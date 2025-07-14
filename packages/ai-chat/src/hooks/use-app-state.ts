import { ulid } from "ulid";
import { IChat, useChatStore } from "@janole/ai-core";

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
