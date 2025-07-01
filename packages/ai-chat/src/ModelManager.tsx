"use client";

import { useState } from "react";
import { PanelApp, ContentContainer, FlexBox, SplitButton, TagButton, QuickMenu, ProgressBar, useLayoutStore, Grid, Spacer } from "@janole/basic-app";
import { Alert, Box, CircularProgress, Dialog, Divider, IconButton, Link, Theme, Tooltip, Typography } from "@mui/material";
import { useShallow } from "zustand/react/shallow";
import { AddCircleOutline, Cancel, Check, DeleteForever, Download, FaceRetouchingNatural, MoreVert, SourceOutlined } from "@mui/icons-material";
import parse from "autosuggest-highlight/parse";
import match from "autosuggest-highlight/match";
import { IChatModel, normalizeModelUri, useChatModelConfigStore, useChatStore, useChatClient, isModelHidden, useTransaction, useDownloadStore } from "@janole/ai-core";
import { HardDrive, Cloud, Star, EyeOff, Eye, Info } from "lucide-react";
import OnOffSwitch from "./Components/OnOffSwitch";
import TextField from "./Components/TextField";
import { SettingsCard, SettingsCardActions, SettingsCardContent } from "./Components/SettingsCard";

interface SettingsCardProps
{
    handleAdd?: () => void;
    handleCancel?: () => void;
}

function OpenAiSettingsCard(props: SettingsCardProps)
{
    const { handleAdd, handleCancel } = props;

    const client = useChatClient();

    const [name, setName] = useState("");
    const [apiKey, setApiKey] = useState("");

    const { run, error, state } = useTransaction();

    const defaultName = "OpenAI";

    const addAccount = () =>
    {
        run({
            action: () => client.addAccount({ provider: "openai", name: name || defaultName, apiKey, type: "openai" }),
            completed: handleAdd,
        });
    }

    const working = state === "pending";

    return (
        <SettingsCard
            state={state}
            title="Add OpenAI Account"
            titleIcon={<AddCircleOutline />}
            actions={
                <SettingsCardActions>
                    <SplitButton
                        variant="text"
                        color="neutral"
                        onClick={handleCancel}
                    >
                        Cancel
                    </SplitButton>
                    <SplitButton
                        color="primary"
                        variant={!apiKey.length ? "text" : "contained"}
                        disabled={!apiKey.length || working}
                        onClick={addAccount}
                    >
                        Add
                    </SplitButton>
                </SettingsCardActions>
            }
        >
            <SettingsCardContent>
                <Grid size={12}>
                    <TextField
                        disabled={working}
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        label="OpenAI API Key"
                        placeholder="Please enter your OpenAI API Key ..."
                        required
                        autoFocus
                        fullWidth
                        type="password"
                        slotProps={{
                            inputLabel: { shrink: true },
                        }}
                    />
                </Grid>
                <Grid size={12}>
                    <TextField
                        disabled={working}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        label="Name"
                        placeholder={defaultName}
                        fullWidth
                        slotProps={{
                            inputLabel: { shrink: true },
                        }}
                    />
                </Grid>
                {error &&
                    <Grid size={12}>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                }
            </SettingsCardContent>
        </SettingsCard>
    );
}

function OpenRouterSettingsCard(props: SettingsCardProps)
{
    const { handleAdd, handleCancel } = props;

    const client = useChatClient();

    const [name, setName] = useState("");
    const [apiKey, setApiKey] = useState("");

    const { run, error, state } = useTransaction();

    const defaultName = "OpenRouter";

    const addAccount = () =>
    {
        run({
            action: () => client.addAccount({ provider: "openai", name: name || defaultName, apiKey, type: "openrouter" }),
            completed: handleAdd,
        });
    }

    const working = state === "pending";

    return (
        <SettingsCard
            state={state}
            title="Add OpenRouter Account"
            titleIcon={<AddCircleOutline />}
            actions={
                <SettingsCardActions>
                    <SplitButton
                        variant="text"
                        color="neutral"
                        onClick={handleCancel}
                    >
                        Cancel
                    </SplitButton>
                    <SplitButton
                        color="primary"
                        variant={!apiKey.length ? "text" : "contained"}
                        disabled={!apiKey.length || working}
                        onClick={addAccount}
                    >
                        Add
                    </SplitButton>
                </SettingsCardActions>
            }
        >
            <SettingsCardContent>
                <Grid size={12}>
                    <TextField
                        disabled={working}
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        label="OpenRouter API Key"
                        placeholder="Please enter your OpenRouter API Key ..."
                        required
                        autoFocus
                        fullWidth
                        type="password"
                        slotProps={{
                            inputLabel: { shrink: true },
                        }}
                    />
                </Grid>
                <Grid size={12}>
                    <TextField
                        disabled={working}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        label="Name"
                        placeholder={defaultName}
                        fullWidth
                        slotProps={{
                            inputLabel: { shrink: true },
                        }}
                    />
                </Grid>
                {error &&
                    <Grid size={12}>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                }
            </SettingsCardContent>
        </SettingsCard>
    );
}

