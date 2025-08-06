import { IChat, Semaphore, TAddAccount, TAddChatModel, TRemoveAccount, TRemoveChatModel, TSendFunc } from "@janole/ai-core";
import tryCatch from "@janole/try-catch";
import { app, ipcMain, shell } from "electron";
import { existsSync, mkdirSync } from "fs";
import { readFile } from "fs/promises";
import { glob } from "glob";
import { getEncoding } from "js-tiktoken";
import path from "path";
import writeFileAtomic from "write-file-atomic";

import { getDownloadStatus, removeDownload, startDownload, stopDownload } from "./ElectronDownloader";
import GoogleAiProvider from "./provider/GoogleAiProvider";
import LlamaCppProvider from "./provider/LlamaCppProvider";
import OllamaProvider from "./provider/OllamaProvider";
import OpenAiProvider from "./provider/OpenAiProvider";

const abortControllers = new Map<string, AbortController>();

const dataPath = path.join(app.getPath("userData"), "conversations");
const getFileNameForChatId = (chatId: string) => path.join(dataPath, `chat-${chatId}.json`);

if (!existsSync(dataPath))
{
    mkdirSync(dataPath, { recursive: true });
}

let __chats: IChat[] = [];
function loadChats(): Promise<IChat[]>
{
    if (__chats.length) return Promise.resolve(__chats);

    return glob(getFileNameForChatId("*"))
        .then(async files =>
        {
            const chats: IChat[] = [];

            for (const file of files)
            {
                const { result } = await tryCatch<IChat>(readFile(file, "utf8").then(data => JSON.parse(data) as IChat));

                if (result?.id && result.deletedAt !== "deleted")
                {
                    chats.push(result);
                }
            }

            return __chats = chats;
        })
        .catch(_ => __chats);
}

function saveChat(chat: IChat)
{
    return loadChats()
        .then(chats => __chats = [...chats.filter(({ id }) => chat.id != id), chat])
        .then(() => writeFileAtomic(getFileNameForChatId(chat.id), JSON.stringify(chat)))
        .catch(e => { console.error("ERROR", e) });
}

async function loadModels()
{
    const llamaCppModels = await tryCatch(LlamaCppProvider.listModels());
    const ollamaModels = await tryCatch(OllamaProvider.listModels());
    // TODO: should be dynamic because of API key
    const openAiModels = await tryCatch(OpenAiProvider.listModels());
    const googleAiModels = await tryCatch(GoogleAiProvider.listModels());

    return [
        ...llamaCppModels.result ?? [],
        ...ollamaModels.result ?? [],
        ...openAiModels.result ?? [],
        ...googleAiModels.result ?? [],
    ];
}

