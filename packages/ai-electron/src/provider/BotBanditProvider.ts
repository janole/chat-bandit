import { IChat, IChatBotBanditSession, IChatMessage, IChatModelBotBandit, pluckModelInfo, sanitizeMessages, TChatState, TSendFunc } from "@janole/ai-core";

import { createDaemonClient, DaemonRequestError, resolveDaemonSocketPath, TDaemonClient, TDaemonSessionEvent } from "./botbandit/daemon-client";

// ---------------------------------------------------------------------------
// BotBandit provider: one ChatBandit chat <-> one BotBandit daemon session.
//
// No Electron imports here (nor in the daemon client), so this module also runs
// under plain node — see scripts/check-botbandit-provider.ts.
// ---------------------------------------------------------------------------

const HEALTH_TIMEOUT_MS = 500;
const CAUGHT_UP_TIMEOUT_MS = 10_000;
const CANCEL_GRACE_MS = 15_000;

let _client: TDaemonClient | undefined;

function getClient()
{
    const socketPath = resolveDaemonSocketPath();

    if (_client?.socketPath !== socketPath)
    {
        _client = createDaemonClient(socketPath);
    }

    return _client;
}

const accountId = (profile: string) => `botbandit::${profile}`;

async function listModels(): Promise<IChatModelBotBandit[]>
{
    const client = getClient();

    // No daemon → no models, quickly; ChatBandit must keep working without BotBandit
    const health = await client.health(HEALTH_TIMEOUT_MS);

    if (!health)
    {
        return [];
    }

    const config = await client.getConfig();

    const models: IChatModelBotBandit[] = [];

    for (const section of config.modelSections ?? [])
    {
        const account = { id: accountId(section.profile), name: `BotBandit · ${section.profile}`, remote: true };

        for (const model of section.models)
        {
            models.push({
                id: `${account.id}::${model}`,
                name: model,
                displayName: model,
                description: `BotBandit profile "${section.profile}" (${section.provider}) via boba daemon ${health.version}`,
                provider: "botbandit",
                account,
                state: { ready: true },
                features: { tools: true },
                botbandit: { profile: section.profile, model },
            });
        }
    }

    return models;
}

/** Builds the first prompt of a fresh session that has to take over an existing conversation. */
function buildSeededPrompt(history: IChatMessage[], prompt: string)
{
    const transcript = history.filter(sanitizeMessages).map(m =>
    {
        const role = m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : "System";
        const images = m.images?.length ? `\n[${m.images.length} image(s) not forwarded]` : "";

        return `${role}: ${m.content}${images}`;
    });

    if (!transcript.length)
    {
        return prompt;
    }

    return [
        "You are continuing a conversation that started in ChatBandit. The earlier messages, for context:",
        "",
        "<conversation>",
        transcript.join("\n\n"),
        "</conversation>",
        "",
        "Reply to this new message:",
        "",
        prompt,
    ].join("\n");
}

function promptOf(message: IChatMessage)
{
    const images = message.images?.length ? `\n\n[${message.images.length} image(s) attached in ChatBandit, not forwarded]` : "";

    return message.content + images;
}

/**
 * Opens the chat's daemon session when it can be reused, otherwise creates a fresh one. A session
 * is reused only when it has seen exactly the messages before the new prompt; a regenerate, an
 * edit or a model switch away and back therefore starts a fresh session seeded with the history.
 */
async function ensureSession(client: TDaemonClient, chat: IChat, model: IChatModelBotBandit, promptIndex: number)
{
    const { profile, model: modelName } = model.botbandit;
    const stored = chat.botbanditSession;
    const prompt = promptOf(chat.messages[promptIndex]);

    if (stored && stored.syncedThrough === promptIndex)
    {
        // Passing profile/model makes the daemon rebuild the session, so only do it on a switch
        const switched = stored.profile !== profile || stored.model !== modelName;

        try
        {
            const opened = await client.createSession({ sessionId: stored.sessionId, ...(switched ? { profile, model: modelName } : {}) });

            return { sessionId: opened.id, prompt, reused: true };
        }
        catch (error)
        {
            if (!(error instanceof DaemonRequestError && error.status === 404))
            {
                throw error;
            }
            // Session is gone: fall through and start over with the conversation as context
        }
    }

    const created = await client.createSession({ profile, model: modelName });

    return { sessionId: created.id, prompt: buildSeededPrompt(chat.messages.slice(0, promptIndex), prompt), reused: false };
}

interface ITurnHandlers
{
    onText: (text: string) => void;
    onReasoning: (text: string) => void;
    onTool: (toolName: string) => void;
    onTurnStart: () => void;
    onTitle: (title: string) => void;
}

