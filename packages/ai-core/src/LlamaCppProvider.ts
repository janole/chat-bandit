import { getLlama, Llama, LlamaChat, LlamaChatSession, LlamaContext, LlamaModel, readGgufFileInfo } from "node-llama-cpp";
import { ulid } from "ulid";
import { stat } from "fs/promises";
import Store from "electron-store";
import tryCatch from "@janole/try-catch";
import { cleanObject, IChat, IChatMessage, IChatModelLlamaCpp, normalizeModelUri, pluckModelInfo, sanitizeMessages, TAddChatModel, TChatState } from "./types";
import { TSendFunc } from "./types-electron";
import { checkDownload, removeDownload, startDownload } from "./ElectronDownloader";
import { llamaFileTypeToString } from "./types-GGUF";
import { getSummaryContent } from "./Summarize";

const _store = (() =>
{
    const llamaCppStore = new Store({ name: "llama-cpp" });

    const key = (modelUri: string) => "models." + btoa(modelUri);

    const get = (modelUri: string) => llamaCppStore.get(key(modelUri)) as (IChatModelLlamaCpp | undefined);
    const set = (modelUri: string, model: IChatModelLlamaCpp) => llamaCppStore.set(key(modelUri), model);
    const has = (modelUri: string) => llamaCppStore.has(key(modelUri));
    const remove = (modelUri: string) => llamaCppStore.delete(key(modelUri));
    const list = () => Object.values(llamaCppStore.get("models") ?? {}) as IChatModelLlamaCpp[];

    return {
        get,
        set,
        has,
        remove,
        list,
    };
})();

const account = { id: ulid(), name: "llama.cpp", remote: false };

const currentModel: {
    llama?: Llama;
    modelPath?: string;
    model?: LlamaModel;
    timestamp?: number;
} = {};

async function loadModel(modelPath: string): Promise<LlamaModel>
{
    if (currentModel.modelPath === modelPath && currentModel.model && currentModel.llama)
    {
        return currentModel.model;
    }

    currentModel.model?.dispose();
    currentModel.model = undefined;

    if (!currentModel.llama)
    {
        currentModel.llama = await getLlama();
    }

    currentModel.model = await currentModel.llama.loadModel({ modelPath });

    if (!currentModel.model)
    {
        throw new Error("Model not found");
    }

    currentModel.modelPath = modelPath;
    currentModel.timestamp = Date.now();

    return currentModel.model;
}

async function generateCompletion(text: string, model: LlamaModel, maxTokens?: number)
{
    const context = await model.createContext({
        contextSize: text.length,
    });

    const session = new LlamaChatSession({
        contextSequence: context.getSequence()
    });

    const response = await session.promptWithMeta(text, {
        maxTokens,
    });

    return Promise.resolve(response.stopReason !== "maxTokens" && response.responseText);
}

