import { ElectronAPI } from "@electron-toolkit/preload";
import { useNavigationStore } from "@janole/ai-chat";
import { ChatClientContext, ChatStoreContext, createChatStore, duplicateChat, IChat, IChatClient, IChatMessage, IChatModel, TAddAccount, TAddChatModel, TChatState, TDownloadStatus, TDownloadStatusMap, TRemoveAccount, TRemoveChatModel, TReturn, useChatModelConfigStore, useChatStore, useChatTitle, useDownloadStore } from "@janole/ai-core";
import { ReactNode, useCallback, useEffect, useMemo } from "react";
import { ulid } from "ulid";
import { create } from "zustand";

const chatStore = createChatStore();

/** Invokes an Electron IPC channel with the given arguments and returns a promise that resolves to the result. */
function invoke<T>(channel: string, ...args: any[])
{
    return window.electron.ipcRenderer.invoke(channel, ...args).then((response: TReturn<T>) =>
    {
        if (response.error)
        {
            if (response.error instanceof Error)
            {
                throw response.error;
            }
            else
            {
                throw new Error("IPC error", { cause: response.error });
            }
        }

        return response.result;
    });
}

function registerListener(channel: string, callback: (...args: any[]) => void)
{
    window.electron.ipcRenderer.removeAllListeners(channel);
    window.electron.ipcRenderer.on(channel, callback);
}

declare global
{
    interface Window
    {
        electron: ElectronAPI;
    }
}

/** Loads chats from the backend and stores them in the chat store. */
invoke<IChat[]>("load-chats").then(chats =>
{
    // TODO: refactor (deletedAt ...)
    chats && chatStore.setState({ chatsLoaded: true, chats: chats.filter((chat: IChat) => !!chat.id && chat.deletedAt !== "deleted").reduce((chats, chat) => (chats[chat.id] = chat, chats), {} as { [key: string]: IChat }) });
});

/** Loads chat models from the backend and stores them in the chat store. */
const loadChatModels = () => invoke<IChatModel[]>("load-chat-models").then(models =>
{
    chatStore.setState({ modelsLoaded: true, models });
});

/** Initializes loading of chat models and sets up an event listener to reload them when the window gains focus. */
loadChatModels();
window.addEventListener("focus", loadChatModels);
import.meta.hot?.dispose(() => window.removeEventListener("focus", loadChatModels));

/** Loads download status from the backend and sets it in the download store. */
invoke<TDownloadStatusMap>("get-download-status").then(status =>
{
    useDownloadStore.setState({ status });
});

/** Updates a chat in the chat store when an "update-chat" event is received from the backend. */
registerListener("update-chat", (_event, chat: IChat) =>
{
    chatStore.setState(state => ({ chats: { ...state.chats, [chat.id]: chat } }));
});

/** Sets a chat summary in the chat store when a "set-chat-summary" event is received from the backend. */
registerListener("set-chat-summary", (_event, chatId: string, generatedSummary: string) =>
{
    chatStore.setState(state => ({ chats: { ...state.chats, [chatId]: { ...state.chats[chatId], generatedSummary } } }));
});

