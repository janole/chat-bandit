import { app, ipcMain } from "electron";
import { existsSync, mkdirSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import writeFileAtomic from "write-file-atomic";

export function registerStore()
{
    const dataPath = path.join(app.getPath("userData"), "data");

    if (!existsSync(dataPath))
    {
        mkdirSync(dataPath, { recursive: true });
    }

    const store = new Map<string, string>();

    function createFileName(key: string)
    {
        return path.join(dataPath, key) + ".json";
    }

    function loadData(key: string): Promise<string | undefined>
    {
        if (store.has(key)) return Promise.resolve(store.get(key));

        const fileName = createFileName(key);

        return readFile(fileName, "utf8")
            .then(data =>
            {
                store.set(key, data);
                return data;
            })
            .catch(_ => Promise.resolve(undefined));
    }

    function saveData(key: string, value: string)
    {
        store.set(key, value);

        const fileName = createFileName(key);

        return writeFileAtomic(fileName, value)
            .then(() => { console.log("SAVED", fileName) })
            .catch(e => { console.error("ERROR", fileName, e) });
    }

    ipcMain.removeHandler("get-data");
    ipcMain.handle("get-data", async (_event, key: string) =>
    {
        return loadData(key);
    });

    ipcMain.removeHandler("set-data");
    ipcMain.handle("set-data", async (_event, key: string, value: string) =>
    {
        await saveData(key, value);
    });

    ipcMain.removeHandler("remove-data");
    ipcMain.handle("remove-data", (_event, key: string) =>
    {
        store.delete(key);
    });
}