async function generateResponse(_chat: IChat, _messageIndex: number, send: TSendFunc, abortController: AbortController)
{
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

    let model: LlamaModel | undefined;
    let context: LlamaContext | undefined;
    let state: TChatState = "done";
    let throttle = Date.now();

    try
    {
        const modelPath = _chat.model.modelFile;

        if (!modelPath)
        {
            throw new Error("Local model file not found");
        }

        model = await loadModel(modelPath);

        context = await model.createContext(cleanObject({
            contextSize: { min: 1024, max: info?.options?.num_ctx || 4096 },
        }));

        const llamaChat = new LlamaChat({
            contextSequence: context.getSequence(),
        });

        const systemPrompt = updatedChat.messages.find(m => m.role === "system")?.content;

        let chatHistory = llamaChat.chatWrapper.generateInitialChatHistory({
            systemPrompt,
        });

        updatedChat.messages.slice(0, messageIndex).filter(sanitizeMessages).forEach(m => 
        {
            if (m.role === "user")
            {
                chatHistory.push({ type: "user", text: m.content });
            }

            if (m.role === "assistant")
            {
                chatHistory.push({ type: "model", response: [m.content] });
            }
        });

        await llamaChat.generateResponse(chatHistory, cleanObject({
            signal: abortController.signal,
            onTextChunk: async (text) =>
            {
                message.content += text;
                message.history[message.history.length - 1].content += text;

                if (Date.now() > throttle + 25)
                {
                    send("chat-message", updatedChat.id, messageIndex, message);
                    throttle = Date.now();
                }
            },
            temperature: info?.options?.temperature,
            topK: info?.options?.top_k,
            topP: info?.options?.top_p,
            minP: info?.options?.min_p,
        }));
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
    finally
    {
        context && await tryCatch(context.dispose());
        context = undefined;
    }

    send("chat-message", updatedChat.id, messageIndex, { ...message, state });
    send("chat-state", updatedChat.id, state);

    // Once the chat generation is complete and no summary has been generated yet,
    // trigger the asynchronous summary generation for the updated chat.    
    state === "done" && !updatedChat.generatedSummary && model && generateSummary(updatedChat, send, model);
}

async function generateSummary(chat: IChat, send: TSendFunc, model: LlamaModel)
{
    const { result: description } = await tryCatch(generateCompletion(
        [
            "Conversation:",
            ...getSummaryContent(chat),
            "Summarize the main point of this conversation in 3-5 words. Only answer with those 3-5 words, for example: 'Managing tasks in Electron.'",
        ].join("\n"),
        model,
        50,
    ));

    description && description.length && send("set-chat-summary", chat.id, description);
}

async function normalizeModel(model: IChatModelLlamaCpp): Promise<IChatModelLlamaCpp>
{
    const normalizedModel: IChatModelLlamaCpp = { ...model, account, provider: "node-llama-cpp" };

    if (normalizedModel.modelUri)
    {
        normalizedModel.modelUri = normalizeModelUri(normalizedModel.modelUri);
    }

    if (normalizedModel.modelFile)
    {
        const { result: stats } = await tryCatch(stat(normalizedModel.modelFile));

        if (!stats)
        {
            normalizedModel.modelFile = undefined;
        }

        normalizedModel.size = stats?.size;
    }

    if (!normalizedModel.modelFile && normalizedModel.modelUri)
    {
        const { result: modelFile } = await tryCatch(checkDownload(normalizedModel.modelUri));

        normalizedModel.modelFile = modelFile;
    }

    if (!normalizedModel.name || !normalizedModel.quantizationLevel || !normalizedModel.info)
    {
        const path = normalizedModel.modelFile ?? normalizedModel.modelUri;

        if (path)
        {
            const { result: info } = await tryCatch(readGgufFileInfo(path, { readTensorInfo: false }));

            // @ts-expect-error
            delete info?.metadata.tokenizer;

            normalizedModel.info = info;

            if (info?.metadata.general.name)
            {
                normalizedModel.name = info.metadata.general.name;
                normalizedModel.contextLength = info.architectureMetadata.context_length;
                normalizedModel.parameterSize = info.metadata.general.size_label;
                normalizedModel.quantizationLevel = llamaFileTypeToString(info.metadata.general.file_type);
            }
        }
    }

    normalizedModel.state = {
        ...normalizedModel.state,
        ready: !!normalizedModel.modelFile,
        downloadable: !!normalizedModel.modelUri,
        removable: true,
        hasLocalModelFile: true,
    };

    normalizedModel.features = {
        options: {
            temperature: true,
            num_ctx: true,
            top_k: true,
            top_p: true,
            min_p: true,
        },
    };

    return normalizedModel;
}

async function addModel(params: TAddChatModel, send: TSendFunc)
{
    const modelUri = normalizeModelUri(params.modelUri);

    if (!modelUri)
    {
        throw new Error("Invalid model URI");
    }

    if (_store.has(modelUri))
    {
        throw new Error("Duplicated model URI");
    }

    const { result: model } = await tryCatch(normalizeModel({
        id: ulid(),
        name: "",
        provider: "node-llama-cpp",
        account,
        modelUri,
        state: {},
    }));

    if (!model?.name?.length)
    {
        throw new Error("Invalid model or no model found");
    }

    // start download immediately to show progress in frontend (TODO: refactor?)
    params.startDownload && startDownload(modelUri, send);

    _store.set(modelUri, model);
}

async function deleteModel(unsafeModelUri: string)
{
    const modelUri = normalizeModelUri(unsafeModelUri);

    if (modelUri)
    {
        _store.remove(modelUri);

        await removeDownload(modelUri);
    }
}

async function listModels()
{
    const savedModels = _store.list();

    const models: IChatModelLlamaCpp[] = [];

    for (const model of savedModels)
    {
        const { result } = await tryCatch(normalizeModel(model));

        if (result?.name?.length)
        {
            models.push(result);
            model.modelUri && _store.set(model.modelUri, result);
        }
    }

    return models;
}

export default {
    generateResponse,
    listModels,
    addModel,
    deleteModel,
};
