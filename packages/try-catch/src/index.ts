type TryCatchResult<R> = { result?: R; error?: Error; };

type TTask<R> = (() => R) | Promise<R> | (() => Promise<R>);

function tryCatch<R>(task: TTask<R>): Promise<TryCatchResult<R>> | TryCatchResult<R>
{
    if (task instanceof Promise)
    {
        return task.then(result => ({ result })).catch(error => ({ error: error as Error }));
    }

    try
    {
        const maybePromiseResult = task();

        if (maybePromiseResult instanceof Promise)
        {
            return maybePromiseResult.then(result => ({ result })).catch(error => ({ error: error as Error }));
        }

        return { result: maybePromiseResult };
    }
    catch (e)
    {
        return { error: e as Error };
    }
}

interface ITryCatchMemoOptions
{
    key: string;
    ttlSeconds: number;
}

const cache = new Map<string, { result: any; expiresAt: number; }>();

function tryCatchCache<R>(task: TTask<R>, options: ITryCatchMemoOptions): Promise<TryCatchResult<R>> | TryCatchResult<R>
{
    const cached = cache.get(options.key);

    if (cached?.expiresAt && cached?.expiresAt > Date.now())
    {
        return { result: cached.result } as TryCatchResult<R>;
    }

    const resultOrPromise = tryCatch<R>(task);

    if (resultOrPromise instanceof Promise)
    {
        return resultOrPromise.then(({ result, error }) =>
        {
            if (!isEmpty(result))
            {
                cache.set(options.key, { result, expiresAt: Date.now() + options.ttlSeconds * 1000 });
            }
            else if (cached?.result)
            {
                return { result: cached.result };
            }

            return { result, error } as TryCatchResult<R>;
        });
    }

    if (!isEmpty(resultOrPromise.result))
    {
        cache.set(options.key, { result: resultOrPromise.result, expiresAt: Date.now() + options.ttlSeconds * 1000 });
    }
    else if (cached?.result)
    {
        return { result: cached.result };
    }

    return resultOrPromise;
}

function isEmpty(value: any): boolean
{
    if (value === null || value === undefined)
    {
        return true;
    }

    if (Array.isArray(value))
    {
        return value.length === 0;
    }

    if (typeof value === 'object')
    {
        return Object.keys(value).length === 0;
    }

    // Handle other primitive types (string, number, boolean) - they are not considered empty
    return false;
}

export default tryCatch;

export
{
    tryCatchCache,
}
