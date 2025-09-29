"use client"

import {useCallback, useEffect, useRef, useState} from "react"
import {BASE_URL} from "@/lib/utils"

export type Sender = {
    id: number
    first_name: string
    last_name: string
    avatar?: string | undefined
} | null

export type File = {
    id: number
    user: number
    name: string
    size: number
    file: string
    type: string
    created_at: string
}

export interface Message {
    id: number
    message: string
    sender?: Sender
    file?: File[]
    created_at: string
}

// утилита: upsert по id + сортировка по времени
const sortAndDedup = (list: Message[]) => {
    const byId = new Map<number, Message>()
    for (const m of list) {
        byId.set(m.id, m)
    }
    return Array.from(byId.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
}

/**
 * Hook to fetch and maintain chat messages and a streaming (pending) AI message.
 */
export function useMessages(chatId: number | null) {
    const [messages, setMessages] = useState<Message[]>([])
    const [pendingAIMessage, setPendingAIMessage] = useState<Message | null>(null)
    const [isLoading, setIsLoading] = useState(false)

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
                console.error("Failed to fetch messages:", res.status, await res.text())
                setIsLoading(false)
                return
            }

            const data = await res.json()
            const serverList: Message[] = Array.isArray(data.data) ? data.data : []
            setMessages(sortAndDedup(serverList))
        } catch (err: any) {
            if (err.name !== "AbortError") {
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
     * Append or update a message locally. If a human message arrives, cancel any pending AI draft.
     */
    const addMessage = useCallback((message: Message) => {
        setMessages(prev => sortAndDedup([...prev, message]))
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
                    id: -Date.now(), // временный локальный id
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
     * Finalize pending AI message: clear draft and refetch canonical data.
     */
    const finishAIMessage = useCallback(async () => {
        if (!pendingRef.current) {
            return
        }
        // не добавляем локальный pending в список, чтобы избежать дублей
        setPendingAIMessage(null)
        try {
            await fetchMessages()
        } catch {
            // уже залогировано внутри fetchMessages
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
