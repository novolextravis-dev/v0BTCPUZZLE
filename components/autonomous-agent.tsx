"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Play,
  RotateCcw,
  Zap,
  Globe,
  Key,
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  Search,
  ImageIcon,
  Lock,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react"

interface AgentState {
  currentPhase: string
  attempts: number
  discoveries: string[]
  potentialKeys: number
  validatedResults: Array<{
    key: string
    address: string
    valid: boolean
    timestamp: string
  }>
  failedApproaches: string[]
  webResearch: Array<{
    url: string
    summary: string
    relevance: number
  }>
  imageAnalysis: Array<{
    source: string
    findings: string
  }>
  logs: string[]
}

interface Tool {
  name: string
  description: string
}

const INITIAL_STATE: AgentState = {
  currentPhase: "initialization",
  attempts: 0,
  discoveries: [],
  potentialKeys: 0,
  validatedResults: [],
  failedApproaches: [],
  webResearch: [],
  imageAnalysis: [],
  logs: [],
}

export function AutonomousAgent() {
  const [state, setState] = useState<AgentState>(INITIAL_STATE)
  const [tools, setTools] = useState<Tool[]>([])
  const [selectedTool, setSelectedTool] = useState<string>("")
  const [toolParams, setToolParams] = useState<string>("{}")
  const [isRunning, setIsRunning] = useState(false)
  const [iterations, setIterations] = useState(5)
  const [manualResult, setManualResult] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionId = useRef(`session_${Date.now()}`)

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [state.logs])

  // Load tools on mount
  useEffect(() => {
    loadTools()
  }, [])

  const loadTools = async () => {
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_tools" }),
      })
      const data = await response.json()
      if (data.success) {
        setTools(data.tools)
        if (data.tools.length > 0) {
          setSelectedTool(data.tools[0].name)
        }
      }
    } catch (error) {
      console.error("Failed to load tools:", error)
    }
  }

  const refreshState = async () => {
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_state",
          sessionId: sessionId.current,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setState(data.state)
      }
    } catch (error) {
      console.error("Failed to refresh state:", error)
    }
  }

  const resetAgent = async () => {
    try {
      await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset",
          sessionId: sessionId.current,
        }),
      })
      setState(INITIAL_STATE)
      setManualResult("")
    } catch (error) {
      console.error("Failed to reset agent:", error)
    }
  }

  const executeTool = async () => {
    if (!selectedTool) return

    setIsRunning(true)
    setManualResult("")

    try {
      let params = {}
      try {
        params = JSON.parse(toolParams)
      } catch {
        params = {}
      }

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "execute_tool",
          sessionId: sessionId.current,
          toolName: selectedTool,
          params,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setState(data.state)
        setManualResult(data.result)
      } else {
        setManualResult(`Error: ${data.error}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      setManualResult(`Error: ${message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const runAutonomous = async () => {
    setIsRunning(true)
    setManualResult("")

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run_autonomous",
          sessionId: sessionId.current,
          maxIterations: iterations,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setState(data.state)

        const validKey = data.state.validatedResults.find((r: { valid: boolean }) => r.valid)
        if (validKey) {
          setManualResult(`SUCCESS! Valid key found: ${validKey.key}`)
        } else {
          setManualResult(`Completed ${iterations} iterations. No valid key found yet.`)
        }
      } else {
        setManualResult(`Error: ${data.error}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      setManualResult(`Error: ${message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case "web_search":
        return <Globe className="h-4 w-4" />
      case "scrape_url":
        return <Search className="h-4 w-4" />
      case "analyze_image":
        return <ImageIcon className="h-4 w-4" />
      case "decrypt_cipher":
        return <Lock className="h-4 w-4" />
      case "validate_key":
        return <Key className="h-4 w-4" />
      case "check_balance":
        return <Zap className="h-4 w-4" />
      case "process_matrix":
        return <Terminal className="h-4 w-4" />
      case "generate_hypothesis":
        return <Brain className="h-4 w-4" />
      case "reflect_on_failure":
        return <RefreshCw className="h-4 w-4" />
      default:
        return <Terminal className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Autonomous Agent</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered puzzle solver with web research, image analysis, and key validation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={refreshState} title="Refresh state">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={resetAgent} title="Reset agent">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Attempts</div>
            <div className="text-2xl font-bold text-foreground">{state.attempts}</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Discoveries</div>
            <div className="text-2xl font-bold text-foreground">{state.discoveries.length}</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Keys Tested</div>
            <div className="text-2xl font-bold text-foreground">{state.validatedResults.length}</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Valid Keys</div>
            <div className="text-2xl font-bold text-green-500">
              {state.validatedResults.filter((r) => r.valid).length}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Control Panel */}
        <Card className="p-6 space-y-6">
          <Tabs defaultValue="manual" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Tools</TabsTrigger>
              <TabsTrigger value="autonomous">Autonomous</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <Label>Select Tool</Label>
                <Select value={selectedTool} onValueChange={setSelectedTool}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tool" />
                  </SelectTrigger>
                  <SelectContent>
                    {tools.map((tool) => (
                      <SelectItem key={tool.name} value={tool.name}>
                        <div className="flex items-center gap-2">
                          {getToolIcon(tool.name)}
                          <span>{tool.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTool && (
                  <p className="text-xs text-muted-foreground">
                    {tools.find((t) => t.name === selectedTool)?.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="params">Parameters (JSON)</Label>
                <Textarea
                  id="params"
                  value={toolParams}
                  onChange={(e) => setToolParams(e.target.value)}
                  placeholder='{"query": "GSMG puzzle solution"}'
                  className="font-mono text-sm h-24"
                />
              </div>

              <Button onClick={executeTool} disabled={!selectedTool || isRunning} className="w-full">
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Execute Tool
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="autonomous" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="iterations">Max Iterations</Label>
                <Input
                  id="iterations"
                  type="number"
                  min={1}
                  max={50}
                  value={iterations}
                  onChange={(e) => setIterations(Number.parseInt(e.target.value) || 5)}
                />
                <p className="text-xs text-muted-foreground">
                  The agent will autonomously choose and execute tools to solve the puzzle
                </p>
              </div>

              <Button onClick={runAutonomous} disabled={isRunning} className="w-full">
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Agent...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Run Autonomous Agent
                  </>
                )}
              </Button>

              <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                <p className="font-medium mb-1">Agent capabilities:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Web search and page scraping</li>
                  <li>Image analysis with AI vision</li>
                  <li>Cipher decryption (AES, Beaufort, VIC, etc.)</li>
                  <li>Bitcoin key validation</li>
                  <li>Self-reflection and strategy adjustment</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          {/* Result Output */}
          {manualResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Result</Label>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(manualResult)}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Textarea value={manualResult} readOnly className="min-h-[200px] font-mono text-sm bg-muted/30" />
            </div>
          )}
        </Card>

        {/* Agent State */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Agent State</h3>

          <Tabs defaultValue="discoveries" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="discoveries">Discoveries</TabsTrigger>
              <TabsTrigger value="keys">Keys</TabsTrigger>
              <TabsTrigger value="research">Research</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="discoveries">
              <ScrollArea className="h-[400px]">
                {state.discoveries.length > 0 ? (
                  <div className="space-y-2">
                    {state.discoveries.map((discovery, i) => (
                      <div key={i} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-foreground">{discovery}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No discoveries yet
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="keys">
              <ScrollArea className="h-[400px]">
                {state.validatedResults.length > 0 ? (
                  <div className="space-y-2">
                    {state.validatedResults.map((result, i) => (
                      <div key={i} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            {result.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-mono text-foreground truncate">{result.key.slice(0, 32)}...</p>
                              <p className="text-xs text-muted-foreground">{result.address.slice(0, 20)}...</p>
                            </div>
                          </div>
                          <Badge variant={result.valid ? "default" : "outline"}>
                            {result.valid ? "VALID" : "Invalid"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No keys tested yet
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="research">
              <ScrollArea className="h-[400px]">
                {state.webResearch.length > 0 ? (
                  <div className="space-y-2">
                    {state.webResearch.map((research, i) => (
                      <div key={i} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Globe className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <a
                              href={research.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline truncate block"
                            >
                              {research.url}
                            </a>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{research.summary}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No research data yet
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="logs">
              <ScrollArea className="h-[400px]" ref={scrollRef}>
                {state.logs.length > 0 ? (
                  <div className="space-y-1 font-mono text-xs">
                    {state.logs.map((log, i) => (
                      <div key={i} className="p-2 bg-muted/20 rounded text-muted-foreground">
                        {log}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No logs yet</div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Failed Approaches */}
          {state.failedApproaches.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Failed Approaches ({state.failedApproaches.length})</Label>
              <div className="max-h-[100px] overflow-y-auto space-y-1">
                {state.failedApproaches.slice(-5).map((failure, i) => (
                  <div key={i} className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                    {failure}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