function GoogleAiSettingsCard(props: SettingsCardProps)
{
    const { handleAdd, handleCancel } = props;

    const client = useChatClient();

    const [name, setName] = useState("");
    const [apiKey, setApiKey] = useState("");

    const { run, error, state } = useTransaction();

    const defaultName = "GoogleAI";

    const addAccount = () =>
    {
        run({
            action: () => client.addAccount({ provider: "googleai", name: name || defaultName, apiKey }),
            completed: handleAdd,
        });
    }

    const working = state === "pending";

    return (
        <SettingsCard
            state={state}
            title="Add Google AI Account"
            titleIcon={<AddCircleOutline />}
            actions={
                <SettingsCardActions>
                    <SplitButton
                        variant="text"
                        color="neutral"
                        onClick={handleCancel}
                    >
                        Cancel
                    </SplitButton>
                    <SplitButton
                        color="primary"
                        variant={!apiKey.length ? "text" : "contained"}
                        disabled={!apiKey.length || working}
                        onClick={addAccount}
                    >
                        Add
                    </SplitButton>
                </SettingsCardActions>
            }
        >
            <SettingsCardContent>
                <Grid size={12}>
                    <TextField
                        disabled={working}
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        label="Google AI API Key"
                        placeholder="Please enter your Google AI API Key ..."
                        required
                        autoFocus
                        fullWidth
                        type="password"
                        slotProps={{
                            inputLabel: { shrink: true },
                        }}
                    />
                </Grid>
                <Grid size={12}>
                    <TextField
                        disabled={working}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        label="Name"
                        placeholder={defaultName}
                        fullWidth
                        slotProps={{
                            inputLabel: { shrink: true },
                        }}
                    />
                </Grid>
                {error &&
                    <Grid size={12}>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                }
            </SettingsCardContent>
        </SettingsCard>
    );
}

const AddLlamaCppModelCard = (props: SettingsCardProps) =>
{
    const { handleAdd, handleCancel } = props;

    const client = useChatClient();

    const [modelUri, setModelUri] = useState("");
    const [startDownload, setStartDownload] = useState(false);

    const { run, error, state } = useTransaction();

    const addModel = () =>
    {
        run({
            action: () => client.addChatModel({ provider: "node-llama-cpp", modelUri, startDownload }),
            completed: handleAdd,
        });
    }

    const normalizedModelUri = normalizeModelUri(modelUri);
    const working = state === "pending";

    return (
        <SettingsCard
            state={state}
            title="Add model for llama.cpp (GGUF)"
            titleIcon={<AddCircleOutline />}
            actions={
                <SettingsCardActions>
                    <SplitButton
                        variant="text"
                        color="neutral"
                        onClick={handleCancel}
                    >
                        Cancel
                    </SplitButton>
                    <SplitButton
                        color="primary"
                        variant={!normalizedModelUri ? "text" : "contained"}
                        disabled={!normalizedModelUri || working}
                        onClick={addModel}
                    >
                        Add
                    </SplitButton>
                </SettingsCardActions>
            }
        >
            <SettingsCardContent>
                <Grid size={12}>
                    <TextField
                        disabled={working}
                        value={modelUri}
                        onChange={e => setModelUri(e.target.value)}
                        label="Model URI"
                        placeholder="Please enter a valid model URI ..."
                        helperText={
                            <Link href={normalizedModelUri?.replace(/^hf:/, "https://huggingface.co/")?.replace(/:[^:]{1,10}$/, "")} target="_blank" rel="noopener noreferrer">
                                {normalizedModelUri}
                            </Link>
                        }
                        multiline
                        required
                        autoFocus
                        fullWidth
                        slotProps={{
                            inputLabel: { shrink: true },
                        }}
                    />
                </Grid>
                <Grid size={12}>
                    <OnOffSwitch
                        disabled={working}
                        label="Automatically download model"
                        value={startDownload}
                        setValue={setStartDownload}
                    />
                </Grid>
                {error &&
                    <Grid size={12}>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                }
            </SettingsCardContent>
        </SettingsCard>
    );
}

