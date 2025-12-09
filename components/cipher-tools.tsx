"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Unlock, Loader2, Copy, Check, Hash, Binary, ArrowRightLeft, Sparkles } from "lucide-react"

type CipherType =
  | "aes"
  | "beaufort"
  | "vic"
  | "binary"
  | "ascii-to-binary"
  | "sha256"
  | "md5"
  | "hex-to-ascii"
  | "ascii-to-hex"
  | "base64-encode"
  | "base64-decode"
  | "rot13"
  | "caesar"
  | "atbash"
  | "vigenere-encrypt"
  | "vigenere-decrypt"
  | "xor"
  | "spiral-matrix"

interface CipherConfig {
  name: string
  description: string
  needsPassword: boolean
  passwordLabel?: string
  passwordPlaceholder?: string
  inputPlaceholder: string
  hasOptions?: boolean
}

const CIPHER_CONFIGS: Record<CipherType, CipherConfig> = {
  aes: {
    name: "AES-256-CBC",
    description: "OpenSSL compatible AES decryption. Password is SHA256 hashed.",
    needsPassword: true,
    passwordLabel: "Password or SHA256 Hash",
    passwordPlaceholder: "causality",
    inputPlaceholder: "U2FsdGVkX1...",
  },
  beaufort: {
    name: "Beaufort Cipher",
    description: "Symmetric cipher used in GSMG puzzle Phase 3.2.1",
    needsPassword: true,
    passwordLabel: "Key",
    passwordPlaceholder: "THEMATRIXHASYOU",
    inputPlaceholder: "Enter encoded text...",
  },
  vic: {
    name: "VIC Cipher",
    description: "Straddling checkerboard cipher. Uses digits 1 and 4 by default.",
    needsPassword: true,
    passwordLabel: "Alphabet",
    passwordPlaceholder: "FUBCDORALETHINGKYMVPSJQZXW",
    inputPlaceholder: "15165943121972409...",
    hasOptions: true,
  },
  binary: {
    name: "Binary to ASCII",
    description: "Convert 8-bit binary sequences to ASCII text",
    needsPassword: false,
    inputPlaceholder: "01001000 01100101 01101100 01101100 01101111",
  },
  "ascii-to-binary": {
    name: "ASCII to Binary",
    description: "Convert text to 8-bit binary representation",
    needsPassword: false,
    inputPlaceholder: "Hello",
  },
  sha256: {
    name: "SHA256 Hash",
    description: "Generate SHA256 hash of input text",
    needsPassword: false,
    inputPlaceholder: "causality",
  },
  md5: {
    name: "MD5 Hash",
    description: "Generate MD5 hash of input text",
    needsPassword: false,
    inputPlaceholder: "Enter text to hash...",
  },
  "hex-to-ascii": {
    name: "Hex to ASCII",
    description: "Convert hexadecimal to ASCII text",
    needsPassword: false,
    inputPlaceholder: "48656c6c6f",
  },
  "ascii-to-hex": {
    name: "ASCII to Hex",
    description: "Convert text to hexadecimal",
    needsPassword: false,
    inputPlaceholder: "Hello",
  },
  "base64-encode": {
    name: "Base64 Encode",
    description: "Encode text to Base64",
    needsPassword: false,
    inputPlaceholder: "Enter text to encode...",
  },
  "base64-decode": {
    name: "Base64 Decode",
    description: "Decode Base64 to text",
    needsPassword: false,
    inputPlaceholder: "SGVsbG8gV29ybGQ=",
  },
  rot13: {
    name: "ROT13",
    description: "Simple letter substitution cipher (shift by 13)",
    needsPassword: false,
    inputPlaceholder: "Enter text...",
  },
  caesar: {
    name: "Caesar Cipher",
    description: "Shift letters by specified amount",
    needsPassword: false,
    inputPlaceholder: "Enter text...",
    hasOptions: true,
  },
  atbash: {
    name: "Atbash Cipher",
    description: "Reverse alphabet substitution (A=Z, B=Y, etc.)",
    needsPassword: false,
    inputPlaceholder: "Enter text...",
  },
  "vigenere-encrypt": {
    name: "Vigenere Encrypt",
    description: "Polyalphabetic substitution cipher encryption",
    needsPassword: true,
    passwordLabel: "Key",
    passwordPlaceholder: "KEY",
    inputPlaceholder: "Enter plaintext...",
  },
  "vigenere-decrypt": {
    name: "Vigenere Decrypt",
    description: "Polyalphabetic substitution cipher decryption",
    needsPassword: true,
    passwordLabel: "Key",
    passwordPlaceholder: "KEY",
    inputPlaceholder: "Enter ciphertext...",
  },
  xor: {
    name: "XOR Operation",
    description: "XOR two hex or binary strings",
    needsPassword: true,
    passwordLabel: "Second Operand",
    passwordPlaceholder: "ff00ff00",
    inputPlaceholder: "Enter first operand...",
    hasOptions: true,
  },
  "spiral-matrix": {
    name: "Spiral Matrix Reader",
    description: "Read binary matrix in spiral pattern and convert to ASCII",
    needsPassword: false,
    inputPlaceholder: "Enter binary matrix (0s and 1s)...",
    hasOptions: true,
  },
}

