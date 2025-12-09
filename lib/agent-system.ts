// Autonomous agent system with self-reflection and retry logic

import { generateTextWithHF, analyzeImageWithHF, visualQAWithHF } from "./huggingface"
import { searchWeb, fetchPuzzlePage, fetchImageAsBase64 } from "./web-scraper"
import {
  validateKeyForAddress,
  checkAddressBalance,
  parsePrivateKey,
  GSMG_TARGET_ADDRESS,
  privateKeyToWIF,
} from "./bitcoin-utils"
import {
  decryptAES256CBC,
  decryptBeaufort,
  decryptVIC,
  binaryToAscii,
  hexToAscii,
  base64Decode,
  readSpiralMatrix,
  parseMatrix,
} from "./crypto-utils"

export interface AgentState {
  currentPhase: string
  attempts: number
  discoveries: string[]
  failedApproaches: string[]
  potentialKeys: string[]
  validatedResults: Array<{
    key: string
    address: string
    valid: boolean
    timestamp: Date
  }>
  webResearch: Array<{
    url: string
    summary: string
    relevance: number
  }>
  imageAnalysis: Array<{
    source: string
    findings: string
    binaryData?: string
  }>
  logs: string[]
}

export interface AgentTool {
  name: string
  description: string
  execute: (
    params: Record<string, unknown>,
    state: AgentState,
  ) => Promise<{
    result: string
    newState: Partial<AgentState>
  }>
}

// Create initial agent state
export function createAgentState(): AgentState {
  return {
    currentPhase: "initialization",
    attempts: 0,
    discoveries: [],
    failedApproaches: [],
    potentialKeys: [],
    validatedResults: [],
    webResearch: [],
    imageAnalysis: [],
    logs: [],
  }
}

// Log helper
function log(state: AgentState, message: string): void {
  const timestamp = new Date().toISOString()
  state.logs.push(`[${timestamp}] ${message}`)
}

