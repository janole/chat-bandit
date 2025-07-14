import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { alpha, Avatar, Box, Button, CardMedia, Collapse, Divider, Pagination, Theme, Tooltip } from "@mui/material";
import { AltRouteOutlined, CopyAll, DeleteForever, Edit, FaceRetouchingNatural, Replay } from "@mui/icons-material";
import ReactCodeMirror, { EditorView, placeholder } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { IChatMessage, useChatStore, useChatClient } from "@janole/ai-core";
import { useLayoutStore, SplitButton, NavBar } from "@janole/basic-app";
import { MemoMarkdown } from "./Markdown";
import { SystemPromptIcon } from "./Icons";
import formatBytes from "./FormatBytes";

interface ChatMessageFooterMenuProps
{
    chatId: string;
    messageIndex: number;
}

function ChatMessageFooterMenu(props: ChatMessageFooterMenuProps)
{
    const { chatId, messageIndex } = props;

    // TODO: refactor
    const chatState = useChatStore(state => state.chats[chatId].state);
    const messageState = useChatStore(state => state.chats[chatId].messages[messageIndex].state);
    const messageRole = useChatStore(state => state.chats[chatId].messages[messageIndex].role);
    const historyLength = useChatStore(state => state.chats[chatId].messages[messageIndex].history?.length) ?? 0;
    const historyIndex = useChatStore(state => state.chats[chatId].messages[messageIndex].historyIndex);
    const setChatMessageHistoryIndex = useChatStore(state => state.setChatMessageHistoryIndex);
    const deleteChatMessage = useChatStore(state => state.deleteChatMessage);
    const getChat = useChatStore(state => state.getChat);
    const setChat = useChatStore(state => state.setChat);
    const { generateChatResponse, branchChat } = useChatClient();

    // TODO: performance?
    const model = useChatStore(state => state.chats[chatId].model);

    const replay = () =>
    {
        const chat = getChat(chatId);
        generateChatResponse(chat, chat.messages[messageIndex].role === "user" ? messageIndex + 1 : messageIndex);
    };

    const branch = () =>
    {
        const chat = getChat(chatId);
        branchChat(chat, chat.messages[messageIndex].role === "user" ? messageIndex + 1 : messageIndex);
    };

    const edit = () =>
    {
        const chat = getChat(chatId);

        if (chat?.messages?.[messageIndex])
        {
            const message = chat.messages[messageIndex];
            setChat({ ...chat, currentPrompt: { content: message.content, images: message.images, messageIndex } });
        }
    };

    const handleDelete = () => 
    {
        deleteChatMessage(chatId, messageIndex, historyIndex);
    };

    const handleCopyAll = () =>
    {
        const chat = getChat(chatId);
        navigator.clipboard.writeText(chat.messages[messageIndex].content);
    };

    if (messageState === "working" || !model?.state?.ready)
    {
        return null;
    }

    return (
        <Box
            className="cb-ChatMessageFooterMenu"
            sx={{
                display: "flex",
                gap: 0.5,
                alignItems: "center",
            }}
        >
            {historyLength > 1 && <>
                <Pagination
                    size="small"
                    count={historyLength}
                    page={1 + (historyIndex ?? (historyLength - 1))}
                    onChange={(_, page) =>
                    {
                        setChatMessageHistoryIndex(props.chatId, props.messageIndex, page - 1);
                    }}
                />
                <Button size="small" color="error" startIcon={<DeleteForever />} onClick={handleDelete}>
                    Delete
                </Button>
                <Divider orientation="vertical" variant="middle" flexItem />
            </>}
            {(messageRole === "user" || messageRole === "assistant") && <>
                <Tooltip title={`Replay with ${model.name} / ${model.provider}`}>
                    <Button size="small" startIcon={<Replay />} onClick={replay} disabled={chatState === "working"}>
                        Replay
                    </Button>
                </Tooltip>
                <Divider orientation="vertical" variant="middle" flexItem />
            </>}
            {messageRole === "user" && <>
                <Button size="small" startIcon={<Edit />} onClick={edit} disabled={chatState === "working"}>
                    Edit
                </Button>
                <Divider orientation="vertical" variant="middle" flexItem />
            </>}
            {messageRole === "assistant" && <>
                <Tooltip title={`Duplicate and branch chat from here`}>
                    <Button size="small" startIcon={<AltRouteOutlined />} onClick={branch} disabled={chatState === "working"}>
                        Branch
                    </Button>
                </Tooltip>
                <Divider orientation="vertical" variant="middle" flexItem />
            </>}
            <Button size="small" startIcon={<CopyAll />} onClick={handleCopyAll}>
                Copy
            </Button>
            {/* <Speak text={() => getChat(chatId).messages[props.messageIndex].content} /> */}
        </Box>
    );
}

