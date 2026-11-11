import { DaemonRequestError, TDaemonClient, TDaemonSessionEvent } from "./daemon-client";

// ---------------------------------------------------------------------------
// One ChatBandit turn against a BotBandit daemon session: wait for the replay,
// make sure the session can take a prompt, send it, follow the live events until
// the agent loop that consumed it settles.
//
// Known limits (the daemon API offers nothing better today):
// - Our prompt is recognised by its text: `POST /send` returns no send id, so an
//   identical prompt queued by another client at the same moment would match.
// - `cancel()` does not clear queued sends and there is no clear-send route. We
//   only send into an idle session, so the prompt is consumed right away; a Stop
//   in the few milliseconds between the send and its `consumed` event can still
//   leave it queued, and the daemon then merges it into the next prompt.
// ---------------------------------------------------------------------------

export type TTurnClient = Pick<TDaemonClient, "openEventStream" | "send" | "cancel">;

export interface ITurnTimings
{
    /** How long the replay may take before `caughtUp`. */
    caughtUpMs: number;
    /** How long a cancelled loop may take to end. */
    cancelGraceMs: number;
    /** Added to a scheduled retry's delay: how long to wait for the retried loop to start (as botbandit's run-settle). */
    retryMarginMs: number;
    /** How long to wait for the approval agent to decide a call it was routed. */
    approvalGraceMs: number;
    /** How long to wait for a busy session to become idle before sending. */
    busyGraceMs: number;
}

export const DEFAULT_TURN_TIMINGS: ITurnTimings = {
    caughtUpMs: 10_000,
    cancelGraceMs: 15_000,
    retryMarginMs: 15_000,
    approvalGraceMs: 20_000,
    busyGraceMs: 20_000,
};

export interface ITurnHandlers
{
    /** The daemon took our prompt: from now on the session has seen it. */
    onConsumed: () => void;
    onText: (text: string) => void;
    onReasoning: (text: string) => void;
    onTool: (toolName: string) => void;
    onTurnStart: () => void;
    onTitle: (title: string) => void;
}

export type TTurnOutcome =
    | { outcome: "done"; }
    | { outcome: "stopped"; }
    /** The loop running our prompt parked on a tool approval nobody decided in time. */
    | { outcome: "approval"; toolName?: string; }
    /** The prompt was not sent: the session is parked on an approval, or busy with another loop. */
    | { outcome: "blocked"; reason: "approval" | "busy"; toolName?: string; }
    | { outcome: "error"; error: string; };

interface IPendingApproval
{
    toolCallId: string;
    toolName?: string;
    /** Routed to a non-human decider (`approval_deferred`), so a verdict should come by itself. */
    deferred: boolean;
}

/** Follows the session state that decides whether a prompt can be sent: open loop and parked approvals. */
function createSessionTracker()
{
    const pending = new Map<string, IPendingApproval>();
    const deferredCalls = new Set<string>();
    let loopOpen = false;

    function track(event: TDaemonSessionEvent)
    {
        switch (event.type)
        {
            case "loop_start":
                loopOpen = true;
                break;

            case "loop_end":
                loopOpen = false;
                break;

            case "approval_deferred":
                deferredCalls.add(event.toolCallId);
                pending.forEach(p => { if (p.toolCallId === event.toolCallId) p.deferred = true; });
                break;

            case "approval_requested":
                pending.set(event.approvalId, { toolCallId: event.toolCallId, toolName: event.toolName, deferred: deferredCalls.has(event.toolCallId) });
                break;

            case "approval_decided":
                pending.delete(event.approvalId);
                break;

            case "interrupted":
                // A cancel synthesizes denials for the parked calls it names (all of them when it names none)
                if (event.toolCallIds?.length)
                {
                    pending.forEach((p, id) => { if (event.toolCallIds!.includes(p.toolCallId)) pending.delete(id); });
                }
                else
                {
                    pending.clear();
                }
                break;
        }
    }

    const pendingList = () => [...pending.values()];

    return {
        track,
        get loopOpen() { return loopOpen; },
        pendingList,
        humanPending: () => pendingList().find(p => !p.deferred),
        blocked: () => loopOpen || pending.size > 0,
    };
}

