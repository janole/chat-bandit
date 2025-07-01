import { Navigate } from "react-router-dom";
import { useAppState } from "@libraries/ai/ChatStore";
import { useChatClient } from "@libraries/ai/ElectronClient";
import Chat from "./Chat";

export default function Start()
{
    useChatClient();

    const appState = useAppState();

    if (appState === "init")
    {
        return null;
    }

    if (appState === "no-models")
    {
        return <Navigate to="/onboarding" replace />; // <Onboarding navigateOnClose="/chat" />;
    }

    return <Chat />;
}

export const Component = Start;
