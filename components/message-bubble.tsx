"use client"

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar"
import {Card} from "@/components/ui/card"
import {Bot, File as FileIcon, User} from "lucide-react"
import {cn} from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import type {File as ChatFile, Message as ChatMessage} from "@/hooks/use-messages"

interface MessageBubbleProps {
    message: ChatMessage
    user: any
    isLast: boolean
}

export function MessageBubble({message, user, isLast: _isLast}: MessageBubbleProps) {
    const isUser = !!message.sender && message.sender?.id === user?.id
    const isAI = !message.sender

    const files: ChatFile[] = Array.isArray(message.file) ? message.file : []
    const hasFiles = files.length > 0

    const showText = isAI ? !hasFiles && !!message.message : !!message.message

    // Скачивание файла без открытия новой вкладки
    const handleDownload = (url: string, name: string) => {
        try {
            const a = document.createElement("a")
            a.href = url
            a.download = name || "download"
            a.style.display = "none"
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch (e) {
            // в случае ограничений браузера всё равно попытаемся перейти по ссылке
            window.location.href = url
        }
    }

    const renderAttachments = (list: ChatFile[]) => {
        if (!list.length) return null
        return (
            <div className={cn("mt-2 flex flex-col gap-2", isUser && "items-end")} aria-label="attachments">
                {list.map((f) => {
                    const isImage = (f.type || "").startsWith("image/")
                    const href = f.file || "#"
                    const name = f.name || "Attachment"
                    return (
                        <div key={f.id ?? `${name}-${href}`} className={cn("max-w-full", isUser && "items-end")} title={name}>
                            {isImage ? (
                                <a
                                    href={href}
                                    onClick={(e) => { e.preventDefault(); handleDownload(href, name) }}
                                    className="block"
                                    download={name}
                                    target="_blank"
                                >
                                    <img
                                        src={href}
                                        alt={name}
                                        className={cn("max-h-64 w-auto rounded border border-border", isUser ? "ml-auto" : "")}
                                        onError={(e) => {
                                            e.currentTarget.onerror = null
                                            e.currentTarget.src = "/placeholder.svg"
                                        }}
                                    />
                                    <div className={cn("text-xs mt-1 truncate text-foreground/80", isUser ? "text-right" : "")}>{name}</div>
                                </a>
                            ) : (
                                <a
                                    href={href}
                                    onClick={(e) => { e.preventDefault(); handleDownload(href, name) }}
                                    className={cn(
                                        "inline-flex items-center gap-2 px-3 py-2 rounded border border-border bg-muted/40 text-sm hover:bg-muted",
                                        isUser ? "ml-auto" : ""
                                    )}
                                    download={name}
                                >
                                    <FileIcon className="h-4 w-4"/>
                                    <span className="truncate max-w-[240px]" title={name}>{name}</span>
                                </a>
                            )}
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className={cn("flex items-start space-x-3 message-slide-in", isUser && "flex-row-reverse space-x-reverse")}>
            <Avatar className="h-8 w-8 flex-shrink-0">
                {isAI ? (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary"/>
                    </div>
                ) : (
                    <>
                        <AvatarImage src={message.sender?.avatar || "/placeholder.svg"}/>
                        <AvatarFallback className={cn(isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
                            {isUser ? <User className="h-4 w-4"/> : `${message.sender?.first_name?.[0]}${message.sender?.last_name?.[0]}`}
                        </AvatarFallback>
                    </>
                )}
            </Avatar>

            <div className={cn("flex flex-col max-w-[70%]", isUser && "items-end")}>
                <Card
                    className={cn(
                        "p-3 shadow-sm",
                        isUser && "bg-primary text-primary-foreground border-primary",
                        isAI && "bg-card border-border",
                        !isUser && !isAI && "bg-secondary border-secondary",
                    )}
                >
                    {showText && (
                        isAI ? (
                            <ReactMarkdown
                                components={{
                                    p: ({children}) => <p className="text-sm leading-relaxed whitespace-pre-wrap">{children}</p>,
                                    a: ({children, href}) => <a href={href as string} className="text-primary underline">{children}</a>,
                                }}
                            >
                                {message.message}
                            </ReactMarkdown>
                        ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                        )
                    )}
                    {hasFiles && renderAttachments(files)}
                </Card>

                <span className="text-xs text-muted-foreground mt-1 px-1">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>
        </div>
    )
}
