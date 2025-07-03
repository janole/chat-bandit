import { useState } from "react";
import { Box, Dialog } from "@mui/material";
import { Emergency } from "@mui/icons-material";
import { lt } from "semver";
import { SplitButton, SettingsCard, SettingsCardActions, SettingsCardContent } from "@janole/basic-app";
import { MarkdownWrapper } from "@janole/ai-chat";
import { downloadUpdate, installUpdate, useAppUpdateStore } from "../ElectronClient";

function formatBytes(size: number, trim?: boolean)
{
    const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    const v = (size / Math.pow(1024, i)).toFixed(2);
    return (trim ? +v * 1 : v) + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

interface IUpdateDialog
{
    open?: boolean;
    onClose?: () => void;
}

function UpdateDialog(props: IUpdateDialog)
{
    const info = useAppUpdateStore(state => state.info);

    return (
        <Dialog
            fullWidth
            maxWidth="sm"
            onClose={props.onClose}
            open={!!props.open}
            disableRestoreFocus // for autoFocus in strict mode (development only), TODO: refactor
        >
            <SettingsCard
                state={info.state === "downloading" ? "pending" : undefined}
                progress={info.progress?.percent}
                title={`Software Update — ${import.meta.env.VITE_APP_NAME} v${info.version}`}
                titleIcon={<Emergency />}
                actions={
                    <SettingsCardActions>
                        <SplitButton
                            variant="text"
                            color="neutral"
                            onClick={props.onClose}
                        >
                            {info.state === "downloading" ? "Close" : "Cancel"}
                        </SplitButton>
                        {info?.state !== "update-ready" &&
                            <SplitButton
                                color="primary"
                                variant="contained"
                                onClick={downloadUpdate}
                                disabled={info?.state === "downloading"}
                            >
                                Download
                            </SplitButton>
                        }
                        {info?.state === "update-ready" &&
                            <SplitButton
                                color="primary"
                                variant="contained"
                                onClick={installUpdate}
                            >
                                Restart & Install Update
                            </SplitButton>
                        }
                    </SettingsCardActions>
                }
            >
                <SettingsCardContent variant="notice">
                    <Box my={-1}>
                        {(info?.state === "idle" || !info?.state) &&
                            <MarkdownWrapper markdown={`There's an update available. Would you like to download it now?`} />
                        }
                        {info?.state === "downloading" &&
                            <MarkdownWrapper markdown={`The new app update is being downloaded ... ${(info.progress?.percent ?? 0).toFixed(2)}% of ${formatBytes(info.progress?.total ?? 0)}`} />
                        }
                        {info?.state === "download-failed" &&
                            <MarkdownWrapper markdown="Download failed!" />
                        }
                        {info?.state === "update-ready" &&
                            <MarkdownWrapper markdown="There's a new app update ready to be installed." />
                        }
                    </Box>
                </SettingsCardContent>
            </SettingsCard>
        </Dialog>
    );
}

export function UpdateButton()
{
    const info = useAppUpdateStore(state => state.info);
    const [open, setOpen] = useState(false);

    if (!info.version || !lt(import.meta.env.VITE_APP_VERSION, info.version))
    {
        return null;
    }

    return (<>
        <SplitButton
            size="small"
            color="primary"
            disableElevation
            onClick={() => setOpen(true)}
            splitComponent={info.progress?.percent && info.progress?.percent > 0 && info.progress?.percent < 100 &&
                (info.progress?.percent.toFixed(1) + "%")
            }
        >
            {info.state === "downloading" && "Downloading Update"}
            {info.state !== "downloading" && "Update Available"}
        </SplitButton>

        <UpdateDialog open={open} onClose={() => setOpen(false)} />
    </>);
}
