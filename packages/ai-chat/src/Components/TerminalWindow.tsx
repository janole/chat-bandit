import { useChatClient } from "@janole/ai-core";
import { NavBar,SplitButton, useLayoutStore } from "@janole/basic-app";
import { Box, Divider, useTheme } from "@mui/material";
import { Code, Copy, ExternalLink } from "lucide-react";
import { useMemo } from "react";

import { SyntaxHighlighter } from "./SyntaxHighlighter";

const sxCodeMirror = {
    "& .cm-gutters": {
        borderColor: "transparent",
        bgcolor: "inherit",
    },
    "& .cm-foldGutter": {
        visibility: "hidden",
    },
    "& .cm-editor": {
        bgcolor: "inherit",
        border: "unset!important",
        outline: "unset!important",
        fontSize: "caption.fontSize",
    },
    "& .cm-cursor": {
        borderWidth: 2,
        borderColor: "primary.dark",
    },
    "& .cm-activeLine, .cm-activeLineGutter": {
        backgroundColor: "inherit",
        outline: "unset",
    },
};

function flattenText(children: React.ReactNode): string
{
    if (typeof children === "string" || typeof children === "number")
    {
        return children.toString();
    }

    if (Array.isArray(children))
    {
        return children.map(flattenText).join("");
    }

    if (children && typeof children === "object" && "props" in children)
    {
        return flattenText((children as any).props.children);
    }

    return "";
}

interface TerminalWindowProps
{
    children?: React.ReactNode;
}

function TerminalWindow(props: TerminalWindowProps)
{
    /** @ts-error */
    const code = flattenText(props.children).trimEnd();

    /** @ts-ignore */
    const lang = props.children?.props?.className?.replace(/.*language-(\w+).*$/, "$1") ?? "markdown";

    const { openInBrowser } = useChatClient();

    const handleOpenBrowser = useMemo(() => 
    {
        if (openInBrowser && lang.includes("html"))
        {
            return (event: React.MouseEvent<HTMLButtonElement>) => 
            {
                event.stopPropagation();
                event.preventDefault();

                const data = "data:text/html;charset=utf-8," + encodeURIComponent(code);

                openInBrowser(data);
            }
        }

        return undefined;
    }, [
        openInBrowser,
        code,
        lang,
    ]);

    const theme = useTheme();
    const contentTopBarHeight = useLayoutStore(state => state.sizes["contentTopBar"]?.height);

    return (
        <Box
            className="keep-together"
            sx={{
                my: 1,
            }}
        >
            <Box
                className="hover"
                sx={{
                    bgcolor: theme.palette.background.default,
                    position: "sticky",
                    top: contentTopBarHeight,
                    zIndex: 1,
                }}
            >
                <Box
                    sx={{
                        bgcolor: theme.palette.background.default,
                        border: "1px solid",
                        borderColor: theme.palette.divider,
                        borderRadius: 2,
                        borderBottom: "none",
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                        p: 0.5,
                    }}
                >
                    <NavBar
                        sx={{
                            width: "100%",
                            bgcolor: theme.palette.neutralLight.main,
                            color: theme.palette.neutralLight.contrastText,
                            py: 0.5,
                        }}
                    >
                        <Code size={20} />

                        {lang}

                        <Box ml="auto" />

                        {lang.includes("html") && <>
                            <SplitButton
                                variant="text"
                                size="small"
                                onClick={handleOpenBrowser}
                                splitComponent="Open in Browser"
                                hideDivider
                            >
                                <ExternalLink size={20} />
                            </SplitButton>

                            <Divider flexItem orientation="vertical" />
                        </>}

                        <SplitButton
                            variant="text"
                            size="small"
                            onClick={() =>
                            {
                                code?.length && navigator.clipboard.writeText(code);
                            }}
                            splitComponent="Copy"
                            hideDivider
                        >
                            <Copy size={20} />
                        </SplitButton>
                    </NavBar>
                </Box>
            </Box>
            <Box
                sx={{
                    bgcolor: theme.palette.background.default,
                    borderLeft: "1px solid",
                    borderRight: "1px solid",
                    borderColor: theme.palette.divider,
                    px: 0.5,
                    ...sxCodeMirror,
                }}
            >
                <SyntaxHighlighter code={code} lang={lang} mode={theme.palette.mode} />
            </Box>
            <Box
                className="hover"
                sx={{
                    bgcolor: theme.palette.background.default,
                    position: "sticky",
                    top: 0,
                    zIndex: 2,
                }}
            >
                <Box
                    sx={{
                        bgcolor: theme.palette.background.default,
                        border: "1px solid",
                        borderColor: theme.palette.divider,
                        borderRadius: 2,
                        borderTop: "none",
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        pt: 0.5,
                        boxShadow: 1,
                    }}
                />
            </Box>
        </Box>
    );
}

export default TerminalWindow;
