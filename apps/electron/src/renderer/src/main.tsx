import React from 'react';
import ReactDOM from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';

import "./main.css";

const router = createHashRouter([
    {
        path: "/",
        lazy: () => import('@renderer/Chat/Start'),
    },
    {
        path: "/chat/:id?",
        lazy: () => import('@renderer/Chat/Chat'),
    },
    {
        path: "/onboarding",
        lazy: () => import('@renderer/Chat/Onboarding'),
    },
    {
        path: "/model/manager",
        lazy: () => import('@renderer/Chat/ModelManager'),
    },
    {
        path: "/licenses",
        lazy: () => import('@renderer/OpenSourceLicenses'),
    },
]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
)