interface AssistentMessageViewProps
{
    chatId: string;
    messageIndex: number;
    message: IChatMessage;
}

function AssistentMessageView(props: AssistentMessageViewProps)
{
    const { chatId, messageIndex, message } = props;

    const toggleShowThinking = useChatStore(state => state.toggleShowThinking);

    return (
        <MessageViewWrapper chatId={chatId} messageIndex={messageIndex}>
            <Box
                sx={{
                    display: "flex",
                    gap: 1,
                    minHeight: "40px",
                }}
            >
                <Box
                    className="cb-AssistentMessageView-avatar"
                    sx={{
                        position: "relative",
                        flexShrink: 0,
                        width: "40px",
                        color: "transparent",
                    }}
                >
                    <Avatar
                        sx={{
                            width: "32px",
                            height: "32px",
                            boxShadow: 4,
                            border: "1px solid #FFF8",
                            outline: "1px solid #0008",
                            position: "absolute",
                            bgcolor: "secondary.main",
                            top: 0,
                            left: 0,
                            transform: "translateY(12px)",
                        }}
                    >
                        <FaceRetouchingNatural />
                    </Avatar>
                </Box>
                <Box
                    className="cb-AssistentMessageView-message"
                    sx={{
                        flexGrow: message.role !== "user" ? 1 : 0,
                        maxWidth: "calc(100% - 40px)",
                    }}
                >
                    <MemoMarkdown
                        markdown={message.content}
                        inProgress={message.state === "working"}
                        showThinking={message.showThinking}
                        toggleShowThinking={() => toggleShowThinking(chatId, messageIndex)}
                    />
                </Box>
            </Box>
        </MessageViewWrapper>
    );
}

interface UserMessageViewProps
{
    chatId: string;
    messageIndex: number;
    // editingIndex?: number;
    message: IChatMessage;
}

function UserMessageView(props: UserMessageViewProps)
{
    const { chatId, message, messageIndex } = props;

    const textLimit = 400;
    const overLimit = message.content.length > textLimit;
    const text = overLimit ? message.content.slice(0, textLimit * 5) : message.content;

    const setChat = useChatStore(state => state.setChat);
    const getChat = useChatStore(state => state.getChat);

    const { openInBrowser } = useChatClient();

    const edit = () =>
    {
        const chat = getChat(chatId);

        if (chat?.messages?.[messageIndex])
        {
            const message = chat.messages[messageIndex];
            setChat({ ...chat, currentPrompt: { content: message.content, images: message.images, messageIndex } });
        }
    };

    return (
        <MessageViewWrapper chatId={chatId} messageIndex={messageIndex}>
            <Box
                sx={{
                    py: 1,
                    display: "flex",
                    flexDirection: "column",
                    flexWrap: "wrap",
                    gap: 0.5,
                }}
            >
                <Box
                    sx={{
                        minWidth: "200px",
                        maxWidth: "80%",
                        flexShrink: 1,
                        flexGrow: 1,
                        alignSelf: "flex-end",
                        borderRadius: 2,
                        boxShadow: (theme: Theme) => `0 0 2px 2px ${alpha(theme.palette.primary.main, 0.25)}`,
                        outline: (theme: Theme) => `1px dashed ${alpha(theme.palette.primary.main, 0.5)}`,
                        border: (theme: Theme) => `1px solid ${theme.palette.background.default}`,
                        bgcolor: (theme: Theme) => theme.palette.primaryLight.light,
                        zIndex: 2,
                        overflow: "hidden",
                    }}
                >
                    <Box position="relative" width="100%" maxHeight="200px" overflow="hidden" px={2}>
                        <MemoMarkdown markdown={text} />
                        {overLimit &&
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 3,
                                    background: (theme: Theme) => `
                                        linear-gradient(to bottom, ${alpha(theme.palette.primaryLight.light, 0)} 0%, ${alpha(theme.palette.primaryLight.light, 1)} 100%),
                                        linear-gradient(to right, ${alpha(theme.palette.primaryLight.light, 0)} 0%, ${alpha(theme.palette.primaryLight.light, 1)} 50%, ${alpha(theme.palette.primaryLight.light, 0)} 100%)
                                    `,
                                    p: 0.5,
                                    pt: 5,
                                }}
                            >
                                <Tooltip
                                    title="Click to see the full message ..."
                                >
                                    <div>
                                        <SplitButton
                                            size="small"
                                            fullWidth
                                            disableElevation
                                            variant="text"
                                            splitComponent={message.content.length > 2048 ? formatBytes(message.content.length) : undefined}
                                            onClick={edit}
                                        >
                                            Edit
                                        </SplitButton>
                                    </div>
                                </Tooltip>
                            </Box>
                        }
                    </Box>

                    {!!message.images?.length && <>
                        {overLimit &&
                            <Box
                                sx={{
                                    mb: 2,
                                    borderTop: (theme: Theme) => `1px dashed ${alpha(theme.palette.primary.main, 0.5)}`,
                                    borderBottom: (theme: Theme) => `1px solid ${theme.palette.background.default}`,
                                }}
                            />
                        }
                        <Box
                            sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 1,
                                userSelect: "none",
                                px: 2,
                            }}
                        >
                            {message.images?.map((image, index) => (
                                <CardMedia
                                    key={index}
                                    component="img"
                                    src={image}
                                    sx={{
                                        mt: 0,
                                        mb: 2,
                                        width: "200px",
                                        overflow: "hidden",
                                        borderRadius: 1.5,
                                        border: "4px solid #FFF",
                                        boxShadow: 2,
                                        display: "inline-block",
                                    }}
                                    onClick={event => 
                                    {
                                        event.stopPropagation();
                                        event.preventDefault();

                                        const data = "data:text/html;charset=utf-8," + encodeURIComponent(
                                            `<html><body><img width="100%" src="${image}" /></body></html>`
                                        );

                                        openInBrowser?.(data);
                                    }}
                                />
                            ))}
                        </Box>
                    </>}
                </Box>
            </Box>
        </MessageViewWrapper>
    );
}

