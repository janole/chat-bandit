import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron';
import { is } from '@electron-toolkit/utils';
import electronUpdater from "electron-updater";
import { join } from 'path';
import icon from "../../resources/icon.png?asset";

function createPeristentPartitionName(name: string)
{
    return "persist:" + name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

const getBackgroundColor = () => nativeTheme.shouldUseDarkColors ? "#000" : "#FFF";

nativeTheme.on('updated', () =>
{
    BrowserWindow.getAllWindows().forEach(window => window.setBackgroundColor(
        getBackgroundColor()
    ));
});

let mainWindow: BrowserWindow;

export function createMainWindow(): BrowserWindow
{
    // Create the browser window.
    const window = new BrowserWindow({
        title: `${app.name}`,
        resizable: true,
        fullscreenable: false,
        // transparent: true, // Enable transparency
        // vibrancy: "fullscreen-ui",
        backgroundColor: getBackgroundColor(),
        width: 1024,
        height: 768,
        minWidth: 1024,
        minHeight: 768,
        show: false,
        titleBarStyle: "hidden",
        trafficLightPosition: { x: 20, y: 20 },
        ...(process.platform === "linux" ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, "../preload/index.mjs"),
            sandbox: false,
            partition: createPeristentPartitionName(app.getName()),
        },
    });

    window.maximize();

    window.on("ready-to-show", () =>
    {
        window.show();
    });

    window.webContents.setWindowOpenHandler((details) =>
    {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    window.webContents.on("did-finish-load", () =>
    {
        electronUpdater.autoUpdater.autoDownload = false;
        electronUpdater.autoUpdater.forceDevUpdateConfig = true;
    });

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env["ELECTRON_RENDERER_URL"])
    {
        window.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    }
    else
    {
        window.loadFile(join(__dirname, "../renderer/index.html"));
    }

    return mainWindow = window;
}

export const getMainWindow = () => mainWindow;

// TODO: refactor ...
export function send(channel: string, ...args: any[]): void
{
    // BrowserWindow.getAllWindows().forEach(window => window.webContents.send(channel, ...args));
    mainWindow.webContents.send(channel, ...args);
    windows.forEach(window => window.webContents.send(channel, ...args));
}

export interface ICreateWindowOptions
{
    title?: string;

    parent?: BrowserWindow;
    modal?: boolean;

    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;

    minimizable?: boolean;
    maximizable?: boolean;
    fullscreenable?: boolean;
}

const windows = new Map<string, BrowserWindow>();

export function createWindow(id: string, url: string, options?: ICreateWindowOptions): BrowserWindow
{
    let window = windows.get(id);

    if (!window)
    {
        window = new BrowserWindow({
            backgroundColor: getBackgroundColor(),
            ...options,
            show: false,
            titleBarStyle: "hidden",
            trafficLightPosition: { x: 20, y: 20 },
            ...(process.platform === "linux" ? { icon } : {}),
            webPreferences: {
                preload: join(__dirname, "../preload/index.mjs"),
                sandbox: false,
                partition: createPeristentPartitionName(app.getName()),
            },
        });

        windows.set(id, window);

        window.once('ready-to-show', () => window?.show());

        window.on('closed', () =>
        {
            window = undefined;
            windows.delete(id);
        });

        window.webContents.setWindowOpenHandler((details) =>
        {
            shell.openExternal(details.url);

            return { action: "deny" };
        });
    }
    else
    {
        window.restore();
    }

    window.focus();

    const currentURL = window.webContents.getURL();

    // If the current URL is not the same as the requested URL, load the new URL.
    if (!currentURL?.endsWith(url.replace(/^\//, "#/")))
    {
        // HMR for renderer base on electron-vite cli.
        // Load the remote URL for development or the local html file for production.
        if (is.dev && process.env["ELECTRON_RENDERER_URL"])
        {
            window.loadURL(process.env["ELECTRON_RENDERER_URL"] + '/#/' + url.replace(/^\//, ""));
        }
        else
        {
            window.loadFile(join(__dirname, "../renderer/index.html"), {
                hash: "#/" + url.replace(/^\//, "")
            });
        }
    }

    return window;
}

const browser = new Map<string, BrowserWindow>();

interface IBrowserWindowOptions extends ICreateWindowOptions
{
    userAgent?: string;
}

export function createBrowser(id: string, url: string, options?: IBrowserWindowOptions): BrowserWindow
{
    let window = browser.get(id);

    if (!window)
    {
        window = new BrowserWindow({
            backgroundColor: getBackgroundColor(),
            ...options,
            show: false,
            // titleBarStyle: "hidden",
            // trafficLightPosition: { x: 20, y: 20 },
            ...(process.platform === "linux" ? { icon } : {}),
            webPreferences: {
                // preload: join(__dirname, "../preload/index.mjs"),
                sandbox: true,
                contextIsolation: true,
                nodeIntegration: false,
                partition: createPeristentPartitionName(id),
            },
        });

        browser.set(id, window);

        window.once('ready-to-show', () => window?.show());

        window.on('closed', () =>
        {
            window = undefined;
            browser.delete(id);
        });
    }
    else
    {
        window.restore();
    }

    window.focus();

    if (options?.userAgent)
    {
        window.webContents.session.setUserAgent(options.userAgent);
    }

    const currentURL = window.webContents.getURL();

    if (currentURL != url)
    {
        window.loadURL(url);
    }

    return window;
}

export function registerWindowManager()
{
    ipcMain.removeHandler("create-window");
    ipcMain.handle("create-window", async (_event, id: string, url: string, options?: ICreateWindowOptions) =>
    {
        createWindow(id, url, options);
    });

    ipcMain.removeHandler("close-window");
    ipcMain.handle("close-window", async (_event, id: string) =>
    {
        windows.get(id)?.close();
        windows.delete(id);
    });

    ipcMain.removeHandler("open-browser");
    ipcMain.handle("open-browser", async (_event, id: string, url: string, options?: ICreateWindowOptions) =>
    {
        createBrowser(id, url, options);
    });

    ipcMain.removeHandler("focus-main-window");
    ipcMain.handle("focus-main-window", (_event) => 
    {
        mainWindow?.focus();
    });
}

export default {
    createWindow,
    registerWindowManager,
};
