import { ModelManager as AiModelManager } from "@janole/ai-chat";
import { ThemeOptions } from "@mui/material";
import { withAppContext } from "@renderer/AppContext";

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