export function CipherTools() {
  const [input, setInput] = useState("")
  const [password, setPassword] = useState("")
  const [output, setOutput] = useState("")
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedCipher, setSelectedCipher] = useState<CipherType>("aes")

  // Options state
  const [caesarShift, setCaesarShift] = useState(3)
  const [vicDigit1, setVicDigit1] = useState(1)
  const [vicDigit2, setVicDigit2] = useState(4)
  const [xorFormat, setXorFormat] = useState<"hex" | "binary">("hex")
  const [spiralRows, setSpiralRows] = useState(14)
  const [spiralCols, setSpiralCols] = useState(14)
  const [spiralCounterClockwise, setSpiralCounterClockwise] = useState(true)

  const config = CIPHER_CONFIGS[selectedCipher]

  const processCipher = async () => {
    if (!input) return

    setProcessing(true)
    setOutput("")

    try {
      const options: Record<string, unknown> = {}

      if (selectedCipher === "caesar") {
        options.shift = caesarShift
      } else if (selectedCipher === "vic") {
        options.digitRow1 = vicDigit1
        options.digitRow2 = vicDigit2
      } else if (selectedCipher === "xor") {
        options.format = xorFormat
      } else if (selectedCipher === "spiral-matrix") {
        options.rows = spiralRows
        options.cols = spiralCols
        options.counterClockwise = spiralCounterClockwise
      }

      const response = await fetch("/api/cipher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          password,
          type: selectedCipher,
          options,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setOutput(data.result)
      } else {
        setOutput(`Error: ${data.error}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      setOutput(`Error: ${message}`)
    } finally {
      setProcessing(false)
    }
  }

  const copyToClipboard = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const swapInputOutput = () => {
    const temp = input
    setInput(output)
    setOutput(temp)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Cipher Tools</h2>
          <p className="text-sm text-muted-foreground">
            Complete cryptographic toolkit for the GSMG.IO puzzle and general decryption.
          </p>
        </div>

        <Tabs defaultValue="encryption" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="encryption">Encryption</TabsTrigger>
            <TabsTrigger value="encoding">Encoding</TabsTrigger>
            <TabsTrigger value="hashing">Hashing</TabsTrigger>
          </TabsList>

          <TabsContent value="encryption" className="space-y-4">
            <div className="space-y-2">
              <Label>Cipher Type</Label>
              <Select value={selectedCipher} onValueChange={(v) => setSelectedCipher(v as CipherType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aes">AES-256-CBC (OpenSSL)</SelectItem>
                  <SelectItem value="beaufort">Beaufort Cipher</SelectItem>
                  <SelectItem value="vic">VIC Cipher</SelectItem>
                  <SelectItem value="vigenere-encrypt">Vigenere Encrypt</SelectItem>
                  <SelectItem value="vigenere-decrypt">Vigenere Decrypt</SelectItem>
                  <SelectItem value="caesar">Caesar Cipher</SelectItem>
                  <SelectItem value="rot13">ROT13</SelectItem>
                  <SelectItem value="atbash">Atbash Cipher</SelectItem>
                  <SelectItem value="xor">XOR Operation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="encoding" className="space-y-4">
            <div className="space-y-2">
              <Label>Encoding Type</Label>
              <Select value={selectedCipher} onValueChange={(v) => setSelectedCipher(v as CipherType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binary">Binary to ASCII</SelectItem>
                  <SelectItem value="ascii-to-binary">ASCII to Binary</SelectItem>
                  <SelectItem value="hex-to-ascii">Hex to ASCII</SelectItem>
                  <SelectItem value="ascii-to-hex">ASCII to Hex</SelectItem>
                  <SelectItem value="base64-encode">Base64 Encode</SelectItem>
                  <SelectItem value="base64-decode">Base64 Decode</SelectItem>
                  <SelectItem value="spiral-matrix">Spiral Matrix Reader</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="hashing" className="space-y-4">
            <div className="space-y-2">
              <Label>Hash Type</Label>
              <Select value={selectedCipher} onValueChange={(v) => setSelectedCipher(v as CipherType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sha256">SHA256</SelectItem>
                  <SelectItem value="md5">MD5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        {/* Description */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <Label htmlFor="cipher-input">Input</Label>
          <Textarea
            id="cipher-input"
            placeholder={config.inputPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
        </div>

        {/* Password/Key */}
        {config.needsPassword && (
          <div className="space-y-2">
            <Label htmlFor="cipher-password">{config.passwordLabel}</Label>
            <Input
              id="cipher-password"
              placeholder={config.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono"
            />
          </div>
        )}

        {/* Cipher-specific options */}
        {selectedCipher === "caesar" && (
          <div className="space-y-2">
            <Label htmlFor="caesar-shift">Shift Amount</Label>
            <Input
              id="caesar-shift"
              type="number"
              min={1}
              max={25}
              value={caesarShift}
              onChange={(e) => setCaesarShift(Number.parseInt(e.target.value) || 3)}
            />
          </div>
        )}

        {selectedCipher === "vic" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vic-digit1">First Escape Digit</Label>
              <Input
                id="vic-digit1"
                type="number"
                min={0}
                max={9}
                value={vicDigit1}
                onChange={(e) => setVicDigit1(Number.parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vic-digit2">Second Escape Digit</Label>
              <Input
                id="vic-digit2"
                type="number"
                min={0}
                max={9}
                value={vicDigit2}
                onChange={(e) => setVicDigit2(Number.parseInt(e.target.value) || 4)}
              />
            </div>
          </div>
        )}

        {selectedCipher === "xor" && (
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={xorFormat} onValueChange={(v) => setXorFormat(v as "hex" | "binary")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hex">Hexadecimal</SelectItem>
                <SelectItem value="binary">Binary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedCipher === "spiral-matrix" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spiral-rows">Rows</Label>
                <Input
                  id="spiral-rows"
                  type="number"
                  min={2}
                  max={64}
                  value={spiralRows}
                  onChange={(e) => setSpiralRows(Number.parseInt(e.target.value) || 14)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spiral-cols">Columns</Label>
                <Input
                  id="spiral-cols"
                  type="number"
                  min={2}
                  max={64}
                  value={spiralCols}
                  onChange={(e) => setSpiralCols(Number.parseInt(e.target.value) || 14)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="spiral-direction">Counter-clockwise</Label>
              <Switch
                id="spiral-direction"
                checked={spiralCounterClockwise}
                onCheckedChange={setSpiralCounterClockwise}
              />
            </div>
          </div>
        )}

        {/* Process Button */}
        <Button onClick={processCipher} disabled={!input || processing} className="w-full">
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {selectedCipher.includes("hash") || selectedCipher === "sha256" || selectedCipher === "md5" ? (
                <Hash className="mr-2 h-4 w-4" />
              ) : selectedCipher.includes("binary") ||
                selectedCipher.includes("hex") ||
                selectedCipher.includes("base64") ? (
                <Binary className="mr-2 h-4 w-4" />
              ) : (
                <Unlock className="mr-2 h-4 w-4" />
              )}
              Process {config.name}
            </>
          )}
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Output</h3>
            <p className="text-xs text-muted-foreground">Processed result</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={swapInputOutput}
              disabled={!output}
              title="Swap input and output"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              disabled={!output}
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {output ? (
          <Textarea value={output} readOnly className="min-h-[400px] font-mono text-sm bg-muted/30" />
        ) : (
          <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
            <div className="text-center space-y-2">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Process a cipher to see results</p>
            </div>
          </div>
        )}

        {/* Quick Reference */}
        <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-medium text-foreground">GSMG.IO Quick Reference</h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Phase 3 Key:</strong> SHA256("causality")
            </p>
            <p>
              <strong>Beaufort Key:</strong> THEMATRIXHASYOU
            </p>
            <p>
              <strong>VIC Alphabet:</strong> FUBCDORALETHINGKYMVPSJQZXW
            </p>
            <p>
              <strong>VIC Digits:</strong> 1 and 4
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
