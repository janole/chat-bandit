import { request } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Minimal, dependency-free client for the BotBandit daemon (`boba daemon`).
//
// The daemon speaks plain HTTP + SSE over a Unix domain socket. Only node's
// `http` module is used, so this file runs inside Electron's main process and
// under plain node (see scripts/check-botbandit-provider.ts) alike.
//
// The wire types below are a hand-copied subset of BotBandit's
// `apps/cli/src/daemon/protocol.ts` and `packages/agent-core/src/types.ts`.
// ---------------------------------------------------------------------------

export interface IDaemonHealth
{
    ok: true;
    pid: number;
    version: string;
    activeSessions?: number;
    runningSessions?: number;
}

export interface IDaemonModelSection
{
    profile: string;
    provider: string;
    models: string[];
    capabilities?: { goal?: boolean; approval?: boolean; };
}

export interface IDaemonConfig
{
    defaultProfile: string;
    profiles: string[];
    modelSections: IDaemonModelSection[];
}

export interface IDaemonCreateSessionRequest
{
    sessionId?: string;
    profile?: string;
    model?: string;
    hidden?: boolean;
    cwd?: string;
}

export interface IDaemonCreateSessionResponse
{
    id: string;
    profile?: string;
    provider?: string;
    model?: string;
}

/** The subset of BotBandit session events this client interprets; everything else passes through untyped. */
export type TDaemonSessionEvent =
    | { type: "send"; event_id: string; id: string; prompt: string; status: "queued" | "consumed" | "cleared"; }
    | { type: "stream"; event_id: string; turn_id: string; event: { type: string; text?: string; toolName?: string; [key: string]: unknown; }; }
    | { type: "turn_start"; event_id: string; turn_id: string; }
    | { type: "turn_end"; event_id: string; turn_id: string; result: string; error?: string; errorCode?: string; }
    | { type: "loop_start"; event_id: string; }
    | { type: "loop_end"; event_id: string; }
    | { type: "retry_scheduled"; event_id: string; attempt: number; maxRetries: number; delayMs: number; }
    | { type: "approval_requested"; event_id: string; approvalId: string; toolCallId: string; toolName?: string; }
    | { type: "approval_decided"; event_id: string; approvalId: string; approved: boolean; }
    | { type: "cancel"; event_id: string; }
    | { type: "notice"; event_id: string; variant: "debug" | "info" | "warning" | "error"; text: string; }
    | { type: "provisional_title"; event_id: string; title: string; }
    | { type: "other"; event_id: string; [key: string]: unknown; };

export type TDaemonStreamFrame =
    | { event: TDaemonSessionEvent; persisted: boolean; replay?: boolean; }
    | { caughtUp: true; };

