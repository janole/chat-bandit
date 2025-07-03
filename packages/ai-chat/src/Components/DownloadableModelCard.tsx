import { Box, Card, CardActions, CardHeader, CircularProgress, LinearProgress, Theme } from "@mui/material";
import { Download, StopCircle, TaskAlt } from "@mui/icons-material";
import { useChatClient, IChatModelLlamaCpp, useDownloadStore } from "@janole/ai-core";
import { TagButton, FlexBox, SplitButton } from "@janole/basic-app";
import formatBytes from "./FormatBytes";

interface DownloadableModelCardProps
{
    model: IChatModelLlamaCpp;
    description?: string;
    elevation?: number;
    width?: string;
}

export function DownloadableModelCard(props: DownloadableModelCardProps)
{
    const { model, description, elevation = 2, width = "75%" } = props;

    const client = useChatClient();

    const status = useDownloadStore(state => model.modelUri ? state.status[model.modelUri] : undefined);

    const canDownload = model.modelUri && !model.state.ready && status?.state !== "downloading";
    const canStop = model.modelUri && status?.state === "downloading" && model.modelUri;
    const ready = model.state.ready;

    const progress = status && status.totalSize > 0 ? 100 * status.downloadedSize / status.totalSize : 0;

    const size = model.size ?? status?.totalSize;

    return (
        <Card
            elevation={elevation}
            sx={{
                width,
            }}
        >
            <CardHeader
                title={
                    <FlexBox flexDirection="column" gap={1}>
                        <FlexBox gap={1}>
                            <Box flexGrow={1} sx={{ typography: "h4", fontWeight: 600, textShadow: "1px 1px 2px #0004" }}>
                                {model.displayName ?? model.name}
                            </Box>
                            {size &&
                                <FlexBox style={{ opacity: 0.9, textShadow: "1px 1px 2px #0004" }} gap={1}>
                                    <Download />
                                    <Box flexShrink={0} sx={{ typography: "h5", fontWeight: 600 }}>
                                        {(size / 1024 / 1024).toFixed(0) + " MB"}
                                    </Box>
                                </FlexBox>
                            }
                        </FlexBox>
                        <FlexBox gap={1}>
                            <TagButton size="small" label={model.provider} color="primary" />
                            {model.parameterSize &&
                                <TagButton size="small" label={model.parameterSize} color="black" />
                            }
                            {model.quantizationLevel &&
                                <TagButton size="small" label={model.quantizationLevel} color="black" />
                            }
                            {model.contextLength &&
                                <TagButton size="small" label={(model.contextLength / 1024) + "K"} color="black" />
                            }
                        </FlexBox>
                        <FlexBox gap={1} alignItems="baseline">
                            <Box pt={1} sx={{ typography: "subtitle1", fontWeight: 500, textShadow: "1px 1px 2px #0004", opacity: 0.9, lineHeight: 1.5 }}>
                                {model.description ?? description}
                            </Box>
                        </FlexBox>
                    </FlexBox>
                }
                sx={{
                    background: (theme: Theme) => `
                        linear-gradient(to bottom, #0000 20%, #0004 80%, #0008 100%),
                        repeating-radial-gradient(circle at 80% 120%, #0001 0%, #0001 10px, #0000 10px, #0000 20px),
                        repeating-linear-gradient(5deg, #FFF1, #FFF1 2px, #0000 2px, #0000 4px),
                        linear-gradient(45deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.warning.dark} 75%)
                    `,
                    color: "white",
                }}
            />
            <CardActions sx={{ p: 2 }}>
                {canDownload &&
                    <SplitButton
                        size="large"
                        onClick={() => client.addChatModel?.({ provider: "node-llama-cpp", modelUri: model.modelUri!, startDownload: true })}
                        icon={<Download />}
                        splitComponent={
                            status && status.downloadedSize > 0 && status.downloadedSize < status.totalSize
                                ? `${formatBytes(status.downloadedSize)} / ${formatBytes(status.totalSize)}`
                                : model.size
                                    ? formatBytes(model.size)
                                    : undefined
                        }
                    >
                        Download
                    </SplitButton>
                }
                {canStop &&
                    <SplitButton
                        size="large"
                        onClick={() => client.stopDownloadChatModel?.(model.modelUri!)}
                        icon={
                            <FlexBox position="relative">
                                <StopCircle />
                                <CircularProgress
                                    size={28}
                                    thickness={4}
                                    sx={{
                                        position: "absolute",
                                        left: -2,
                                        top: -2,
                                        color: "white",
                                    }}
                                />
                            </FlexBox>
                        }
                        color="error"
                        splitComponent={
                            status && status.downloadedSize > 0 && status.downloadedSize < status.totalSize
                                ? `${formatBytes(status.downloadedSize)} / ${formatBytes(status.totalSize)}`
                                : model.size
                                    ? formatBytes(model.size)
                                    : undefined
                        }
                    >
                        Stop
                    </SplitButton>
                }
                {ready &&
                    <FlexBox gap={1}>
                        <TaskAlt color="success" />
                        <Box>Model <strong>downloaded</strong> and <strong>ready</strong>.</Box>
                    </FlexBox>
                }
            </CardActions>
            <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                    height: 6,
                }}
            />
        </Card>
    );
}
