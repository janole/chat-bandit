import { Chat as AiChat, useAppState, useChatRedirect } from "@janole/ai-chat";
import { ThemeOptions } from "@mui/material";
import { withAppContext } from "@renderer/AppContext";
import { useParams } from "react-router-dom";

import { UpdateButton } from "../UpdateButton";

const themeOptions: ThemeOptions = {
    typography: {
        fontFamily: "Roboto",
    },
};

function Chat()
{
    const params = useParams<{ id: string }>();

    useAppState();
    useChatRedirect(params.id);

    return (
        <AiChat
            themeOptions={themeOptions}
            toolbarLeftOffset="80px"
            fixedTernaryDarkMode="system"
            id={params.id}
            rightToolbar={<UpdateButton />}
        />
    );
}

const Component = withAppContext(Chat);

export default Component;

export { Component };