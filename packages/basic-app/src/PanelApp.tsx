"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { alpha, Box, BoxProps, CssBaseline, Drawer, IconButton, Theme } from "@mui/material";
import { ImperativePanelGroupHandle, ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Menu as MenuIcon } from "lucide-react";
import { AppThemeProvider, useAppTheme } from "./Helper";
import useResizeWatcher, { useLayoutStore } from "./ResizeWatcher";
import FlexBox from "./Components/FlexBox";
import { AppProps } from "./AppProps";
import { useScrollTracker } from "./ScrollTracker";

const zIndexFab = (theme: Theme) => theme.zIndex.fab;

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

interface ToolbarContainerProps
{
    resizeRef?: RefObject<HTMLDivElement | null>;
    background: string | ((theme: Theme) => string);
}

function ToolbarContainer(props: ToolbarContainerProps)
{
    const { resizeRef, background } = props;

    return (
        <Box
            ref={resizeRef}
            position="absolute"
            top={0}
            left={0}
            right={0}
            minHeight="48px"
            zIndex={zIndexFab}
            bgcolor={background}
        />
    );
}

interface HandleProps
{
    orientation: "left" | "right";
    setDragging?: ((state: boolean) => void) | React.Dispatch<React.SetStateAction<boolean>>;
}

function Handle(props: HandleProps)
{
    const { orientation } = props;

    const borderKey = orientation === "right" ? "borderLeft" : "borderRight";

    const handleDragging = useCallback((isDragging: boolean) =>
    {
        props.setDragging?.(isDragging);
    }, [
        props.setDragging,
    ]);

    return (
        <PanelResizeHandle style={{ position: "relative", width: 0 }} onDragging={handleDragging}>
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "-4px",
                    width: "8px",
                    "&:hover": {
                        [borderKey]: (theme: Theme) => `2px dashed ${theme.palette.text.disabled}`,
                        backgroundImage: `linear-gradient(to ${orientation}, #0001 0%, #0000 100%)`,
                    },
                    zIndex: (theme: Theme) => theme.zIndex.appBar + 1,
                }}
            />
        </PanelResizeHandle>
    );
}

interface CollapsiblePanelProps extends React.ComponentProps<typeof Panel>
{
    visible?: boolean;
    setVisible?: ((state: boolean) => void) | React.Dispatch<React.SetStateAction<boolean>>;
    isDragging?: boolean;
}

function CollapsiblePanel(props: CollapsiblePanelProps)
{
    const { visible, setVisible, style, isDragging, ...panelProps } = props;

    const panelRef = useRef<ImperativePanelHandle>(null);

    const onCollapse = useCallback(() => { setVisible?.(false); }, [setVisible]);
    const onExpand = useCallback(() => { setVisible?.(true); }, [setVisible]);

    useEffect(() =>
    {
        if (panelRef.current?.isExpanded() != visible)
        {
            !!visible && panelRef.current?.expand();
            !visible && panelRef.current?.collapse();
        }
    }, [
        panelRef,
        visible,
    ]);

    return (
        <Panel
            collapsedSize={0}
            {...panelProps}
            ref={panelRef}
            collapsible
            onCollapse={onCollapse}
            onExpand={onExpand}
            style={{
                ...style,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                transition: isDragging ? undefined : "0.25s all",
            }}
        />
    );
}

