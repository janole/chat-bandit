import { AppProps, PanelApp } from "@janole/basic-app";

export default function App(props: AppProps)
{
    return (
        <PanelApp
            {...props}
            toolbarLeftOffset="80px"
            fixedTernaryDarkMode="system"
        />
    );
}
