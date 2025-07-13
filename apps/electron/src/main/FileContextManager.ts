import { dialog, ipcMain } from "electron";
import { getMainWindow } from "./WindowManager";
import glob from "fast-glob";

export default function registerFileContextManager()
{
    ipcMain.removeHandler("open-directory-dialog");
    ipcMain.handle("open-directory-dialog", async (_event) =>
    {
        const result = await dialog.showOpenDialog(getMainWindow(), {
            properties: ['openDirectory']
        });

        if (!result.canceled)
        {
            // Handle the selected directory path
            const selectedDirectory = result.filePaths[0];
            console.log('Selected directory:', selectedDirectory);

            const ignore = [
                '**/node_modules/**',
                '**/.git/**',
                '**/bin/**',
                '**/build/**',
                '**/dist/**',
                '**/out/**',
            ];

            const files = await glob.glob(['**/*'], { cwd: selectedDirectory, ignore, onlyFiles: true, dot: true, absolute: true });

            // const files = await glob("**/*", {
            //     ignore,
            //     cwd: selectedDirectory,
            //     dot: true,
            //     absolute: true,
            // });

            console.log(files);
        }
    });
}
