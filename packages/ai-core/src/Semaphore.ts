class Semaphore
{
    private maxConcurrency: number;
    private currentConcurrency: number;
    private waiting: Function[];

    constructor(maxConcurrency: number)
    {
        this.maxConcurrency = maxConcurrency;
        this.currentConcurrency = 0;
        this.waiting = [];
    }

    async acquire()
    {
        if (this.currentConcurrency < this.maxConcurrency)
        {
            this.currentConcurrency++;
            return Promise.resolve();
        }

        return new Promise(resolve =>
        {
            this.waiting.push(resolve);
        });
    }

    release()
    {
        this.currentConcurrency--;

        if (this.waiting.length > 0)
        {
            const nextResolve = this.waiting.shift();
            this.currentConcurrency++;
            nextResolve?.();
        }
    }
}

export
{
    Semaphore,
}