// Agent tools implementation
export const agentTools: AgentTool[] = [
  {
    name: "web_search",
    description: "Search the web for information about the GSMG puzzle or cryptographic techniques",
    execute: async (params, state) => {
      const query = (params.query as string) || "GSMG.IO 5 BTC puzzle solution"
      log(state, `Searching web for: ${query}`)

      const results = await searchWeb(query, 5)

      if (results.length === 0) {
        return {
          result: "No search results found",
          newState: { logs: state.logs },
        }
      }

      const summaries: string[] = []
      for (const r of results) {
        summaries.push(`- ${r.title}: ${r.snippet} (${r.url})`)
      }

      return {
        result: `Found ${results.length} results:\n${summaries.join("\n")}`,
        newState: {
          webResearch: [
            ...state.webResearch,
            ...results.map((r) => ({
              url: r.url,
              summary: `${r.title}: ${r.snippet}`,
              relevance: 0.5,
            })),
          ],
        },
      }
    },
  },
  {
    name: "scrape_url",
    description: "Fetch and analyze content from a specific URL",
    execute: async (params, state) => {
      const url = params.url as string
      if (!url) {
        return { result: "No URL provided", newState: {} }
      }

      log(state, `Scraping URL: ${url}`)
      const content = await fetchPuzzlePage(url)

      if (content.error) {
        state.failedApproaches.push(`Failed to scrape ${url}: ${content.error}`)
        return {
          result: `Error scraping URL: ${content.error}`,
          newState: { failedApproaches: state.failedApproaches },
        }
      }

      const discoveries: string[] = []

      if (content.binaryData.length > 0) {
        discoveries.push(`Found ${content.binaryData.length} binary patterns`)
        state.discoveries.push(`Binary data found at ${url}`)
      }

      if (content.potentialPasswords.length > 0) {
        discoveries.push(`Found ${content.potentialPasswords.length} potential passwords`)
      }

      if (content.cryptoReferences.length > 0) {
        discoveries.push(`Crypto references: ${content.cryptoReferences.slice(0, 10).join(", ")}`)
      }

      return {
        result: `Scraped ${url}:\n- Content length: ${content.content.length}\n- ${discoveries.join("\n- ")}`,
        newState: {
          discoveries: state.discoveries,
          webResearch: [
            ...state.webResearch,
            {
              url,
              summary: content.content.slice(0, 500),
              relevance: content.cryptoReferences.length > 5 ? 0.8 : 0.3,
            },
          ],
        },
      }
    },
  },
  {
    name: "analyze_image",
    description: "Analyze an image for binary patterns, hidden data, or cryptographic clues",
    execute: async (params, state) => {
      const imageUrl = params.url as string
      const imageBase64 = params.base64 as string

      let base64Data: string
      let source: string

      if (imageBase64) {
        base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64
        source = "uploaded"
      } else if (imageUrl) {
        log(state, `Fetching image from: ${imageUrl}`)
        const fetched = await fetchImageAsBase64(imageUrl)
        if (fetched.error) {
          return { result: `Failed to fetch image: ${fetched.error}`, newState: {} }
        }
        base64Data = fetched.base64
        source = imageUrl
      } else {
        return { result: "No image provided (url or base64)", newState: {} }
      }

      log(state, "Analyzing image with AI...")

      const findings: string[] = []

      // Image captioning
      try {
        const caption = await analyzeImageWithHF(base64Data)
        findings.push(`Caption: ${caption}`)
      } catch (e) {
        findings.push("Caption: Unable to generate")
      }

      // Visual QA for puzzle-specific questions
      const questions = [
        "What colors are in this image?",
        "Is this a grid or matrix?",
        "How many rows and columns?",
        "Is there any text?",
      ]

      for (const q of questions) {
        try {
          const answer = await visualQAWithHF(base64Data, q)
          findings.push(`Q: ${q} A: ${answer}`)
        } catch {
          // Skip failed questions
        }
      }

      const analysisResult = {
        source,
        findings: findings.join("\n"),
      }

      return {
        result: `Image Analysis:\n${findings.join("\n")}`,
        newState: {
          imageAnalysis: [...state.imageAnalysis, analysisResult],
        },
      }
    },
  },
  {
    name: "decrypt_cipher",
    description: "Attempt to decrypt data using various cipher methods",
    execute: async (params, state) => {
      const ciphertext = params.ciphertext as string
      const method = params.method as string
      const key = params.key as string

      if (!ciphertext) {
        return { result: "No ciphertext provided", newState: {} }
      }

      log(state, `Attempting ${method || "auto"} decryption`)

      const results: string[] = []

      // Try specified method or all methods
      const methods = method ? [method] : ["aes", "beaufort", "vic", "binary", "hex", "base64"]

      for (const m of methods) {
        try {
          let result = ""

          switch (m) {
            case "aes":
              if (key) {
                result = decryptAES256CBC(ciphertext, key)
              } else {
                // Try known GSMG keys
                const knownKeys = ["causality", "theflowerblossomsthroughwhatseemstobeaconcretesurface"]
                for (const k of knownKeys) {
                  const attempt = decryptAES256CBC(ciphertext, k)
                  if (!attempt.includes("Error")) {
                    result = `(key: ${k}) ${attempt}`
                    break
                  }
                }
              }
              break

            case "beaufort":
              result = decryptBeaufort(ciphertext, key || "THEMATRIXHASYOU")
              break

            case "vic":
              result = decryptVIC(ciphertext, key || "FUBCDORALETHINGKYMVPSJQZXW", 1, 4)
              break

            case "binary":
              result = binaryToAscii(ciphertext)
              break

            case "hex":
              result = hexToAscii(ciphertext)
              break

            case "base64":
              result = base64Decode(ciphertext)
              break
          }

          if (result && !result.includes("Error") && result.length > 0) {
            results.push(`[${m}]: ${result.slice(0, 200)}${result.length > 200 ? "..." : ""}`)

            // Check if result looks like a private key
            const parsed = parsePrivateKey(result.replace(/\s/g, ""))
            if (parsed.format !== "unknown" && !parsed.error) {
              state.potentialKeys.push(parsed.privateKeyHex)
              state.discoveries.push(`Potential key found via ${m} decryption`)
            }
          }
        } catch (e) {
          // Skip failed methods
        }
      }

      return {
        result: results.length > 0 ? `Decryption results:\n${results.join("\n")}` : "No successful decryptions",
        newState: {
          potentialKeys: state.potentialKeys,
          discoveries: state.discoveries,
        },
      }
    },
  },
  {
    name: "validate_key",
    description: "Validate a potential private key against the GSMG target address",
    execute: async (params, state) => {
      const keyInput = params.key as string
      const targetAddress = (params.address as string) || GSMG_TARGET_ADDRESS

      if (!keyInput) {
        return { result: "No key provided", newState: {} }
      }

      log(state, `Validating key against ${targetAddress}`)

      // Parse the key
      const parsed = parsePrivateKey(keyInput)

      if (parsed.error || parsed.format === "unknown") {
        state.failedApproaches.push(`Invalid key format: ${keyInput.slice(0, 20)}...`)
        return {
          result: `Failed to parse key: ${parsed.error || "Unknown format"}`,
          newState: { failedApproaches: state.failedApproaches },
        }
      }

      // Validate against target
      const validation = validateKeyForAddress(parsed.privateKeyHex, targetAddress)

      const result = {
        key: parsed.privateKeyHex,
        address: targetAddress,
        valid: validation.valid,
        timestamp: new Date(),
      }

      state.validatedResults.push(result)

      if (validation.valid) {
        state.discoveries.push(`VALID KEY FOUND: ${parsed.privateKeyHex}`)

        // Generate WIF for easy import
        const wif = privateKeyToWIF(parsed.privateKeyHex, true, true)

        return {
          result:
            `SUCCESS! Valid key found!\n` +
            `Private Key (hex): ${parsed.privateKeyHex}\n` +
            `Private Key (WIF): ${wif}\n` +
            `Target Address: ${targetAddress}\n` +
            `Match Type: ${validation.matchType}`,
          newState: {
            validatedResults: state.validatedResults,
            discoveries: state.discoveries,
          },
        }
      }

      return {
        result:
          `Key validation failed:\n` +
          `Input format: ${parsed.format}\n` +
          `Generated (compressed): ${validation.generatedAddressCompressed}\n` +
          `Generated (uncompressed): ${validation.generatedAddressUncompressed}\n` +
          `Target: ${targetAddress}\n` +
          `Match: NO`,
        newState: {
          validatedResults: state.validatedResults,
          failedApproaches: [...state.failedApproaches, `Key ${parsed.privateKeyHex.slice(0, 16)}... invalid`],
        },
      }
    },
  },
  {
    name: "check_balance",
    description: "Check the balance of a Bitcoin address",
    execute: async (params, state) => {
      const address = (params.address as string) || GSMG_TARGET_ADDRESS

      log(state, `Checking balance for ${address}`)

      const balance = await checkAddressBalance(address)

      if (balance.error) {
        return {
          result: `Error checking balance: ${balance.error}`,
          newState: {},
        }
      }

      return {
        result:
          `Balance for ${address}:\n` +
          `Current: ${balance.balanceBTC} BTC\n` +
          `Total Received: ${(balance.totalReceived / 100000000).toFixed(8)} BTC\n` +
          `Total Sent: ${(balance.totalSent / 100000000).toFixed(8)} BTC\n` +
          `Transactions: ${balance.txCount}`,
        newState: {},
      }
    },
  },
  {
    name: "process_matrix",
    description: "Process a binary matrix with spiral reading pattern",
    execute: async (params, state) => {
      const matrixInput = params.matrix as string
      const rows = (params.rows as number) || 14
      const cols = (params.cols as number) || 14
      const counterClockwise = params.counterClockwise !== false

      if (!matrixInput) {
        return { result: "No matrix input provided", newState: {} }
      }

      log(state, `Processing ${rows}x${cols} matrix`)

      const matrix = parseMatrix(matrixInput, rows, cols)
      const spiralBinary = readSpiralMatrix(matrix, counterClockwise)
      const spiralAscii = binaryToAscii(spiralBinary)
      const rowBinary = matrix.map((r) => r.join("")).join("")
      const rowAscii = binaryToAscii(rowBinary)

      const result =
        `Matrix Processing Results:\n` +
        `Spiral (${counterClockwise ? "CCW" : "CW"}) Binary: ${spiralBinary.slice(0, 100)}...\n` +
        `Spiral ASCII: ${spiralAscii}\n` +
        `Row-by-row Binary: ${rowBinary.slice(0, 100)}...\n` +
        `Row-by-row ASCII: ${rowAscii}`

      // Check if any output looks like a URL or key
      if (spiralAscii.includes("gsmg") || spiralAscii.includes("http")) {
        state.discoveries.push(`URL found in matrix: ${spiralAscii}`)
      }

      return {
        result,
        newState: {
          discoveries: state.discoveries,
        },
      }
    },
  },
  {
    name: "generate_hypothesis",
    description: "Use AI to generate new hypotheses based on current state",
    execute: async (params, state) => {
      const focus = (params.focus as string) || "general"

      log(state, `Generating hypotheses for: ${focus}`)

      const prompt = `You are an expert cryptanalyst working on the GSMG.IO 5 BTC Bitcoin puzzle.

Current state:
- Phase: ${state.currentPhase}
- Attempts: ${state.attempts}
- Discoveries: ${state.discoveries.slice(-5).join("; ")}
- Failed approaches: ${state.failedApproaches.slice(-5).join("; ")}
- Potential keys found: ${state.potentialKeys.length}

Focus area: ${focus}

Based on this information, generate 3 specific, actionable hypotheses for solving the puzzle. Each hypothesis should include:
1. What to try
2. Why it might work
3. What tools/methods to use

Be specific and technical.`

      try {
        const response = await generateTextWithHF(prompt, {
          maxTokens: 1000,
          temperature: 0.8,
        })

        return {
          result: `AI Hypotheses:\n${response}`,
          newState: {},
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return {
          result: `Failed to generate hypotheses: ${message}`,
          newState: {},
        }
      }
    },
  },
  {
    name: "reflect_on_failure",
    description: "Analyze failed approaches and suggest improvements",
    execute: async (params, state) => {
      if (state.failedApproaches.length === 0) {
        return { result: "No failed approaches to analyze", newState: {} }
      }

      log(state, "Reflecting on failures...")

      const prompt = `You are an expert cryptanalyst reviewing failed puzzle-solving attempts.

Failed approaches:
${state.failedApproaches.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Successful discoveries so far:
${state.discoveries.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Analyze these failures and:
1. Identify common patterns in what went wrong
2. Suggest alternative approaches that avoid these mistakes
3. Recommend the most promising next steps

Be specific and actionable.`

      try {
        const response = await generateTextWithHF(prompt, {
          maxTokens: 800,
          temperature: 0.5,
        })

        return {
          result: `Failure Analysis:\n${response}`,
          newState: {},
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return {
          result: `Failed to analyze: ${message}`,
          newState: {},
        }
      }
    },
  },
]

// Get tool by name
export function getTool(name: string): AgentTool | undefined {
  return agentTools.find((t) => t.name === name)
}

// Execute a tool
export async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  state: AgentState,
): Promise<{ result: string; newState: AgentState }> {
  const tool = getTool(toolName)

  if (!tool) {
    return {
      result: `Unknown tool: ${toolName}`,
      newState: state,
    }
  }

  state.attempts++

  try {
    const { result, newState } = await tool.execute(params, state)

    return {
      result,
      newState: { ...state, ...newState },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    state.failedApproaches.push(`Tool ${toolName} failed: ${message}`)

    return {
      result: `Tool execution failed: ${message}`,
      newState: state,
    }
  }
}

// Autonomous agent loop
export async function runAutonomousAgent(
  initialState: AgentState,
  maxIterations = 10,
  onProgress?: (state: AgentState, iteration: number, action: string) => void,
): Promise<AgentState> {
  let state = { ...initialState }

  for (let i = 0; i < maxIterations; i++) {
    // Check if we found a valid key
    const validKey = state.validatedResults.find((r) => r.valid)
    if (validKey) {
      log(state, `SUCCESS: Valid key found after ${i + 1} iterations`)
      break
    }

    // Generate next action using AI
    const planPrompt = `You are an autonomous agent solving the GSMG.IO 5 BTC Bitcoin puzzle.

Current state:
- Iteration: ${i + 1}/${maxIterations}
- Discoveries: ${state.discoveries.slice(-3).join("; ") || "None yet"}
- Failed: ${state.failedApproaches.slice(-3).join("; ") || "None"}
- Keys tested: ${state.validatedResults.length}

Available tools:
${agentTools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

What should be the next action? Respond with ONLY a JSON object:
{"tool": "tool_name", "params": {"param1": "value1"}}`

    try {
      const planResponse = await generateTextWithHF(planPrompt, {
        maxTokens: 200,
        temperature: 0.7,
      })

      // Parse the action
      const jsonMatch = planResponse.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        log(state, `Invalid plan response: ${planResponse}`)
        continue
      }

      const action = JSON.parse(jsonMatch[0]) as { tool: string; params: Record<string, unknown> }

      if (onProgress) {
        onProgress(state, i + 1, `Executing: ${action.tool}`)
      }

      // Execute the action
      const { result, newState } = await executeTool(action.tool, action.params, state)
      state = newState

      log(state, `Action ${action.tool} result: ${result.slice(0, 200)}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      log(state, `Iteration ${i + 1} error: ${message}`)
      state.failedApproaches.push(`Iteration ${i + 1}: ${message}`)
    }

    // Small delay between iterations
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  return state
}
