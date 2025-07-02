import { ReactNode, useEffect, useMemo, useRef } from "react";
// import { useLocation, useNavigate, useParams } from "react-router-dom";
import { alpha, Box, Collapse, Divider, IconButton, InputAdornment, ListItemButton, ListItemText, TextField, Theme, Typography } from "@mui/material";
import { Backspace, Chat, Delete, ExpandLess, ExpandMore, MoreHoriz, RestoreFromTrash, Search, SourceOutlined, Star } from "@mui/icons-material";
import { Copy } from "lucide-react";
import { decodeTime } from "ulid";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import Mark from "mark.js";
import { FlexBox, QuickMenu, SplitButton, TagButton, CancelButton, Spacer } from "@janole/basic-app";
import { IChat, useChatStore, useChatClient } from "@janole/ai-core";

const sxHeader = {
    display: "flex",
    alignItems: "center",
    position: "sticky",
    top: 0,
    bgcolor: "background.panel",
    zIndex: 5,
    "& .MuiListItemButton-root": {
        py: 0.25,
        pr: 1.5,
    },
};

interface HeaderProps
{
    title: string;
    expanded?: boolean;
    onSetExpanded?: (expanded: boolean) => void;
}

function Header(props: HeaderProps)
{
    const { title, expanded, onSetExpanded } = props;

    return (
        <Box sx={sxHeader}>
            <ListItemButton
                onClick={onSetExpanded ? () => onSetExpanded(!expanded) : undefined}
            >
                <ListItemText>
                    <Typography variant="subtitle2" color="textPrimary" fontWeight={500}>
                        {title}
                    </Typography>
                </ListItemText>
                {expanded !== undefined &&
                    <FlexBox>
                        <IconButton onClick={() => onSetExpanded?.(!expanded)} sx={{ p: 0 }}>
                            {expanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    </FlexBox>
                }
            </ListItemButton>
        </Box>
    );
}

// Interface for the navigation store
export interface INavigationStore
{
    currentChatId?: IChat["id"];
    setCurrentChatId: (currentChatId: IChat["id"]) => void;

    search: string;
    searchResult: IChat["id"][];
    setSearch: (search: string) => void;
    setSearchResult: (searchResult: IChat["id"][]) => void;

    showTrash: boolean;
    setShowTrash: (showTrash: boolean) => void;

    showFavorites: boolean;
    setShowFavorites: (showFavorites: boolean) => void;

    showChatOptions: boolean;
    setShowChatOptions: (showChatOptions: boolean) => void;
}

// Zustand store for navigation-related state
export const useNavigationStore = create<INavigationStore>()(
    (set) => ({
        setCurrentChatId: (currentChatId: IChat["id"]) => set({ currentChatId }),

        search: "",
        searchResult: [],
        setSearch: (search: string) => set({ search /*, searchRegExp: createRegExpFromString(search) */ }),
        setSearchResult: (searchResult: IChat["id"][]) => set({ searchResult }),

        showTrash: false,
        setShowTrash: (showTrash: boolean) => set({ showTrash, showFavorites: false }),

        showFavorites: false,
        setShowFavorites: (showFavorites: boolean) => set({ showFavorites, showTrash: false }),

        showChatOptions: false,
        setShowChatOptions: (showChatOptions: boolean) => set({ showChatOptions }),
    })
);

// Component to display individual chat items
function ChatListItem(props: { id: string })
{
    const chatId = props.id;

    const chat = useChatStore(state => state.chats[chatId]);

    const { branchChat, abortChat, showChatFileInFileManager, setCurrentChat } = useChatClient();
    const deleteChat = useChatStore(state => state.deleteChat);
    const undeleteChat = useChatStore(state => state.undeleteChat);

    const selected = useNavigationStore(state => state.currentChatId === chatId);
    const hidden = useNavigationStore(state => state.search && !state.searchResult.includes(chatId));

    if (hidden)
    {
        return null;
    }

    const text = chat.generatedSummary || chat.messages.find(m => m.role === "user")?.content || (chat.messages[0]?.content || "New Chat");

    const deleted = !!chat.deletedAt || undefined;

    return (
        <ListItemButton
            onClick={(e: React.MouseEvent<HTMLElement>) => { e.stopPropagation(); e.preventDefault(); setCurrentChat?.(chatId); }}
            sx={{
                py: 0.5,
                pr: 1,
                gap: 0.5,
                "&:hover": {
                    "& .hover": { display: "flex!important" },
                    "& .no-hover": { display: "none!important" },
                    "& .button": { bgcolor: "primary.main", color: "primary.contrastText" },
                },
            }}
        >
            <ListItemText>
                <Typography
                    variant="body2"
                    color={selected ? "primary.main" : "text.primary"}
                    fontWeight={400}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    minWidth={0}
                    noWrap
                >
                    {text.substring(0, 100)}
                </Typography>
            </ListItemText>
            <FlexBox gap={0.5}>
                {chat.state === "working" &&
                    <IconButton onClick={() => abortChat(chat.id)} sx={{ p: 0.5 }}>
                        <CancelButton size="small" />
                    </IconButton>
                }
                <QuickMenu
                    button={
                        <TagButton
                            className="button"
                            label={<>
                                <Box className="no-hover" width="100%" textAlign="center">
                                    {chat.messages.length}
                                </Box>
                                <Box className="hover" sx={{ position: "absolute", display: "none", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                                    <MoreHoriz fontSize="small" />
                                </Box>
                            </>}
                            position="relative"
                            width="32px"
                            color="neutralLight"
                            style={{ marginTop: "-2px", transition: "none!important" }}
                        />
                    }
                    items={[
                        { title: "Duplicate", icon: <Copy />, onClick: () => branchChat(chat) },
                        ...(showChatFileInFileManager ? [
                            { title: "Reveal in Finder", icon: <SourceOutlined />, onClick: () => showChatFileInFileManager(chatId) },
                        ] : []),
                        { type: "divider" },
                        { title: "Restore", icon: <RestoreFromTrash color="success" />, onClick: () => undeleteChat(chatId), hidden: !deleted },
                        { title: "Delete", icon: <Delete color="error" />, onClick: () => deleteChat(chatId) },
                    ]}
                />
            </FlexBox>
        </ListItemButton>
    );
}

// Function to determine the group key for list items based on date
function getGroupKey(time: number): string
{
    const date = new Date(time);

    function isToday(date: Date, offset?: number)
    {
        const referenceDate = new Date();
        referenceDate.setDate(referenceDate.getDate() - (offset || 0));

        return (
            date.getDate() === referenceDate.getDate() &&
            date.getMonth() === referenceDate.getMonth() &&
            date.getFullYear() === referenceDate.getFullYear()
        );
    }

    if (isToday(date))
    {
        return "Today";
    }
    else if (isToday(date, 1))
    {
        return "Yesterday";
    }

    const diff = ((new Date()).getTime() - date.getTime()) / 1000 / 60 / 60 / 24;

    if (diff < 7)
    {
        return "Last week";
    }
    else if (diff < 30)
    {
        return "Last month";
    }

    return date.toLocaleDateString("default", { month: "long" });
}

const sxListGroup = {
    // hide header when there are no children (list items)
    "&:has(.MuiCollapse-wrapperInner:empty)": {
        display: "none",
    },
};

// Component to render a list group with expandable/collapsible items
function ListGroup(props: { group: string, ids: string[], Component: any })
{
    const { group, ids, Component } = props;

    return (
        <Box sx={sxListGroup}>
            <Header title={group} />

            <Collapse in>
                {ids.map(id => (
                    <Component key={id} id={id} />
                ))}
            </Collapse>

            <Spacer height="medium" />
        </Box>
    );
}

// Component to render a sorted and grouped list of items
function ListX(props: { ids: string[], Component: any })
{
    if (!props.ids.length)
    {
        return null;
    }

    // SORT
    const sorted = props.ids.toSorted((a, b) => -a.localeCompare(b));

    const groups: { key: string; ids: string[] }[] = [];

    sorted.forEach(id =>
    {
        const key = getGroupKey(decodeTime(id));

        if (groups.length === 0 || groups[groups.length - 1].key != key)
        {
            groups.push({ key, ids: [] });
        }

        groups[groups.length - 1].ids.push(id);
    });

    return groups.map(group => <ListGroup key={group.key} group={group.key} ids={group.ids} Component={props.Component} />);
}

// Component to render the chat navigation section
export function ChatNavigation()
{
    const chatIds = useChatStore(useShallow(state =>
        Object.keys(state.chats).filter(id => !state.chats[id].deletedAt)
    ));

    const deletedChatIds = useChatStore(useShallow(state =>
        Object.keys(state.chats).filter(id => !!state.chats[id].deletedAt && state.chats[id].deletedAt != "deleted")
    ));

    const favoriteChatIds = useChatStore(useShallow(state =>
        Object.keys(state.chats).filter(id => !!state.chats[id].favorite)
    ));

    const showTrash = useNavigationStore(state => state.showTrash);
    const showFavorites = useNavigationStore(state => state.showFavorites);

    const ids = showTrash ? deletedChatIds : (showFavorites ? favoriteChatIds : chatIds);

    return useMemo(() => <ListX ids={ids} Component={ChatListItem} />, [ids]);
}

function ChatNavigationBottom()
{
    const chatCount = useChatStore(state =>
        Object.keys(state.chats).filter(id => !state.chats[id].deletedAt).length
    );

    const deletedCount = useChatStore(state =>
        Object.keys(state.chats).filter(id => Number(state.chats[id].deletedAt) > 0).length
    );

    const favoriteCount = useChatStore(state =>
        Object.keys(state.chats).filter(id => state.chats[id].favorite).length
    );

    const showTrash = useNavigationStore(state => state.showTrash);
    const setShowTrash = useNavigationStore(state => state.setShowTrash);

    const showFavorites = useNavigationStore(state => state.showFavorites);
    const setShowFavorites = useNavigationStore(state => state.setShowFavorites);

    const showChats = !showTrash && !showFavorites;

    return (
        <FlexBox gap={1}>
            <SplitButton
                hideDivider
                size="small"
                color={showChats ? "primary" : "neutral"}
                variant="text"
                splitComponent={chatCount}
                onClick={() => { setShowTrash(false); setShowFavorites(false); }}
            >
                <Chat fontSize="small" />
            </SplitButton>

            <Box ml="auto" />

            <Divider orientation="vertical" flexItem />

            <SplitButton
                size="small"
                color={showFavorites ? "warning" : "neutral"}
                variant={showFavorites ? "contained" : "text"}
                hideDivider={!showFavorites}
                splitComponent={favoriteCount}
                onClick={() => setShowFavorites(!showFavorites)}
            >
                <Star fontSize="small" />
            </SplitButton>

            <Divider orientation="vertical" flexItem />

            <SplitButton
                size="small"
                color={showTrash ? "error" : "neutral"}
                variant={showTrash ? "contained" : "text"}
                hideDivider={!showTrash}
                splitComponent={deletedCount}
                onClick={() => setShowTrash(!showTrash)}
            >
                <Delete fontSize="small" />
            </SplitButton>
        </FlexBox>
    );
}

// Component to render the search field
function SearchField()
{
    const search = useNavigationStore(state => state.search);
    const setSearch = useNavigationStore(state => state.setSearch);
    const setSearchResult = useNavigationStore(state => state.setSearchResult);

    useEffect(() => 
    {
        if (!search)
        {
            setSearchResult([]);
            return;
        }

        // TODO: fix1
        // window.electron.ipcRenderer.invoke("find-in-chats", search)
        //     .then(({ result }) => 
        //     {
        //         setSearchResult(result);
        //     });
    }, [
        search,
        setSearchResult,
    ]);

    return (
        <TextField
            value={search}
            onChange={e => setSearch(e.currentTarget.value)}
            placeholder="Search"
            fullWidth
            variant="outlined"
            size="small"
            sx={!search?.length ? undefined : {
                "& div.MuiInputBase-root.MuiOutlinedInput-root": (theme: Theme) => ({
                    background: theme.palette.background.default,
                    "& fieldset": {
                        boxShadow: `0 0 4px 0 ${alpha(theme.palette.primary.dark, 0.5)}`,
                        border: `solid 2px ${theme.palette.primary.dark} !important`,
                    },
                }),
            }}
            slotProps={{
                input: {
                    // disableUnderline: true,
                    startAdornment: (
                        <InputAdornment position="start">
                            <Search />
                        </InputAdornment>
                    ),
                    endAdornment: !!search?.length && (
                        <InputAdornment position="end" sx={{ mr: -1 }}>
                            <SplitButton
                                onClick={() => setSearch("")}
                                variant="text"
                                color="neutral"
                            >
                                <Backspace fontSize="small" />
                            </SplitButton>
                        </InputAdornment>
                    )
                }
            }}
        />
    );
}

export function HighlightedSearchWrapper({
    children,
}: {
    children: ReactNode,
})
{
    const search = useNavigationStore(state => state.search);

    return search ? <HighlightedSearch search={search}>{children}</HighlightedSearch> : children;
}

function HighlightedSearch({
    children,
    search,
}: {
    children: ReactNode,
    search: string,
})
{
    // TODO: fix1
    // const params = useParams<{ id: string }>();
    // const chat = useChatStore(state => params.id && state.chats?.[params.id]) || undefined;

    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() =>
    {
        const context = contentRef.current;

        // Ensure context exists and has children before creating Mark instance
        if (!context || context.children.length === 0)
        {
            return; // Nothing to mark yet or ever if div is empty
        }

        const markInstance = new Mark(context);

        markInstance.mark(search);

        return () => markInstance.unmark();
    }, [
        search,
        // chat,
    ]);

    return (
        <Box ref={contentRef}>
            {children}
        </Box>
    );
}

// Main navigation component
export function Navigation()
{
    return (<>
        <Box
            sx={{
                p: 1,
                pr: 0.5,
            }}
        >
            <SearchField />
        </Box>

        <Box
            className="cb-Navigation"
            sx={{
                // TODO: sync with left panel min width
                minWidth: "15vw",
                flexGrow: 1,
                overflowY: "auto",
                pl: 1,
                pb: 1,
                pr: 0.5,
                zIndex: 1,
            }}
        >
            <ChatNavigation />
        </Box>

        <Box
            sx={{
                p: 1,
                boxShadow: "-8px 2px 8px 0 #0002",
                zIndex: 2,
            }}
        >
            <ChatNavigationBottom />
        </Box>
    </>);
}
