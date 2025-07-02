import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { ThemeOptions } from "@mui/material";
import { Chat as AiChat, useChatClient, useChatStore } from "@janole/ai-chat";
import { withAppContext } from "@renderer/AppContext";

import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto/900.css";

const themeOptions: ThemeOptions = {
    typography: {
        fontFamily: "Roboto",
    },
};

function Chat()
{
    const params = useParams<{ id: string }>();

    const { setCurrentChat } = useChatClient();

    const firstId = useChatStore(state => Object.keys(state.chats).sort((a, b) => b.localeCompare(a))[0]);

    useEffect(() => { !params.id && firstId && setCurrentChat?.(firstId); }, [params.id, firstId, setCurrentChat]);

    return (
        <AiChat
            themeOptions={themeOptions}
            toolbarLeftOffset="80px"
            fixedTernaryDarkMode="system"
            id={params.id ?? firstId}
        />
    );
}

const Component = withAppContext(Chat);

export default Component;

export { Component };
