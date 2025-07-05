import { createContext, useContext } from "react";
import { IChat, TAddAccount, TAddChatModel, TRemoveAccount, TRemoveChatModel } from "./types";

export interface IChatClient
{
    newChat: () => void;
    branchChat: (chat: IChat, messageIndex?: number) => void;

    generateChatResponse: (chat: IChat, messageIndex: number) => void;
    abortChat: (chatId: IChat["id"]) => void;

    //

    setCurrentChat?: (chatId: IChat["id"]) => void;
    // getCurrentChatId?: IChat["id"];

    //

    countChatTokens?: (chatId: IChat["id"]) => Promise<number | undefined>;
    countTokens?: (text: string) => Promise<number | undefined>;

    //

    addAccount?: (params: TAddAccount) => Promise<void>;
    removeAccount?: (params: TRemoveAccount) => Promise<void>;

    //

    addChatModel?: (params: TAddChatModel) => Promise<void>;
    deleteChatModel?: (params: TRemoveChatModel) => Promise<void>;

    downloadChatModel?: (modelUri: string) => Promise<any>;
    stopDownloadChatModel?: (modelUri: string) => Promise<any>;
    removeDownloadChatModel?: (modelUri: string) => Promise<unknown>;

    //

    showFileInFileManager?: (file: string) => Promise<unknown>;
    showChatFileInFileManager?: (chatId: string) => Promise<unknown>;
    openModelManagerWindow?: () => Promise<unknown>;
    openInBrowser?: (url: string) => Promise<unknown>;

    //

    navigate?: (pathname: string) => void;
    location?: { pathname: string; };
}

export const ChatClientContext = createContext<IChatClient | null>(null);

export function useChatClient()
{
    const store = useContext(ChatClientContext);

    if (!store) throw new Error("No ChatStore provided!");

    return store;
}
