"use client";

import { useRef, useState } from 'react';
import { Avatar, AvatarGroup, Box, Button, Collapse, Divider, IconButton, StyledEngineProvider, TextField, Theme, ThemeOptions, Tooltip, useTheme } from '@mui/material';
import { AddCircleOutline, AddPhotoAlternate, ArrowCircleLeft, BugReport, DeleteForever, RestoreFromTrash, Save, StarBorderRounded, StarRounded, Tune } from '@mui/icons-material';
import { List, PanelLeftClose, PanelRightClose, SquarePen } from 'lucide-react';
import ReactCodeMirror, { EditorView, placeholder } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { IChat } from "@janole/ai-core";
import { PanelApp, ContentContainer, Grid, FlexBox, SplitButton, CancelButton, NavBar } from '@janole/basic-app';
import { useChatStore, useChatClient, useChatTitle } from "@janole/ai-core";
import ChatView, { MemoChatSourceView } from './Components/ChatView';
import ChatOptions from './Components/ChatOptions';
import ChatRedirect from './Components/ChatRedirect';
import { SystemPromptIcon } from './Components/Icons';
import ChatModelSelect from './Components/ChatModelSelect';
import TokenCount from './Components/TokenCount';
// import { UpdateButton } from './Components/UpdateButton';
import { HighlightedSearchWrapper, Navigation, useNavigationStore } from "./Navigation";

function NewButton()
{
    const { newChat } = useChatClient();

    const modelCount = useChatStore(state => state.models.filter(model => model.state.ready).length);

    if (modelCount === 0)
    {
        return null;
    }

    return (
        <SplitButton
            size="small"
            splitComponent={
                <AddCircleOutline fontSize="small" />
            }
            variant="contained"
            onClick={newChat}
        >
            New
        </SplitButton>
    );
}

function ChatTitle(props: { chatId: string, deletedAt?: IChat["deletedAt"] })
{
    const title = useChatTitle(props.chatId);

    return (
        <FlexBox
            gap={1}
            overflow="hidden"
        >
            <Box
                sx={{
                    typography: "subtitle1",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textWrap: "nowrap",
                    minWidth: 0,
                    textDecoration: props.deletedAt ? "line-through" : "none",
                    textDecorationThickness: "2px",
                    color: props.deletedAt ? "error.main" : "text.primary",
                }}
            >
                {title}
            </Box>
        </FlexBox>
    );
}

interface ImageInputProps
{
    chatId: string;
}

function ImageInput(props: ImageInputProps)
{
    const { chatId } = props;

    const images = useChatStore(state => state.chats[chatId]?.currentPrompt?.images) ?? [];

    const getChat = useChatStore(state => state.getChat);
    const setChat = useChatStore(state => state.setChat);

    const setImages = (images: string[]) => 
    {
        const chat = getChat(chatId);
        setChat({ ...chat, currentPrompt: { ...chat.currentPrompt, images } });
    };

    const ref = useRef<HTMLInputElement>(null);

    const maxHeight = "125px", borderRadius = "8px";

    return (
        <Box display="flex">
            <input
                ref={ref}
                style={{ display: 'none' }}
                id="image"
                name="image"
                type="file"
                accept="image/png,image/jpg,image/jpeg"
                value={""}
                onChange={(e: any) =>
                {
                    const file = e.target?.files[0];

                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = function ()
                    {
                        const data = reader.result as string;
                        setImages([...images, data]);
                    };
                    reader.onerror = function (error)
                    {
                        console.error('Error: ', error);
                    };
                }}
            />
            <Box display="flex" alignItems="center" gap={1}>
                <IconButton
                    onClick={() => ref.current?.click()}
                >
                    <AddPhotoAlternate />
                </IconButton>
                <AvatarGroup>
                    {images.map((image, index) => (
                        <Tooltip
                            key={index}
                            title={
                                <Box
                                    sx={{
                                        borderRadius,
                                        overflow: "hidden",
                                    }}
                                >
                                    <Box
                                        key={index}
                                        component="img"
                                        src={image}
                                        style={{
                                            objectFit: "contain",
                                            maxWidth: "200px",
                                            maxHeight,
                                        }}
                                        onClick={() => setImages(images.toSpliced(index, 1))}
                                    />
                                </Box>
                            }
                            arrow
                            disableHoverListener={images.length === 0}
                            slotProps={{
                                tooltip: {
                                    sx: {
                                        m: 2,
                                        p: 0,
                                        borderRadius,
                                        outline: "2px solid #fff",
                                        maxWidth: "unset",
                                        height: maxHeight,
                                        boxShadow: 10,
                                        // opacity: 0.5,
                                    },
                                },
                                arrow: {
                                    sx: {
                                        color: "#fff",
                                    },
                                },
                            }}
                        >
                            <Avatar
                                key={index}
                                src={image}
                                sx={{ width: "1.5rem", height: "1.5rem" }}
                                onClick={() => setImages(images.toSpliced(index, 1))}
                            />
                        </Tooltip>
                    ))}
                </AvatarGroup>
            </Box>
        </Box>
    );
}

