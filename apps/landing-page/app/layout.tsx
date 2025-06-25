import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
    title: "Chat Bandit",
    description: "Chat with Local and Cloud AI. The ultimate desktop AI companion. Run local models with Ollama & llama.cpp, or connect to OpenAI, OpenRouter, Google AI and many more. Privacy-focused, lightning-fast, and infinitely customizable.",
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