export class DaemonRequestError extends Error
{
    constructor(public readonly status: number, message: string, public readonly detail?: string)
    {
        super(message);
        this.name = "DaemonRequestError";
    }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/** Socket path of the local daemon: `BOTBANDIT_DAEMON_SOCK`, else `~/.botbandit/daemon.sock`. */
export function resolveDaemonSocketPath()
{
    return process.env.BOTBANDIT_DAEMON_SOCK || join(homedir(), ".botbandit", "daemon.sock");
}

function parseErrorDetail(raw: string)
{
    try
    {
        const body = JSON.parse(raw) as { error?: unknown; };

        return typeof body.error === "string" ? body.error : undefined;
    }
    catch
    {
        return undefined;
    }
}

/**
 * Incremental Server-Sent-Events parser: feed it raw chunks, it calls `onData` with the joined
 * `data:` payload of every complete event. Handles `\n` / `\r\n`, multi-line data and comments.
 */
export function createSseParser(onData: (data: string) => void)
{
    let buffer = "";
    let dataLines: string[] = [];

    return (chunk: string) =>
    {
        buffer += chunk;

        let newline = buffer.indexOf("\n");

        while (newline !== -1)
        {
            let line = buffer.slice(0, newline);
            buffer = buffer.slice(newline + 1);
            newline = buffer.indexOf("\n");

            if (line.endsWith("\r"))
            {
                line = line.slice(0, -1);
            }

            if (line === "")
            {
                if (dataLines.length)
                {
                    const data = dataLines.join("\n");
                    dataLines = [];
                    onData(data);
                }

                continue;
            }

            if (line.startsWith(":"))
            {
                continue;
            }

            const colon = line.indexOf(":");
            const field = colon === -1 ? line : line.slice(0, colon);
            let value = colon === -1 ? "" : line.slice(colon + 1);

            if (value.startsWith(" "))
            {
                value = value.slice(1);
            }

            if (field === "data")
            {
                dataLines.push(value);
            }
        }
    };
}

export function createDaemonClient(socketPath: string = resolveDaemonSocketPath())
{
    function call<T>(method: string, path: string, body?: unknown, timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS): Promise<T>
    {
        return new Promise<T>((resolve, reject) =>
        {
            const payload = body === undefined ? undefined : JSON.stringify(body);

            const req = request({
                socketPath,
                path,
                method,
                timeout: timeoutMs,
                headers: payload === undefined ? {} : { "content-type": "application/json", "content-length": Buffer.byteLength(payload) },
            }, (res) =>
            {
                const chunks: Buffer[] = [];

                res.on("data", (chunk: Buffer) => chunks.push(chunk));
                res.on("end", () =>
                {
                    const raw = Buffer.concat(chunks).toString("utf8");
                    const status = res.statusCode ?? 0;

                    if (status < 200 || status >= 300)
                    {
                        const detail = parseErrorDetail(raw);
                        reject(new DaemonRequestError(status, `BotBandit daemon ${method} ${path} failed (${status}): ${detail ?? raw}`, detail));
                        return;
                    }

                    try
                    {
                        resolve((raw ? JSON.parse(raw) : undefined) as T);
                    }
                    catch (error)
                    {
                        reject(error);
                    }
                });
            });

            req.on("error", reject);
            req.on("timeout", () => req.destroy(new Error(`BotBandit daemon ${method} ${path} timed out after ${timeoutMs}ms`)));

            if (payload !== undefined)
            {
                req.write(payload);
            }

            req.end();
        });
    }

    /** Resolves the health body, or undefined when no daemon answers within `timeoutMs`. */
    async function health(timeoutMs = 500)
    {
        try
        {
            const result = await call<IDaemonHealth>("GET", "/health", undefined, timeoutMs);

            return result?.ok ? result : undefined;
        }
        catch
        {
            return undefined;
        }
    }

    const getConfig = (timeoutMs = 2_000) => call<IDaemonConfig>("GET", "/config", undefined, timeoutMs);

    const createSession = (params: IDaemonCreateSessionRequest) => call<IDaemonCreateSessionResponse>("POST", "/session", params);

    const send = (sessionId: string, prompt: string) => call<{ queued: boolean; }>("POST", `/session/${encodeURIComponent(sessionId)}/send`, { prompt });

    const cancel = (sessionId: string) => call<{ cancelled: boolean; }>("POST", `/session/${encodeURIComponent(sessionId)}/cancel`, {});

    /**
     * Opens `GET /session/:id/events`. The daemon first replays the whole log, then writes a
     * `{ caughtUp: true }` frame, then forwards live events. Returns a function closing the stream.
     * `onError` fires at most once, also when the daemon ends the stream.
     */
    function openEventStream(sessionId: string, handlers: { onFrame: (frame: TDaemonStreamFrame) => void; onError: (error: Error) => void; })
    {
        let closed = false;

        const fail = (error: Error) =>
        {
            if (closed) return;

            closed = true;
            handlers.onError(error);
        };

        const parse = createSseParser(data =>
        {
            if (closed) return;

            try
            {
                handlers.onFrame(JSON.parse(data) as TDaemonStreamFrame);
            }
            catch (error)
            {
                fail(error instanceof Error ? error : new Error(String(error)));
            }
        });

        const req = request({ socketPath, path: `/session/${encodeURIComponent(sessionId)}/events`, method: "GET", headers: { accept: "text/event-stream" } }, (res) =>
        {
            if (res.statusCode !== 200)
            {
                const chunks: Buffer[] = [];

                res.on("data", (chunk: Buffer) => chunks.push(chunk));
                res.on("end", () =>
                {
                    const raw = Buffer.concat(chunks).toString("utf8");
                    const detail = parseErrorDetail(raw);
                    fail(new DaemonRequestError(res.statusCode ?? 0, `BotBandit event stream failed (${res.statusCode}): ${detail ?? raw}`, detail));
                });

                return;
            }

            res.setEncoding("utf8");
            res.on("data", parse);
            res.on("end", () => fail(new Error("BotBandit event stream ended")));
            res.on("error", fail);
            res.on("close", () => fail(new Error("BotBandit event stream closed")));
        });

        req.on("error", fail);
        req.end();

        return () =>
        {
            closed = true;
            req.destroy();
        };
    }

    return {
        socketPath,
        call,
        health,
        getConfig,
        createSession,
        send,
        cancel,
        openEventStream,
    };
}

export type TDaemonClient = ReturnType<typeof createDaemonClient>;