/**
 * Sends one prompt into a daemon session and follows its event stream until the agent loop that
 * consumed it settles (or parks on a tool approval, or is cancelled via `signal`).
 */
export function runTurn(client: TTurnClient, sessionId: string, prompt: string, handlers: ITurnHandlers, signal: AbortSignal, timings: ITurnTimings = DEFAULT_TURN_TIMINGS): Promise<TTurnOutcome>
{
    return new Promise<TTurnOutcome>((resolve) =>
    {
        const session = createSessionTracker();

        let settled = false;
        let caughtUp = false;
        let posted = false;
        let ours = false;
        let ourSendId: string | undefined;
        let cancelled = false;
        let pendingRetryDelayMs: number | undefined;
        let lastError: string | undefined;

        const timers = new Map<string, ReturnType<typeof setTimeout>>();

        const setTimer = (name: string, ms: number, fn: () => void) =>
        {
            clearTimer(name);
            timers.set(name, setTimeout(fn, ms));
        };

        const clearTimer = (name: string) =>
        {
            clearTimeout(timers.get(name));
            timers.delete(name);
        };

        let close = () => { };

        const finish = (outcome: TTurnOutcome) =>
        {
            if (settled) return;

            settled = true;
            timers.forEach(timer => clearTimeout(timer));
            signal.removeEventListener("abort", onAbort);
            close();
            resolve(outcome);
        };

        const settleLoop = () => finish(lastError ? { outcome: "error", error: lastError } : { outcome: "done" });

        const onAbort = () =>
        {
            if (cancelled || settled) return;

            cancelled = true;

            if (!posted)
            {
                // Nothing was sent, so there is nothing to cancel
                finish({ outcome: "stopped" });
                return;
            }

            client.cancel(sessionId).catch(error => console.error("BotBandit cancel failed", error));

            if (!ours)
            {
                // Our prompt has not started; don't wait for a loop that may never be ours
                finish({ outcome: "stopped" });
                return;
            }

            // Normally the cancelled loop ends promptly with a loop_end; don't wait forever for it
            setTimer("cancel", timings.cancelGraceMs, () => finish({ outcome: "stopped" }));
        };

        const post = () =>
        {
            clearTimer("busy");

            if (signal.aborted)
            {
                finish({ outcome: "stopped" });
                return;
            }

            posted = true;

            client.send(sessionId, prompt).catch((error: Error) =>
            {
                finish({ outcome: "error", error: error instanceof DaemonRequestError && error.detail ? error.detail : error.message });
            });
        };

        /** Called at `caughtUp` and on each live event until the prompt is posted. */
        const gate = () =>
        {
            const human = session.humanPending();

            if (human)
            {
                // Somebody has to decide it in BotBandit; sending now would only queue the prompt
                finish({ outcome: "blocked", reason: "approval", toolName: human.toolName });
                return;
            }

            if (!session.blocked())
            {
                post();
                return;
            }

            if (!timers.has("busy"))
            {
                setTimer("busy", timings.busyGraceMs, () =>
                {
                    const parked = session.pendingList()[0];

                    finish(parked ? { outcome: "blocked", reason: "approval", toolName: parked.toolName } : { outcome: "blocked", reason: "busy" });
                });
            }
        };

        const onLiveEvent = (event: TDaemonSessionEvent) =>
        {
            session.track(event);

            if (event.type === "provisional_title")
            {
                handlers.onTitle(event.title);
                return;
            }

            if (!posted)
            {
                gate();
                return;
            }

            if (!ours)
            {
                // Only events after our prompt was consumed belong to this turn
                if (event.type === "send" && (event.id === ourSendId || event.prompt === prompt))
                {
                    if (event.status === "queued")
                    {
                        ourSendId = event.id;
                    }
                    else if (event.status === "consumed")
                    {
                        ours = true;
                        handlers.onConsumed();
                    }
                    else if (event.status === "cleared")
                    {
                        finish(cancelled ? { outcome: "stopped" } : { outcome: "error", error: "BotBandit dropped the prompt before running it." });
                    }
                }

                return;
            }

            switch (event.type)
            {
                case "loop_start":
                    pendingRetryDelayMs = undefined;
                    clearTimer("retry");
                    break;

                case "turn_start":
                    handlers.onTurnStart();
                    break;

                case "stream":
                    if (event.event.type === "text-delta" && event.event.text)
                    {
                        handlers.onText(event.event.text);
                    }
                    else if (event.event.type === "reasoning-delta" && event.event.text)
                    {
                        handlers.onReasoning(event.event.text);
                    }
                    else if (event.event.type === "tool-call" && event.event.toolName)
                    {
                        handlers.onTool(event.event.toolName);
                    }
                    break;

                case "turn_end":
                    // Keyed on errorCode (as botbandit's selfHeal and run-settle): an empty response has no error text
                    if (event.errorCode && event.errorCode !== "aborted")
                    {
                        lastError = event.error || `BotBandit turn failed (${event.errorCode}).`;
                    }
                    else if (!event.errorCode)
                    {
                        lastError = undefined;
                    }
                    break;

                case "retry_scheduled":
                    pendingRetryDelayMs = event.delayMs;
                    break;

                case "approval_requested":
                {
                    const parked = session.pendingList().find(p => p.toolCallId === event.toolCallId);

                    if (cancelled)
                    {
                        finish({ outcome: "stopped" });
                    }
                    else if (!parked?.deferred)
                    {
                        finish({ outcome: "approval", toolName: event.toolName });
                    }
                    else
                    {
                        // The approval agent decides within seconds; keep streaming if it does
                        setTimer("approval", timings.approvalGraceMs, () => finish({ outcome: "approval", toolName: event.toolName }));
                    }
                    break;
                }

                case "approval_decided":
                case "interrupted":
                    if (!session.pendingList().length)
                    {
                        clearTimer("approval");
                    }
                    break;

                case "cancel":
                    // A cancel from elsewhere; between loops only a pending retry is waited for, and it stops that
                    cancelled = true;

                    if (!session.loopOpen)
                    {
                        finish({ outcome: "stopped" });
                    }
                    break;

                case "loop_end":
                    if (cancelled)
                    {
                        finish({ outcome: "stopped" });
                    }
                    else if (pendingRetryDelayMs === undefined)
                    {
                        settleLoop();
                    }
                    else
                    {
                        // selfHeal may drop the retry silently; bound the wait like run-settle does
                        setTimer("retry", pendingRetryDelayMs + timings.retryMarginMs, settleLoop);
                    }
                    break;
            }
        };

        setTimer("caughtUp", timings.caughtUpMs, () => finish({ outcome: "error", error: "BotBandit daemon did not replay the session in time." }));

        close = client.openEventStream(sessionId, {
            onFrame: frame =>
            {
                if ("caughtUp" in frame)
                {
                    if (caughtUp) return;

                    caughtUp = true;
                    clearTimer("caughtUp");
                    gate();

                    return;
                }

                if (frame.replay || !caughtUp)
                {
                    // History the chat already has; it only tells us the session's current state
                    session.track(frame.event);
                    return;
                }

                onLiveEvent(frame.event);
            },
            onError: error => finish(cancelled ? { outcome: "stopped" } : { outcome: "error", error: error.message }),
        });

        if (signal.aborted)
        {
            onAbort();
        }
        else
        {
            signal.addEventListener("abort", onAbort);
        }
    });
}
