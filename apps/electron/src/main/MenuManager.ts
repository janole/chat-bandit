import { app, Menu, MenuItemConstructorOptions, shell } from "electron";

import { createWindow, send } from "./WindowManager";

const macTemplate: MenuItemConstructorOptions[] = [
    {
        label: app.name,
        role: "appMenu",
        submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
        ],
    },
    {
        role: "fileMenu",
        submenu: [
            {
                label: "New Chat",
                accelerator: "Command+N",
                click: () => send("new-chat"),
            },
            { type: "separator" },
            { role: "close" },
        ],
    },
    {
        role: "editMenu",
        submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" },
            { role: "paste" },
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
        ],
    },
    {
        role: "viewMenu",
        submenu: [
            {
                label: "Model Manager",
                accelerator: "Command+M",
                click: () => 
                {
                    // TODO: refactor -> see ElectronClient.ts
                    createWindow("model-manager", "/model/manager", {
                        title: `${import.meta.env.VITE_APP_NAME} - Model Manager`,
                        width: 1280,
                    });
                },
            },
            { type: "separator" },

            /* Add dev tools */
            ...(!app.isPackaged ? [
                { role: "reload" },
                { role: "forceReload" },
                { role: "toggleDevTools" },
                { type: "separator" }
            ] as MenuItemConstructorOptions[] : []),

            { role: "resetZoom" },
            { role: "zoomIn" },
            { role: "zoomOut" },
        ],
    },
    {
        role: "windowMenu",
        submenu: [
            { role: "minimize" },
            { role: "zoom" },
            { type: "separator" },
            { role: "front" },
        ],
    },
    {
        role: "help",
        submenu: [
            {
                label: "Open Source Licenses",
                click: () => 
                {
                    // TODO: refactor -> see ElectronClient.ts
                    createWindow("about", "/licenses", {
                        title: `${import.meta.env.VITE_APP_NAME} - Open-Source Licenses`,
                    });
                },
            },
            { type: "separator" },
            {
                label: `${import.meta.env.VITE_APP_NAME} Website`,
                click: () => 
                {
                    shell.openExternal(import.meta.env.VITE_APP_HOMEPAGE);
                },
            },
            {
                label: `${import.meta.env.VITE_APP_NAME} on GitHub`,
                click: () => 
                {
                    shell.openExternal(import.meta.env.VITE_APP_GITHUB);
                },
            },
        ],
    },
];

export function createMenu()
{
    return Menu.buildFromTemplate(macTemplate);
}
