import type { GgufFileInfo } from "node-llama-cpp";
import type { ModelResponse, ShowResponse } from "ollama";
import { ulid } from "ulid";

type TChatModelProvider = "node-llama-cpp" | "ollama" | "openai" | "googleai";

export interface IChatModelFeatures
{
    tools?: boolean;
    vision?: boolean;
    options?: {
        temperature?: boolean;
        num_ctx?: boolean;
        top_k?: boolean;
        top_p?: boolean;
        min_p?: boolean;
        integratedWebSearch?: boolean;
    };
}

interface IChatModelState
{
    ready?: boolean;
    downloadable?: boolean;
    removable?: boolean;
    hasLocalModelFile?: boolean;
}

export interface IChatModelOptions
{
    temperature?: number;
    num_ctx?: number;
    top_k?: number;
    top_p?: number;
    min_p?: number;
    integratedWebSearch?: boolean;
}

export interface IChatModelConfig
{
    favorite?: boolean;
    hidden?: boolean;
    options?: IChatModelOptions;
};

interface IChatModelBase
{
    id: string;
    name: string;
    provider: TChatModelProvider;

    account: { id: string; name: string; remote?: boolean; removable?: boolean; };

    displayName?: string;
    description?: string;

    modelUri?: string;
    modelFile?: string;

    state: IChatModelState;

    contextLength?: number;
    size?: number;
    parameterSize?: string;
    quantizationLevel?: string;
    features?: IChatModelFeatures;

    config?: IChatModelConfig;
}

export interface IChatModelOllama extends IChatModelBase
{
    provider: "ollama";
    details: ModelResponse;
    info: ShowResponse;
}

export interface IChatModelLlamaCpp extends IChatModelBase
{
    provider: "node-llama-cpp";
    info?: GgufFileInfo;
}

export interface IChatModelOpenAI extends IChatModelBase
{
    provider: "openai";
}

export interface IChatModelOpenRouter extends IChatModelOpenAI
{
    info?: any;
}

export interface IChatModelGoogleAI extends IChatModelBase
{
    provider: "googleai";
    info?: any;
}

export type IChatModel =
    | IChatModelOllama
    | IChatModelLlamaCpp
    | IChatModelOpenAI
    | IChatModelOpenRouter
    | IChatModelGoogleAI
    ;

export interface IChatModelInfo
{
    model: Pick<IChatModel, "name" | "provider">;
    options?: IChatModelOptions;
}

export function pluckModelInfo(source?: IChat): IChatModelInfo | undefined
{
    return source?.model.name ? {
        model: { name: source.model.name, provider: source.model.provider },
        options: source.model.config?.options,
    } : undefined;
}

export type TAddChatModel = { provider: TChatModelProvider; modelUri: string; startDownload?: boolean; };

export type TRemoveChatModel = { provider: TChatModelProvider; modelUri: string; };

export interface IAddAccountOpenAI
{
    name: string;
    provider: "openai";
    type: "openai";
    apiKey: string;
    baseURL?: string;
}

export interface IAddAccountOpenRouter extends Omit<IAddAccountOpenAI, "type">
{
    type: "openrouter";
}

interface IAddAccountGoogleAI
{
    name: string;
    provider: "googleai";
    apiKey: string;
}

export type TAddAccount = IAddAccountOpenAI | IAddAccountOpenRouter | IAddAccountGoogleAI;

export interface TRemoveAccount
{
    provider: TChatModelProvider;
    id: string;
}

export type TChatMessageRole = "user" | "system" | "assistant";

interface IChatMessageBase
{
    content: string;
    images?: string[];
    readonly createdAt: number;
    readonly info?: IChatModelInfo;
    showThinking?: boolean;
}

export function pluckMessage(source?: IChatMessageBase): IChatMessageBase
{
    return {
        content: source?.content ?? "",
        images: [...source?.images ?? []],
        createdAt: source?.createdAt ?? Date.now(),
        info: source?.info,
        showThinking: source?.showThinking,
    } as IChatMessageBase;
}

export interface IChatMessage extends IChatMessageBase
{
    role: TChatMessageRole;

    state?: TChatState;

    history: IChatMessageBase[];
    historyIndex: number;
}

export const sanitizeMessages = (m: IChatMessage) => ["user", "system", "assistant"].includes(m.role) && m.content.length > 0;

export type TChatState = "working" | "done" | "stopped";

export interface IChat
{
    id: string;
    sourceId?: string;
    model: IChatModel;
    title?: string;
    generatedSummary?: string;
    messages: IChatMessage[];
    currentPrompt?: { content?: string; images?: string[]; messageIndex?: number; };
    state?: TChatState;
    scrollPos?: number;
    favorite?: boolean;
    useSystemPrompt?: boolean;
    showSettings?: boolean;
    updatedAt?: number;
    deletedAt?: number | "deleted";
}

export function cleanObject(obj: object)
{
    return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== null && value !== undefined));
}

export function normalizeModelUri(modelUri: string)
{
    if (/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(modelUri))
    {
        return modelUri;
    }

    const modelId = "hf:" + modelUri.replace(/^.*?([a-zA-Z-0-9]+\/[^/]+)$/g, "$1");

    return modelId.length > 5 && modelId.includes("/") ? modelId : undefined;
}

export function duplicateChat(chat: IChat, messageIndex?: number): IChat
{
    const copy = structuredClone(chat);

    return ({
        ...copy,
        id: ulid(),
        sourceId: copy.id,
        state: undefined,
        favorite: false,
        updatedAt: undefined,
        deletedAt: undefined,
        // TODO: filter empty / working messages?
        messages: copy.messages.slice(0, messageIndex ? messageIndex + 1 : copy.messages.length).map(m => ({ ...m, state: "done" })),
    }) satisfies IChat;
}