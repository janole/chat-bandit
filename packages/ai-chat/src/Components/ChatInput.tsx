import { useRef } from 'react';
import { Avatar, AvatarGroup, Box, Button, IconButton, TextField, Theme, Tooltip, useTheme } from '@mui/material';
import { AddPhotoAlternate, ArrowCircleLeft, FilePresent, Save, Tune } from '@mui/icons-material';
import { SquarePen } from 'lucide-react';
import ReactCodeMirror, { EditorView, placeholder } from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { Grid, FlexBox, SplitButton, CancelButton, NavBar } from '@janole/basic-app';
import { IChat, useChatStore, useChatClient } from "@janole/ai-core";
import { useNavigationStore } from "../Navigation";
import ChatModelSelect from './ChatModelSelect';
import TokenCount from './TokenCount';

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

export function ChatInput(props: ChatInputProps)
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

    const { generateChatResponse, abortChat, addFileContext } = useChatClient();

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
                    inputRef={el => { setTimeout(() => !hasActiveInput() && el?.focus(), 100); }}
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

                    {addFileContext &&
                        <SplitButton
                            color="neutral"
                            variant="text"
                            onClick={() => addFileContext()}
                        >
                            <FilePresent fontSize="small" />
                        </SplitButton>
                    }

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

export function ChatInputBox(props: { id: string })
{
    return (
        <Box sx={{ p: 2, background: (theme: Theme) => `linear-gradient(to bottom, #0000 0%, ${theme.palette.background.default} 100%)` }}>
            <Box sx={{ mx: -0.5, mt: -0.5, borderRadius: 3, border: (theme: Theme) => `1px solid ${theme.palette.divider}`, overflow: "hidden", boxShadow: 3, backgroundColor: "background.paper" }}>
                <ChatInput chatId={props.id} />
            </Box>
        </Box>
    );
}
