"use client"

import {useEffect, useRef, useState} from "react"
import {WS_URL} from "@/lib/utils"
import type {Message} from "./use-messages"

type Handlers = {
    addMessage: (msg: Message) => void
    addAIChunk: (chunk: string) => void
    finishAIMessage: () => void
}

/**
 * A robust WebSocket hook for chat streaming.
 *
 * - automatically reconnects with exponential backoff (capped)
 * - uses handler refs to avoid stale closures
 * - ensures cleanup on chatId change/unmount
 */
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

    handlersRef.current = handlers
    userRef.current = user

    useEffect(() => {
        // Reset reconnect attempts when chat changes
        reconnectRef.current.tries = 0
        reconnectRef.current.timer && clearTimeout(reconnectRef.current.timer)
    }, [chatId])

    useEffect(() => {
        if (!chatId) {
            // close existing socket if chatId removed
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
                console.log("WebSocket connected", chatId)
            }

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    const h = handlersRef.current

                    // streaming chunk from AI
                    if (data.type === "ai_chunk" && typeof data.chunk === "string") {
                        h.addAIChunk(data.chunk)
                        return
                    }

                    // AI finished
                    if (data.type === "ai_end") {
                        h.finishAIMessage()
                        return
                    }

                    // If server sends assistant message as full object
                    if (!data.type && data.user === "assistant" && typeof data.message === "string") {
                        const aiMsg: Message = {
                            id: Date.now(),
                            message: data.message,
                            sender: null,
                            created_at: new Date().toISOString(),
                        }
                        h.addMessage(aiMsg)
                        return
                    }

                    // Regular persisted message object (id, message, created_at)
                    if (!data.type && data.id && data.message && data.created_at) {
                        h.addMessage(data as Message)
                        return
                    }

                    // Unknown format - log for debugging
                    console.warn("Unhandled websocket message format:", data)
                } catch (error) {
                    console.error("Failed to parse WebSocket message:", error)
                }
            }

            ws.onclose = (ev) => {
                wsRef.current = null
                setIsConnected(false)
                if (!closedByUs) {
                    console.warn("WebSocket closed unexpectedly, scheduling reconnect", ev.reason)
                    scheduleReconnect()
                } else {
                    // normal close
                    console.log("WebSocket closed")
                }
            }

            ws.onerror = (err) => {
                console.error("WebSocket error:", err)
                // socket will typically fire close after error
            }
        } // end connect

        const scheduleReconnect = () => {
            const tries = (reconnectRef.current.tries || 0) + 1
            reconnectRef.current.tries = tries
            // exponential backoff: base 500ms, cap 30s
            const delay = Math.min(30000, 500 * Math.pow(2, Math.max(0, tries - 1)))
            reconnectRef.current.timer = window.setTimeout(() => {
                connect()
            }, delay)
        }

        connect()

        return () => {
            // on unmount or chatId change - stop reconnect, close socket
            reconnectRef.current.timer && clearTimeout(reconnectRef.current.timer)
            if (wsRef.current) {
                closedByUs = true
                try {
                    wsRef.current.close()
                } catch (err) {
                    /* ignore */
                }
                wsRef.current = null
            }
            setIsConnected(false)
        }
    }, [chatId])

    /**
     * Send message via websocket (also optimistic local add).
     */
    const sendMessage = async (message: string) => {
        const ws = wsRef.current
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            throw new Error("WebSocket not connected")
        }

        // optimistic local message add for the sending user
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
            ws.send(JSON.stringify({message}))
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
