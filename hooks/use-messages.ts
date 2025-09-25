"use client"

import {useCallback, useEffect, useRef, useState} from "react"
import {BASE_URL} from "@/lib/utils"

export type Sender = {
    id: number
    first_name: string
    last_name: string
    avatar?: string | undefined
} | null

export interface Message {
    id: number
    message: string
    sender?: Sender
    created_at: string
}

/**
 * Hook to fetch and maintain chat messages and a streaming (pending) AI message.
 */
export function useMessages(chatId: number | null) {
    const [messages, setMessages] = useState<Message[]>([])
    const [pendingAIMessage, setPendingAIMessage] = useState<Message | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // use a ref to avoid stale closures when finishing AI message
    const pendingRef = useRef<Message | null>(null)
    pendingRef.current = pendingAIMessage

    const fetchMessages = useCallback(async (signal?: AbortSignal) => {
        if (!chatId) {
            setMessages([])
            return
        }
        setIsLoading(true)
        try {
            const token = localStorage.getItem("access_token")
            if (!token) {
                setMessages([])
                setIsLoading(false)
                return
            }

            const res = await fetch(
                `${BASE_URL}/api/v1/chat/messages/${chatId}/?page_size=100`,
                {
                    headers: {Authorization: `Bearer ${token}`, "Accept": "application/json"},
                    signal,
                },
            )

            if (!res.ok) {
                // optionally handle 401/403 specifically
                console.error("Failed to fetch messages:", res.status, await res.text())
                setIsLoading(false)
                return
            }

            const data = await res.json()
            setMessages(Array.isArray(data.data) ? data.data : [])
        } catch (err: any) {
            if (err.name === "AbortError") {
                // ignore abort
            } else {
                console.error("Failed to fetch messages:", err)
            }
        } finally {
            setIsLoading(false)
        }
    }, [chatId])

    useEffect(() => {
        const controller = new AbortController()
        fetchMessages(controller.signal)
        return () => controller.abort()
    }, [fetchMessages])

    /**
     * Append a message locally. If a user message arrives, cancel any pending AI draft.
     */
    const addMessage = useCallback((message: Message) => {
        setMessages(prev => [...prev, message])
        // If a human (sender exists) message gets added, it usually means AI draft should be reset.
        if (message.sender) {
            setPendingAIMessage(null)
        }
    }, [])

    /**
     * Add streaming chunk for AI message. We accumulate chunks in pendingAIMessage.
     */
    const addAIChunk = useCallback((chunk: string) => {
        setPendingAIMessage(prev => {
            if (!prev) {
                const created = new Date().toISOString()
                const newMsg: Message = {
                    id: Date.now(),
                    message: chunk,
                    sender: null,
                    created_at: created,
                }
                return newMsg
            }
            return {...prev, message: prev.message + chunk}
        })
    }, [])

    /**
     * Finalize pending AI message: push it into messages and refetch from server to get canonical data.
     */
    const finishAIMessage = useCallback(async () => {
        // push local pending if exists
        if (pendingRef.current) {
            setMessages(prev => [...prev, pendingRef.current as Message])
            setPendingAIMessage(null)
        }
        // fetch latest from backend to make sure local state is canonical
        try {
            await fetchMessages()
        } catch (err) {
            // fetchMessages already handles and logs
        }
    }, [fetchMessages])

    return {
        messages,
        isLoading,
        addMessage,
        addAIChunk,
        finishAIMessage,
        pendingAIMessage,
        refetch: fetchMessages,
    }
}