type TTurnOutcome =
    | { outcome: "done"; }
    | { outcome: "stopped"; }
    | { outcome: "approval"; toolName?: string; }
    | { outcome: "error"; error: string; };

/**
 * Sends one prompt into a daemon session and follows its event stream until the agent loop that
 * consumed this prompt ends (or parks on a tool approval, or is cancelled via `signal`).
 */
function runTurn(client: TDaemonClient, sessionId: string, prompt: string, handlers: ITurnHandlers, signal: AbortSignal): Promise<TTurnOutcome>
{
    return new Promise<TTurnOutcome>((resolve) =>
    {
        let settled = false;
        let caughtUp = false;
        let posted = false;
        let ours = false;
        let ourSendId: string | undefined;
        let cancelled = false;
        let retryPending = false;
        let lastError: string | undefined;
        let cancelTimer: ReturnType<typeof setTimeout> | undefined;
        let caughtUpTimer: ReturnType<typeof setTimeout> | undefined;
        let close = () => { };

        const finish = (outcome: TTurnOutcome) =>
        {
            if (settled) return;

            settled = true;
            clearTimeout(caughtUpTimer);
            clearTimeout(cancelTimer);
            signal.removeEventListener("abort", onAbort);
            close();
            resolve(outcome);
        };

        const onAbort = () =>
        {
            if (cancelled || settled) return;

            cancelled = true;

            if (!posted)
            {
                // Nothing was sent yet, so there is nothing to cancel
                finish({ outcome: "stopped" });
                return;
            }

            client.cancel(sessionId).catch(error => console.error("BotBandit cancel failed", error));

            // Normally the cancelled loop ends promptly with a loop_end; don't wait forever for it
            cancelTimer = setTimeout(() => finish({ outcome: "stopped" }), CANCEL_GRACE_MS);
        };

        const onEvent = (event: TDaemonSessionEvent) =>
        {
            if (event.type === "provisional_title")
            {
                handlers.onTitle(event.title);
                return;
            }

            if (!ours)
            {
                // Only events after our prompt was consumed belong to this turn
                if (event.type === "send" && (event.id === ourSendId || event.prompt === prompt))
                {
                    if (event.status === "queued")
                    {
                        ourSendId = event.id;
                    }
                    else if (event.status === "consumed")
                    {
                        ours = true;
                    }
                    else if (event.status === "cleared")
                    {
                        finish(cancelled ? { outcome: "stopped" } : { outcome: "error", error: "BotBandit dropped the prompt before running it." });
                    }
                }

                return;
            }

            switch (event.type)
            {
                case "loop_start":
                    retryPending = false;
                    lastError = undefined;
                    break;

                case "turn_start":
                    handlers.onTurnStart();
                    break;

                case "stream":
                    if (event.event.type === "text-delta" && event.event.text)
                    {
                        handlers.onText(event.event.text);
                    }
                    else if (event.event.type === "reasoning-delta" && event.event.text)
                    {
                        handlers.onReasoning(event.event.text);
                    }
                    else if (event.event.type === "tool-call" && event.event.toolName)
                    {
                        handlers.onTool(event.event.toolName);
                    }
                    break;

                case "turn_end":
                    if (event.error && event.errorCode !== "aborted")
                    {
                        lastError = event.error;
                    }
                    break;

                case "retry_scheduled":
                    retryPending = true;
                    break;

                case "approval_requested":
                    finish(cancelled ? { outcome: "stopped" } : { outcome: "approval", toolName: event.toolName });
                    break;

                case "loop_end":
                    if (cancelled)
                    {
                        finish({ outcome: "stopped" });
                    }
                    else if (!retryPending)
                    {
                        finish(lastError ? { outcome: "error", error: lastError } : { outcome: "done" });
                    }
                    break;
            }
        };

        caughtUpTimer = setTimeout(() => finish({ outcome: "error", error: "BotBandit daemon did not replay the session in time." }), CAUGHT_UP_TIMEOUT_MS);

        close = client.openEventStream(sessionId, {
            onFrame: frame =>
            {
                if ("caughtUp" in frame)
                {
                    if (caughtUp) return;

                    caughtUp = true;
                    clearTimeout(caughtUpTimer);

                    if (signal.aborted)
                    {
                        finish({ outcome: "stopped" });
                        return;
                    }

                    posted = true;

                    client.send(sessionId, prompt).catch((error: Error) =>
                    {
                        finish({ outcome: "error", error: error instanceof DaemonRequestError && error.detail ? error.detail : error.message });
                    });

                    return;
                }

                // The replayed backlog is history the chat already has
                if (caughtUp && !frame.replay)
                {
                    onEvent(frame.event);
                }
            },
            onError: error => finish(cancelled ? { outcome: "stopped" } : { outcome: "error", error: error.message }),
        });

        if (signal.aborted)
        {
            onAbort();
        }
        else
        {
            signal.addEventListener("abort", onAbort);
        }
    });
}