interface SystemMessageViewProps
{
    chatId: string;
    messageIndex: number;
    message: IChatMessage;
}

function SystemMessageView(props: SystemMessageViewProps)
{
    const { chatId, messageIndex, message } = props;

    const useSystemPrompt = useChatStore(state => state.chats[props.chatId].useSystemPrompt);
    const setChatMessage = useChatStore(state => state.setChatMessage);

    const handleOnChange = useCallback((content: string) =>
    {
        setChatMessage(chatId, messageIndex, { ...message, content });
    }, [
        setChatMessage,
    ]);

    return (<Collapse in={useSystemPrompt}>
        <MessageViewWrapper chatId={chatId} messageIndex={messageIndex}>
            <Box
                className="cb-SystemMessageView"
                sx={{
                    py: 1.75,
                    flexGrow: 1,
                }}
            >
                <Box
                    sx={{
                        p: 0.5,
                        pb: 1.0,
                        borderRadius: 2,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        boxShadow: (theme: Theme) => `0 0 2px 2px ${alpha(theme.palette.success.main, 0.25)}`,
                        outline: (theme: Theme) => `1px dashed ${alpha(theme.palette.success.main, 0.5)}`,
                        border: (theme: Theme) => `1px solid ${theme.palette.background.default}`,
                        bgcolor: "background.default",
                        "& .cm-gutters": {
                            display: "none",
                        },
                        "& .cm-editor": {
                            bgcolor: "inherit",
                            border: "unset!important",
                            outline: "unset!important",
                            fontSize: "body1.fontSize",
                        },
                        "& .cm-cursor": {
                            borderWidth: 2,
                            borderColor: "primary.dark",
                        },
                        "& .cm-activeLine, .cm-activeLineGutter": {
                            backgroundColor: "inherit",
                            outline: "unset",
                        },
                    }}
                >
                    <NavBar
                        sx={{
                            bgcolor: "successLight.main",
                            color: "successLight.contrastText",
                        }}
                    >
                        <SystemPromptIcon />
                        System Prompt
                    </NavBar>

                    <ReactCodeMirror
                        value={message.content ?? ""}
                        autoFocus
                        maxHeight="50vh"
                        onChange={handleOnChange}
                        extensions={[
                            markdown(),
                            EditorView.lineWrapping,
                            placeholder("Please enter a system prompt ..."),
                        ]}
                    />
                </Box>
            </Box>
        </MessageViewWrapper>
    </Collapse>);
}

interface MessageViewProps
{
    chatId: string;
    messageIndex: number;
    // editingIndex?: number;
}

function MessageViewWrapper(props: MessageViewProps & { children?: React.ReactNode })
{
    const { children, chatId, messageIndex } = props;

    return (
        <Box className="cb-MessageViewWrapper container">
            {children}
            <Box className="buttons">
                <Box ml="auto" />
                <ChatMessageFooterMenu chatId={chatId} messageIndex={messageIndex} />
            </Box>
        </Box>
    )
}

