import { useNavigationStore } from "@janole/ai-chat";
import { IChat } from "@janole/ai-core";
import { ElectronChatProvider } from "@janole/ai-electron";
import { FC, ReactNode, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

export function AppContext(props: { children?: ReactNode })
{
    const navigate = useNavigate();
    const params = useParams<{ id: string }>();

    const setCurrentChat = useCallback((chatId: IChat["id"]) => navigate(`/chat/${chatId}`), [navigate]);
    const setCurrentChatId = useNavigationStore(state => state.setCurrentChatId);

    useEffect(() => { params.id && setCurrentChatId(params.id); }, [params.id, setCurrentChatId]);

    return (
        <ElectronChatProvider
            setCurrentChat={setCurrentChat}
        >
            {props.children}
        </ElectronChatProvider>
    );
}

export function withAppContext(Component: FC)
{
    return () => <AppContext><Component /></AppContext>;
}
