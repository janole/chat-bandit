export type TReturn<T> = { result?: T; error?: Error; };

export type TSendFunc = (channel: string, ...args: any[]) => void;

// TODO: refactor ...
export type TDownloadStatus = { state: "downloading" | "downloaded" | "paused"; totalSize: number; downloadedSize: number; path?: string; };
export type TDownloadStatusMap = { [modelUri: string]: TDownloadStatus; };