async function generateResponse(_chat: IChat, _messageIndex: number, send: TSendFunc, abortController: AbortController)
{
    if (_chat.model.provider !== "botbandit")
    {
        throw new Error("Unsupported provider");
    }

    const model = _chat.model as IChatModelBotBandit;

    const client = getClient();

    const messageIndex = _messageIndex ?? _chat.messages.length;

    const info = pluckModelInfo(_chat);

    const message: IChatMessage = {
        role: "assistant",
        content: "",
        info,
        createdAt: Date.now(),
        state: "working",
        history: [
            ...(_chat.messages[messageIndex]?.history ?? []),
            {
                content: "",
                info,
                createdAt: Date.now(),
            },
        ],
        historyIndex: _chat.messages[messageIndex]?.history?.length ?? 0,
    };

    let text = "";
    let reasoning = "";
    let separatorPending = false;

    const render = () =>
    {
        const content = (reasoning ? `<think>${reasoning}</think>\n\n` : "") + text;

        message.content = content;
        message.history[message.history.length - 1].content = content;
    };

    const appendText = (delta: string) =>
    {
        if (separatorPending && text.length)
        {
            text += "\n\n";
        }

        separatorPending = false;
        text += delta;
    };

    let botbanditSession: IChatBotBanditSession | undefined = _chat.botbanditSession;
    let sessionId: string | undefined;
    let prompt: string | undefined;
    let setupError: unknown;

    const promptIndex = messageIndex - 1;

    try
    {
        if (_chat.messages[promptIndex]?.role !== "user")
        {
            throw new Error("BotBandit: there is no user message to send.");
        }

        const session = await ensureSession(client, _chat, model, promptIndex);

        sessionId = session.sessionId;
        prompt = session.prompt;

        // The session will have seen everything up to and including this answer
        botbanditSession = {
            sessionId,
            profile: model.botbandit.profile,
            model: model.botbandit.model,
            syncedThrough: messageIndex + 1,
        };
    }
    catch (error)
    {
        setupError = error;
    }

    const updatedChat: IChat = {
        ..._chat,
        state: "working",
        messages: [
            ..._chat.messages.slice(0, messageIndex),
            message,
            ..._chat.messages.slice(messageIndex + 1)
        ],
        currentPrompt: { content: "", images: [] },
        botbanditSession,
    };

    send("update-chat", updatedChat);

    let state: TChatState = "done";

    if (setupError || !sessionId || !prompt)
    {
        const reason = setupError instanceof Error ? setupError.message : String(setupError);
        console.error("ERROR", setupError);

        text += `BotBandit is not available: ${reason}`;
    }
    else
    {
        let throttle = Date.now();
        let summarized = !!updatedChat.generatedSummary;

        const update = () =>
        {
            render();

            if (Date.now() > throttle + 25)
            {
                send("chat-message", updatedChat.id, messageIndex, message);
                throttle = Date.now();
            }
        };

        const result = await runTurn(client, sessionId, prompt, {
            onText: delta => { appendText(delta); update(); },
            onReasoning: delta => { reasoning += delta; update(); },
            onTool: toolName => { appendText(`_Using tool \`${toolName}\` …_`); separatorPending = true; update(); },
            onTurnStart: () => { separatorPending = true; },
            onTitle: title =>
            {
                if (!summarized)
                {
                    summarized = true;
                    send("set-chat-summary", updatedChat.id, title);
                }
            },
        }, abortController.signal);

        if (result.outcome === "stopped")
        {
            state = "stopped";
        }
        else if (result.outcome === "error")
        {
            console.error("ERROR", result.error);

            text += (text ? "\n\n" : "") + result.error;
        }
        else if (result.outcome === "approval")
        {
            // A full approval UI is out of scope; tell the user where to decide instead of hanging
            const tool = result.toolName ? ` to run \`${result.toolName}\`` : "";

            text += (text ? "\n\n" : "") + [
                "---",
                `**BotBandit is waiting for approval**${tool}.`,
                `Approve or deny it in BotBandit (web app or \`boba\` TUI, session \`${sessionId}\`), then send another message here to continue.`,
            ].join("\n\n");
        }
    }

    render();

    message.state = state;
    send("chat-message", updatedChat.id, messageIndex, { ...message, state });
    send("chat-state", updatedChat.id, state);
}

export default {
    generateResponse,
    listModels,
};
