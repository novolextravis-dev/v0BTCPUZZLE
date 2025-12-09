"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Sparkles, Bot, User, Trash2, AlertCircle } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const SUGGESTED_QUESTIONS = [
  "How do I decode the 14x14 binary matrix?",
  "Explain the AES-256-CBC decryption process",
  "What is the Beaufort cipher and its key?",
  "Help me understand the VIC cipher implementation",
  "What are all the puzzle phases?",
  "How is SHA256 used in this puzzle?",
  "What pop culture references are in the puzzle?",
  "Explain the spiral reading pattern",
]

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Welcome to the GSMG.IO 5 BTC Puzzle Assistant! I'm powered by Hugging Face AI and have comprehensive knowledge of:

- Binary matrix decoding (14x14 grid, spiral patterns)
- Cipher types: AES-256-CBC, Beaufort, VIC, and more
- All puzzle phases and their solutions
- Pop culture references (The Matrix, Alice in Wonderland)
- Cryptographic techniques and tools

How can I help you solve the puzzle today?`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (!data.success) {
        setError(data.message)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(`Failed to send message: ${errorMessage}`)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `I encountered an error: ${errorMessage}. Please try again.`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. How can I help you with the GSMG.IO puzzle?",
        timestamp: new Date(),
      },
    ])
    setError(null)
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
    inputRef.current?.focus()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Chat Area */}
      <Card className="lg:col-span-2 p-6 flex flex-col h-[700px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">AI Assistant</h2>
            <p className="text-sm text-muted-foreground">Powered by Hugging Face - Expert in GSMG.IO puzzle solving</p>
          </div>
          <Button variant="outline" size="icon" onClick={clearChat} title="Clear chat">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 pr-4 mb-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            placeholder="Ask about puzzle patterns, cipher types, or decryption strategies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon" className="h-[60px] w-[60px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Suggested Questions */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Suggested Questions</h3>
          </div>

          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4 bg-transparent hover:bg-muted/50"
                onClick={() => handleSuggestedQuestion(question)}
              >
                <span className="text-sm line-clamp-2">{question}</span>
              </Button>
            ))}
          </div>
        </Card>

        {/* Quick Info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Puzzle Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prize</span>
              <span className="font-mono text-foreground">1.5 BTC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="text-amber-500 font-medium">Unsolved</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Started</span>
              <span className="text-foreground">Apr 13, 2019</span>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground font-mono break-all">1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe</p>
            </div>
          </div>
        </Card>

        {/* AI Model Info */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">AI Models</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Chat: Zephyr-7B</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Vision: BLIP</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Analysis: Mistral-7B</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
