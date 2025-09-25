"use client"

import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar"
import {Card} from "@/components/ui/card"
import {Bot, User} from "lucide-react"
import {cn} from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import {useMessages} from "@/hooks/use-messages"

interface Message {
    id?: number
    message: string
    sender?: {
        id: number
        first_name: string
        last_name: string
        avatar?: string | undefined
    } | null
    created_at: string
}

interface MessageBubbleProps {
    message: Message
    user: any
    isLast: boolean
}

export function MessageBubble({message, user, isLast}: MessageBubbleProps) {
    const isUser = message.sender?.id === user?.id
    const isAI = !message.sender

    return (
        <div
            className={cn("flex items-start space-x-3 message-slide-in", isUser && "flex-row-reverse space-x-reverse")}>
            <Avatar className="h-8 w-8 flex-shrink-0">
                {isAI ? (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary"/>
                    </div>
                ) : (
                    <>
                        <AvatarImage src={message.sender?.avatar || "/placeholder.svg"}/>
                        <AvatarFallback
                            className={cn(isUser ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}
                        >
                            {isUser ? (
                                <User className="h-4 w-4"/>
                            ) : (
                                `${message.sender?.first_name?.[0]}${message.sender?.last_name?.[0]}`
                            )}
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
                    {isAI ? (
                        <ReactMarkdown
                            components={{
                                p: ({children}) => <p
                                    className="text-sm leading-relaxed whitespace-pre-wrap">{children}</p>,
                                code: ({children}) => <code
                                    className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                ul: ({children}) => <ul className="list-disc pl-5 text-sm">{children}</ul>,
                                ol: ({children}) => <ol className="list-decimal pl-5 text-sm">{children}</ol>,
                                li: ({children}) => <li className="mb-1">{children}</li>,
                                h1: ({children}) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                h2: ({children}) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                                h3: ({children}) => <h3 className="text-sm font-semibold mb-2">{children}</h3>,
                                a: ({children, href}) => <a href={href}
                                                            className="text-primary underline">{children}</a>,
                            }}
                        >
                            {message.message}
                        </ReactMarkdown>
                    ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
                    )}
                </Card>

                <span className="text-xs text-muted-foreground mt-1 px-1">
          {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
          })}
        </span>
            </div>
        </div>
    )
}

// MessageList komponenti: messages va pendingAIMessage ni ko'rsatadi
export function MessageList({user}: { user: any }) {
    const {messages, pendingAIMessage} = useMessages(user?.chatId)
    return (
        <div>
            {messages.map((msg, idx) => (
                <MessageBubble key={msg.id || idx} message={msg} user={user}
                              isLast={idx === messages.length - 1 && !pendingAIMessage}/>
            ))}
            {pendingAIMessage && (
                <MessageBubble message={pendingAIMessage} user={user} isLast={true}/>
            )}
        </div>
    )
}
