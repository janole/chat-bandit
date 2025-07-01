/// <reference types="vite/client" />

interface ImportMetaEnv
{
    VITE_APP_NAME: string;
    VITE_APP_VERSION: string;
    VITE_WITH_FEATURE_PROJECTS: string;
    VITE_WITH_FEATURE_VOICE: string;
}

interface ImportMeta
{
    env: ImportMetaEnv;
}
