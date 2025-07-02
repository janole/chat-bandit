import { create, createStore, StateCreator, StoreApi, useStore } from 'zustand';
import { persist } from 'zustand/middleware';
import { shared } from 'use-broadcast-ts';
import { ulid } from 'ulid';
import { IChat, IChatMessage, IChatModel, IChatModelConfig, IChatModelOptions, pluckMessage } from './types';
import { createContext, useContext } from 'react';

export interface IChatStore
{
    chats: { [id: string]: IChat };
    chatsLoaded: boolean;

    models: IChatModel[];
    modelsLoaded: boolean;

    setChats: (chats: IChat[]) => void;
    getChat: (chatId: string) => IChat;
    setChat: (chat: IChat) => void;
    deleteChat: (chatId: string) => void;
    undeleteChat: (chatId: string) => void;
    setChatMessage: (chatId: string, index: number, chatMessage: IChatMessage) => void;
    setChatMessageHistoryIndex: (chatId: string, messageIndex: number, historyIndex: number) => void;
    deleteChatMessage: (chatId: string, messageIndex: number, historyIndex: number) => void;
    stopChat: (chatId: string) => void;
    setChatModel: (chatId: string, model: IChatModel) => void;
    setChatModelOptions: (chatId: string, options: IChatModelOptions) => void;
    toggleShowThinking: (chatId: string, index: number) => void;
    setScrollPos: (chatId: string, scrollPos: number) => void;
    setFavorite: (chatId: string, favorite: boolean) => void;
    setUseSystemPrompt: (chatId: string, useSystemPrompt: boolean) => void;

    getModels: () => IChatModel[];
    setModels: (models: IChatModel[]) => void;

    // chatClient?: IChatClient;
    // setChatClient: (chatClient: IChatClient) => void;
}

const chatStoreCreator: StateCreator<IChatStore> = (set, get) => ({
    chats: {},
    chatsLoaded: false,

    models: [],
    modelsLoaded: false,

    setChats: (chats: IChat[]) => 
    {
        set({ chats: chats.reduce((chats, chat) => (chats[chat.id] = chat, chats), {} as IChatStore["chats"]) });
    },

    getChat: (chatId: string) => 
    {
        return get().chats[chatId];
    },
    setChat: (chat: IChat) =>
    {
        set((state) => ({ chats: { ...state.chats, [chat.id]: { ...chat, updatedAt: Date.now() } } }));
    },
    deleteChat: (chatId: string) => 
    {
        set((state) => 
        {
            const deletedAt: IChat["deletedAt"] = state.chats[chatId]?.deletedAt ? "deleted" : Date.now();
            return { chats: { ...state.chats, [chatId]: { ...state.chats[chatId], deletedAt, updatedAt: Date.now() } } };
        });
    },
    undeleteChat: (chatId: string) => 
    {
        set((state) => 
        {
            if (!state.chats[chatId]?.deletedAt)
            {
                return state;
            }

            return { chats: { ...state.chats, [chatId]: { ...state.chats[chatId], deletedAt: undefined, updatedAt: Date.now() } } };
        });
    },

    setChatMessage: (chatId: string, index: number, chatMessage: IChatMessage) =>
    {
        set(state => ({
            chats: {
                ...state.chats,
                [chatId]: {
                    ...state.chats[chatId],
                    messages: [
                        ...state.chats[chatId].messages.slice(0, index),
                        { ...chatMessage, showThinking: state.chats[chatId].messages[index].showThinking },
                        ...state.chats[chatId].messages.slice(index + 1),
                    ],
                    updatedAt: Date.now(),
                },
            },
        }));
    },

    setChatMessageHistoryIndex: (chatId: string, messageIndex: number, historyIndex: number) =>
    {
        set(state => ({
            chats: {
                ...state.chats,
                [chatId]: {
                    ...state.chats[chatId],
                    messages: [
                        ...state.chats[chatId].messages.slice(0, messageIndex),
                        {
                            // copy message
                            ...state.chats[chatId].messages[messageIndex],
                            historyIndex,
                            // TODO: prevent overflow!
                            ...pluckMessage(state.chats[chatId].messages[messageIndex].history?.[historyIndex]),
                        },
                        ...state.chats[chatId].messages.slice(messageIndex + 1),
                    ],
                    updatedAt: Date.now(),
                },
            },
        }));
    },
    deleteChatMessage: (chatId: string, messageIndex: number, historyIndex: number) =>
    {
        set(state => 
        {
            const message = state.chats[chatId].messages[messageIndex];

            if (message.history?.length < 2 || historyIndex < 0 || historyIndex >= message.history.length)
            {
                return state;
            }

            const history = [
                ...message.history.slice(0, historyIndex),
                ...message.history.slice(historyIndex + 1),
            ];

            const newHistoryIndex = Math.min(history.length - 1, historyIndex);

            return {
                chats: {
                    ...state.chats,
                    [chatId]: {
                        ...state.chats[chatId],
                        messages: [
                            ...state.chats[chatId].messages.slice(0, messageIndex),
                            {
                                ...message,
                                history,
                                historyIndex: newHistoryIndex,
                                // copy history item to message
                                ...pluckMessage(history[newHistoryIndex]),
                            },
                            ...state.chats[chatId].messages.slice(messageIndex + 1),
                        ],
                        updatedAt: Date.now(),
                    }
                }
            };
        });
    },

    stopChat: (chatId: string) =>
    {
        set(state => ({
            chats: {
                ...state.chats,
                [chatId]: {
                    ...state.chats[chatId],
                    state: "done",
                    messages: state.chats[chatId].messages?.map(m => ({ ...m, state: m.state === "working" ? "stopped" : m.state })),
                    updatedAt: Date.now(),
                },
            },
        }));
    },

    setChatModel: (chatId: string, model: IChatModel) =>
    {
        set(state => ({
            chats: {
                ...state.chats,
                [chatId]: {
                    ...state.chats[chatId],
                    model,
                    updatedAt: Date.now(),
                },
            },
        }));
    },
    setChatModelOptions: (chatId: string, options: IChatModelOptions) =>
    {
        set(state => ({
            chats: {
                ...state.chats,
                [chatId]: {
                    ...state.chats[chatId],
                    options,
                    updatedAt: Date.now(),
                },
            },
        }));
    },

    toggleShowThinking: (chatId: string, index: number) =>
    {
        set(state => ({
            chats: {
                ...state.chats,
                [chatId]: {
                    ...state.chats[chatId],
                    messages: [
                        ...state.chats[chatId].messages.slice(0, index),
                        { ...state.chats[chatId].messages[index], showThinking: !state.chats[chatId].messages[index].showThinking },
                        ...state.chats[chatId].messages.slice(index + 1),
                    ],
                    updatedAt: Date.now(),
                },
            },
        }));
    },

    setScrollPos: (chatId: string, scrollPos: number) =>
    {
        set(state => ({
            chats: {
                ...state.chats,
                [chatId]: {
                    ...state.chats[chatId],
                    scrollPos,
                    updatedAt: Date.now(),
                },
            },
        }));
    },

    setFavorite: (chatId: string, favorite: boolean) =>
    {
        set(state => ({
            chats: {
                ...state.chats,
                [chatId]: {
                    ...state.chats[chatId],
                    favorite,
                    updatedAt: Date.now(),
                },
            },
        }));
    },

    setUseSystemPrompt: (chatId: string, useSystemPrompt: boolean) =>
    {
        set(state => ({
            chats: {
                ...state.chats,
                [chatId]: {
                    ...state.chats[chatId],
                    messages: state.chats[chatId].messages[0]?.role !== "system" ? [{ role: "system", content: "", createdAt: Date.now(), history: [], historyIndex: 0 }, ...state.chats[chatId].messages] : state.chats[chatId].messages,
                    useSystemPrompt,
                    updatedAt: Date.now(),
                },
            },
        }));
    },

    getModels: () => 
    {
        return get().models ?? [];
    },
    setModels: (models: IChatModel[]) =>
    {
        set({ models });
    },

    // setChatClient: (chatClient: IChatClient) => 
    // {
    //     set({ chatClient });
    // },
});

