// Live check of the BotBandit provider against the running `boba daemon`.
//
//   npx tsx packages/ai-electron/scripts/check-botbandit-provider.ts
//
// Env: BOTBANDIT_DAEMON_SOCK (socket override), BOTBANDIT_CHECK_MODEL ("<profile>::<model>",
// default "claude::haiku", else the first model the daemon offers).
//
// Creates two daemon sessions: one for turns 1-3 (pong, ping reusing it, abort) and one for the
// "session gone" turn, which must be seeded with the earlier conversation.

import type { IChat, IChatMessage, IChatModelBotBandit, TChatState } from "@janole/ai-core";

import { createDaemonClient } from "../src/provider/botbandit/daemon-client";
import BotBanditProvider from "../src/provider/BotBanditProvider";

let failures = 0;

function check(label: string, ok: boolean, detail?: string)
{
    if (!ok) failures++;

    console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
}

const short = (text: string) => JSON.stringify(text.length > 120 ? text.slice(0, 120) + "…" : text);

const userMessage = (content: string): IChatMessage => ({ role: "user", content, createdAt: Date.now(), history: [], historyIndex: 0 });

/** A stub `send` that applies updates the way ElectronClient's listeners do, and records them. */
function createRecorder(initial: IChat)
{
    let chat = initial;
    const counts: Record<string, number> = {};
    let firstContentAt: number | undefined;

    const send = (channel: string, ...args: any[]) =>
    {
        counts[channel] = (counts[channel] ?? 0) + 1;

        if (channel === "update-chat")
        {
            chat = args[0] as IChat;
        }
        else if (channel === "chat-message")
        {
            const [, index, message] = args as [string, number, IChatMessage];

            if (message.content && firstContentAt === undefined) firstContentAt = Date.now();

            chat = { ...chat, messages: [...chat.messages.slice(0, index), { ...message }, ...chat.messages.slice(index + 1)] };
        }
        else if (channel === "chat-state")
        {
            chat = { ...chat, state: args[1] as TChatState };
        }
        else if (channel === "set-chat-summary")
        {
            chat = { ...chat, generatedSummary: args[1] as string };
        }
    };

    return { send, counts, get chat() { return chat; }, get firstContentAt() { return firstContentAt; } };
}

async function turn(label: string, chat: IChat, prompt: string, options?: { abortAfterFirstTextMs?: number; })
{
    const before: IChat = { ...chat, messages: [...chat.messages, userMessage(prompt)] };
    const messageIndex = before.messages.length;
    const recorder = createRecorder(before);
    const abortController = new AbortController();

    let abortedAt: number | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;

    if (options?.abortAfterFirstTextMs !== undefined)
    {
        const startedAt = Date.now();

        poll = setInterval(() =>
        {
            // Abort once text streams, or after 20 s regardless
            if ((recorder.firstContentAt && Date.now() - recorder.firstContentAt >= options.abortAfterFirstTextMs!) || Date.now() - startedAt > 20_000)
            {
                clearInterval(poll);
                abortedAt = Date.now();
                abortController.abort();
            }
        }, 50);
    }

    const startedAt = Date.now();
    await BotBanditProvider.generateResponse(before, messageIndex, recorder.send, abortController);
    clearInterval(poll);

    const after = recorder.chat;
    const answer = after.messages[messageIndex];

    console.log(`\n[${label}] ${Date.now() - startedAt} ms, session ${after.botbanditSession?.sessionId}, updates ${JSON.stringify(recorder.counts)}`);
    console.log(`  answer (${answer?.state}): ${short(answer?.content ?? "")}`);

    return { chat: after, answer, abortedAt, finishedAt: Date.now() };
}

