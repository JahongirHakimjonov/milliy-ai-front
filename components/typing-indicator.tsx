"use client"

import { Avatar } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Bot } from "lucide-react"

export function TypingIndicator() {
  return (
    <div className="flex items-start space-x-3 message-slide-in">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <div className="h-full w-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      </Avatar>

      <Card className="p-3 bg-card border-border shadow-sm">
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 bg-muted-foreground rounded-full typing-dot"></div>
          <div className="h-2 w-2 bg-muted-foreground rounded-full typing-dot"></div>
          <div className="h-2 w-2 bg-muted-foreground rounded-full typing-dot"></div>
        </div>
      </Card>
    </div>
  )
}
