import type React from "react"
import {Suspense} from "react"
import type {Metadata} from "next"
import {GeistSans} from "geist/font/sans"
import {GeistMono} from "geist/font/mono"
import {Analytics} from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
    title: "MILLIY AI Chat Assistant",
    description: "Intelligent chat application with AI-powered responses",
    generator: "Next.js",
    applicationName: "MILLIY AI Chat Assistant",
    referrer: "origin-when-cross-origin",
    keywords: [
        "AI",
        "Chat",
        "Assistant",
        "Next.js",
        "TypeScript",
        "Tailwind CSS",
        "OpenAI",
        "WebSocket",
        "Real-time",
        "Chatbot",
    ],
    authors: [{name: "MILLIY Tech", url: "https://milliytech.uz"}],
    creator: "MILLIY Tech",
    publisher: "MILLIY Tech",
    metadataBase: new URL("https://ai.milliytech.uz"),
    openGraph: {
        title: "MILLIY AI Chat Assistant",
        description: "Intelligent chat application with AI-powered responses",
        url: "https://ai-chat.milliytech.uz",
        siteName: "MILLIY AI Chat Assistant",
        images: [
            {
                url: "https://ai-chat.milliytech.uz/og-image.png",
                width: 736,
                height: 736,
                alt: "MILLIY AI Chat Assistant",
            },
        ],
        locale: "en-US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "MILLIY AI Chat Assistant",
        description: "Intelligent chat application with AI-powered responses",
        images: ["https://ai-chat.milliytech.uz/og-image.png"],
        creator: "@milliytech",
    },
    icons: {
        icon: "/favicon.ico",
    }
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" className="dark">
        <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics/>
        </body>
        </html>
    )
}
