import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_METADATA_BASE_URL || "https://chat-bandit.janole.com"),
    authors: [{ name: "Jan Ole Suhr", url: "https://janole.com" }],
    creator: "Jan Ole Suhr",
    title: "Chat Bandit",
    description: "Chat with Local and Cloud AI. The ultimate desktop AI companion. Run local models with Ollama & llama.cpp, or connect to OpenAI, OpenRouter, Google AI and many more. Privacy-focused, lightning-fast, and infinitely customizable.",
    applicationName: "Chat Bandit Landing Page",
    keywords: ["Chat Bandit", "AI", "Chatbot", "LLM", "Ollama", "llama.cpp"],
    icons: {
        icon: "/icon.png",
    },
    twitter: {
        card: "summary_large_image",
        images: "/screenshot-light.png",
        site: "@ChatBanditApp",
        creator: "@janole",
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
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