/** Updates a chat message in the chat store when a "chat-message" event is received from the backend. */
registerListener("chat-message", (_event, chatId: string, index: number, chatMessage: IChatMessage) =>
{
    chatStore.setState(state => ({
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
});

/** Updates the chat state in the chat store when a "chat-state" event is received from the backend. */
registerListener("chat-state", (_event, chatId: string, chatState: TChatState) =>
{
    chatStore.setState(state => ({
        chats: {
            ...state.chats,
            [chatId]: {
                ...state.chats[chatId],
                state: chatState,
                updatedAt: Date.now(),
            },
        },
    }));
});

/** Updates the download status in the download store when a "download-status" event is received from the backend. */
registerListener("download-status", (_event, status: TDownloadStatusMap, state?: TDownloadStatus["state"], _modelUri?: string) =>
{
    useDownloadStore.setState({ status });

    // TODO: refactor, because this is inefficient
    if (state === "downloaded" || state === "paused")
    {
        loadChatModels();
    }
});

/** Simple "sync engine" that periodically saves chats to the backend. */
// TODO: refactor ...
let lastUpdated1 = Date.now();
let lastUpdated2 = Date.now();
let timerId: NodeJS.Timeout | string | number | undefined;
setInterval(() =>
{
    if (Object.values(chatStore.getState().chats).find(chat => chat.updatedAt && chat.updatedAt > lastUpdated1))
    {
        console.log("SET TIMEOUT FOR SAVE");
        clearTimeout(timerId);
        timerId = setTimeout(() =>
        {
            Object.values(chatStore.getState().chats).filter(chat => chat.updatedAt && chat.updatedAt > lastUpdated2).forEach(chat =>
            {
                console.log("SAVE ...", JSON.stringify({ chat }).length);
                invoke("save-chat", chat);
            });
            lastUpdated2 = Date.now();
        }, 5000);
        lastUpdated1 = Date.now();
    }
}, 5000);

/** Generates a chat response for the given chat and message index. */
const generateChatResponse = (chat: IChat, messageIndex: number) =>
{
    const config = useChatModelConfigStore.getState().config[chat.model.id] ?? {};

    invoke("generate-chat-response", { ...chat, model: { ...chat.model, config: { ...chat.model.config, ...config } } }, messageIndex);
}

/** Aborts the current chat with the given ID. */
const abortChat = (chatId: string) => invoke("abort-chat", chatId).finally(() => chatStore.getState().stopChat(chatId));

/** Shows the chat file for the given chat ID in the file manager. */
const showChatFileInFileManager = (chatId: string) => invoke("show-chat-file-in-file-manager", chatId);

/** Adds a new chat model with the given parameters and reloads chat models. */
const addChatModel = (params: TAddChatModel) => invoke("add-chat-model", params).then(() => loadChatModels());

/** Deletes an existing chat model with the given parameters and reloads chat models. */
const deleteChatModel = (params: TRemoveChatModel) => invoke("delete-chat-model", params).then(() => loadChatModels());

/** Downloads a chat model from the given URI and reloads chat models. */
const downloadChatModel = (modelUri: string) => invoke("download-chat-model", modelUri).then(() => loadChatModels());

/** Stops downloading a chat model with the given URI and reloads chat models. */
const stopDownloadChatModel = (modelUri: string) => invoke("stop-download-chat-model", modelUri).then(() => loadChatModels());

/** Removes a downloaded chat model with the given URI and reloads chat models. */
const removeDownloadChatModel = (modelUri: string) => invoke("remove-download-chat-model", modelUri).then(() => loadChatModels());

/** Adds an account with the given parameters and reloads chat models. */
const addAccount = (params: TAddAccount) => invoke("add-account", params).then(() => loadChatModels());

/** Removes an account with the given parameters and reloads chat models. */
const removeAccount = (params: TRemoveAccount) => invoke("remove-account", params).then(() => loadChatModels());

/** Counts the number of tokens in a chat with the given ID. */
const countChatTokens = (chatId: string) => invoke<number>("count-chat-tokens", chatId);

/** Counts the number of tokens in the given text. */
const countTokens = (text: string) => invoke<number>("count-tokens", text);

/** Opens the model manager window. */
const openModelManagerWindow = () => invoke("create-window", "model-manager", "/model/manager", {
    title: `${import.meta.env.VITE_APP_NAME} - Model Manager`,
    width: 1280,
});

/** Shows the file in the file manager. */
const showFileInFileManager = (file: string) => invoke("show-file-in-file-manager", file);

const openInBrowser = (url: string) => invoke("open-browser", "browser", url);
const findInChats = (search: string) => invoke<IChat["id"][]>("find-in-chats", search);

/* export */ function useChatClient(props: UseChatClientProps)
{
    // const setChat = useChatStore(state => state.setChat);

    /** Gets the current download status from the backend and sets it in the download store. */
    const getDownloadStatus = useCallback(() =>
    {
        invoke<TDownloadStatusMap>("get-download-status")
            .then(status =>
            {
                useDownloadStore.setState({ status });
            });
    }, []);

    const { newChat, branchChat } = useNewChat(props);

    return useMemo(() => ({
        // setChat,
        generateChatResponse,
        abortChat,
        showChatFileInFileManager,

        findInChats,

        addChatModel,
        deleteChatModel,
        downloadChatModel,
        stopDownloadChatModel,
        removeDownloadChatModel,
        getDownloadStatus,

        addAccount,
        removeAccount,

        openModelManagerWindow,

        showFileInFileManager,

        openInBrowser,

        newChat,
        branchChat,

        setCurrentChat: props.setCurrentChat,
    }), [
        // setChat,
        getDownloadStatus,
        props.setCurrentChat,
        newChat,
        branchChat,
    ]);
}

export function useCountTokens()
{
    return {
        countChatTokens,
        countTokens,
    };
}

/* export */ function useNewChat(props: { setCurrentChat?: UseChatClientProps["setCurrentChat"] })
{
    const setChat = useChatStore(state => state.setChat);
    const getModels = useChatStore(state => state.getModels);

    const defaultChatModelId = useChatModelConfigStore(state => state.defaultId);

    const clearFilters = useNavigationStore(state => state.clearFilters);

    const addChat = useCallback((chat: IChat) =>
    {
        setChat(chat);
        clearFilters();
        props.setCurrentChat?.(chat.id);
        invoke("focus-main-window");
    }, [
        setChat,
        clearFilters,
        props.setCurrentChat,
    ]);

    const newChat = useCallback(() =>
    {
        const models = getModels();

        addChat({
            id: ulid(),
            model: models.find(model => model.id === defaultChatModelId) ?? models[0],
            // messages: [{ role: "system", content: "I am a helpful assistant.", createdAt: Date.now(), history: [], historyIndex: 0 }],
            messages: [],
        });
    }, [
        addChat,
        getModels,
        defaultChatModelId,
    ]);

    const branchChat = useCallback((chat: IChat, messageIndex?: number) =>
    {
        addChat(duplicateChat(chat, messageIndex));
    }, [
        addChat,
    ]);

    useEffect(() =>
    {
        registerListener("new-chat", newChat);
    }, [
        newChat,
    ]);

    return {
        newChat,
        branchChat,
    };
}

export
{
    useChatModelConfigStore,
    useChatStore,
    useChatTitle,
};

// DEBUG TEST

interface IAppUpdateStore
{
    info: { version?: string, state: "idle" | "downloading" | "update-ready" | "download-failed", progress?: { percent: number; total: number; transferred: number; bytesPerSecond: number; } };
    setInfo(info: IAppUpdateStore["info"]): void;
}

export const useAppUpdateStore = create<IAppUpdateStore>()(
    (set) => ({
        info: { state: "idle" },
        setInfo: (info: IAppUpdateStore["info"]) => set({ info }),
    }),
);

invoke<IAppUpdateStore["info"]>("check-for-update").then(info =>
{
    info && useAppUpdateStore.setState({ info });
});

/** Updates a chat in the chat store when an "update-chat" event is received from the backend. */
registerListener("app-update-info", (_event, info: IAppUpdateStore["info"]) =>
{
    info && useAppUpdateStore.setState({ info });
});

export function downloadUpdate()
{
    invoke("download-update");
}

export function installUpdate()
{
    invoke("restart-and-install-update");
}

interface UseChatClientProps
{
    setCurrentChat?: IChatClient["setCurrentChat"];
}

interface ElectronChatClientProviderProps extends UseChatClientProps
{
    children?: ReactNode;
}

export function ElectronChatStoreProvider(props: { children?: ReactNode })
{
    return (
        <ChatStoreContext.Provider value={chatStore}>
            {props.children}
        </ChatStoreContext.Provider>
    );
}

export function ElectronChatClientProvider(props: ElectronChatClientProviderProps)
{
    const { children, ...useChatClientProps } = props;

    const chatClient = useChatClient(useChatClientProps);

    return (
        <ChatClientContext.Provider value={chatClient}>
            {children}
        </ChatClientContext.Provider>
    );
}

export function ElectronChatProvider(props: ElectronChatClientProviderProps)
{
    return (
        <ElectronChatStoreProvider>
            <ElectronChatClientProvider {...props} />
        </ElectronChatStoreProvider>
    );
}
