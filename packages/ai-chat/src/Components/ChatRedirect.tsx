import { useChatStore } from "@janole/ai-core";
// import { Navigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { decodeTime } from "ulid";

interface ISortBy { id: string; updatedAt?: number; }

const getCreatedAt = (s: ISortBy) => { try { return decodeTime(s.id) || 0 } catch (e) { return 0; } };
const getUpdatedAt = (s: ISortBy) => s.updatedAt || getCreatedAt(s);
const sortByUpdatedAt = (a: ISortBy, b: ISortBy) => getUpdatedAt(a) - getUpdatedAt(b);

export default function ChatRedirect({ chatId }: { chatId?: string })
{
    const redirectId = useChatStore(useShallow(state =>
    {
        if (chatId && state.chats[chatId])
        {
            return undefined;
        }

        // TODO: refactor (deletedAt ...)
        return Object.keys(state.chats).filter(id => state.chats[id].deletedAt !== "deleted").toSorted((a, b) => sortByUpdatedAt(state.chats[b], state.chats[a]))[0];
    }));

    // TODO: fix1
    // return !!redirectId && <Navigate to={`/chat/${redirectId}`} replace={true} />;

    return null;
};
