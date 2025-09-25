"use client"

import { useState } from "react"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatArea } from "@/components/chat-area"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/hooks/use-auth"

export default function ChatApp() {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null)
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthModal />
  }

  return (
    <div className="flex h-screen bg-background">
      <ChatSidebar selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />
      <ChatArea chatId={selectedChatId} />
    </div>
  )
}
