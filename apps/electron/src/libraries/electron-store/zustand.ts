import { StateStorage } from "zustand/middleware";

export const electronStorage: StateStorage =
{
    getItem(name)
    {
        return window.electron.ipcRenderer.invoke("get-data", name);
    },
    setItem(name, value)
    {
        return window.electron.ipcRenderer.invoke("set-data", name, value);
    },
    removeItem(name)
    {
        return window.electron.ipcRenderer.invoke("remove-data", name);
    },
}
