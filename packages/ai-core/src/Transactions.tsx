import tryCatch from "@janole/try-catch";
import { useCallback, useRef, useState } from "react";
import { ulid } from "ulid";
import { create } from "zustand";

import { TReturn } from "./types-electron";

interface ITransaction
{
    id: string;
    title: string;
    state: "pending" | "completed" | "failed";
    sourceId?: string;
    createdAt: number;
    updatedAt: number;

    finish: (state: ITransaction["state"]) => void;
    remove: () => void;
}

interface ITransactionStore
{
    transactions: { [id: string]: ITransaction };
    addTransaction: (title: string, sourceId?: ITransaction["sourceId"], state?: ITransaction["state"]) => ITransaction;
    getTransaction: (id: ITransaction["id"]) => ITransaction | undefined;
    removeTransaction: (id: ITransaction["id"]) => void;
}

export const useTransactionStore = create<ITransactionStore>()(
    (set, get) => ({
        transactions: {},

        addTransaction: (title: string, sourceId?: ITransaction["sourceId"], state?: ITransaction["state"]) =>
        {
            const transaction: ITransaction = {
                id: ulid(),
                title,
                state: state ?? "pending",
                sourceId,
                createdAt: Date.now(),
                updatedAt: Date.now(),

                finish: function (state: ITransaction["state"] = "completed") 
                {
                    set(store => ({ transactions: { ...store.transactions, [this.id]: { ...this, state } } }));
                },
                remove: function () { get().removeTransaction(this.id); },
            };

            set(store => ({ transactions: { ...store.transactions, [transaction.id]: transaction } }));

            return transaction;
        },

        getTransaction: (id: string) => get().transactions[id],

        removeTransaction: (id: string) =>
        {
            set(store => 
            {
                const transactions = { ...store.transactions };
                delete transactions[id];

                return { /* ...store, */ transactions };
            });
        },
    })
);

export interface RunTransactionProps<T>
{
    action: () => Promise<any>;
    completed?: (result: T | undefined) => void;
}

export function useTransaction<T extends TReturn<T>>()
{
    const [state, setState] = useState<ITransaction["state"]>();
    const [result, setResult] = useState<T>();
    const [error, setError] = useState<string>();

    const internalStateRef = useRef<"running" | "idle">("idle");
    internalStateRef.current = state === "pending" ? "running" : "idle";

    const run = useCallback(async (props: RunTransactionProps<T>) =>
    {
        if (internalStateRef.current === "running")
        {
            return;
        }

        internalStateRef.current = "running";

        setState("pending");
        setResult(undefined);
        setError(undefined);

        const r = await tryCatch<T>(props.action);

        const error = r.result?.error || r.error;

        if (error)
        {
            setState("failed");
            setError(error.message);
        }
        else
        {
            setState("completed");
            setResult(result);

            props.completed?.(result);
        }
    }, [
        internalStateRef,
        // setState,
        // setError,
    ]);

    return { run, state, result, error, _internalState: internalStateRef.current };
}
