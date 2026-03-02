import { IChat, IChatMessage, IChatModelCodexAsp, pluckModelInfo, sanitizeMessages, TChatState, TSendFunc } from "@janole/ai-core";
import { streamText, ModelMessage } from "ai";
import { AppServerClient, createCodexAppServer, StdioTransport } from "@janole/ai-sdk-provider-codex-asp";

const account = {
    id: "codexasp",
    name: "Codex ASP",
    remote: true,
    removable: false,
} as const;

const codex = createCodexAppServer();

interface ICodexListModelsResponse
{
    data: Array<{
        id: string;
        model: string;
        displayName: string;
        description: string;
        hidden: boolean;
        inputModalities?: string[];
    }>;
    nextCursor?: string | null;
}

function mapChatMessagesToVercelMessages(messages: IChatMessage[]): ModelMessage[]
{
    const mapped: ModelMessage[] = [];

    for (const message of messages.filter(sanitizeMessages))
    {
        if (message.role === "system")
        {
            mapped.push({ role: "system", content: message.content });
            continue;
        }

        if (message.role === "user")
        {
            mapped.push({ role: "user", content: message.content });
            continue;
        }

        mapped.push({ role: "assistant", content: message.content });
    }

    return mapped;
}

async function generateResponse(_chat: IChat, _messageIndex: number, send: TSendFunc, abortController: AbortController)
{
    if (_chat.model.provider !== "codexasp")
    {
        throw new Error("Unsupported provider");
    }

    const model = _chat.model as IChatModelCodexAsp;

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

    let state: TChatState = "done";

    try
    {
        const response = streamText({
            model: codex(model.name),
            messages: mapChatMessagesToVercelMessages(updatedChat.messages.slice(0, messageIndex).filter(sanitizeMessages)),
            abortSignal: abortController.signal,
        });

        let throttle = Date.now();

        for await (const chunk of response.textStream)
        {
            if (!chunk)
            {
                continue;
            }

            message.content += chunk;
            message.history[message.history.length - 1].content += chunk;

            if (Date.now() > throttle + 25)
            {
                send("chat-message", updatedChat.id, messageIndex, message);
                throttle = Date.now();
            }
        }
    }
    catch (error)
    {
        if (error instanceof Error && error.name === "AbortError")
        {
            state = "stopped";
        }
        else
        {
            message.content += (error as Error).message;
            message.history[message.history.length - 1].content += (error as Error).message;
        }
    }

    abortController.signal.onabort = null;

    message.state = state;
    send("chat-message", updatedChat.id, messageIndex, { ...message, state });
    send("chat-state", updatedChat.id, state);
}

async function listModels(): Promise<IChatModelCodexAsp[]>
{
    const client = new AppServerClient(new StdioTransport());
    const models: ICodexListModelsResponse["data"] = [];

    try
    {
        await client.connect();
        await client.request("initialize", {
            clientInfo: {
                name: "chat-bandit",
                version: "0.0.1",
            },
        });
        await client.notification("initialized");

        let cursor: string | undefined;

        do
        {
            const result = await client.request<ICodexListModelsResponse>("model/list", cursor ? { cursor } : {});
            models.push(...result.data);
            cursor = result.nextCursor ?? undefined;
        }
        while (cursor);
    }
    finally
    {
        await client.disconnect();
    }

    return models
        .filter(model => !model.hidden)
        .map(model => ({
            id: `${account.id}::${model.id}`,
            name: model.id,
            provider: "codexasp",
            account,
            displayName: model.displayName || model.id,
            description: model.description,
            state: { ready: true },
            features: {
                vision: model.inputModalities?.includes("image"),
                options: {
                    temperature: true,
                },
            },
            info: model,
        }));
}

export default {
    generateResponse,
    listModels,
};
