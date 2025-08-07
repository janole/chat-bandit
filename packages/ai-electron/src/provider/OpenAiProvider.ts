import { IAddAccountOpenAI, IAddAccountOpenRouter, IChat, IChatMessage, IChatModel, IChatModelOpenAI, IChatModelOpenRouter, pluckModelInfo, sanitizeMessages, TChatState, TRemoveAccount, TSendFunc } from "@janole/ai-core";
import tryCatch, { tryCatchCache } from "@janole/try-catch";
import { safeStorage } from "electron";
import OpenAI from "openai";
import { ChatCompletionContentPartImage, ChatCompletionMessageParam } from "openai/resources";
import { ChatCompletionCreateParamsStreaming } from "openai/resources/chat/completions";
import { ulid } from "ulid";

import { createAccountStore } from "../utils/Accounts";

interface IAccountOpenAI
{
    id: string;
    name: string;
    type: "openai";
    encryptedApiKey: string;
    baseURL?: string;
}

interface IAccountOpenRouter extends Omit<IAccountOpenAI, "type">
{
    type: "openrouter";
}

type TAccount = IAccountOpenAI | IAccountOpenRouter;

const _store = createAccountStore<TAccount, OpenAI>({
    name: "openai",
    createClient: (account) => 
    {
        return new OpenAI({
            apiKey: safeStorage.decryptString(Buffer.from(account.encryptedApiKey, "hex")),
            baseURL: account.baseURL,
            defaultHeaders: {
                // @ts-ignore
                "HTTP-Referer": import.meta.env?.VITE_APP_HOMEPAGE || "https://chatbandit.de",
                // @ts-ignore
                "X-Title": import.meta.env?.VITE_APP_NAME || "Chat Bandit",
            },
        });
    },
});

function mapChatMessagesToOpenAI(messages: IChatMessage[])
{
    const mapped: ChatCompletionMessageParam[] = messages.filter(sanitizeMessages).map(m => 
    {
        if (m.role === "user")
        {
            const images: ChatCompletionContentPartImage[] = m.images?.map(image => ({ type: "image_url", image_url: { url: image } })) ?? [];

            return {
                role: "user",
                content: [
                    { type: "text", text: m.content },
                    ...images,
                ],
            };
        }

        return { role: m.role, content: m.content };
    });

    return mapped;
}

