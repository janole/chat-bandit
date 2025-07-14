"use client";

import { alpha, Box, BoxProps, CssBaseline, Drawer } from "@mui/material";
import { useRef, useState } from "react";

import { AppProps } from "./AppProps";
import FlexBox from "./Components/FlexBox";
import { AppThemeProvider, useAppTheme } from "./Helper";
import useResizeWatcher, { useLayoutStore } from "./ResizeWatcher";

interface PaddingProps extends BoxProps
{
    name: string;
}

function PaddingH(props: PaddingProps)
{
    const { name, ...boxProps } = props;

    const height = useLayoutStore(state => state.sizes[name]?.height);

    return (
        <Box {...boxProps} height={height} />
    );
}

export default function App(props: AppProps)
{
    const {
        children,
        contentTop,
        bottomToolbar,
        rightDrawer,
        onThemeChange,
        themeOptions,
        fixedTernaryDarkMode,
    } = props;

    const { theme, darkMode } = useAppTheme({ onThemeChange, themeOptions, fixedTernaryDarkMode });

    const [showRightDrawer, setShowRightDrawer] = useState(false);

    const contentTopBar = useRef<HTMLDivElement>(null);
    const contentContainer = useRef<HTMLDivElement>(null);
    const contentBottomBar = useRef<HTMLDivElement>(null);
    useResizeWatcher({ refs: { contentTopBar, contentBottomBar, contentContainer } });

    return (
        <AppThemeProvider
            theme={theme}
            darkMode={darkMode}
        >
            <CssBaseline />

            <PaddingH name="contentTopBar" />
            {children}
            <PaddingH name="contentBottomBar" />

            {/* Top AppBar */}
            <Box
                ref={contentTopBar}
                sx={{
                    zIndex: theme.zIndex.appBar,
                    position: "fixed",
                    left: 0, right: 0, top: 0,
                    minHeight: "56px",
                    WebkitUserSelect: "none",
                    WebkitAppRegion: "drag",
                    "& button, & a": {
                        WebkitAppRegion: "no-drag",
                    },
                    backgroundColor: theme.palette.background.contentTopBar,
                }}
            >
                <FlexBox
                    minHeight="56px"
                    position="relative"
                    pt={0}
                >
                    <FlexBox
                        flexGrow={1}
                        gap={1}
                        height="100%"
                        overflow="hidden"
                    >
                        {contentTop}
                    </FlexBox>
                </FlexBox>
            </Box>

            {!!bottomToolbar &&
                <Box
                    ref={contentBottomBar}
                    sx={{
                        zIndex: theme.zIndex.appBar,
                        position: "fixed",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: bottomToolbar ? `linear-gradient(to bottom, ${alpha(theme.palette.background.default, 0)} 0%, ${alpha(theme.palette.background.default, 0.7)} 40%, ${alpha(theme.palette.background.default, 0.9)} 100%)` : undefined,
                    }}
                >
                    {bottomToolbar}
                </Box>
            }

            {!!rightDrawer &&
                <Drawer
                    open={showRightDrawer}
                    onClose={() => setShowRightDrawer(false)}
                    anchor={"right"}
                    sx={{
                        WebkitUserSelect: "none",
                        WebkitAppRegion: "no-drag",
                        "& button, & a": {
                            WebkitAppRegion: "no-drag",
                        },
                    }}
                >
                    {rightDrawer}
                </Drawer>
            }
        </AppThemeProvider>
    );
}
