"use client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, MessageSquare, Settings, LogOut, Bot } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useChatRooms } from "@/hooks/use-chat-rooms"

interface ChatSidebarProps {
  selectedChatId: number | null
  onSelectChat: (chatId: number) => void
}

export function ChatSidebar({ selectedChatId, onSelectChat }: ChatSidebarProps) {
  const { user, logout } = useAuth()
  const { chatRooms, createChatRoom, isLoading } = useChatRooms()

  const handleNewChat = async () => {
    const newChat = await createChatRoom()
    if (newChat) {
      onSelectChat(newChat.id)
    }
  }

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold text-sidebar-foreground">MILLIY AI Chat</h1>
          </div>
          <Button onClick={handleNewChat} size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-sidebar-accent">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar || "/placeholder.svg"} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.first_name?.[0]}
              {user?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : chatRooms.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          chatRooms.map((chat) => (
            <Card
              key={chat.id}
              className={`p-3 cursor-pointer transition-all hover:bg-sidebar-accent ${
                selectedChatId === chat.id ? "bg-sidebar-accent border-primary" : "bg-sidebar border-sidebar-border"
              }`}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {chat.name || `Chat ${chat.id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(chat.updated_at).toLocaleDateString()}</p>
                </div>
                {selectedChatId === chat.id && (
                  <Badge variant="secondary" className="bg-primary text-primary-foreground">
                    Active
                  </Badge>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Button
          variant="ghost"
          onClick={logout}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
