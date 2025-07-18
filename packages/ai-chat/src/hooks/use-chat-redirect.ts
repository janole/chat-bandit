import { useChatClient } from "@janole/ai-core";
import { useChatStore } from "@janole/ai-core";
import { useEffect } from "react";
import { decodeTime } from "ulid";
import { useShallow } from "zustand/react/shallow";

import { useNavigationStore } from "../Navigation";

interface ISortBy { id: string; updatedAt?: number; }

// Safely decodes the timestamp from a ULID, returning 0 on error.
const getCreatedAt = (s: ISortBy) => 
{
    try { return decodeTime(s.id) || 0 }
    catch (e) { return 0; }
};

// Returns the updatedAt timestamp, falling back to the creation time from the ULID.
const getUpdatedAt = (s: ISortBy) => s.updatedAt || getCreatedAt(s);

// Sort comparator to order chats by their last update time.
const sortByUpdatedAt = (a: ISortBy, b: ISortBy) => getUpdatedAt(a) - getUpdatedAt(b);

/**
 * A hook that redirects to a valid chat if the current `chatId` is not visible
 * in the current navigation view (e.g., viewing Trash, Favorites, or the main list).
 * @param chatId The currently active chat ID from the URL.
 * @returns The ID of the chat to be displayed (either the original or the redirect target).
 */
export function useChatRedirect(chatId?: string)
{
    const { setCurrentChat } = useChatClient();

    const showTrash = useNavigationStore(state => state.showTrash);
    const showFavorites = useNavigationStore(state => state.showFavorites);

    const redirectId = useChatStore(useShallow(state =>
    {
        // First, determine if a redirect is necessary. If the current chat is valid
        // for the current view, we don't need to do anything.
        if (chatId && state.chats[chatId] && state.chats[chatId].deletedAt !== "deleted")
        {
            // In "Favorites" view: stay if the chat is a favorite.
            if (showFavorites)
            {
                if (state.chats[chatId].favorite)
                {
                    return undefined; // No redirect needed.
                }
            }
            // In "Trash" view: stay if the chat is marked as deleted.
            else if (showTrash)
            {
                if (!!state.chats[chatId].deletedAt)
                {
                    return undefined; // No redirect needed.
                }
            }
            // In "Normal" view: stay if the chat is not deleted.
            else if (!state.chats[chatId].deletedAt)
            {
                return undefined; // No redirect needed.
            }
        }

        // If the above checks failed, a redirect is required.
        // Now, we find the best candidate for redirection based on the current view.
        let ids;

        if (showTrash)
        {
            // Find all chats that are in the trash.
            ids = Object.keys(state.chats).filter(id => !!state.chats[id].deletedAt && state.chats[id].deletedAt !== "deleted");
        }
        else if (showFavorites)
        {
            // Find all favorite chats that are not deleted.
            ids = Object.keys(state.chats).filter(id => !!state.chats[id].favorite && state.chats[id].deletedAt !== "deleted");
        }
        else
        {
            // Find all non-deleted chats.
            ids = Object.keys(state.chats).filter(id => !state.chats[id].deletedAt);
        }

        // Get the most recently updated chat from the filtered list as the redirect target.
        return ids.toSorted((a, b) => sortByUpdatedAt(state.chats[b], state.chats[a]))[0];
    }));

    // Effect to perform the redirection when a `redirectId` is determined.
    useEffect(() =>
    {
        redirectId && setCurrentChat?.(redirectId);
    }, [
        redirectId,
        setCurrentChat,
    ]);

    // Return the determined ID for immediate use by the UI, if needed.
    return redirectId || chatId;
}