async function main()
{
    // 1. No daemon → no models, fast
    const realSocket = process.env.BOTBANDIT_DAEMON_SOCK;
    process.env.BOTBANDIT_DAEMON_SOCK = "/tmp/botbandit-check-no-such-daemon.sock";
    let t = Date.now();
    const none = await BotBanditProvider.listModels();
    check("listModels without daemon returns [] quickly", none.length === 0 && Date.now() - t < 1_000, `${none.length} models in ${Date.now() - t} ms`);

    if (realSocket) process.env.BOTBANDIT_DAEMON_SOCK = realSocket;
    else delete process.env.BOTBANDIT_DAEMON_SOCK;

    // 2. Models from the running daemon
    t = Date.now();
    const models = await BotBanditProvider.listModels();
    check("listModels with daemon returns models", models.length > 0, `${models.length} models in ${Date.now() - t} ms`);
    console.log("  " + models.map(m => `${m.botbandit.profile}::${m.name}`).join(", "));

    const wanted = process.env.BOTBANDIT_CHECK_MODEL ?? "claude::haiku";
    const model: IChatModelBotBandit | undefined = models.find(m => `${m.botbandit.profile}::${m.name}` === wanted) ?? models[0];

    if (!model)
    {
        throw new Error("No BotBandit model to test with");
    }

    check("models are remote botbandit models", models.every(m => m.provider === "botbandit" && m.account.remote === true));
    console.log(`  using ${model.botbandit.profile}::${model.name}`);

    const empty: IChat = { id: `check-${Date.now()}`, title: "Provider check", model, messages: [] };

    // 3. First turn creates the session
    const t1 = await turn("turn 1", empty, "Reply with the single word: pong");
    check("turn 1 answers pong", /pong/i.test(t1.answer?.content ?? ""));
    check("turn 1 ends done", t1.answer?.state === "done" && t1.chat.state === "done");
    check("turn 1 stores the daemon session on the chat", !!t1.chat.botbanditSession?.sessionId && t1.chat.botbanditSession.syncedThrough === 2, JSON.stringify(t1.chat.botbanditSession));

    // 4. Second turn reuses it
    const t2 = await turn("turn 2", t1.chat, "Now reply with the single word: ping");
    check("turn 2 answers ping", /ping/i.test(t2.answer?.content ?? ""));
    check("turn 2 reuses the session", t2.chat.botbanditSession?.sessionId === t1.chat.botbanditSession?.sessionId && t2.chat.botbanditSession?.syncedThrough === 4);

    // 5. Abort mid-stream
    const t3 = await turn("turn 3 (abort)", t2.chat, "Count from 1 to 300, one number per line, no other text.", { abortAfterFirstTextMs: 300 });
    const stopLatency = t3.abortedAt ? t3.finishedAt - t3.abortedAt : -1;
    check("abort ends the turn stopped", t3.answer?.state === "stopped" && t3.chat.state === "stopped", `stopped ${stopLatency} ms after abort`);
    check("abort reuses the session", t3.chat.botbanditSession?.sessionId === t1.chat.botbanditSession?.sessionId);

    // 6. Session gone → fresh session seeded with the conversation
    const gone: IChat = { ...t2.chat, botbanditSession: { ...t2.chat.botbanditSession!, sessionId: "01J0000000000000000000000Z" } };
    const t4 = await turn("turn 4 (session gone)", gone, "Quote my very first message in this conversation exactly, without any other text.");
    check("gone session is replaced", !!t4.chat.botbanditSession?.sessionId && t4.chat.botbanditSession.sessionId !== "01J0000000000000000000000Z" && t4.chat.botbanditSession.sessionId !== t1.chat.botbanditSession?.sessionId);
    check("replacement session answers from the earlier conversation", /single word: pong/i.test(t4.answer?.content ?? ""));

    // The daemon's own log must show the seeded first prompt
    const events = await createDaemonClient().call<Array<{ event: { message?: { role: string; content: unknown; }; }; }>>("GET", `/events?sessionId=${t4.chat.botbanditSession?.sessionId}&type=message`);
    const firstUser = events.find(e => e.event.message?.role === "user")?.event.message?.content;
    check("replacement session was seeded with the conversation", typeof firstUser === "string" && firstUser.includes("<conversation>") && firstUser.includes("User: Reply with the single word: pong"));

    console.log(`\n${failures ? `${failures} check(s) FAILED` : "All checks passed"}`);
    process.exit(failures ? 1 : 0);
}

main().catch(error =>
{
    console.error(error);
    process.exit(1);
});
