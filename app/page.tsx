"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageAnalyzer } from "@/components/image-analyzer"
import { CipherTools } from "@/components/cipher-tools"
import { PuzzleTracker } from "@/components/puzzle-tracker"
import { AIAssistant } from "@/components/ai-assistant"
import { AutonomousAgent } from "@/components/autonomous-agent"
import { KeyValidator } from "@/components/key-validator"
import { Sparkles, ImageIcon, Lock, Map, MessageSquare, Bot, Key } from "lucide-react"

export default function Home() {
  const [activeTab, setActiveTab] = useState("agent")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">GSMG.IO Puzzle Analyzer</h1>
                <p className="text-xs text-muted-foreground">5 BTC Bitcoin Puzzle - Autonomous AI Solver</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-foreground">Prize: 1.5 BTC</div>
                <div className="text-xs text-muted-foreground">Status: Unsolved</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 lg:w-auto">
            <TabsTrigger value="agent" className="gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Agent</span>
            </TabsTrigger>
            <TabsTrigger value="validator" className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Validator</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Image</span>
            </TabsTrigger>
            <TabsTrigger value="cipher" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Cipher</span>
            </TabsTrigger>
            <TabsTrigger value="tracker" className="gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agent" className="space-y-6">
            <AutonomousAgent />
          </TabsContent>

          <TabsContent value="validator" className="space-y-6">
            <KeyValidator />
          </TabsContent>

          <TabsContent value="image" className="space-y-6">
            <ImageAnalyzer />
          </TabsContent>

          <TabsContent value="cipher" className="space-y-6">
            <CipherTools />
          </TabsContent>

          <TabsContent value="tracker" className="space-y-6">
            <PuzzleTracker />
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <AIAssistant />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