async function generateResponse(_chat: IChat, _messageIndex: number, send: TSendFunc, abortController: AbortController)
{
    if (_chat.model.provider !== "openai")
    {
        throw new Error("Unsupported provider");
    }

    const model = _chat.model as IChatModelOpenAI;

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
        const payload: ChatCompletionCreateParamsStreaming = {
            model: model.name,
            temperature: info?.options?.temperature,
            top_p: info?.options?.top_p,
            // TODO: refactor
            messages: mapChatMessagesToOpenAI(updatedChat.messages.slice(0, messageIndex).filter(sanitizeMessages)),
            stream: true,
            web_search_options: info?.options?.integratedWebSearch ? {} : undefined,
        };

        const response = await client.chat.completions.create(payload, {
            signal: abortController.signal,
        });

        let throttle = Date.now();

        for await (const part of response)
        {
            if (part.choices[0].delta?.content)
            {
                message.content += part.choices[0].delta?.content;
                message.history[message.history.length - 1].content += part.choices[0].delta?.content;

                if (Date.now() > throttle + 25)
                {
                    send("chat-message", updatedChat.id, messageIndex, message);
                    throttle = Date.now();
                }
            }
        }
    }
    catch (error)
    {
        console.error("ERROR", error);

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

    // Once the chat generation is complete and no summary has been generated yet,
    // trigger the asynchronous summary generation for the updated chat.    
    // state === "done" && !updatedChat.generatedSummary && model && generateSummary(updatedChat, send, model);
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

async function listModels(): Promise<IChatModelOpenAI[]>
{
    const models: IChatModelOpenAI[] = [];

    const accounts = _store.list();

    for (const account of accounts)
    {
        if (account.type === "openai")
        {
            const { result, error } = await tryCatch(addOpenAiAccount(account));

            if (error) { console.log(error); _store.remove(account.id); };
            result && models.push(...result);
        }
        else if (account.type === "openrouter")
        {
            const { result, error } = await tryCatch(addOpenRouterAccount(account));

            if (error) { console.log(error); _store.remove(account.id); };
            result && models.push(...result);
        }
    }

    return models;
}

async function addOpenAiAccount(account: IAccountOpenAI): Promise<IChatModelOpenAI[]>
{
    const models: IChatModelOpenAI[] = [];

    const client = _store.getClient(account.id);

    const { result } = await tryCatchCache(client.models.list(), { key: `${account.id}-list-models`, ttlSeconds: 60 * 60 });

    if (!result?.data)
    {
        return [];
    }

    const remoteModels = result.data.map(m => m.id);

    const openAiModels = [
        { name: "gpt-5", displayName: "GPT-5", vision: true, tools: true, contextLength: 400000 },
        { name: "gpt-5-mini", displayName: "GPT-5 mini", vision: true, tools: true, contextLength: 400000 },
        { name: "gpt-5-nano", displayName: "GPT-5 nano", vision: true, tools: true, contextLength: 400000 },
        { name: "gpt-5-chat-latest", displayName: "GPT-5 Chat", vision: true, tools: true, contextLength: 400000 },
        { name: "gpt-4o-mini", displayName: "GPT-4o mini", vision: true, tools: true, contextLength: 128000, parameterSize: "8B" },
        { name: "gpt-4o", displayName: "GPT-4o", contextLength: 128000 },
        { name: "chatgpt-4o-latest", displayName: "ChatGPT-4o", vision: true, contextLength: 128000 },
        // { name: "gpt-4.5-preview", displayName: "GPT-4.5 Preview", vision: true, contextLength: 128000 },
        { name: "o4-mini", vision: true, tools: true, contextLength: 200000 },
        // { name: "o4-mini-deep-research", vision: true, tools: true, contextLength: 200000, integratedWebSearch: true },
        { name: "o3-pro", vision: true, tools: true, contextLength: 200000 },
        { name: "o3", vision: true, tools: true, contextLength: 200000 },
        // { name: "o3-deep-research", vision: true, tools: true, contextLength: 200000, integratedWebSearch: true },
        { name: "o3-mini", tools: true, contextLength: 200000 },
        { name: "o1-pro", vision: true, tools: true, contextLength: 200000 },
        { name: "o1", vision: true, tools: true, contextLength: 200000 },
        { name: "o1-mini", contextLength: 128000 },
        { name: "gpt-4.1", displayName: "GPT-4.1", vision: true, contextLength: 1047576 },
        { name: "gpt-4.1-mini", displayName: "GPT-4.1 mini", vision: true, contextLength: 1047576 },
        { name: "gpt-4.1-nano", displayName: "GPT-4.1 nano", vision: true, contextLength: 1047576 },
        { name: "gpt-4o-search-preview", displayName: "GPT-4o Web Search (Preview)", contextLength: 128000, integratedWebSearch: true },
        { name: "gpt-4o-mini-search-preview", displayName: "GPT-4o mini Web Search (Preview)", contextLength: 128000, integratedWebSearch: true },
    ];

    for (const model of openAiModels)
    {
        if (!remoteModels.includes(model.name))
        {
            console.warn("OpenAI model not found!", model.name);
            continue;
        }

        models.push({
            id: `${account.id}::${model.name}`,
            name: model.name,
            provider: "openai",
            account: { id: account.id, name: account.name, remote: true, removable: true },
            displayName: model.displayName,
            state: { ready: true },
            features: {
                vision: model.vision,
                tools: model.tools,
                options: {
                    temperature: true,
                    top_p: true,
                    integratedWebSearch: model.integratedWebSearch,
                },
            },
            contextLength: model.contextLength,
            parameterSize: model.parameterSize,
        });
    }

    return models;
}

async function listOpenRouterModels(): Promise<IChatModel[]>
{
    const url = "https://openrouter.ai/api/v1/models";
    const options = { method: "GET" };

    try
    {
        const response = await fetch(url, options);
        const data = await response.json();

        return data.data as IChatModel[];
    }
    catch (error)
    {
        console.error(error);
    }

    return [];
}

async function addOpenRouterAccount(account: IAccountOpenRouter): Promise<IChatModelOpenRouter[]>
{
    const models: IChatModelOpenRouter[] = [];

    _store.getClient(account.id);

    const { result } = await tryCatchCache(listOpenRouterModels(), { key: `${account.id}-list-models`, ttlSeconds: 60 * 60 });

    for (const model of (result ?? []))
    {
        const hidden = (!(model.id.endsWith(":free") || (model["pricing"]?.["prompt"] === "0" && model["pricing"]?.["completion"] === "0")));

        models.push({
            id: `${account.id}::${model.name}`,
            name: model.id,
            provider: "openai",
            account: { id: account.id, name: account.name, remote: true, removable: true },
            displayName: model.name,
            description: model.description,
            state: { ready: true },
            features: {
                tools: model["supported_parameters"]?.includes("tools"),
                vision: model["architecture"]?.input_modalities?.includes("image"),
                options: {
                    temperature: model["supported_parameters"]?.includes("temperature"),
                    top_k: model["supported_parameters"]?.includes("top_k"),
                    top_p: model["supported_parameters"]?.includes("top_p"),
                    min_p: model["supported_parameters"]?.includes("min_p"),
                },
            },
            // @ts-expect-error
            contextLength: model.context_length,
            info: model,
            config: {
                hidden,
            },
        });
    }

    return models;
}

async function addAccount(accountData: IAddAccountOpenAI | IAddAccountOpenRouter)
{
    const accounts = _store.list();

    const encryptedApiKey = safeStorage.encryptString(accountData.apiKey).toString("hex");

    const existingAccount = accounts.find(s => s.encryptedApiKey === encryptedApiKey);

    if (existingAccount)
    {
        throw new Error("Duplicated API key. Account already exists.");
    }

    const baseURL = (accountData.type === "openrouter" && !accountData.baseURL) ? "https://openrouter.ai/api/v1" : accountData.baseURL;

    const newAccount: TAccount = {
        id: ulid(),
        name: accountData.name,
        type: accountData.type,
        encryptedApiKey,
        baseURL,
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