export const createChatStore = () => createStore<IChatStore>(chatStoreCreator);

type IChatStoreC = StoreApi<IChatStore>;

export const ChatStoreContext = createContext<IChatStoreC | null>(null);

export const useChatStore = <T,>(selector: (state: IChatStore) => T): T =>
{
    const store = useContext(ChatStoreContext);
    if (!store) throw new Error('ChatStoreContext not found');
    return useStore(store, selector);
};

export function useChatTitle(chatId: string)
{
    const messages = useChatStore(state => state.chats[chatId]?.messages);
    const generatedSummary = useChatStore(state => state.chats[chatId]?.generatedSummary);

    const title = generatedSummary ?? messages.findLast(m => m.role === "user")?.content ?? messages[0]?.content ?? "Untitled";

    return title;
}

export function useAppState(): "init" | "no-models" | "no-chats" | "empty-first-chat" | "ready"
{
    const state = useChatStore(state =>
    {
        if (!state.chatsLoaded || !state.modelsLoaded)
        {
            return "init";
        }

        if (state.models.filter(m => m.state.ready).length === 0)
        {
            return "no-models";
        }

        const chatIds = Object.keys(state.chats).filter(id => state.chats[id].deletedAt !== "deleted");

        if (chatIds.length === 0)
        {
            const chat: IChat =
            {
                id: ulid(),
                model: state.models.find(m => m.state.ready)!, // TODO: refactor
                messages: [],
            };

            state.setChat(chat);

            return "empty-first-chat";
        }

        if (chatIds.length === 1 && !state.chats[chatIds[0]].messages.find(m => m.role === "user"))
        {
            return "empty-first-chat";
        }

        return "ready";
    });

    return state;
}

interface IChatModelConfigStore
{
    defaultId: string | undefined;
    setDefaultId: (defaultId: string | undefined) => void;

    config: Record<string, IChatModelConfig>;
    toggleFavorite: (id: string) => void;
    setHidden: (id: string, hidden: boolean) => void;
    setOptions: (id: string, options: IChatModelOptions) => void;
}

export const useChatModelConfigStore = create<IChatModelConfigStore>()(
    persist(
        shared(
            (set) => ({
                defaultId: undefined,
                setDefaultId: (defaultId: string | undefined) => set({ defaultId }),

                config: {},
                toggleFavorite: (id: string) => set(state => ({ config: { ...state.config, [id]: { ...state.config[id], favorite: !state.config[id]?.favorite } } })),
                setHidden: (id: string, hidden: boolean) => set(state => ({ config: { ...state.config, [id]: { ...state.config[id], hidden } } })),

                setOptions: (id: string, options: IChatModelOptions) =>
                {
                    set(state => ({ config: { ...state.config, [id]: { ...state.config[id], options } } }));
                },
            }),
            {
                name: "model-config",
                // enabled: true,
            }
        ),
        {
            name: "model-config",
            // TODO: fix1
            // storage: createJSONStorage(() => electronStorage),
        }
    )
);

// TODO: refactor ...
export const isModelHidden = (chatModel: IChatModel, config?: IChatModelConfig) => 
{
    return !!(config ? config.hidden : chatModel?.config?.hidden);
};
