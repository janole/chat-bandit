import { PanelApp, AppProps } from "./BasicApp";

export default function App(props: AppProps)
{
    return (
        <PanelApp
            {...props}
            fixedTernaryDarkMode="system"
        />
    );
}