interface ChatInputProps
{
    chatId: string;
}

const hasActiveInput = () => document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";

function ChatInput(props: ChatInputProps)
{
    const { chatId } = props;

    const chatState = useChatStore(state => state.chats[chatId]?.state);

    const chatModel = useChatStore(state => state.chats[chatId]?.model);

    const getChat = useChatStore(state => state.getChat);
    const setChat = useChatStore(state => state.setChat);

    const value = useChatStore(state => state.chats[chatId]?.currentPrompt?.content ?? "");
    const setValue = (content: string) => setChat({ ...getChat(chatId), currentPrompt: { ...getChat(chatId).currentPrompt, content } });

    // set, if editing an existing message
    const messageIndex = useChatStore(state => state.chats[chatId]?.currentPrompt?.messageIndex);

    const { generateChatResponse, abortChat } = useChatClient();

    const showChatOptions = useNavigationStore(state => state.showChatOptions);
    const setShowChatOptions = useNavigationStore(state => state.setShowChatOptions);

    // TODO: check for performance ...
    const theme = useTheme();

    const onSubmit = () =>
    {
        if (messageIndex !== undefined)
        {
            return;
        }

        const currentChat = getChat(chatId);

        if (!currentChat || currentChat.state === "working" || !currentChat.currentPrompt?.content?.length)
        {
            return;
        }

        const message = currentChat.currentPrompt.content;
        const images = currentChat.currentPrompt.images ?? [];

        const chat: IChat = {
            ...currentChat,
            messages: [
                ...currentChat.messages,
                {
                    role: "user",
                    content: message,
                    images,
                    createdAt: Date.now(),
                    history: [],
                    historyIndex: 0,
                },
            ],
        };

        setChat(chat);
        // setAutoScroll();

        generateChatResponse(chat, chat.messages.length);

        return true;
    }

    const onSave = () =>
    {
        if (messageIndex === undefined)
        {
            return;
        }

        const currentChat = getChat(chatId);

        if (!currentChat?.currentPrompt?.content?.length)
        {
            return;
        }

        setChat({
            ...currentChat,
            messages: [
                ...currentChat.messages.slice(0, messageIndex),
                {
                    ...currentChat.messages[messageIndex],
                    content: currentChat.currentPrompt.content,
                    images: currentChat.currentPrompt.images ?? [],
                },
                ...currentChat.messages.slice(messageIndex + 1),
            ],
            currentPrompt: { content: "" },
        });
    }

    const onCancel = () =>
    {
        const currentChat = getChat(chatId);

        setChat({ ...currentChat, currentPrompt: { content: "" } });
    }

    const working = chatState === "working";
    const disabled = !chatModel?.state?.ready || !value.length;

    return (
        <Grid container spacing={0}>
            {messageIndex === undefined && <Grid size={12} p={2}>
                <TextField
                    // TODO: refactor possible memory leak
                    inputRef={el => setTimeout(() => !hasActiveInput() && el?.focus(), 100)}
                    value={value}
                    multiline
                    maxRows={10}
                    onChange={event => setValue(event.target.value)}
                    placeholder={working ? "Thinking ..." : "Ask me anything ..."}
                    fullWidth
                    variant="standard"
                    onKeyDown={(e: any) =>
                    {
                        if (e.key === 'Enter')
                        {
                            if (e.altKey || e.shiftKey)
                            {
                                return;
                            }

                            e.preventDefault();
                            !working && !disabled && onSubmit();
                        }
                    }}
                    slotProps={{
                        input: {
                            disableUnderline: true,
                        }
                    }}
                />
            </Grid>}

            {messageIndex !== undefined && <Grid size={12} px={2} pt={2}>
                <NavBar
                    sx={{
                        bgcolor: "neutralLight.main",
                        color: "neutralLight.contrastText",
                        mt: -1,
                        mx: -1,
                        mb: 2,
                    }}
                >
                    <SquarePen />
                    Edit message ...
                </NavBar>

                <Box
                    sx={{
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
                            borderColor: "black.main",
                        },
                        "& .cm-activeLine, .cm-activeLineGutter": {
                            backgroundColor: "inherit",
                            outline: "unset",
                        },
                        // make sure the scrollbar doesn't cover the last line in the editor
                        "& .cm-scroller": {
                            pb: 2,
                        },
                    }}
                >
                    <ReactCodeMirror
                        value={value}
                        theme={theme.palette.mode}
                        autoFocus
                        maxHeight="50vh"
                        onChange={value => setValue(value)}
                        extensions={[markdown(), EditorView.lineWrapping, placeholder("Edit message ...")]}
                    />
                </Box>
            </Grid>}

            <Grid size={12} pl={1} pb={0.5} pr={0.5}>
                <FlexBox gap={2} pl={0.5}>
                    <ChatModelSelect chatId={chatId} />

                    <SplitButton
                        color="neutral"
                        variant={showChatOptions ? "contained" : "text"}
                        onClick={() => setShowChatOptions(!showChatOptions)}
                    >
                        <Tune fontSize="small" />
                    </SplitButton>

                    <FlexBox flexGrow={1} />

                    <TokenCount chatId={chatId} />

                    {chatState !== "working" && chatModel?.features?.vision &&
                        <ImageInput chatId={chatId} />
                    }
                    {chatState === "working" &&
                        <CancelButton onClick={() => abortChat(chatId)} size="large" />
                    }
                    {chatState !== "working" && messageIndex === undefined &&
                        <IconButton onClick={onSubmit} disabled={disabled} color="primary" sx={{ position: "relative" }}>
                            <ArrowCircleLeft fontSize="large" style={{ transform: "rotate(90deg)" }} />
                        </IconButton>
                    }
                    {messageIndex !== undefined && <>
                        <Button
                            color="error"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                        <IconButton onClick={onSave} disabled={disabled} color="primary">
                            <Save fontSize="large" />
                        </IconButton>
                    </>}
                </FlexBox>
            </Grid>
        </Grid>
    );
}