export function MessageView(props: MessageViewProps)
{
    const message = useChatStore(state => state.chats[props.chatId].messages[props.messageIndex]);

    if (message.role === "user")
    {
        return <UserMessageView {...props} message={message} />;
    }

    if (message.role === "system")
    {
        return <SystemMessageView {...props} message={message} />;
    }

    if (message.role === "assistant")
    {
        return <AssistentMessageView {...props} message={message} />;
    }

    return null;
}

interface ChatViewProps
{
    chatId: string;
}

const sxLastContainer = {
    "& .container": { px: 2, py: 1, borderRadius: 2 },
    "& .buttons": { display: "flex", alignItems: "center" },
    minHeight: 0,
};

export default function ChatView(props: ChatViewProps)
{
    const { chatId } = props;

    const contentTopBarHeight = useLayoutStore(state => state.sizes["contentTopBar"]?.height);
    const contentContainerHeight = useLayoutStore(state => state.sizes["contentContainer"]?.height);
    const contentBottomBarHeight = useLayoutStore(state => state.sizes["contentBottomBar"]?.height);

    const sxContainer = useMemo(() => ({
        ...sxLastContainer,
        "& .buttons": { visibility: "hidden", opacity: 0, transition: "0.25s opacity", ...sxLastContainer["& .buttons"] },
        "&:hover": {
            "& .buttons": { visibility: "visible", opacity: 1 },
        },
        scrollMarginTop: `${contentTopBarHeight}px`,
    }), [
        contentTopBarHeight,
    ]);

    const styleLastContainer = useMemo(() => ({
        minHeight: `calc(${contentContainerHeight - contentTopBarHeight - contentBottomBarHeight}px - var(--workingUserMessage-height) * 1px)`,
    }), [
        contentContainerHeight,
        contentTopBarHeight,
        contentBottomBarHeight,
    ]);

    const messageCount = useChatStore(state => state.chats[chatId]?.messages.length || 0);
    // const editingIndex = useChatStore(state => state.chats[chatId]?.currentPrompt?.messageIndex);

    const lastMessageWorking = useChatStore(state => state.chats[chatId]?.messages[messageCount - 1]?.state === "working");

    const workingUserMessage = useRef<HTMLDivElement>(null);
    const wasWorkingRef = useRef<boolean>(false);

    // Reset wasWorkingRef when chatId changes
    useEffect(() => 
    {
        wasWorkingRef.current = false;
    }, [
        chatId,
    ]);

    // Scroll to last message when user added new message
    useEffect(() =>
    {
        if (lastMessageWorking)
        {
            wasWorkingRef.current = true;
            document.body.style.setProperty("--workingUserMessage-height", String(workingUserMessage.current?.offsetHeight ?? 0));
            workingUserMessage.current?.scrollIntoView({ block: "start", behavior: "smooth" });
        }
    }, [
        lastMessageWorking,
        wasWorkingRef,
    ]);

    const paddingBottom = wasWorkingRef.current || lastMessageWorking;

    return [...Array(messageCount).keys()].map(index => (
        <Box
            key={chatId + index} // TODO: why is this more performant than key={index} only?
            ref={lastMessageWorking && index === messageCount - 2 ? workingUserMessage : undefined}
            sx={index < messageCount - 1 ? sxContainer : sxLastContainer}
            style={paddingBottom && index === messageCount - 1 ? styleLastContainer : undefined}
        >
            <MessageView
                chatId={chatId}
                messageIndex={index}
            // editingIndex={editingIndex}
            />
        </Box>
    ));
}

export const MemoChatView = memo(ChatView);

interface ChatSourceViewProps
{
    chatId: string;
}

const extensions = [json(), EditorView.lineWrapping];

export function ChatSourceView(props: ChatSourceViewProps)
{
    const { chatId } = props;

    const chat = useChatStore(state => state.chats[chatId]);

    const height = useLayoutStore(state =>
    {
        if (state.sizes["contentContainer"]?.height === undefined || state.sizes["contentTopBar"]?.height === undefined)
        {
            return "100vh";
        }

        return (state.sizes["contentContainer"]?.height - state.sizes["contentTopBar"]?.height) + "px";
    });

    const code = JSON.stringify(chat, null, "  ");

    return (
        <ReactCodeMirror
            height={height}
            theme="dark"
            value={code}
            extensions={extensions}
            readOnly
        />
    );
}

export const MemoChatSourceView = memo(ChatSourceView);
