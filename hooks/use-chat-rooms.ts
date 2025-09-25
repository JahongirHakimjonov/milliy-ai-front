"use client"

import { useState, useEffect } from "react"
import { BASE_URL } from "@/lib/utils"

interface ChatRoom {
  id: number
  name: string | null
  created_at: string
  updated_at: string
}

export function useChatRooms() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchChatRooms = async () => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return

      const response = await fetch(`${BASE_URL}/api/v1/chat/chats/?page_size=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setChatRooms(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch chat rooms:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const createChatRoom = async (): Promise<ChatRoom | null> => {
    try {
      const token = localStorage.getItem("access_token")
      if (!token) return null

      const response = await fetch(`${BASE_URL}/api/v1/chat/chats/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const data = await response.json()
        const newChat = data.data
        setChatRooms((prev) => [newChat, ...prev])
        return newChat
      }
    } catch (error) {
      console.error("Failed to create chat room:", error)
    }
    return null
  }

  useEffect(() => {
    fetchChatRooms()
  }, [])

  return {
    chatRooms,
    isLoading,
    createChatRoom,
    refetch: fetchChatRooms,
  }
}