function ChatInputBox(props: { id: string })
{
    return (
        <Box sx={{ p: 2, background: (theme: Theme) => `linear-gradient(to bottom, #0000 0%, ${theme.palette.background.default} 100%)` }}>
            <Box sx={{ mx: -0.5, mt: -0.5, borderRadius: 3, border: (theme: Theme) => `1px solid ${theme.palette.divider}`, overflow: "hidden", boxShadow: 3, backgroundColor: "background.paper" }}>
                <ChatInput chatId={props.id} />
            </Box>
        </Box>
    );
}

function SystemPromptIconButton(props: { chatId: string })
{
    const { chatId } = props;

    const useSystemPrompt = useChatStore(state => chatId && state.chats[chatId]?.useSystemPrompt);
    const hasSystemPrompt = useChatStore(state => chatId && !!state.chats[chatId]?.messages?.find(m => m.role === "system")?.content?.length);
    const setUseSystemPrompt = useChatStore(state => state.setUseSystemPrompt);

    return (
        <SplitButton
            onClick={() => setUseSystemPrompt(chatId, !useSystemPrompt)}
            size="small"
            color={useSystemPrompt || hasSystemPrompt ? "success" : "neutral"}
            variant={useSystemPrompt ? "contained" : "text"}
        >
            <SystemPromptIcon />
        </SplitButton>
    );
}

interface ChatProps
{
    id: string;
    themeOptions?: ThemeOptions;
}