function AddButton()
{
    const [dialogComponent, setDialogComponent] = useState<{ FC: ((props: SettingsCardProps) => JSX.Element) }>();

    return (<>
        <QuickMenu
            button={
                <SplitButton
                    size="small"
                    splitComponent={
                        <AddCircleOutline fontSize="small" />
                    }
                >
                    Add
                </SplitButton>
            }
            items={[
                { title: "Add llama.cpp model from Huggingface", icon: <AddCircleOutline fontSize="small" />, onClick: () => { setDialogComponent({ FC: AddLlamaCppModelCard }); } },
                // { type: "divider" },
                // { title: "Add Ollama model", icon: <AddCircleOutline fontSize="small" />, onClick: () => { setDialogComponent({ FC: AddOllamaModelCard }); } },
                { type: "divider" },
                { title: "Add OpenAI account", icon: <AddCircleOutline fontSize="small" />, onClick: () => { setDialogComponent({ FC: OpenAiSettingsCard }); } },
                { title: "Add OpenRouter account", icon: <AddCircleOutline fontSize="small" />, onClick: () => { setDialogComponent({ FC: OpenRouterSettingsCard }); } },
                { type: "divider" },
                { title: "Add Google AI account", icon: <AddCircleOutline fontSize="small" />, onClick: () => { setDialogComponent({ FC: GoogleAiSettingsCard }); } },
            ]}
        />

        <Dialog
            fullWidth
            maxWidth="sm"
            onClose={() => setDialogComponent(undefined)}
            open={!!dialogComponent?.FC}
            disableRestoreFocus // for autoFocus in strict mode (development only), TODO: refactor
        >
            {dialogComponent?.FC &&
                <dialogComponent.FC
                    handleAdd={() => setDialogComponent(undefined)}
                    handleCancel={() => setDialogComponent(undefined)}
                />
            }
        </Dialog>
    </>);
}

interface ModelLineProps
{
    model: IChatModel;

    variant?: "default" | "listbox";

    highlight?: string;
}

