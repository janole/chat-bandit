"use client";

import { useState } from 'react';
import { Box, Collapse, Divider } from '@mui/material';
import { BugReport, DeleteForever, RestoreFromTrash, StarBorderRounded, StarRounded, Tune } from '@mui/icons-material';
import { List, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { PanelApp, ContentContainer, FlexBox, SplitButton, AppProps } from "@janole/basic-app";
import { useChatStore } from "@janole/ai-core";
import NewButton from './Components/NewButton';
import ChatTitle from './Components/ChatTitle';
import ChatView, { MemoChatSourceView } from './Components/ChatView';
import ChatOptions from './Components/ChatOptions';
import { ChatInputBox } from './Components/ChatInput';
import SystemPromptIconButton from './Components/SystemPromptIconButton';
import { HighlightedSearchWrapper, Navigation, useNavigationStore } from "./Navigation";

interface ChatProps extends AppProps
{
    id?: string;
}

export default function Chat(props: ChatProps): JSX.Element
{
    const { id, ...appProps } = props;

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
            {...appProps}
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

                    {props.rightToolbar}

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
