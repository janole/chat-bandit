import { IChat, IChatBotBanditSession, IChatMessage, IChatModelBotBandit, pluckModelInfo, sanitizeMessages, TChatState, TSendFunc } from "@janole/ai-core";

import { createDaemonClient, DaemonRequestError, resolveDaemonSocketPath, TDaemonClient } from "./botbandit/daemon-client";
import { DEFAULT_TURN_TIMINGS, ITurnTimings, runTurn } from "./botbandit/turn";

// ---------------------------------------------------------------------------
// BotBandit provider: one ChatBandit chat <-> one BotBandit daemon session.
//
// No Electron imports here (nor in the daemon client), so this module also runs
// under plain node — see scripts/check-botbandit-provider.ts.
// ---------------------------------------------------------------------------

const HEALTH_TIMEOUT_MS = 500;

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
 *
 * Known limits:
 * - Reuse is decided by message count only, so editing an earlier message in place (without
 *   regenerating from it) still counts as in sync and the daemon keeps the old wording.
 * - Every regenerate or edit creates a new, visible daemon session; the old ones are not hidden,
 *   archived or deleted (the daemon offers no route for either from here).
 */
async function ensureSession(client: Pick<TDaemonClient, "createSession">, chat: IChat, model: IChatModelBotBandit, promptIndex: number)
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

export interface IGenerateOptions
{
    /** Daemon client override, for tests; defaults to the local daemon socket. */
    client?: Pick<TDaemonClient, "createSession" | "openEventStream" | "send" | "cancel">;
    timings?: ITurnTimings;
}

/** Resolves with the promise's value, or with `undefined` as soon as `signal` aborts. */
function unlessAborted<T>(promise: Promise<T>, signal: AbortSignal)
{
    return new Promise<T | undefined>((resolve, reject) =>
    {
        const onAbort = () => resolve(undefined);

        if (signal.aborted) return onAbort();

        signal.addEventListener("abort", onAbort, { once: true });
        promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
    });
}

async function generateResponse(_chat: IChat, _messageIndex: number, send: TSendFunc, abortController: AbortController, options?: IGenerateOptions)
{
    if (_chat.model.provider !== "botbandit")
    {
        throw new Error("Unsupported provider");
    }

    const model = _chat.model as IChatModelBotBandit;

    const client = options?.client ?? getClient();

    const signal = abortController.signal;

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

    // The session link is left as it is here: it only moves once the daemon has the prompt
    const updatedChat: IChat = {
        ..._chat,
        state: "working",
        messages: [
            ..._chat.messages.slice(0, messageIndex),
            message,
            ..._chat.messages.slice(messageIndex + 1)
        ],
        currentPrompt: { content: "", images: [] },
    };

    send("update-chat", updatedChat);

    let text = "";
    let reasoning = "";
    let separatorPending = false;
    let state: TChatState = "done";

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

    const appendNote = (note: string) =>
    {
        text += (text ? "\n\n" : "") + note;
    };

    const linkSession = (link: IChatBotBanditSession) => send("set-chat-botbandit-session", updatedChat.id, link);

    const promptIndex = messageIndex - 1;

    try
    {
        if (_chat.messages[promptIndex]?.role !== "user")
        {
            throw new Error("there is no user message to send.");
        }

        const session = await unlessAborted(ensureSession(client, _chat, model, promptIndex), signal);

        if (!session)
        {
            state = "stopped";
        }
        else
        {
            const link: IChatBotBanditSession = {
                sessionId: session.sessionId,
                profile: model.botbandit.profile,
                model: model.botbandit.model,
                // Once consumed, the session has seen everything up to and including this answer
                syncedThrough: messageIndex + 1,
            };

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

            const result = await runTurn(client, session.sessionId, session.prompt, {
                onConsumed: () => linkSession(link),
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
            }, signal, options?.timings ?? DEFAULT_TURN_TIMINGS);

            const where = `in BotBandit (web app or \`boba\` TUI, session \`${session.sessionId}\`)`;

            if (result.outcome === "stopped")
            {
                state = "stopped";
            }
            else if (result.outcome === "error")
            {
                console.error("ERROR", result.error);
                appendNote(result.error);
            }
            else if (result.outcome === "approval")
            {
                // A full approval UI is out of scope; tell the user where to decide instead of hanging
                const tool = result.toolName ? ` to run \`${result.toolName}\`` : "";

                appendNote([
                    "---",
                    `**BotBandit is waiting for approval**${tool}.`,
                    `Approve or deny it ${where}, then send another message here to continue.`,
                ].join("\n\n"));
            }
            else if (result.outcome === "blocked")
            {
                const why = result.reason === "approval"
                    ? `**This BotBandit session is waiting for a tool approval**${result.toolName ? ` (\`${result.toolName}\`)` : ""}.`
                    : "**This BotBandit session is busy** with another run.";

                appendNote([
                    why,
                    `Your message was **not sent**. ${result.reason === "approval" ? `Approve or deny the call ${where}` : "Wait for it to finish"}, then send your message again.`,
                ].join("\n\n"));

                if (session.reused)
                {
                    // The user was told the message did not arrive; keep the session for their next one
                    linkSession(link);
                }
            }
        }
    }
    catch (error)
    {
        console.error("ERROR", error);
        appendNote(`BotBandit is not available: ${error instanceof Error ? error.message : String(error)}`);
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
