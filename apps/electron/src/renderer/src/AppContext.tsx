import { IChat } from "@janole/ai-core";
import { FC, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ElectronChatProvider } from "@janole/ai-electron";

export function AppContext(props: { children?: ReactNode })
{
    const navigate = useNavigate();

    const setCurrentChat = useCallback((chatId: IChat["id"]) => navigate(`/chat/${chatId}`), [navigate]);

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
