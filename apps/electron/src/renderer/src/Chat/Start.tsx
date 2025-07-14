import { useAppState } from "@janole/ai-chat";
import { useChatClient } from "@janole/ai-core";
import { withAppContext } from "@renderer/AppContext";
import { Navigate } from "react-router-dom";

function Start()
{
    useChatClient();

    const appState = useAppState();

    if (appState === "init")
    {
        return null;
    }

    if (appState === "no-models")
    {
        return <Navigate to="/onboarding" replace />;
    }

    return <Navigate to="/chat" replace />;
}

const Component = withAppContext(Start);

export default Component;

export { Component };
