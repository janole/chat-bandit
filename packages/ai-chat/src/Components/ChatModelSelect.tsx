import { useState } from "react";
import { alpha, Autocomplete, Box, IconButton, InputAdornment, ListItem, ListItemText, Paper, PaperProps, TextField, Theme, Typography } from "@mui/material";
import { FaceRetouchingNatural } from "@mui/icons-material";
import { useShallow } from "zustand/react/shallow";
import { IChatModel, useChatClient, isModelHidden, useChatModelConfigStore, useChatStore } from "@janole/ai-core";
import { FlexBox } from "@janole/basic-app";
import { ModelLine } from "../ModelManager";

interface ChatModelSelectProps
{
    chatId: string;
}

export default function ChatModelSelect(props: ChatModelSelectProps)
{
    const { chatId } = props;

    const chatModel = useChatStore(state => state.chats[chatId]?.model);

    return (
        <Box position="relative">
            {/* Placeholder for absolute Autocomplete */}
            <Box sx={{ display: "flex", gap: 1, opacity: 0, px: 0.25 }}>
                <InputAdornment position="end"><FaceRetouchingNatural /></InputAdornment>
                <Typography variant="body2">
                    {chatModel?.account?.name || chatModel?.provider}
                </Typography>
                <Typography variant="body2">
                    {chatModel?.displayName ?? chatModel?.name}
                </Typography>
                <InputAdornment position="end"><FaceRetouchingNatural /></InputAdornment>
            </Box>
            <Box
                sx={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    "& div.MuiAutocomplete-root div.MuiOutlinedInput-root": {
                        pl: 0,
                        py: 0.5,
                        borderRadius: 2,
                        fontSize: "body2.fontSize",
                    },
                }}
            >
                <ChatModelAutocomplete {...props} providerPrefix="inline" />
            </Box>
        </Box>
    );
}

export function ChatModelSelectForm(props: ChatModelSelectProps)
{
    return (
        <Box
            sx={{
                "& div.MuiAutocomplete-root div.MuiOutlinedInput-root": {
                    pl: 0,
                    py: 1,
                },
            }}
        >
            <ChatModelAutocomplete {...props} multiline />
        </Box>
    );
}

function ChatModelAutocomplete(props: ChatModelSelectProps & { providerPrefix?: "inline", multiline?: boolean })
{
    const { chatId, multiline, providerPrefix } = props;

    const [focused, setFocused] = useState(false);

    const chatModel = useChatStore(state => state.chats[chatId]?.model);
    const setChatModel = useChatStore(state => state.setChatModel);

    const modelConfig = useChatModelConfigStore(state => state.config);

    const models = useChatStore(useShallow(state => [
        ...state.models.filter(m => !!m.state.ready && !isModelHidden(m, modelConfig[m.id]) && !!modelConfig[m.id]?.favorite),
        ...state.models.filter(m => !!m.state.ready && !isModelHidden(m, modelConfig[m.id]) && !modelConfig[m.id]?.favorite),
    ]));

    const client = useChatClient();

    return (
        <Autocomplete
            renderInput={(params) => (
                <TextField
                    multiline={multiline}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            bgcolor: focused ? "undefined" : "background.panel",
                            "& input": {
                                mt: "-0.5px", // TODO: find better way to align input text with the icon and provider name prefix
                            },
                        },
                    }}
                    onFocus={(e: any) => 
                    {
                        params.inputProps.onFocus?.(e);
                        setFocused(true);
                    }}
                    onBlur={(e: any) => 
                    {
                        params.inputProps.onBlur?.(e);
                        setFocused(false);
                    }}
                    variant="outlined"
                    {...params}
                    size="small"
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: providerPrefix === "inline" ? (
                            <InputAdornment position="end">
                                <FlexBox gap={1}>
                                    <IconButton
                                        size="small"
                                        sx={{ p: 0, "&:hover": { color: "primary.main" } }}
                                        onClick={(e) => 
                                        {
                                            e.stopPropagation();

                                            client.openModelManagerWindow?.();
                                        }}
                                    >
                                        <FaceRetouchingNatural color="inherit" />
                                    </IconButton>

                                    {!focused &&
                                        <Box>
                                            {chatModel?.account?.name || chatModel?.provider}
                                        </Box>
                                    }
                                </FlexBox>
                            </InputAdornment>
                        ) : undefined,
                    }}
                />
            )}
            slots={{
                paper: PaperComponent,
            }}
            slotProps={{
                popper: {
                    placement: "top-start",
                    sx: {
                        minWidth: "50vw",
                        py: 1,
                    },
                },
                listbox: {
                    sx: {
                        p: 0,
                        "& .MuiListSubheader-root.MuiAutocomplete-groupLabel": {
                            top: 1,
                            boxShadow: (theme: Theme) => `0 -1px 0 1px ${theme.palette.background.paper}, 0 0 0 1px #0001`,
                            backgroundColor: (theme: Theme) => alpha(theme.palette.background.paper, 0.9),
                        },
                    },
                },
            }}

            //

            fullWidth
            blurOnSelect
            disableClearable
            autoHighlight
            value={chatModel}
            onChange={(_event, v) => v && setChatModel(chatId, v)}
            options={models}
            isOptionEqualToValue={(model: IChatModel, value: IChatModel) => model.id === value?.id}
            groupBy={(model) => !!modelConfig[model.id]?.favorite ? "Favorites" : model.account.name}
            getOptionLabel={model => model.displayName ?? model.name}
            renderOption={({ key, ...props }, model, { inputValue }) => (
                <ListItem key={key} {...props} sx={{ gap: 1 }}>
                    <ListItemText>
                        <ModelLine model={model} variant="listbox" highlight={inputValue} />
                    </ListItemText>
                </ListItem>
            )}
        />
    );
}

function PaperComponent(props: PaperProps)
{
    const { children, ...paperProps } = props;

    return (
        <Paper
            {...paperProps}
        >
            {children}
        </Paper>
    );
}