export function ModelLine(props: ModelLineProps)
{
    const {
        model,
        variant,
        highlight,
    } = props;

    const status = useDownloadStore(state => model.modelUri ? state.status[model.modelUri] : undefined);
    const client = useChatClient();
    const sizes = useChatStore(useShallow(state => state.models?.reduce((acc, m) => [Math.min(m.size ?? acc[0], acc[0]), Math.max(m.size ?? 0, acc[1])], [Number.MAX_SAFE_INTEGER, 0])));

    const defaultId = useChatModelConfigStore(state => state.defaultId);
    const setDefaultId = useChatModelConfigStore(state => state.setDefaultId);

    const hidden = isModelHidden(model, useChatModelConfigStore(state => state.config[model.id]));
    const setHidden = useChatModelConfigStore(state => state.setHidden);

    const favorite = useChatModelConfigStore(state => state.config[model.id]?.favorite);
    const toggleFavorite = useChatModelConfigStore(state => state.toggleFavorite);

    const modelName = model.displayName ?? model.name;

    const matches = match(modelName, highlight ?? "", { insideWords: true });
    const parts = parse(modelName, matches);

    const color = !model.account.remote ? "success.main" : "warning.main";

    return (
        <Grid
            size={12}
            container
            spacing={1}
            alignItems="center"
            sx={{
                "&:hover": {
                    position: "relative",
                    "& .favorite-button": {
                        opacity: 1,
                    },
                    "&:before": variant === "listbox" ? undefined : {
                        content: '""',
                        bgcolor: color,
                        position: "absolute",
                        top: -4,
                        left: -16,
                        right: -16,
                        bottom: -4,
                        borderRadius: 1,
                        opacity: 0.1,
                    },
                },
            }}
        >
            <Grid size="grow" display="flex" gap={2} alignItems="center">
                <FlexBox color={color}>
                    {!model.account.remote ? <HardDrive size={20} /> : <Cloud size={20} />}
                </FlexBox>

                <Box
                    sx={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                    }}
                >
                    {parts.map((part, index) => (
                        <span
                            key={index}
                            style={{
                                fontWeight: part.highlight ? 700 : 400,
                                textDecoration: part.highlight ? "underline" : undefined,
                            }}
                        >
                            {part.text}
                        </span>
                    ))}

                    {variant === "listbox" && !!favorite &&
                        <Typography component="span" variant="body2" color="text.secondary">
                            {` ${model.account.name}`}
                        </Typography>
                    }
                </Box>
            </Grid>

            {variant !== "listbox" && status?.state === "downloading" &&
                <Grid size="auto">
                    <ProgressBar
                        width="200px"
                        currentValue={status.downloadedSize / 1024 / 1024 / 1024}
                        maximumValue={status.totalSize / 1024 / 1024 / 1024}
                        maximumValueSuffix=" GB"
                    />
                </Grid>
            }

            {variant !== "listbox" &&
                <Grid size="auto" display="flex" gap={1}>
                    {!model.state.ready && model.modelUri && model.state.downloadable && status?.state !== "downloading" &&
                        <SplitButton
                            onClick={() => client.downloadChatModel(model.modelUri!)}
                            size="small"
                            icon={<Download />}
                        >
                            Download
                        </SplitButton>
                    }
                    {!model.state.ready && model.modelUri && model.state.downloadable && status?.state === "downloading" &&
                        <IconButton
                            onClick={() => client.stopDownloadChatModel(model.modelUri!)}
                            size="small"
                            sx={{ position: "relative" }}
                            color="error"
                        >
                            <Cancel />
                            <CircularProgress size={28} color="black" sx={{ position: "absolute" }} />
                        </IconButton>
                    }
                </Grid>
            }

            {!!model.description &&
                <Grid size="auto">
                    <Tooltip
                        arrow
                        slotProps={{
                            tooltip: {
                                sx: (theme: Theme) => ({
                                    "& a": {
                                        color: theme.palette.primary.light,
                                        textDecorationColor: theme.palette.primary.light,
                                    },
                                    "& pre, & code": {
                                        color: theme.palette.background.paper,
                                        fontSize: "caption.fontSize",
                                    },
                                    whiteSpace: "pre-wrap",
                                }),
                            },
                        }}
                        title={
                            model.description
                        }
                    >
                        <IconButton
                            // onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(model.id); }}
                            size="small"
                            color="info"
                            sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
                        >
                            <Info size={20} />
                        </IconButton>
                    </Tooltip>
                </Grid>
            }

            {variant !== "listbox" &&
                <Grid size="auto">
                    <TagButton
                        label="DEFAULT"
                        color="success"
                        fullWidth
                        disabled={model.id !== defaultId}
                        onClick={() => setDefaultId(model.id)}
                        rightIcon={<Check />}
                    />
                </Grid>
            }

            {variant !== "listbox" &&
                <Grid size="auto">
                    <IconButton
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHidden(model.id, !hidden); }}
                        size="small"
                        color="neutral"
                        sx={{ opacity: hidden ? 1 : 0.25 }}
                    >
                        {hidden ? <EyeOff size={20} /> : <Eye size={20} />}
                    </IconButton>
                </Grid>
            }

            <Grid size="auto">
                <IconButton
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(model.id); }}
                    size="small"
                    color={favorite ? "warning" : "neutral"}
                    sx={{ opacity: favorite ? 1 : 0.25 }}
                >
                    <Star size={20} fill={favorite ? "currentColor" : "none"} />
                </IconButton>
            </Grid>

            <Grid size="auto">
                <FlexBox width="32px" justifyContent="end">
                    {model.features?.vision &&
                        <TagButton label="V" color="secondary" fullWidth />
                    }
                    {!model.features?.vision &&
                        <TagButton disabled fullWidth />
                    }
                </FlexBox>
            </Grid>

            <Grid size="auto">
                <FlexBox width="32px" justifyContent="end">
                    {model.features?.tools &&
                        <TagButton label="T" color="black" fullWidth />
                    }
                    {!model.features?.tools &&
                        <TagButton disabled fullWidth />
                    }
                </FlexBox>
            </Grid>

            <Grid size="auto">
                <FlexBox width="64px" justifyContent="end">
                    {!!model.parameterSize &&
                        <TagButton label={model.parameterSize} fullWidth />
                    }
                    {!model.parameterSize &&
                        <TagButton disabled fullWidth />
                    }
                </FlexBox>
            </Grid>

            {variant !== "listbox" &&
                <Grid size="auto">
                    <FlexBox width="64px">
                        {!!model.quantizationLevel &&
                            <TagButton label={model.quantizationLevel} fullWidth />
                        }
                        {!model.quantizationLevel &&
                            <TagButton disabled fullWidth />
                        }
                    </FlexBox>
                </Grid>
            }

            <Grid size="auto">
                <FlexBox width="64px" justifyContent="end">
                    {!!model.contextLength &&
                        <TagButton label={(model.contextLength / 1024).toFixed() + "K"} fullWidth />
                    }
                </FlexBox>
            </Grid>

            {variant !== "listbox" && <Grid size="auto">
                <FlexBox width="120px" justifyContent="start" position="relative">
                    {!!model.size && <>
                        <TagButton fullWidth position="absolute" />
                        <TagButton
                            label={!!model.size && `${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB`}
                            color="neutral"
                            width={`${55 + 45 * (model.size - sizes[0]) / sizes[1]}%`}
                            align="left"
                        />
                    </>}
                    {!model.size &&
                        <TagButton disabled fullWidth />
                    }
                </FlexBox>
            </Grid>}

            {variant === "listbox" && <Grid size="auto">
                <FlexBox width="64px">
                    {!!model.size &&
                        <TagButton
                            label={!!model.size && `${(model.size / 1024 / 1024 / 1024).toFixed(1)} GB`}
                            color="neutral"
                            fullWidth
                        />
                    }
                    {!model.size &&
                        <TagButton disabled fullWidth />
                    }
                </FlexBox>
            </Grid>}

            {variant !== "listbox" &&
                <Grid size="auto">
                    <QuickMenu
                        disabled={!model.state.removable}
                        icon={
                            <MoreVert fontSize="small" />
                        }
                        items={[
                            {
                                title: "Reveal in Finder",
                                icon: <SourceOutlined />,
                                onClick: () => model.modelFile && client.showFileInFileManager(model.modelFile),
                                hidden: !model.state?.ready || !model.state?.hasLocalModelFile,
                            },
                            {
                                title: "Delete",
                                icon: <DeleteForever />,
                                onClick: () => client.deleteChatModel({ provider: model.provider, modelUri: model.modelUri! }),
                            }
                        ]}
                    />
                </Grid>
            }
        </Grid>
    );
}

