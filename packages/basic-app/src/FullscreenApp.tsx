import { CssBaseline } from "@mui/material";
import { AppThemeProvider, useAppTheme } from "./Helper";
import { AppProps } from "./AppProps";

export default function FullscreenApp(props: AppProps)
{
    const {
        children,
        onThemeChange,
        fixedTernaryDarkMode,
    } = props;

    const { theme, darkMode } = useAppTheme({ onThemeChange, fixedTernaryDarkMode });

    return (
        <AppThemeProvider
            theme={theme}
            darkMode={darkMode}
        >
            <CssBaseline />
            {children}
        </AppThemeProvider>
    );
}
