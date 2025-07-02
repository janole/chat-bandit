import { ThemeOptions } from "@mui/material";
import { ModelManager as AiModelManager } from "@janole/ai-chat";
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

function ModelManager()
{
    return (
        <AiModelManager
            themeOptions={themeOptions}
            toolbarLeftOffset="80px"
            fixedTernaryDarkMode="system"
        />
    );
}

const Component = withAppContext(ModelManager);

export default Component;

export { Component };