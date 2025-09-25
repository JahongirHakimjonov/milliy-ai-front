"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Send, Paperclip, Bot, Sparkles } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useMessages } from "@/hooks/use-messages"
import { useWebSocket } from "@/hooks/use-websocket"
import { TypingIndicator } from "@/components/typing-indicator"
import { MessageBubble } from "@/components/message-bubble"

interface ChatAreaProps {
  chatId: number | null
}

export function ChatArea({ chatId }: ChatAreaProps) {
  const [message, setMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const { messages, isLoading, pendingAIMessage, addMessage, addAIChunk, finishAIMessage } = useMessages(chatId)
  const { sendMessage, isConnected } = useWebSocket(chatId, { addMessage, addAIChunk, finishAIMessage }, user)

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
    }, 0)
  }

  useEffect(() => {
    if (!isLoading && (messages.length > 0 || pendingAIMessage)) {
      scrollToBottom()
    }
  }, [messages, pendingAIMessage, isLoading])

  const handleSendMessage = async () => {
    if (!message.trim() || !chatId) return

    const messageText = message.trim()
    setMessage("")
    setIsTyping(true)

    try {
      await sendMessage(messageText)
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Welcome to MILLIY AI Chat</h2>
          <p className="text-muted-foreground max-w-md">
            Select a conversation from the sidebar or create a new one to start chatting with your AI assistant.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">MILLIY AI Assistant</h2>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-xs text-muted-foreground">{isConnected ? "Connected" : "Disconnected"}</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Start a conversation</h3>
            <p className="text-muted-foreground">Ask me anything! I'm here to help with your questions and tasks.</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <MessageBubble key={msg.id || index} message={msg} user={user} isLast={index === messages.length - 1 && !pendingAIMessage} />
            ))}
            {pendingAIMessage && (
              <MessageBubble message={pendingAIMessage} user={user} isLast={true} />
            )}
          </>
        )}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-end space-x-2">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="bg-input border-border focus:border-primary"
              disabled={!isConnected}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || !isConnected}
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  )
}
