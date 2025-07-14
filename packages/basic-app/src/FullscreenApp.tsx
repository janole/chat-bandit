import { CssBaseline } from "@mui/material";

import { AppProps } from "./AppProps";
import { AppThemeProvider, useAppTheme } from "./Helper";

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
