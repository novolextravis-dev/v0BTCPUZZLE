"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Key, Loader2, CheckCircle2, XCircle, Copy, Check, Wallet, ArrowRight } from "lucide-react"

interface ValidationResult {
  valid: boolean
  inputFormat: string
  privateKeyHex: string
  privateKeyWIF: string | null
  targetAddress: string
  generatedAddresses: {
    compressed: string
    uncompressed: string
  }
  matchType: string
  balance: {
    balanceBTC: string
    txCount: number
  } | null
}

const GSMG_ADDRESS = "1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe"

export function KeyValidator() {
  const [keyInput, setKeyInput] = useState("")
  const [targetAddress, setTargetAddress] = useState(GSMG_ADDRESS)
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const validateKey = async () => {
    if (!keyInput.trim()) return

    setValidating(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: keyInput.trim(),
          address: targetAddress.trim() || GSMG_ADDRESS,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
    } finally {
      setValidating(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Bitcoin Key Validator</h2>
          <p className="text-sm text-muted-foreground">
            Validate private keys against the GSMG.IO target address. Supports hex, WIF, decimal, and binary formats.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key-input">Private Key</Label>
            <Textarea
              id="key-input"
              placeholder="Enter private key (hex, WIF, decimal, or binary)..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="font-mono text-sm min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Formats: 64 hex chars, WIF (5/K/L prefix), decimal number, or binary
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-address">Target Address</Label>
            <Input
              id="target-address"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder={GSMG_ADDRESS}
              className="font-mono text-sm"
            />
          </div>

          <Button onClick={validateKey} disabled={!keyInput.trim() || validating} className="w-full">
            {validating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Validate Key
              </>
            )}
          </Button>
        </div>

        {/* Quick Info */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-2">
          <h4 className="text-sm font-medium text-foreground">GSMG.IO Puzzle Info</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <strong>Target:</strong> {GSMG_ADDRESS}
            </p>
            <p>
              <strong>Prize:</strong> 1.5 BTC (originally 5 BTC)
            </p>
            <p>
              <strong>Status:</strong> Unsolved since April 2019
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Validation Result</h3>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Match Status */}
            <div
              className={`p-4 rounded-lg ${result.valid ? "bg-green-500/10 border border-green-500/20" : "bg-muted/50"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {result.valid ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{result.valid ? "VALID KEY FOUND!" : "No Match"}</p>
                    <p className="text-xs text-muted-foreground">Input format: {result.inputFormat}</p>
                  </div>
                </div>
                <Badge variant={result.valid ? "default" : "outline"}>{result.matchType}</Badge>
              </div>
            </div>

            {/* Key Details */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Private Key (Hex)</Label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(result.privateKeyHex, "hex")}
                  >
                    {copied === "hex" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <p className="text-xs font-mono bg-muted/50 p-2 rounded break-all">{result.privateKeyHex}</p>
              </div>

              {result.privateKeyWIF && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Private Key (WIF)</Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(result.privateKeyWIF!, "wif")}
                    >
                      {copied === "wif" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-xs font-mono bg-muted/50 p-2 rounded break-all">{result.privateKeyWIF}</p>
                </div>
              )}
            </div>

            {/* Address Comparison */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Address Comparison</Label>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Target:</span>
                  <span className="text-foreground break-all">{result.targetAddress}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Compressed:</span>
                  <span className={result.matchType === "compressed" ? "text-green-500" : "text-foreground"}>
                    {result.generatedAddresses.compressed}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Uncompressed:</span>
                  <span className={result.matchType === "uncompressed" ? "text-green-500" : "text-foreground"}>
                    {result.generatedAddresses.uncompressed}
                  </span>
                </div>
              </div>
            </div>

            {/* Balance (if valid) */}
            {result.valid && result.balance && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h4 className="text-sm font-semibold text-green-500 mb-2">Wallet Balance</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance:</span>
                    <span className="font-mono text-foreground">{result.balance.balanceBTC} BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transactions:</span>
                    <span className="text-foreground">{result.balance.txCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !error && (
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
            <div className="text-center space-y-2">
              <Key className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Enter a key to validate</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
