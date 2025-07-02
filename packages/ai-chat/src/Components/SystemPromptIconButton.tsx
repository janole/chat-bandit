import { SplitButton } from '@janole/basic-app';
import { useChatStore } from "@janole/ai-core";
import { SystemPromptIcon } from './Icons';

export default function SystemPromptIconButton(props: { chatId: string })
{
    const { chatId } = props;

    const useSystemPrompt = useChatStore(state => chatId && state.chats[chatId]?.useSystemPrompt);
    const hasSystemPrompt = useChatStore(state => chatId && !!state.chats[chatId]?.messages?.find(m => m.role === "system")?.content?.length);
    const setUseSystemPrompt = useChatStore(state => state.setUseSystemPrompt);

    return (
        <SplitButton
            onClick={() => setUseSystemPrompt(chatId, !useSystemPrompt)}
            size="small"
            color={useSystemPrompt || hasSystemPrompt ? "success" : "neutral"}
            variant={useSystemPrompt ? "contained" : "text"}
        >
            <SystemPromptIcon />
        </SplitButton>
    );
}
