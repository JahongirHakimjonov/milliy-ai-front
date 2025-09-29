"use client"

import type React from "react"
import {useEffect, useRef, useState} from "react"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
import {Bot, Paperclip, Send, Sparkles, X} from "lucide-react"
import {useAuth} from "@/hooks/use-auth"
import {useMessages} from "@/hooks/use-messages"
import {useWebSocket} from "@/hooks/use-websocket"
import {TypingIndicator} from "@/components/typing-indicator"
import {MessageBubble} from "@/components/message-bubble"
import {BASE_URL} from "@/lib/utils"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"
import {Switch} from "@/components/ui/switch"
import {Label} from "@/components/ui/label"

interface ChatAreaProps {
    chatId: number | null
}

export function ChatArea({chatId}: ChatAreaProps) {
    const [message, setMessage] = useState("")
    const [attachedFileIds, setAttachedFileIds] = useState<number[]>([])
    const [attachedFileNames, setAttachedFileNames] = useState<string[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [invalidFiles, setInvalidFiles] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    // Action state
    const [actionEnabled, setActionEnabled] = useState(false)
    const [actionType, setActionType] = useState<string>("generate_file")
    const [actionFormat, setActionFormat] = useState<string>("pdf")

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const {user} = useAuth()
    const {messages, isLoading, pendingAIMessage, addMessage, addAIChunk, finishAIMessage} = useMessages(chatId)
    const {sendMessage, isConnected} = useWebSocket(chatId, {addMessage, addAIChunk, finishAIMessage}, user)

    const scrollToBottom = () => {
        // более надёжная прокрутка после рендера
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({behavior: "auto"})
        })
    }

    useEffect(() => {
        if (!isLoading && (messages.length > 0 || pendingAIMessage)) {
            scrollToBottom()
        }
    }, [messages.length, pendingAIMessage?.message, isLoading])

    const handleSendMessage = async () => {
        if (!chatId || !isConnected) return
        const text = message.trim()
        // message required
        if (!text) return

        // require action fields if enabled
        if (actionEnabled && (!actionType || !actionFormat)) return

        const options: { file_ids?: number[]; action?: { type: string; format: string } } = {}
        if (attachedFileIds.length) options.file_ids = [...attachedFileIds]
        if (actionEnabled) options.action = {type: actionType, format: actionFormat}

        setMessage("")
        setAttachedFileIds([])
        setAttachedFileNames([])
        try {
            await sendMessage(text, options)
        } catch (error) {
            console.error("Failed to send message:", error)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const onClickAttach = () => {
        if (!isConnected || !chatId) return
        fileInputRef.current?.click()
    }

    // Разрешённые расширения
    const allowedExt = new Set(["pdf", "doc", "docx", "pptx"]) as Set<string>

    const uploadFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
        if (!token) {
            console.warn("No access token, cannot upload files")
            return
        }

        setIsUploading(true)
        const newIds: number[] = []
        const newNames: string[] = []
        const skipped: string[] = []

        for (const file of Array.from(files)) {
            const ext = (file.name.split(".").pop() || "").toLowerCase()
            if (!allowedExt.has(ext)) {
                skipped.push(file.name)
                continue
            }
            try {
                const form = new FormData()
                form.append("file", file)
                const res = await fetch(`${BASE_URL}/api/v1/chat/resource/`, {
                    method: "POST",
                    headers: {Authorization: `Bearer ${token}`},
                    body: form,
                })
                if (!res.ok) {
                    console.error("File upload failed:", res.status, await res.text())
                    continue
                }
                const data = await res.json().catch(() => null)
                let id: number | undefined
                if (data) {
                    // поддержим несколько возможных форматов ответа
                    if (typeof data.id === "number") id = data.id
                    else if (data.data && typeof data.data.id === "number") id = data.data.id
                }
                if (typeof id === "number") {
                    newIds.push(id)
                    newNames.push(file.name)
                } else {
                    console.warn("Upload response missing id for file", file.name, data)
                }
            } catch (err) {
                console.error("Upload error for file", file.name, err)
            }
        }

        if (newIds.length) {
            setAttachedFileIds(prev => [...prev, ...newIds])
            setAttachedFileNames(prev => [...prev, ...newNames])
        }
        if (skipped.length) {
            setInvalidFiles(skipped)
            // автоочистка предупреждения
            setTimeout(() => setInvalidFiles([]), 6000)
        }
        setIsUploading(false)
        // очистить input, чтобы повторно можно было выбирать те же файлы
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const onFilesSelected: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        uploadFiles(e.target.files)
    }

    if (!chatId) {
        return (
            <div className="flex-1 flex items-center justify-center bg-background">
                <div className="text-center">
                    <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4"/>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to MILLIY AI Chat</h2>
                    <p className="text-muted-foreground max-w-md">
                        Select a conversation from the sidebar or create a new one to start chatting with your AI
                        assistant.
                    </p>
                </div>
            </div>
        )
    }

    const sendDisabled = !message.trim() || !isConnected || (actionEnabled && (!actionType || !actionFormat))

    return (
        <div className="flex-1 flex flex-col bg-background">
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-primary"/>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-card-foreground">MILLIY AI Assistant</h2>
                            <div className="flex items-center space-x-2">
                                <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}/>
                                <span
                                    className="text-xs text-muted-foreground">{isConnected ? "Connected" : "Disconnected"}</span>
                            </div>
                        </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                        <Sparkles className="h-3 w-3 mr-1"/>
                        AI Powered
                    </Badge>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div
                            className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                        <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4"/>
                        <h3 className="text-lg font-medium text-foreground mb-2">Start a conversation</h3>
                        <p className="text-muted-foreground">Ask me anything! I'm here to help with your questions and
                            tasks.</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <MessageBubble key={msg.id || index} message={msg} user={user}
                                           isLast={index === messages.length - 1 && !pendingAIMessage}/>
                        ))}
                        {pendingAIMessage && (
                            <MessageBubble message={pendingAIMessage} user={user} isLast={true}/>
                        )}
                    </>
                )}

                {/* Показываем индикатор только до первого чанка */}
                {pendingAIMessage && pendingAIMessage.message.length === 0 && <TypingIndicator/>}
                <div ref={messagesEndRef}/>
            </div>

            {/* Action controls */}
            <div className="px-4 pb-2 bg-card border-t border-border/50">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3">
                        <Switch id="toggle-action" checked={actionEnabled} onCheckedChange={setActionEnabled}/>
                        <Label htmlFor="toggle-action" className={`text-sm ${actionEnabled ? "text-foreground" : "text-muted-foreground"}`}>Action</Label>
                    </div>
                    <div className={`flex items-center gap-3 flex-wrap rounded-md ${actionEnabled ? "" : "opacity-60"}`}>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Type</Label>
                            <Select value={actionType} onValueChange={setActionType}>
                                <SelectTrigger disabled={!actionEnabled} className="w-40">
                                    <SelectValue placeholder="Select type"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="generate_file">generate_file</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">Format</Label>
                            <Select value={actionFormat} onValueChange={setActionFormat}>
                                <SelectTrigger disabled={!actionEnabled} className="w-32">
                                    <SelectValue placeholder="Select format"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pdf">pdf</SelectItem>
                                    <SelectItem value="docx">docx</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {!actionEnabled && (
                            <span className="text-xs text-muted-foreground">Enable Action to select</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
                <div className="flex items-end space-x-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"
                            onClick={onClickAttach} disabled={!isConnected || !chatId || isUploading}>
                        <Paperclip className="h-4 w-4"/>
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                        onChange={onFilesSelected}
                    />
                    <div className="flex-1">
                        <Input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            className="bg-input border-border focus:border-primary"
                            disabled={!isConnected || !chatId}
                        />
                        {(attachedFileIds.length > 0 || isUploading || invalidFiles.length > 0) && (
                            <div className="mt-2 flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                                {isUploading && <span className="inline-flex items-center">Uploading...</span>}
                                {attachedFileNames.map((n, i) => (
                                    <span key={`${n}-${i}`}
                                          className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-foreground">
                                        {n}
                                    </span>
                                ))}
                                {attachedFileIds.length > 0 && (
                                    <button type="button" onClick={() => {
                                        setAttachedFileIds([]);
                                        setAttachedFileNames([]);
                                    }}
                                            className="inline-flex items-center gap-1 text-foreground/70 hover:text-foreground">
                                        <X className="h-3 w-3"/> Clear attachments
                                    </button>
                                )}
                                {invalidFiles.length > 0 && (
                                    <span className="w-full text-[11px] text-red-500">Faqat .pdf, .doc, .docx, .pptx fayllarni yuklash mumkin: {invalidFiles.join(", ")}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <Button onClick={handleSendMessage} disabled={sendDisabled}
                            className="bg-primary hover:bg-primary/90">
                        <Send className="h-4 w-4"/>
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    AI can make mistakes. Please verify important information.
                </p>
            </div>
        </div>
    )
}