interface ChatModelAccountListProps
{
    accountId: string;
}

function ChatModelAccountList(props: ChatModelAccountListProps)
{
    const { accountId } = props;

    const client = useChatClient();

    const models = useChatStore(useShallow(state => state.models.filter(m => m.account.id === accountId))) ?? [];

    const contentTopBarHeight = useLayoutStore(state => state.sizes["contentTopBar"]?.height);

    const removable = models[0].account.removable;

    return (
        <Box>
            <FlexBox
                position="sticky"
                flexDirection="column"
                style={{
                    top: contentTopBarHeight,
                    minHeight: contentTopBarHeight,
                    zIndex: 1,
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        bgcolor: "background.contentTopBar",
                        typography: "h6",
                        mx: -1,
                        p: 1,
                    }}
                >
                    {models[0].account.name}
                    <Box ml="auto" />
                    {removable &&
                        <QuickMenu
                            icon={
                                <MoreVert fontSize="small" />
                            }
                            items={[
                                {
                                    title: "Delete",
                                    icon: <DeleteForever />,
                                    onClick: () => client.removeAccount({ provider: models[0].provider, id: accountId }),
                                }
                            ]}
                        />
                    }
                </Box>
                <Divider sx={{ mx: -1 }} />
            </FlexBox>
            <Grid container spacing={1} pt={1}>
                {models.map(m => (
                    <ModelLine key={m.id} model={m} />
                ))}
            </Grid>
            <Spacer height="large" />
        </Box>
    );
}

export function ChatModelsView()
{
    const models = useChatStore(state => state.models);

    const accountIds = models.reduce<string[]>((acc, model) => (acc.includes(model.account.id) ? acc : [...acc, model.account.id]), []);

    return (
        <FlexBox flexDirection="column">
            {accountIds.map(accountId => (
                <ChatModelAccountList key={accountId} accountId={accountId} />
            ))}
        </FlexBox>
    );
}

export default function ModelManager()
{
    // TODO: refactor (the following call is just used to register an "on focus" event listener)
    useChatClient();

    return (
        <PanelApp
            contentTop={
                <FlexBox gap={1}>
                    <FaceRetouchingNatural />
                    <FlexBox>
                        Model Manager
                    </FlexBox>
                </FlexBox>
            }
            leftToolbarTop={
                <FlexBox gap={1} flexGrow={1} pr={1.5}>
                    <Box ml="auto" />
                    <AddButton />
                </FlexBox>
            }
        >
            <ContentContainer maxWidth="lg" px={4} py={0}>
                <ChatModelsView />
            </ContentContainer>
        </PanelApp>
    );
}

export const Component = ModelManager;
