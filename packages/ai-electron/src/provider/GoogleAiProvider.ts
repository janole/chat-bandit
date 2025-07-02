import { safeStorage } from "electron";
import { ulid } from "ulid";
import { Content, GoogleGenAI, Model, Part } from "@google/genai";
import tryCatch, { tryCatchCache } from "@janole/try-catch";
import { IChat, IChatMessage, pluckModelInfo, sanitizeMessages, TChatState, TAddAccount, TRemoveAccount, IChatModelGoogleAI, TSendFunc } from "@janole/ai-core";
import { createAccountStore } from "../utils/Accounts";

interface IAccount
{
    id: string;
    name: string;
    type: "googleai";
    encryptedApiKey: string;
}

const _store = createAccountStore<IAccount, GoogleGenAI>({
    name: "googleai",
    createClient: (account) => new GoogleGenAI({
        apiKey: safeStorage.decryptString(Buffer.from(account.encryptedApiKey, "hex")),
    }),
});

function mapChatMessagesToOpenAI(messages: IChatMessage[])
{
    const mapped: Content[] = messages.filter(sanitizeMessages).filter(m => ["user", "assistant"].includes(m.role)).map(m => 
    {
        if (m.role === "user")
        {
            const images: Part[] = m.images?.map(image => ({
                inlineData: {
                    // TODO: add filter to prevent crashing here
                    data: image.substring(image.indexOf(";base64,") + 8),
                    mimeType: image.match(/^data:([^;]+)/)?.[1],
                },
            })) ?? [];

            return {
                role: "user",
                parts: [
                    { text: m.content },
                    ...images,
                ],
            } as Content;
        }

        return { role: "model", parts: [{ text: m.content }] } as Content;
    });

    return mapped;
}

async function generateResponse(_chat: IChat, _messageIndex: number, send: TSendFunc, abortController: AbortController)
{
    if (_chat.model.provider !== "googleai")
    {
        throw new Error("Unsupported provider");
    }

    const model = _chat.model as IChatModelGoogleAI;

    const client = _store.getClient(model.account.id);

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
        const response = await client.models.generateContentStream({
            model: model.name,
            contents: mapChatMessagesToOpenAI(updatedChat.messages.slice(0, messageIndex).filter(sanitizeMessages)),
            config: {
                systemInstruction: updatedChat.messages.find(m => m.role === "system")?.content,
                abortSignal: abortController.signal,
                temperature: info?.options?.temperature,
                topP: info?.options?.top_p,
                topK: info?.options?.top_k,
                tools: info?.options?.integratedWebSearch ? [{ googleSearch: {} }] : undefined,
            },
        });

        let throttle = Date.now();

        for await (const chunk of response)
        {
            console.log(chunk.candidates);

            if (chunk.text)
            {
                message.content += chunk.text;
                message.history[message.history.length - 1].content += chunk.text;

                if (Date.now() > throttle + 25)
                {
                    send("chat-message", updatedChat.id, messageIndex, message);
                    throttle = Date.now();
                }
            }
        }
    }
    catch (error: any)
    {
        if (error instanceof Error && error.name === "AbortError")
        {
            state = "stopped";
        }
        else
        {
            // TODO: refactor -> dedicated error field?
            message.content += (error as Error).message;
            message.history[message.history.length - 1].content += (error as Error).message;
        }
    }

    abortController.signal.onabort = null;

    message.state = state;
    send("chat-message", updatedChat.id, messageIndex, { ...message, state });
    send("chat-state", updatedChat.id, state);

    // !updatedChat.generatedSummary && generateSummary(updatedChat, send);
}

// async function generateSummary(chat: IChat, send: TSendFunc)
// {
//     const { result: description } = await tryCatch(generateCompletion(
//         [
//             "Conversation:",
//             ...chat.messages.filter(m => m.role === "user").map(m => m.role + ": " + m.content),
//             "Summarize the main point of this conversation in 3-5 words.",
//         ].join("\n"),
//         chat.model,
//     ));

//     description && send("set-chat-summary", chat.id, description);
// }

async function listModels(): Promise<IChatModelGoogleAI[]>
{
    const models: IChatModelGoogleAI[] = [];

    const accounts = _store.list();

    for (const account of accounts)
    {
        if (account.type === "googleai")
        {
            const { result, error } = await tryCatch(addGoogleAiAccount(account));

            if (error) { console.log(error); _store.remove(account.id); };
            result && models.push(...result);
        }
    }

    return models;
}

async function addGoogleAiAccount(account: IAccount): Promise<IChatModelGoogleAI[]>
{
    const client = _store.getClient(account.id);

    const { result } = await tryCatchCache(client.models.list({}), { key: `${account.id}-list-models`, ttlSeconds: 60 * 60 });

    if (!result?.page)
    {
        return [];
    }

    const validModels = [
        "models/gemini-2.5-pro",
        "models/gemini-2.0-flash-exp",
        "models/gemini-2.0-flash-thinking-exp",
        // "models/gemini-2.0-flash-thinking-exp-1219",
        // "models/gemini-2.0-flash-thinking-exp-01-21",
        "models/gemini-2.0-flash",
        // "models/gemini-2.0-flash-001",
        "models/gemini-2.0-flash-exp",
        "models/gemini-2.0-flash-lite",
        // "models/gemini-2.0-flash-lite-001",
        // "models/gemini-2.0-flash-lite-preview",
        // "models/gemini-2.0-flash-lite-preview-02-05",
        "models/gemini-2.5-flash-preview-04-17-thinking",
        "models/gemini-2.5-flash-preview-04-17",
        "models/gemini-2.5-flash-preview-05-20",
        "models/gemini-2.5-flash-lite-preview-06-17",
    ];

    const filter = (m: Model) => true
        && m.name
        && m.supportedActions?.includes("generateContent")
        && !m.name.includes("-tts")
        && !m.description?.toLowerCase().includes("deprecated")
        ;

    const models: IChatModelGoogleAI[] = result.page.filter(filter).map(model => ({
        id: `${account.id}::${model.name}`,
        name: model.name!,
        provider: "googleai",
        account: { id: account.id, name: account.name, remote: true, removable: true },
        displayName: model.displayName,
        description: model.description,
        state: { ready: true },
        features: {
            vision: true,
            // vision: model.vision,
            // tools: model.tools,
            options: {
                temperature: true,
                top_p: true,
                top_k: true,
                integratedWebSearch: true,
            },
        },
        contextLength: model.inputTokenLimit,
        config: {
            hidden: !validModels.includes(model.name!),
        },
        info: model,
    }));

    return models;
}

async function addAccount(accountData: TAddAccount)
{
    const accounts = _store.list();

    const encryptedApiKey = safeStorage.encryptString(accountData.apiKey).toString("hex");

    const existingAccount = accounts.find(s => s.encryptedApiKey === encryptedApiKey);

    if (existingAccount)
    {
        throw new Error("Duplicated API key. Account already exists.");
    }

    const newAccount: IAccount = {
        id: ulid(),
        name: accountData.name,
        type: "googleai",
        encryptedApiKey,
    };

    _store.set(newAccount.id, newAccount);

    const { error } = await tryCatch(async () => _store.getClient(newAccount.id).models.list());

    if (error)
    {
        _store.remove(newAccount.id);

        throw error;
    }
}

function removeAccount(accountData: TRemoveAccount)
{
    _store.remove(accountData.id);
}

export default {
    generateResponse,
    // generateSummary,
    listModels,
    addAccount,
    removeAccount,
};
