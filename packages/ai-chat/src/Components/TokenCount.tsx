import { useChatClient, useChatStore } from "@janole/ai-core";
import { Typography } from "@mui/material";
import { useEffect, useState } from "react";

interface TokenCountProps
{
    chatId: string;
}

export default function TokenCount(props: TokenCountProps)
{
    const { chatId } = props;

    const text = useChatStore(state => state.chats[chatId].currentPrompt?.content ?? "");
    const model = useChatStore(state => state.chats[chatId]?.model);

    const { countTokens, countChatTokens } = useChatClient();

    const [chatTokens, setChatTokens] = useState(0);
    const [textTokens, setTextTokens] = useState(0);

    useEffect(() =>
    {
        countChatTokens?.(chatId).then(count => count !== undefined && setChatTokens(count));
    }, [
        chatId, // TODO: depend on messages (e.g. the system prompt is edited)
    ]);

    useEffect(() =>
    {
        countTokens?.(text).then(count => count !== undefined && setTextTokens(count));
    }, [
        text,
    ]);

    const percentage = model?.contextLength && (100.0 * (textTokens + chatTokens) / model.contextLength)

    return (
        <Typography component="div" color="text.secondary" typography="subtitle2">
            ~ {textTokens + chatTokens} tokens

            {!!percentage &&
                <Typography
                    component="span"
                    variant={percentage < 100 ? "caption" : "subtitle2"}
                    fontWeight={500}
                    color={percentage < 100 ? "text.disabled" : "error.main"}
                >
                    {" "} ({percentage.toFixed(1)}%)
                </Typography>
            }
        </Typography>
    );
}
