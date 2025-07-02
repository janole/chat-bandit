import Store from "electron-store";

interface ICreateStoreProps<A, C>
{
    name: string;
    createClient: (account: A) => C;
}

export function createAccountStore<A, C>(props: ICreateStoreProps<A, C>)
{
    const store = new Store({ name: props.name });

    const key = (id: string) => "accounts." + btoa(id);

    const get = (id: string) => store.get(key(id)) as (A | undefined);
    const set = (id: string, model: A) => store.set(key(id), model);
    const has = (id: string) => store.has(key(id));
    const remove = (id: string) => store.delete(key(id));
    const list = () => Object.values(store.get("accounts") ?? {}) as A[];

    const clients: { [id: string]: C } = {};

    // TODO: refactor checking for apiKey
    function getClient(id: string)
    {
        if (clients[id])
        {
            return clients[id];
        }

        const account = get(id);

        if (!account)
        {
            throw new Error("Invalid account id");
        }

        clients[id] = props.createClient(account);

        return clients[id];
    }

    return {
        set,
        get,
        has,
        remove,

        list,

        getClient,
    };
}