export default function Chat(props: ChatProps): JSX.Element
{
    const { id, themeOptions } = props;

    const [showNavigation, setShowNavigation] = useState(true);

    const showChatOptions = useNavigationStore(state => state.showChatOptions);
    const setShowChatOptions = useNavigationStore(state => state.setShowChatOptions);

    const [viewMode, setViewMode] = useState<"source" | "default">("default");

    const chatId = useChatStore(state => id && state.chats[id]?.id);

    const deletedAt = useChatStore(state => chatId ? state.chats[chatId]?.deletedAt : undefined);

    const favorite = useChatStore(state => chatId && state.chats[chatId]?.favorite);
    const setFavorite = useChatStore(state => state.setFavorite);

    const deleteChat = useChatStore(state => state.deleteChat);
    const undeleteChat = useChatStore(state => state.undeleteChat);

    const newChat = useChatStore(state => !!chatId && !state.chats[chatId]?.messages?.find(m => m.role === "user") && !state.chats[chatId]?.useSystemPrompt);

    return (
        <PanelApp
            themeOptions={themeOptions}
            leftToolbarTop={
                <FlexBox gap={1} flexGrow={1} pr={1.5}>
                    {chatId &&
                        <SplitButton
                            onClick={() => setShowNavigation(!showNavigation)}
                            size="small"
                            color="neutral"
                            variant="text"
                            hideDivider
                        >
                            {showNavigation ? <PanelLeftClose size={22} /> : <List size={22} />}
                        </SplitButton>
                    }
                    <Box ml="auto" />
                    <NewButton />
                </FlexBox>
            }
            // TODO: refactor - handleLeftToolbarVisibilityChange (setShowNavigation) has to be memoized at the moment
            handleLeftToolbarVisibilityChange={setShowNavigation}
            contentTop={!chatId ? undefined :
                <>
                    <FlexBox flexShrink={0} gap={1} ml={1} pr={1}>
                        <SplitButton
                            onClick={() => setFavorite(chatId, !favorite)}
                            size="small"
                            color={favorite ? "warning" : "neutral"}
                            variant="text"
                        >
                            {favorite ? <StarRounded color="warning" /> : <StarBorderRounded />}
                        </SplitButton>

                        <Divider flexItem variant="middle" orientation="vertical" />
                    </FlexBox>

                    <ChatTitle chatId={chatId} deletedAt={deletedAt} />

                    <FlexBox ml="auto" flexShrink={0} gap={1} pl={1}>
                        <Divider flexItem variant="middle" orientation="vertical" />

                        {viewMode !== "source" && <>
                            {!!deletedAt &&
                                <>
                                    <SplitButton size="small" splitComponent="Restore" color="success" disableElevation onClick={() => undeleteChat(chatId)}>
                                        <RestoreFromTrash fontSize="small" />
                                    </SplitButton>
                                    <SplitButton size="small" splitComponent="Delete forever" color="error" disableElevation onClick={() => deleteChat(chatId)}>
                                        <DeleteForever fontSize="small" />
                                    </SplitButton>
                                    <Divider flexItem variant="middle" orientation="vertical" />
                                </>
                            }

                            {chatId && <SystemPromptIconButton chatId={chatId} />}
                        </>}

                        <SplitButton
                            onClick={() => setViewMode(viewMode => viewMode === "default" ? "source" : "default")}
                            size="small"
                            color={viewMode === "source" ? "secondary" : "neutral"}
                            variant={viewMode === "source" ? "contained" : "text"}
                            style={{ marginRight: 5 }}
                            hideDivider
                        >
                            <BugReport />
                        </SplitButton>
                    </FlexBox>
                </>
            }
            rightToolbarTop={
                <FlexBox gap={1} flexGrow={1}>
                    <Box ml="auto" />

                    {/* TODO: fix1 <UpdateButton /> */}

                    {chatId &&
                        <SplitButton
                            onClick={() => setShowChatOptions(!showChatOptions)}
                            size="small"
                            color="neutral"
                            variant="text"
                            hideDivider
                        >
                            {showChatOptions ? <PanelRightClose /> : <Tune />}
                        </SplitButton>
                    }
                </FlexBox>
            }
            // TODO: refactor - handleRightToolbarVisibilityChange (setShowChatOptions) has to be memoized at the moment
            handleRightToolbarVisibilityChange={setShowChatOptions}
            leftToolbar={showNavigation ? <Navigation /> : undefined}
            rightToolbar={chatId && showChatOptions ? <ChatOptions chatId={chatId} /> : undefined}
            bottomToolbar={!!chatId && viewMode !== "source" &&
                <ContentContainer maxWidth={newChat ? "md" : "lg"} px={2} py={0} transition="all 0.4s">
                    <Collapse in={newChat} timeout={0} sx={{ transition: newChat ? "opacity 0.2s" : undefined, opacity: newChat ? 1 : 0 }} unmountOnExit>
                        <FlexBox justifyContent="center" typography="h3" fontWeight={900} color="text.secondary" fontFamily="Instrument Serif" style={{ padding: 16, letterSpacing: "0.5px" }}>
                            How can I help you?
                        </FlexBox>
                        <FlexBox height="2vh" />
                    </Collapse>
                    <ChatInputBox id={chatId} />
                    <FlexBox height={newChat ? "40vh" : 0} animate="height 0.2s" />
                </ContentContainer>
            }
            contentScrollId={chatId}
        >
            <ChatRedirect chatId={deletedAt !== "deleted" ? chatId : undefined} />

            {viewMode === "default" &&
                <ContentContainer maxWidth="lg" px={4}>

                    {chatId &&
                        <HighlightedSearchWrapper>
                            <ChatView chatId={chatId} />
                        </HighlightedSearchWrapper>
                    }

                </ContentContainer>
            }

            {viewMode === "source" && chatId &&
                <MemoChatSourceView chatId={chatId} />
            }
        </PanelApp>
    );
}

export const Component = Chat;
