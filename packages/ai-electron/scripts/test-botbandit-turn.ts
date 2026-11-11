// Offline tests of the BotBandit provider's turn logic against a fake daemon (no socket, no model).
//
//   npx tsx packages/ai-electron/scripts/test-botbandit-turn.ts
//
// Each scenario scripts the replay and the live events the fake daemon emits in answer to send /
// cancel, runs the real generateResponse() with short timings, and checks what ChatBandit got.

import type { IChat, IChatBotBanditSession, IChatMessage, IChatModelBotBandit, TChatState } from "@janole/ai-core";

import { DaemonRequestError, TDaemonSessionEvent, TDaemonStreamFrame } from "../src/provider/botbandit/daemon-client";
import { ITurnTimings } from "../src/provider/botbandit/turn";
import BotBanditProvider, { IGenerateOptions } from "../src/provider/BotBanditProvider";

const TIMINGS: ITurnTimings = { caughtUpMs: 300, cancelGraceMs: 300, retryMarginMs: 150, approvalGraceMs: 300, busyGraceMs: 300 };

let failures = 0;
let seq = 0;

function check(label: string, ok: boolean, detail?: string)
{
    if (!ok) failures++;

    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail && !ok ? `  — ${detail}` : ""}`);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type TPartialEvent = { type: string; [key: string]: unknown; };
type TEmit = (event: TPartialEvent, delayMs?: number) => void;

interface IScenario
{
    replay?: TPartialEvent[];
    /** Skip the caughtUp frame (replay never finishes). */
    noCaughtUp?: boolean;
    /** Live events emitted right after caughtUp, before any send. */
    live?: (emit: TEmit) => void;
    onSend?: (emit: TEmit, prompt: string, sendId: string) => void;
    onCancel?: (emit: TEmit) => void;
    sendError?: Error;
    createDelayMs?: number;
    /** Make opening this stored session fail with 404. */
    openNotFound?: boolean;
    streamErrorAfterMs?: number;
}

/** The normal reply to a send into an idle session. */
const consume = (emit: TEmit, prompt: string, sendId: string) =>
{
    emit({ type: "send", id: sendId, prompt, status: "queued" });
    emit({ type: "loop_start" });
    emit({ type: "send", id: sendId, prompt, status: "consumed" });
};

const reply = (emit: TEmit, text: string) =>
{
    emit({ type: "turn_start", turn_id: "t1" });
    emit({ type: "stream", turn_id: "t1", event: { type: "text-delta", text } });
    emit({ type: "turn_end", turn_id: "t1", result: "continued" });
    emit({ type: "loop_end" });
};

function createFakeClient(scenario: IScenario)
{
    const log: string[] = [];
    let onFrame: ((frame: TDaemonStreamFrame) => void) | undefined;
    let onError: ((error: Error) => void) | undefined;
    let closed = false;

    // Events are delivered in order, each after its own delay (relative to the previous one)
    let chain = Promise.resolve();

    const emit: TEmit = (event, delayMs = 5) =>
    {
        chain = chain.then(() => sleep(delayMs)).then(() =>
        {
            if (!closed) onFrame?.({ event: { event_id: `e${++seq}`, ...event } as TDaemonSessionEvent, persisted: true });
        });
    };

    const client: NonNullable<IGenerateOptions["client"]> = {
        createSession: async (params) =>
        {
            log.push(`create:${params.sessionId ?? "new"}`);
            await sleep(scenario.createDelayMs ?? 1);

            if (params.sessionId && scenario.openNotFound)
            {
                throw new DaemonRequestError(404, "not found", `Session not found: ${params.sessionId}`);
            }

            return { id: params.sessionId ?? "S-new" };
        },
        openEventStream: (_sessionId, handlers) =>
        {
            log.push("stream");
            onFrame = handlers.onFrame;
            onError = handlers.onError;

            setTimeout(() =>
            {
                for (const event of scenario.replay ?? [])
                {
                    onFrame?.({ event: { event_id: `r${++seq}`, ...event } as TDaemonSessionEvent, persisted: true, replay: true });
                }

                if (!scenario.noCaughtUp) onFrame?.({ caughtUp: true });

                scenario.live?.(emit);
            }, 2);

            if (scenario.streamErrorAfterMs !== undefined)
            {
                setTimeout(() => !closed && onError?.(new Error("BotBandit event stream closed")), scenario.streamErrorAfterMs);
            }

            return () => { closed = true; log.push("close"); };
        },
        send: async (_sessionId, prompt) =>
        {
            log.push(`send:${prompt}`);

            if (scenario.sendError) throw scenario.sendError;

            scenario.onSend?.(emit, prompt, `send-${++seq}`);

            return { queued: true };
        },
        cancel: async () =>
        {
            log.push("cancel");
            scenario.onCancel?.(emit);

            return { cancelled: true };
        },
    };

    return { client, log };
}

const model: IChatModelBotBandit = {
    id: "botbandit::fake::m", name: "m", provider: "botbandit", account: { id: "botbandit::fake", name: "BotBandit · fake", remote: true },
    state: { ready: true }, botbandit: { profile: "fake", model: "m" },
};

const msg = (role: IChatMessage["role"], content: string): IChatMessage => ({ role, content, createdAt: 0, history: [], historyIndex: 0 });

/** A chat with one earlier exchange, already synced with session S-old, plus the new prompt "hello". */
function syncedChat(): IChat
{
    return {
        id: "chat", model,
        messages: [msg("user", "first"), msg("assistant", "answer"), msg("user", "hello")],
        botbanditSession: { sessionId: "S-old", profile: "fake", model: "m", syncedThrough: 2 },
    };
}

async function run(name: string, scenario: IScenario, options?: { chat?: IChat; abortAfterMs?: number; })
{
    console.log(`\n${name}`);

    const chat = options?.chat ?? syncedChat();
    const messageIndex = chat.messages.length;
    const { client, log } = createFakeClient(scenario);
    const events: string[] = [];
    const links: Array<IChatBotBanditSession | undefined> = [];
    let content = "";
    let state: TChatState | undefined;
    let firstUpdateAt: number | undefined;

    const send = (channel: string, ...args: any[]) =>
    {
        events.push(channel);

        if (channel === "update-chat" && firstUpdateAt === undefined) firstUpdateAt = Date.now();
        if (channel === "set-chat-botbandit-session") links.push(args[1]);
        if (channel === "chat-message") content = (args[2] as IChatMessage).content;
        if (channel === "chat-state") state = args[1];
    };

    const abortController = new AbortController();
    let abortedAt: number | undefined;

    if (options?.abortAfterMs !== undefined)
    {
        setTimeout(() => { abortedAt = Date.now(); abortController.abort(); }, options.abortAfterMs);
    }

    const startedAt = Date.now();
    await BotBanditProvider.generateResponse(chat, messageIndex, send, abortController, { client, timings: TIMINGS });
    const finishedAt = Date.now();

    return {
        log, events, links, content, state,
        elapsed: finishedAt - startedAt,
        firstUpdateMs: (firstUpdateAt ?? finishedAt) - startedAt,
        stopLatency: abortedAt ? finishedAt - abortedAt : undefined,
        sent: log.some(l => l.startsWith("send:")),
    };
}

async function main()
{
    let r;

    r = await run("happy path: reuse, stream, link committed on consumed", { onSend: (emit, p, id) => { consume(emit, p, id); reply(emit, "pong"); } });
    check("done with streamed text", r.state === "done" && r.content === "pong", JSON.stringify(r));
    check("sends only the new prompt into the stored session", r.log.includes("create:S-old") && r.log.includes("send:hello"), r.log.join(" "));
    check("link committed once, advanced past this answer", r.links.length === 1 && r.links[0]?.syncedThrough === 4 && r.links[0]?.sessionId === "S-old", JSON.stringify(r.links));

    // Finding 6: placeholder first, abort effective while the session is being created
    r = await run("slow session create: placeholder first", { createDelayMs: 150, onSend: (emit, p, id) => { consume(emit, p, id); reply(emit, "ok"); } });
    check("update-chat sent before the create returns", r.events[0] === "update-chat" && r.firstUpdateMs < 50, `${r.firstUpdateMs} ms`);

    r = await run("abort during session create", { createDelayMs: 1_000 }, { abortAfterMs: 30 });
    check("stops promptly without sending", r.state === "stopped" && !r.sent && (r.stopLatency ?? 999) < 50, `${r.stopLatency} ms, ${r.log.join(" ")}`);
    check("no link committed", r.links.length === 0);

    // Finding 1: nothing delivered → no link
    r = await run("send rejected (409)", { sendError: new DaemonRequestError(409, "conflict", "Session is compacting") });
    check("error shown", r.state === "done" && r.content.includes("Session is compacting"), r.content);
    check("no link committed", r.links.length === 0);

    r = await run("stream error before consumed", { onSend: (emit, p, id) => emit({ type: "send", id, prompt: p, status: "queued" }), streamErrorAfterMs: 60 });
    check("error shown, no link", r.content.includes("stream closed") && r.links.length === 0, JSON.stringify(r.links));

    r = await run("prompt cleared", { onSend: (emit, p, id) => { emit({ type: "send", id, prompt: p, status: "queued" }); emit({ type: "send", id, prompt: p, status: "cleared" }); } });
    check("error shown, no link", r.content.includes("dropped the prompt") && r.links.length === 0);

    r = await run("replay never catches up", { noCaughtUp: true });
    check("times out with an error, nothing sent, no link", r.content.includes("did not replay") && !r.sent && r.links.length === 0);

    r = await run("fresh seeded session whose send fails", { openNotFound: true, sendError: new Error("socket hang up") });
    check("no link to the half-made session", r.links.length === 0 && r.log.includes("create:new"), r.log.join(" "));

    // Finding 2: session already parked on an approval
    const parked = [{ type: "loop_start" }, { type: "approval_requested", approvalId: "a1", toolCallId: "c1", toolName: "fs_write" }];
    r = await run("replay: parked on a human approval", { replay: parked });
    check("fails fast without sending", !r.sent && r.elapsed < 100 && r.content.includes("waiting for a tool approval") && r.content.includes("fs_write") && r.content.includes("not sent"), `${r.elapsed} ms ${r.content}`);
    check("reused session stays linked for the next message", r.links.length === 1 && r.links[0]?.syncedThrough === 4);

    r = await run("replay: approval already decided", {
        replay: [...parked, { type: "approval_decided", approvalId: "a1", approved: true }, { type: "loop_end" }],
        onSend: (emit, p, id) => { consume(emit, p, id); reply(emit, "fine"); },
    });
    check("sends normally", r.sent && r.content === "fine");

    r = await run("replay: parked call cancelled", {
        replay: [...parked, { type: "cancel" }, { type: "interrupted", toolCallIds: ["c1"] }, { type: "loop_end" }],
        onSend: (emit, p, id) => { consume(emit, p, id); reply(emit, "fine"); },
    });
    check("sends normally", r.sent && r.content === "fine");

    r = await run("replay: busy loop that ends soon", {
        replay: [{ type: "loop_start" }],
        live: emit => emit({ type: "loop_end" }, 50),
        onSend: (emit, p, id) => { consume(emit, p, id); reply(emit, "after"); },
    });
    check("waits, then sends", r.sent && r.content === "after");

    r = await run("replay: busy loop that does not end", { replay: [{ type: "loop_start" }] });
    check("gives up with 'busy', nothing sent", !r.sent && r.content.includes("busy") && r.elapsed < 500, `${r.elapsed} ms`);

    // Finding 3: retry watchdog
    const failedTurn = (emit: TEmit) =>
    {
        emit({ type: "turn_start", turn_id: "t1" });
        emit({ type: "turn_end", turn_id: "t1", result: "idle", error: "overloaded", errorCode: "turn_error" });
        emit({ type: "retry_scheduled", attempt: 1, maxRetries: 3, delayMs: 50 });
        emit({ type: "loop_end" });
    };

    r = await run("retry scheduled but never starts", { onSend: (emit, p, id) => { consume(emit, p, id); failedTurn(emit); } });
    check("settles with the error after delay + margin", r.content.includes("overloaded") && r.elapsed >= 200 && r.elapsed < 500, `${r.elapsed} ms`);

    r = await run("retry scheduled and recovers", { onSend: (emit, p, id) => { consume(emit, p, id); failedTurn(emit); emit({ type: "loop_start" }, 30); reply(emit, "recovered"); } });
    check("streams the retried answer, no error", r.content === "recovered" && r.state === "done", r.content);

    // Finding 4: approvals during our turn
    const toolCall = (emit: TEmit, deferred: boolean) =>
    {
        emit({ type: "turn_start", turn_id: "t1" });
        emit({ type: "stream", turn_id: "t1", event: { type: "tool-call", toolName: "web_fetch" } });
        if (deferred) emit({ type: "approval_deferred", toolCallId: "c9", decision: "ask-agent" });
        emit({ type: "approval_requested", approvalId: "a9", toolCallId: "c9", toolName: "web_fetch" });
    };

    r = await run("agent-decided approval", {
        onSend: (emit, p, id) =>
        {
            consume(emit, p, id);
            toolCall(emit, true);
            emit({ type: "approval_decided", approvalId: "a9", approved: true }, 80);
            emit({ type: "turn_end", turn_id: "t1", result: "continued" });
            reply(emit, "fetched it");
        },
    });
    check("keeps streaming after the decision", r.state === "done" && r.content.endsWith("fetched it") && !r.content.includes("waiting for approval"), r.content);

    r = await run("agent approval that never comes", { onSend: (emit, p, id) => { consume(emit, p, id); toolCall(emit, true); } });
    check("ends with the approval note after the grace", r.content.includes("waiting for approval") && r.elapsed >= 300, `${r.elapsed} ms`);

    r = await run("human approval", { onSend: (emit, p, id) => { consume(emit, p, id); toolCall(emit, false); } });
    check("ends at once with the approval note", r.content.includes("waiting for approval") && r.elapsed < 150 && r.links.length === 1, `${r.elapsed} ms`);

    // Finding 5: stop before consumed
    r = await run("stop before consumed", { onSend: (emit, p, id) => emit({ type: "send", id, prompt: p, status: "queued" }) }, { abortAfterMs: 40 });
    check("stops promptly, cancels, no link", r.state === "stopped" && (r.stopLatency ?? 999) < 50 && r.log.includes("cancel") && r.links.length === 0, `${r.stopLatency} ms ${r.log.join(" ")}`);

    r = await run("stop mid-stream", {
        onSend: (emit, p, id) => { consume(emit, p, id); emit({ type: "turn_start", turn_id: "t1" }); emit({ type: "stream", turn_id: "t1", event: { type: "text-delta", text: "1 2 3" } }); },
        onCancel: emit => { emit({ type: "cancel" }); emit({ type: "interrupted", turn_id: "t1" }); emit({ type: "turn_end", turn_id: "t1", result: "idle", errorCode: "aborted" }); emit({ type: "loop_end" }); },
    }, { abortAfterMs: 60 });
    check("stopped with partial text, link kept", r.state === "stopped" && r.content === "1 2 3" && r.links.length === 1 && (r.stopLatency ?? 999) < 100, `${r.stopLatency} ms`);

    // Finding 7: empty response
    r = await run("empty response (errorCode only)", {
        onSend: (emit, p, id) => { consume(emit, p, id); emit({ type: "turn_start", turn_id: "t1" }); emit({ type: "turn_end", turn_id: "t1", result: "idle", errorCode: "empty_response" }); emit({ type: "loop_end" }); },
    });
    check("shown as an error, not an empty success", r.content.includes("empty_response"), JSON.stringify(r.content));

    console.log(`\n${failures ? `${failures} check(s) FAILED` : "All offline checks passed"}`);
    process.exit(failures ? 1 : 0);
}

main().catch(error =>
{
    console.error(error);
    process.exit(1);
});
