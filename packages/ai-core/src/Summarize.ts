import { IChat } from "./types";

function ellipsize(text, maxLength)
{
    return (text.length <= maxLength) ? text : text.slice(0, maxLength - 3) + '...';
}

export function getSummaryContent(chat: IChat)
{
    return [...chat.messages.filter(m => m.role === "user").map(m => m.role + ": " + ellipsize(m.content, 1024))];
}
