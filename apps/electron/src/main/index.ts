import { app, BrowserWindow, Menu, ipcMain } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import electronUpdater from "electron-updater";
import { tryCatchCache } from "@janole/try-catch";
import { registerAdapter } from "@janole/ai-electron/electron";
import { registerStore } from "../libraries/electron-store/server";
import { createMainWindow, registerWindowManager, send } from "./WindowManager";
import { createMenu } from "./MenuManager";

function registerAutoUpdater()
{
    let updateCheckResult: electronUpdater.UpdateCheckResult | null | undefined;
    let state: "idle" | "downloading" | "update-ready" | "download-failed" = "idle";

    ipcMain.removeHandler("check-for-update");
    ipcMain.handle("check-for-update", async (_event) =>
    {
        if (!updateCheckResult?.updateInfo?.version)
        {
            console.log("CHECK FOR UPDATE");

            const response = await tryCatchCache(electronUpdater.autoUpdater.checkForUpdates(), {
                key: "app-update",
                ttlSeconds: 60 * 60,
            });

            updateCheckResult = response.result;
        }

        return { result: { ...updateCheckResult?.updateInfo, state } };
    });

    ipcMain.removeHandler("download-update");
    ipcMain.handle("download-update", async (_event) =>
    {
        state = "downloading";
        send("app-update-info", { ...updateCheckResult?.updateInfo, state });

        electronUpdater.autoUpdater.downloadUpdate(updateCheckResult?.cancellationToken)
            .then(() => 
            {
                state = "update-ready";
                send("app-update-info", { ...updateCheckResult?.updateInfo, state });
            })
            .catch(e =>
            {
                console.error("ERROR", e);

                state = "download-failed";
                send("app-update-info", { ...updateCheckResult?.updateInfo, state });
            });
    });

    ipcMain.removeHandler("restart-and-install-update");
    ipcMain.handle("restart-and-install-update", async (_event) =>
    {
        console.log("Restart and install ...");
        electronUpdater.autoUpdater.quitAndInstall();
    });

    electronUpdater.autoUpdater.removeAllListeners("download-progress");
    electronUpdater.autoUpdater.on("download-progress", progress =>
    {
        send("app-update-info", { ...updateCheckResult?.updateInfo, state, progress });
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() =>
{
    // Set app user model id for windows
    electronApp.setAppUserModelId("com.janole.chat-bandit");

    // const menu = Menu.getApplicationMenu() || Menu.buildFromTemplate([]);
    // console.log(menu.items.map(item => ([item.role, [...item.submenu?.items?.map(item => item.role + ", " + item.label + ", " + item.type)]])));

    Menu.setApplicationMenu(createMenu());

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on("browser-window-created", (_, window) =>
    {
        optimizer.watchWindowShortcuts(window);
    });

    registerWindowManager();
    registerStore();
    registerAdapter({ send });
    registerAutoUpdater();

    createMainWindow();

    // createBrowser("google-search-browser", "https://www.google.com", {
    //     userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0",
    // });

    app.on("activate", function ()
    {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0)
        {
            createMainWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () =>
{
    if (process.platform !== "darwin")
    {
        app.quit();
    }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
