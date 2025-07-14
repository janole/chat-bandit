import { useChatClient } from "@janole/ai-core";
import { useChatStore } from "@janole/ai-core";
import { useEffect } from "react";
import { decodeTime } from "ulid";
import { useShallow } from "zustand/react/shallow";

interface ISortBy { id: string; updatedAt?: number; }

const getCreatedAt = (s: ISortBy) => 
{
 try { return decodeTime(s.id) || 0 }
 catch (e) { return 0; } 
};
const getUpdatedAt = (s: ISortBy) => s.updatedAt || getCreatedAt(s);
const sortByUpdatedAt = (a: ISortBy, b: ISortBy) => getUpdatedAt(a) - getUpdatedAt(b);

export function useChatRedirect(chatId?: string)
{
    const { setCurrentChat } = useChatClient();

    const redirectId = useChatStore(useShallow(state =>
    {
        if (chatId && state.chats[chatId] && state.chats[chatId].deletedAt !== "deleted")
        {
            return undefined;
        }

        // Get the most recent non-deleted chat
        return Object.keys(state.chats)
            .filter(id => state.chats[id].deletedAt !== "deleted")
            .toSorted((a, b) => sortByUpdatedAt(state.chats[b], state.chats[a]))[0];
    }));

    useEffect(() =>
    {
        redirectId && setCurrentChat?.(redirectId);
    }, [
        redirectId,
        setCurrentChat,
    ]);

    return redirectId || chatId;
}