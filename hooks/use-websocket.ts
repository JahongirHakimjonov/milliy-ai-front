"use client"

import {useEffect, useRef, useState} from "react"
import {BASE_URL, WS_URL} from "@/lib/utils"
import type {Message} from "./use-messages"

type Handlers = {
    addMessage: (msg: Message) => void
    addAIChunk: (chunk: string) => void
    finishAIMessage: () => void
}

export function useWebSocket(
    chatId: number | null,
    handlers: Handlers,
    user?: { id: number; first_name: string; last_name: string; avatar?: string | null } | null,
) {
    const [isConnected, setIsConnected] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)
    const handlersRef = useRef<Handlers>(handlers)
    const userRef = useRef<typeof user | undefined>(user)
    const reconnectRef = useRef<{ tries: number; timer?: number | null }>({tries: 0, timer: null})
    const pingRef = useRef<number | null>(null)

    handlersRef.current = handlers
    userRef.current = user

    useEffect(() => {
        reconnectRef.current.tries = 0
        reconnectRef.current.timer && clearTimeout(reconnectRef.current.timer)
    }, [chatId])

    useEffect(() => {
        if (!chatId) {
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
            setIsConnected(false)
            return
        }

        const token = localStorage.getItem("access_token")
        if (!token) {
            console.warn("No access_token found - WebSocket will not connect")
            return
        }

        let ws: WebSocket | null = null
        let closedByUs = false

        const startPing = () => {
            stopPing()
            pingRef.current = window.setInterval(() => {
                try {
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({type: "ping"}))
                    }
                } catch {
                    /* ignore */
                }
            }, 25000)
        }
        const stopPing = () => {
            if (pingRef.current) {
                clearInterval(pingRef.current)
                pingRef.current = null
            }
        }

        const connect = () => {
            const url = `${WS_URL.replace(/\/+$/, "")}/ws/chat/${chatId}/?token=${encodeURIComponent(token)}`
            try {
                ws = new WebSocket(url)
            } catch (err) {
                console.error("WebSocket constructor failed:", err)
                scheduleReconnect()
                return
            }
            wsRef.current = ws

            ws.onopen = () => {
                reconnectRef.current.tries = 0
                setIsConnected(true)
                startPing()
                console.log("WebSocket connected", chatId)
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    const h = handlersRef.current

                    // обработка запроса генерации файла
                    if (data.type === "ai_file" && typeof data.file_url === "string") {
                        h.finishAIMessage()
                        const toAbs = (u: string) => u.startsWith("http") ? u : `${BASE_URL.replace(/\/+$/, "")}/${u.replace(/^\/+/, "")}`
                        const absUrl = toAbs(data.file_url)
                        const name = absUrl.split("/").pop() || "generated_file"
                        const ext = (name.split(".").pop() || "").toLowerCase()
                        let mime = "application/octet-stream"
                        if (ext === "pdf") mime = "application/pdf"
                        else if (ext === "docx") mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        else if (ext === "doc") mime = "application/msword"
                        else if (ext === "pptx") mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                        const fileObj: NonNullable<Message["file"]>[number] = {
                            id: Date.now(),
                            user: 0,
                            name,
                            size: 0,
                            file: absUrl,
                            type: mime,
                            created_at: new Date().toISOString(),
                        }
                        const aiMsg: Message = {
                            id: Date.now() + 1,
                            message: "",
                            sender: null,
                            file: [fileObj],
                            created_at: new Date().toISOString(),
                        }
                        h.addMessage(aiMsg)
                        return
                    }

                    // явный старт генерации AI
                    if (data.type === "ai_start") {
                        h.addAIChunk("")
                        return
                    }

                    if (data.type === "ai_chunk" && typeof data.chunk === "string") {
                        h.addAIChunk(data.chunk)
                        return
                    }

                    if (data.type === "ai_end") {
                        h.finishAIMessage()
                        return
                    }

                    // Если пришел полноценный ответ ассистента без ai_end
                    if (!data.type && data.user === "assistant" && typeof data.message === "string") {
                        h.finishAIMessage()
                        const aiMsg: Message = {
                            id: Date.now(),
                            message: data.message,
                            sender: null,
                            created_at: new Date().toISOString(),
                        }
                        h.addMessage(aiMsg)
                        return
                    }

                    // Обычное сохранённое сообщение
                    if (!data.type && data.id && data.message && data.created_at) {
                        h.addMessage(data as Message)
                        return
                    }

                    console.warn("Unhandled websocket message format:", data)
                } catch (error) {
                    console.error("Failed to parse WebSocket message:", error)
                }
            }

            ws.onclose = (ev) => {
                wsRef.current = null
                setIsConnected(false)
                stopPing()
                if (!closedByUs) {
                    console.warn("WebSocket closed unexpectedly, scheduling reconnect", ev.reason)
                    scheduleReconnect()
                } else {
                    console.log("WebSocket closed")
                }
            }

            ws.onerror = (err) => {
                console.error("WebSocket error:", err)
            }
        }

        const scheduleReconnect = () => {
            const tries = (reconnectRef.current.tries || 0) + 1
            reconnectRef.current.tries = tries
            const delay = Math.min(30000, 500 * Math.pow(2, Math.max(0, tries - 1)))
            reconnectRef.current.timer = window.setTimeout(() => {
                connect()
            }, delay)
        }

        connect()

        return () => {
            reconnectRef.current.timer && clearTimeout(reconnectRef.current.timer)
            stopPing()
            if (wsRef.current) {
                closedByUs = true
                try { wsRef.current.close() } catch { /* ignore */ }
                wsRef.current = null
            }
            setIsConnected(false)
        }
    }, [chatId])

    /**
     * Send message via websocket (also optimistic local add).
     */
    const sendMessage = async (
        message: string,
        options?: { file_ids?: number[]; action?: { type: string; format: string } }
    ) => {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket not connected")
        }

        if (userRef.current) {
            const optimistic: Message = {
                id: Date.now(),
                message,
                sender: {
                    id: userRef.current.id,
                    first_name: userRef.current.first_name,
                    last_name: userRef.current.last_name,
                    avatar: userRef.current.avatar ?? undefined,
                },
                created_at: new Date().toISOString(),
            }
            handlersRef.current.addMessage(optimistic)
        }

        try {
            const payload: Record<string, any> = { message }
            if (options?.file_ids && options.file_ids.length > 0) payload.file_ids = options.file_ids
            if (options?.action && options.action.type && options.action.format) payload.action = options.action
            ws.send(JSON.stringify(payload))
        } catch (err) {
            console.error("Failed to send websocket message:", err)
            throw err
        }
    }

    return {
        isConnected,
        sendMessage,
    }
}
