import { app, powerMonitor } from "electron";
import path from "path";
import { rm, stat } from "fs/promises";
import { createModelDownloader } from "node-llama-cpp";
import tryCatch from "@janole/try-catch";
import { TDownloadStatusMap, TSendFunc, normalizeModelUri } from "@janole/ai-core";

const modelsPath = path.join(app.getPath('userData'), 'models');

const abortControllers = new Map<string, AbortController>();

const downloadStatus: TDownloadStatusMap = {};

powerMonitor.addListener("suspend", () =>
{
    for (const abortController of abortControllers.values())
    {
        abortController.abort();
    }
});

async function startDownload(unsafeModelUri: string, send: TSendFunc)
{
    const modelUri = normalizeModelUri(unsafeModelUri);

    if (!modelUri || downloadStatus[modelUri]?.state === "downloaded" || downloadStatus[modelUri]?.state === "downloading")
    {
        return;
    }

    const abortController = new AbortController();
    abortControllers.set(modelUri, abortController);

    if (!downloadStatus[modelUri])
    {
        downloadStatus[modelUri] = { state: "downloading", downloadedSize: 0, totalSize: 0 };
    }
    else
    {
        downloadStatus[modelUri].state = "downloading";
    }

    const localStatus = downloadStatus[modelUri];

    send("download-status", downloadStatus, localStatus.state, modelUri);

    let throttle = Date.now();

    const downloader = await createModelDownloader({
        modelUri,
        dirPath: modelsPath,
        showCliProgress: false,
        skipExisting: true,
        deleteTempFileOnCancel: false,
        onProgress(progress)
        {
            localStatus.state = "downloading";
            localStatus.downloadedSize = progress.downloadedSize;
            localStatus.totalSize = progress.totalSize;

            if (Date.now() > throttle + 500)
            {
                send("download-status", downloadStatus, localStatus, modelUri);
                throttle = Date.now();
            }
        },
    });

    const { result: modelPath } = await tryCatch(downloader.download({
        signal: abortController.signal,
    }));

    if (modelPath)
    {
        const { result: info } = await tryCatch(stat(modelPath));

        localStatus.state = info?.size ? "downloaded" : "paused";
        localStatus.path = modelPath;
    }
    else
    {
        localStatus.state = "paused";
    }

    send("download-status", downloadStatus, localStatus.state, modelUri);
}

async function stopDownload(unsafeModelUri: string, send?: TSendFunc)
{
    const modelUri = normalizeModelUri(unsafeModelUri);

    if (modelUri)
    {
        abortControllers.get(modelUri)?.abort();

        if (downloadStatus[modelUri])
        {
            downloadStatus[modelUri].state = "paused";
            send?.("download-status", downloadStatus, downloadStatus[modelUri].state, modelUri);
        }
    }
}

export async function checkDownload(unsafeModelUri: string): Promise<string | undefined>
{
    const modelUri = normalizeModelUri(unsafeModelUri);

    if (!modelUri)
    {
        return undefined;
    }

    const { result: downloader } = await tryCatch(createModelDownloader({
        modelUri,
        dirPath: modelsPath,
        skipExisting: true,
        deleteTempFileOnCancel: false,
    }));

    if (!downloader?.entrypointFilePath)
    {
        return undefined;
    }

    const { result: info } = await tryCatch(stat(downloader?.entrypointFilePath));

    return info?.size ? downloader?.entrypointFilePath : undefined;
}

async function removeDownload(unsafeModelUri: string, send?: TSendFunc): Promise<void>
{
    const modelUri = normalizeModelUri(unsafeModelUri);

    if (!modelUri)
    {
        return;
    }

    await stopDownload(modelUri);

    if (downloadStatus[modelUri])
    {
        delete downloadStatus[modelUri];
        send?.("download-status", downloadStatus);
    }

    const path = await checkDownload(modelUri);

    console.log(path, modelUri);

    path && await tryCatch(rm(path)) && await tryCatch(rm(path + ".ipull"));
}

function getDownloadStatus()
{
    return downloadStatus;
}

export
{
    modelsPath,
    startDownload,
    stopDownload,
    removeDownload,
    getDownloadStatus,
};
