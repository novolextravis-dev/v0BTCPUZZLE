"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Loader2, Eye, Grid3X3, Copy, Check, RotateCcw, Download } from "lucide-react"
import { analyzeImageForGrid, formatMatrix, matrixToBinary } from "@/lib/image-processing"
import { binaryToAscii, readSpiralMatrix } from "@/lib/crypto-utils"

export function ImageAnalyzer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<string>("")
  const [gridSize, setGridSize] = useState<number>(14)
  const [detectedMatrix, setDetectedMatrix] = useState<number[][] | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("ai")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setResult("")
      setDetectedMatrix(null)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setResult("")
      setDetectedMatrix(null)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // AI-powered analysis using Hugging Face
  const analyzeWithAI = async () => {
    if (!selectedFile) return

    setAnalyzing(true)
    setResult("")

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = e.target?.result as string

        const response = await fetch("/api/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64,
            analysisType: "full",
          }),
        })

        const data = await response.json()

        if (data.success) {
          setResult(data.analysis)
        } else {
          setResult(`Error: ${data.error}`)
        }
      }
      reader.readAsDataURL(selectedFile)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      setResult(`Error analyzing image: ${message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // Local grid detection using canvas
  const detectGrid = async () => {
    if (!previewUrl || !canvasRef.current) return

    setAnalyzing(true)
    setResult("")

    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        const canvas = canvasRef.current!
        const ctx = canvas.getContext("2d")!

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const analysis = analyzeImageForGrid(imageData, gridSize)

        if (analysis.gridDetected && analysis.binaryMatrix) {
          setDetectedMatrix(analysis.binaryMatrix)

          const matrixStr = formatMatrix(analysis.binaryMatrix)
          const binaryStr = matrixToBinary(analysis.binaryMatrix)
          const spiralBinary = readSpiralMatrix(analysis.binaryMatrix, true)
          const spiralAscii = binaryToAscii(spiralBinary)
          const rowAscii = binaryToAscii(binaryStr)

          setResult(
            `[Grid Detection Results]
Grid Size: ${gridSize}x${gridSize}

[Binary Matrix]
${matrixStr}

[Reading Methods]

Row-by-row ASCII:
${rowAscii}

Counterclockwise Spiral ASCII:
${spiralAscii}

[Raw Binary]
Row-by-row: ${binaryStr}
Spiral: ${spiralBinary}

[Color Analysis]
${analysis.dominantColors
  .slice(0, 5)
  .map((c) => `${c.color}: ${c.percentage.toFixed(1)}%`)
  .join("\n")}`,
          )
        } else {
          setResult(
            `[Grid Detection Failed]
Could not detect a ${gridSize}x${gridSize} grid in this image.

[Color Analysis]
${analysis.dominantColors
  .slice(0, 5)
  .map((c) => `${c.color}: ${c.percentage.toFixed(1)}%`)
  .join("\n")}

Try:
- Adjusting the grid size
- Using a cleaner image
- Using AI analysis for complex patterns`,
          )
        }

        setAnalyzing(false)
      }

      img.onerror = () => {
        setResult("Error loading image for grid detection")
        setAnalyzing(false)
      }

      img.src = previewUrl
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      setResult(`Error detecting grid: ${message}`)
      setAnalyzing(false)
    }
  }

  const copyToClipboard = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadResult = () => {
    if (!result) return
    const blob = new Blob([result], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "analysis-result.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetAnalysis = () => {
    setSelectedFile(null)
    setPreviewUrl("")
    setResult("")
    setDetectedMatrix(null)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Image Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Upload puzzle images for AI-powered analysis or local grid detection. Supports binary matrix decoding for
            GSMG.IO puzzle.
          </p>
        </div>

        <div className="space-y-4">
          {/* File Upload Area */}
          <div className="space-y-2" onDrop={handleDrop} onDragOver={handleDragOver}>
            <Label htmlFor="image-upload">Upload Puzzle Image</Label>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="w-full bg-transparent">
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Select Image or Drag & Drop
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </Button>
              {selectedFile && (
                <Button variant="ghost" size="icon" onClick={resetAnalysis} title="Reset">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
            {selectedFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Image Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
                <img
                  ref={imageRef}
                  src={previewUrl || "/placeholder.svg"}
                  alt="Preview"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Analysis Options */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai">AI Analysis</TabsTrigger>
              <TabsTrigger value="grid">Grid Detection</TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="space-y-4 pt-4">
              <p className="text-xs text-muted-foreground">
                Uses Hugging Face models to analyze image content, detect patterns, and provide cryptographic insights.
              </p>
              <Button onClick={analyzeWithAI} disabled={!selectedFile || analyzing} className="w-full">
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="grid" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="grid-size">Grid Size (NxN)</Label>
                <Input
                  id="grid-size"
                  type="number"
                  min={2}
                  max={64}
                  value={gridSize}
                  onChange={(e) => setGridSize(Number.parseInt(e.target.value) || 14)}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  GSMG.IO puzzle uses 14x14 grid. Black/Blue = 1, Yellow/White = 0.
                </p>
              </div>
              <Button onClick={detectGrid} disabled={!selectedFile || analyzing} className="w-full">
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Detecting Grid...
                  </>
                ) : (
                  <>
                    <Grid3X3 className="mr-2 h-4 w-4" />
                    Detect Binary Grid
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Analysis Result</h3>
            <p className="text-xs text-muted-foreground">
              {activeTab === "ai" ? "AI-powered analysis" : "Local grid detection"} results
            </p>
          </div>
          {result && (
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy to clipboard">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={downloadResult} title="Download result">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {result ? (
          <Textarea value={result} readOnly className="min-h-[500px] font-mono text-sm bg-muted/30" />
        ) : (
          <div className="flex h-[500px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
            <div className="text-center space-y-2">
              <Eye className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Upload an image and run analysis to see results</p>
            </div>
          </div>
        )}

        {/* Matrix visualization */}
        {detectedMatrix && (
          <div className="space-y-2">
            <Label>Detected Matrix Visual</Label>
            <div
              className="grid gap-0.5 p-2 bg-muted rounded-lg overflow-auto max-h-[200px]"
              style={{
                gridTemplateColumns: `repeat(${detectedMatrix[0].length}, minmax(0, 1fr))`,
              }}
            >
              {detectedMatrix.flat().map((cell, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-sm ${cell === 1 ? "bg-primary" : "bg-background"}`}
                  style={{ minWidth: "8px", minHeight: "8px" }}
                />
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
