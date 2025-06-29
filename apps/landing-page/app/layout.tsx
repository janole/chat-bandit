import type { Metadata } from "next";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_METADATA_BASE_URL || "https://chatbandit.de";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    authors: [{ name: "Jan Ole Suhr", url: "https://janole.com" }],
    creator: "Jan Ole Suhr",
    title: "Chat Bandit",
    description: "Chat with Local and Cloud AI. The ultimate desktop AI companion. Run local models with Ollama & llama.cpp, or connect to OpenAI, OpenRouter, Google AI and many more. Privacy-focused, lightning-fast, and infinitely customizable.",
    applicationName: "Chat Bandit Landing Page",
    keywords: [
        "Chat Bandit",
        "AI Chatbot",
        "Desktop AI",
        "Offline AI",
        "Local AI",
        "Private AI",
        "MacOS",
        "AI",
        "Chatbot",
        "LLM",
        "Ollama",
        "llama.cpp",
        "GGUF",
        "Electron",
        "OpenAI",
        "Gemini",
        "OpenRouter",
        "AI Assistant",
    ],
    icons: {
        icon: "/icon.png",
    },
    twitter: {
        card: "summary_large_image",
        images: [{ url: "/screenshot-light.png" }],
        site: "@ChatBanditApp",
        creator: "@janole",
    },
    openGraph: {
        type: "website",
        url: SITE_URL,
        title: "Chat Bandit - The friendly and powerful desktop AI chatbot supporting both local and cloud AI models.",
        description: "Chat with Local and Cloud AI. The ultimate desktop AI companion. Run local models with Ollama & llama.cpp, or connect to OpenAI, OpenRouter, Google AI and many more. Privacy-focused, lightning-fast, and infinitely customizable.",
        images: [{ url: "/screenshot-light.png" }],
    },
    robots: "index, follow",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>)
{
    return (
        <html lang="en">
            <AppRouterCacheProvider>
                <body className="antialiased">
                    {children}
                </body>
            </AppRouterCacheProvider>
        </html>
    );
}