export default function PanelApp(props: AppProps)
{
    const {
        children,
        contentTop,
        bottomToolbar,
        leftToolbar,
        leftToolbarTop,
        handleLeftToolbarVisibilityChange,
        rightToolbar,
        rightToolbarTop,
        handleRightToolbarVisibilityChange,
        rightDrawer,
        onThemeChange,
        fixedTernaryDarkMode,
        contentScrollId,
    } = props;

    const mainPanelGroupRef = useRef<ImperativePanelGroupHandle>(null);

    const { theme, darkMode } = useAppTheme({ onThemeChange, fixedTernaryDarkMode });

    const [dragging, setDragging] = useState(false);
    const [showRightDrawer, setShowRightDrawer] = useState(false);

    const contentTopBar = useRef<HTMLDivElement>(null);
    const contentContainer = useRef<HTMLDivElement>(null);
    const contentBottomBar = useRef<HTMLDivElement>(null);
    const leftTopBar = useRef<HTMLDivElement>(null);
    const rightTopBar = useRef<HTMLDivElement>(null);
    useResizeWatcher({ refs: { leftTopBar, contentTopBar, contentBottomBar, rightTopBar, contentContainer } });

    const rightTopBarHeight = useLayoutStore(state => state.sizes["rightTopBar"]?.height);

    const [layout, setLayout] = useState<number[]>([]);

    // const layout = useLayoutStore(useShallow(state => state.layout));
    // const setLayout = useLayoutStore(state => state.setLayout);

    const boxShadow = !!leftToolbar || !!rightToolbar;
    const padding = boxShadow;
    const sxContainer = {
        m: padding ? "8px" : undefined,
        height: padding ? "calc(100vh - 16px)" : "100vh",
        boxShadow: boxShadow ? "0 0 4px 0 #0003" : undefined,
        borderRadius: boxShadow ? 2 : undefined,
        transition: "box-shadow 0.5s",
    };

    const { scrollRef: contentScrollContainer } = useScrollTracker({ scrollId: contentScrollId });

    return (
        <AppThemeProvider
            theme={theme}
            darkMode={darkMode}
        >
            <CssBaseline />

            <PanelGroup ref={mainPanelGroupRef} direction="horizontal" style={{ height: "100vh" }} onLayout={setLayout}>

                {/* Left Panel */}
                <CollapsiblePanel
                    id="leftToolbar"
                    order={0}
                    defaultSize={leftToolbar ? 20 : 0}
                    minSize={15}
                    style={{
                        backgroundColor: theme.palette.background.panel,
                        maxWidth: dragging ? undefined : `${layout[0]}vw`,
                        minWidth: dragging ? undefined : `${layout[0]}vw`,
                    }}
                    visible={!!leftToolbar}
                    setVisible={handleLeftToolbarVisibilityChange}
                    isDragging={dragging}
                >
                    <ToolbarContainer
                        resizeRef={leftTopBar}
                        background={alpha(theme.palette.background.panel, 0.9)}
                    />
                    <PaddingH name="leftTopBar" flexShrink={0} />
                    {leftToolbar}
                </CollapsiblePanel>

                {(!!leftToolbar || dragging) &&
                    <Handle orientation="left" setDragging={setDragging} />
                }

                {/* Content */}
                <Panel
                    id="content"
                    order={1}
                    minSize={50}
                    style={{ position: "relative", background: boxShadow ? theme.palette.background.panel : undefined }}
                >
                    <Box
                        ref={contentContainer}
                        sx={{
                            ...sxContainer,
                            position: "relative",
                            background: boxShadow ? theme.palette.background.default : undefined,
                            overflow: "hidden",
                        }}
                    >
                        <Box
                            ref={contentScrollContainer}
                            sx={{
                                height: "100%",
                                overflowY: "auto",
                            }}
                        >
                            <PaddingH name="contentTopBar" />
                            {children}
                            <PaddingH name="contentBottomBar" />
                        </Box>
                        <Box
                            ref={contentBottomBar}
                            sx={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: theme.zIndex.appBar,
                                backgroundImage: bottomToolbar ? `linear-gradient(to bottom, ${alpha(theme.palette.background.default, 0)} 0%, ${alpha(theme.palette.background.default, 0.7)} 40%, ${alpha(theme.palette.background.default, 0.9)} 100%)` : undefined,
                            }}
                        >
                            {bottomToolbar}
                        </Box>
                    </Box>
                </Panel>

                {(!!rightToolbar || dragging) &&
                    <Handle orientation="right" setDragging={setDragging} />
                }

                {/* Right Panel */}
                <CollapsiblePanel
                    id="rightToolbar"
                    order={2}
                    defaultSize={rightToolbar ? 20 : 0}
                    minSize={15}
                    style={{
                        position: "relative",
                        maxWidth: dragging ? undefined : `${layout[2]}vw`,
                        minWidth: dragging ? undefined : `${layout[2]}vw`,
                    }}
                    visible={!!rightToolbar}
                    setVisible={handleRightToolbarVisibilityChange}
                    isDragging={dragging}
                >
                    <ToolbarContainer
                        resizeRef={rightTopBar}
                        background={alpha(theme.palette.background.panel, 0.9)}
                    />
                    <Box
                        sx={{
                            height: "100%",
                            overflowY: "auto",
                            bgcolor: "background.panel",
                            paddingTop: `${rightTopBarHeight}px`,
                        }}
                    >
                        {rightToolbar}
                    </Box>
                </CollapsiblePanel>
            </PanelGroup>

            {/* Top AppBar */}
            <Box
                ref={padding ? undefined : contentTopBar}
                sx={{
                    zIndex: theme.zIndex.appBar,
                    position: "fixed",
                    left: 0, right: 0, top: 0,
                    minHeight: "56px",
                    WebkitUserSelect: "none",
                    WebkitAppRegion: "drag",
                    '& button, & a': {
                        WebkitAppRegion: "no-drag",
                    },
                    backgroundColor: !padding ? theme.palette.background.contentTopBar : undefined,
                }}
            >
                <FlexBox
                    minHeight={padding ? "48px" : "56px"}
                    position="relative"
                    pt={padding ? "8px" : 0}
                >
                    <Box
                        ref={padding ? contentTopBar : undefined}
                        sx={{
                            position: "absolute",
                            left: `${layout[0]}vw`,
                            right: `${layout[2]}vw`,
                            top: 0,
                            bottom: 0,
                            backgroundColor: padding ? theme.palette.background.contentTopBar : undefined,
                            borderRadius: "8px 8px 0px 0px",
                            // backdropFilter: "blur(4px)",
                            mt: 1,
                            mx: 1,
                            zIndex: -1,
                        }}
                    />

                    <FlexBox width="80px" flexShrink={0} />

                    <FlexBox minWidth={`calc(${layout[0]}vw - 80px + 8px)`} flexShrink={0}>
                        {leftToolbarTop}
                    </FlexBox>

                    <FlexBox
                        flexGrow={1}
                        gap={1}
                        height="100%"
                        overflow="hidden"
                    >
                        {contentTop}
                    </FlexBox>

                    <FlexBox
                        minWidth={`calc(${layout[2]}vw + 8px)`}
                        flexShrink={0}
                        gap={1}
                        pr={1.5}
                    >
                        {rightToolbarTop}

                        {!!rightDrawer &&
                            <IconButton size="small" onClick={() => setShowRightDrawer(true)}>
                                <MenuIcon size={22} />
                            </IconButton>
                        }
                    </FlexBox>
                </FlexBox>
            </Box>

            {!!rightDrawer &&
                <Drawer
                    open={showRightDrawer}
                    onClose={() => setShowRightDrawer(false)}
                    anchor={"right"}
                    sx={{
                        WebkitUserSelect: "none",
                        WebkitAppRegion: "no-drag",
                        '& button, & a': {
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
