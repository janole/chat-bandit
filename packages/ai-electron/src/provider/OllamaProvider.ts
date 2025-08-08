import { cleanObject, getSummaryContent, IChat, IChatMessage, IChatModel, IChatModelOllama, llamaFileTypeToString, pluckModelInfo, sanitizeMessages, TChatState, TSendFunc } from "@janole/ai-core";
import tryCatch from "@janole/try-catch";
import { Ollama, ShowResponse } from "ollama";

import { createAccountStore } from "../utils/Accounts";

const LOCAL_OLLAMA_ACCOUNT_ID = "local-ollama-11434";

type TAccount = {
    id: string;
    name: string;
    baseURL?: string;
};

const _store = createAccountStore<TAccount, Ollama>({
    name: "ollama",
    createClient: (account) => new Ollama({
        host: account.baseURL ?? "http://localhost:11434",
    }),
});

async function generateCompletion(text: string, model: IChatModel, system?: string)
{
    const client = _store.getClient(model.account.id);

    const result = await client.generate({
        prompt: text,
        model: model.name,
        system,
        options: {
            // temperature: 0.1,
            // num_ctx: text.length,
        },
    });

    return Promise.resolve(result.response);
}

async function generateResponse(_chat: IChat, _messageIndex: number, send: TSendFunc, abortController: AbortController)
{
    const ollama = _store.getClient(_chat.model.account.id);

    const messageIndex = _messageIndex ?? _chat.messages.length;

    const model = typeof _chat.model === "string" ? _chat.model : _chat.model.name;

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
        // toolChain: [],
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

    ////////x
    // const toolDef = {
    //     type: 'function',
    //     function: {
    //         name: 'add',
    //         description: 'Add two numbers',
    //         parameters: {
    //             type: 'object',
    //             properties: {
    //                 a: { type: 'number', description: 'First number' },
    //                 b: { type: 'number', description: 'Second number' }
    //             },
    //             required: ['a', 'b']
    //         }
    //     }
    // };
    ////////x:end

    let state: TChatState = "done";

    try
    {
        const response = await ollama.chat({
            model,
            options: cleanObject({
                num_ctx: info?.options?.num_ctx,
                temperature: info?.options?.temperature,
                top_k: info?.options?.top_k,
                top_p: info?.options?.top_p,
                min_p: info?.options?.min_p,
            }),
            messages: updatedChat.messages.slice(0, messageIndex).filter(sanitizeMessages).map(m => ({
                role: m.role,
                content: m.content,
                // TODO: refactor (see other providers)
                ...(m.images?.length ? { images: m.images.map(image => image.split(",")[1]) } : {}),
            })),
            stream: true,
            // tools: [toolDef],
        });

        const onabort = () => { state = "stopped"; response.abort(); };

        if (abortController.signal.aborted)
        {
            onabort();
        }
        else
        {
            abortController.signal.onabort = onabort;
        }

        let throttle = Date.now();

        for await (const part of response)
        {
            message.content += part.message.content;
            message.history[message.history.length - 1].content += part.message.content;

            if (Date.now() > throttle + 25)
            {
                send("chat-message", updatedChat.id, messageIndex, message);
                throttle = Date.now();
            }
        }
    }
    catch (error)
    {
        console.error("ERROR", error);

        // @ts-ignore
        if (state !== "stopped")
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
    state === "done" && !updatedChat.generatedSummary && generateSummary(updatedChat, send);
}

async function generateSummary(chat: IChat, send: TSendFunc)
{
    const { result: description } = await tryCatch(generateCompletion(
        [
            "Conversation:",
            ...getSummaryContent(chat),
            "Summarize the main point of this conversation in 3-5 words.",
        ].join("\n"),
        chat.model,
    ));

    description && send("set-chat-summary", chat.id, description);
}

async function getModels(account: TAccount)
{
    const models: IChatModelOllama[] = [];

    const { result: ollama } = await tryCatch(() => _store.getClient(account.id));

    if (!ollama)
    {
        return [];
    }

    const { result } = await tryCatch(ollama.list());

    if (!result?.models?.length)
    {
        return [];
    }

    for (const model of result.models)
    {
        const info: ShowResponse & { capabilities?: string[]; } = await ollama.show(model);

        if (info?.capabilities?.includes("embedding") && info?.capabilities?.length === 1)
        {
            continue;
        }

        const generalArchitecture = info.model_info?.["general.architecture"];
        const contextLength = generalArchitecture ? info.model_info?.[`${generalArchitecture}.context_length`] : undefined;

        const fileType = info.model_info?.["general.file_type"];
        const quantizationLevel = fileType ? llamaFileTypeToString(fileType) : model.details.quantization_level;

        const features: IChatModel["features"] = {
            tools: info?.capabilities?.includes("tools") || info?.template.toLocaleLowerCase().includes(".tools"),
            vision: info?.capabilities?.includes("vision") || !!info?.projector_info,
            options: {
                temperature: true,
                num_ctx: true,
                top_k: true,
                top_p: true,
                min_p: true,
            },
        };

        models.push({
            id: `${account.id}::${model.name}`,
            name: model.name,
            modelUri: model.name,
            provider: "ollama",
            account,
            state: { ready: true, /* removable: true */ },
            contextLength,
            size: model.size,
            parameterSize: model.details.parameter_size,
            quantizationLevel,
            details: model,
            features,
            // @ts-expect-error
            info: { ...info, tensors: undefined },
        });
    }

    return models;
}

async function listModels()
{
    const models: IChatModelOllama[] = [];

    if (!_store.has(LOCAL_OLLAMA_ACCOUNT_ID))
    {
        _store.set(LOCAL_OLLAMA_ACCOUNT_ID, {
            id: LOCAL_OLLAMA_ACCOUNT_ID,
            name: "Ollama",
            baseURL: "http://localhost:11434",
        });
    }

    const accounts = _store.list();

    for (const account of accounts)
    {
        const { result } = await tryCatch(getModels(account));

        if (result?.length)
        {
            models.push(...result);
        }
    }

    return models;
}

// async function addModel(params: TAddChatModel, send: TSendFunc)
// {
//     const response = await ollama.pull({ model: params.modelUri, stream: true });

//     for await (const part of response)
//     {
//         console.log(part);
//     }
// }

// async function deleteModel(modelUri: string)
// {
//     if (modelUri)
//     {
//         return ollama.delete({ model: modelUri })
//             .then(s => { console.log("DELETED", s) });
//     }
// }

export default {
    generateResponse,
    listModels,

    // generateCompletion,
    // addModel,
    // deleteModel,
};