export function registerAdapter({ send }: { send: TSendFunc })
{
    // TODO: refactor
    const encoding = getEncoding("cl100k_base");

    // Create a semaphore for local and remote providers
    const semaphore = {
        local: new Semaphore(1),
        remote: new Semaphore(4),
    };

    const activeChatRequests = new Set<string>();

    // Create 
    const generateChatResponse = {
        "ollama": OllamaProvider.generateResponse,
        "node-llama-cpp": LlamaCppProvider.generateResponse,
        "openai": OpenAiProvider.generateResponse,
        "googleai": GoogleAiProvider.generateResponse,
    };

    ipcMain.removeHandler("generate-chat-response");
    ipcMain.handle("generate-chat-response", async (_event, chat: IChat, messageIndex: number) =>
    {
        if (activeChatRequests.has(chat.id))
        {
            // Reject duplicate call immediately
            return { error: new Error(`Chat response already generating for chatId: ${chat.id}`) };
        }

        activeChatRequests.add(chat.id);

        const semaphoreKey = chat.model.account.remote ? "remote" : "local";
        await semaphore[semaphoreKey].acquire();

        try 
        {
            const abortController = new AbortController();
            abortControllers.set(chat.id, abortController);
            return await tryCatch(generateChatResponse[chat.model.provider](chat, messageIndex, send, abortController));
        }
        finally
        {
            activeChatRequests.delete(chat.id);
            semaphore[semaphoreKey].release();
        }
    });

    ipcMain.removeHandler("abort-chat");
    ipcMain.handle("abort-chat", (_event, chatId: string) =>
    {
        abortControllers.get(chatId)?.abort();
        // abortControllers.delete(chatId);
    });

    ipcMain.removeHandler("load-chats");
    ipcMain.handle("load-chats", (_event) =>
    {
        return tryCatch(loadChats());
    });

    ipcMain.removeHandler("save-chat");
    ipcMain.handle("save-chat", (_event, chat: IChat) =>
    {
        return tryCatch(saveChat(chat));
    });

    ipcMain.removeHandler("show-chat-file-in-file-manager");
    ipcMain.handle("show-chat-file-in-file-manager", (_event, chatId: string) =>
    {
        shell.showItemInFolder(path.join(dataPath, `chat-${chatId}.json`));
    });

    ipcMain.removeHandler("show-file-in-file-manager");
    ipcMain.handle("show-file-in-file-manager", (_event, file: string) =>
    {
        shell.showItemInFolder(file);
    });

    ipcMain.removeHandler("count-chat-tokens");
    ipcMain.handle("count-chat-tokens", async (_event, chatId: string) =>
    {
        return tryCatch(async () =>
        {
            const chat = await loadChats().then(chats => chats.find(({ id }) => chatId === id));

            const tokens = encoding.encode(chat?.messages?.map(m => m.content).join(" ") ?? "").length;

            return tokens;
        });
    });

    ipcMain.removeHandler("count-tokens");
    ipcMain.handle("count-tokens", (_event, text: string) =>
    {
        return tryCatch(() => encoding.encode(text).length);
    });

    ipcMain.removeHandler("load-chat-models");
    ipcMain.handle("load-chat-models", (_event) =>
    {
        return tryCatch(loadModels());
    });

    ipcMain.removeHandler("add-chat-model");
    ipcMain.handle("add-chat-model", (_event, params: TAddChatModel) =>
    {
        if (params.provider === "node-llama-cpp")
        {
            return tryCatch(LlamaCppProvider.addModel(params, send));
        }

        // if (params.provider === "ollama")
        // {
        //     return tryCatch(OllamaProvider.addModel(params, send));
        // }

        return { error: new Error("Unsupported provider") };
    });

    ipcMain.removeHandler("delete-chat-model");
    ipcMain.handle("delete-chat-model", (_event, params: TRemoveChatModel) =>
    {
        if (params.provider === "node-llama-cpp")
        {
            return tryCatch(LlamaCppProvider.deleteModel(params.modelUri));
        }

        // if (params.provider === "ollama")
        // {
        //     return tryCatch(OllamaProvider.deleteModel(params.modelUri));
        // }

        return { error: new Error("Unsupported provider") };
    });

    ipcMain.removeHandler("download-chat-model");
    ipcMain.handle("download-chat-model", (_event, modelUri: string) =>
    {
        return tryCatch(startDownload(modelUri, send));
    });

    ipcMain.removeHandler("stop-download-chat-model");
    ipcMain.handle("stop-download-chat-model", (_event, modelUri: string) =>
    {
        return tryCatch(stopDownload(modelUri, send));
    });

    ipcMain.removeHandler("remove-download-chat-model");
    ipcMain.handle("remove-download-chat-model", (_event, modelUri: string) =>
    {
        return tryCatch(removeDownload(modelUri, send));
    });

    ipcMain.removeHandler("get-download-status");
    ipcMain.handle("get-download-status", (_event) =>
    {
        return tryCatch(() => getDownloadStatus());
    });

    ipcMain.removeHandler("add-account");
    ipcMain.handle("add-account", (_event, params: TAddAccount) =>
    {
        if (params.provider === "openai")
        {
            return tryCatch(() => OpenAiProvider.addAccount(params));
        }

        if (params.provider === "googleai")
        {
            return tryCatch(() => GoogleAiProvider.addAccount(params));
        }

        return { error: new Error("Unsupported provider") };
    });

    ipcMain.removeHandler("remove-account");
    ipcMain.handle("remove-account", async (_event, params: TRemoveAccount) =>
    {
        if (params.provider === "openai")
        {
            return tryCatch(() => OpenAiProvider.removeAccount(params));
        }

        if (params.provider === "googleai")
        {
            return tryCatch(() => GoogleAiProvider.removeAccount(params));
        }

        return { error: new Error("Unsupported provider") };
    });

    ipcMain.removeHandler("find-in-chats");
    ipcMain.handle("find-in-chats", async (_event, search: string) =>
    {
        function createRegExpFromString(input?: string): RegExp | undefined
        {
            if (!input) return undefined;

            // Define a regex pattern to match special characters
            const specialCharsPattern = /[.*+?^${}()|[\]\\]/g;

            // Escape special characters by adding a backslash before them
            const escapedString = input.replace(specialCharsPattern, "\\$&");

            // Create a RegExp object from the escaped string
            return new RegExp(escapedString, "giu");
        }

        const searchRegExp = createRegExpFromString(search);

        const chats = await loadChats();

        const result: string[] = [];

        for (const chat of chats)
        {
            if (chat && (!searchRegExp || chat.messages.find(m => searchRegExp.test(m.content))))
            {
                result.push(chat.id);
            }
        }

        return { result };
    });

    ipcMain.removeHandler("get-provider-info");
    ipcMain.handle("get-provider-info", async (_event) =>
    {
        const { result: llamaCpp } = await tryCatch(LlamaCppProvider.getProviderInfo());

        return {
            result: {
                llamaCpp,
            }
        };
    });
}
