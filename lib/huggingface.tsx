// Complete Hugging Face API integration for AI-powered puzzle solving

const HF_API_URL = "https://api-inference.huggingface.co/models"

interface HFOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  topP?: number
  doSample?: boolean
}

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

// Get API key with validation
function getApiKey(): string {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY environment variable is not set. Please add it to your environment variables.")
  }
  return apiKey
}

// Generic HF API call with retry logic
async function callHuggingFaceAPI(model: string, payload: Record<string, unknown>, retries = 3): Promise<unknown> {
  const apiKey = getApiKey()

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${HF_API_URL}/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 503) {
        // Model is loading, wait and retry
        const data = await response.json()
        const waitTime = data.estimated_time || 20
        console.log(`[v0] Model loading, waiting ${waitTime}s...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000))
        continue
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HF API error (${response.status}): ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      if (attempt === retries - 1) throw error
      console.log(`[v0] Retry ${attempt + 1}/${retries} after error`)
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  throw new Error("Max retries exceeded")
}

// Text generation with Mistral or other models
export async function generateTextWithHF(prompt: string, options: HFOptions = {}): Promise<string> {
  const model = options.model || "mistralai/Mistral-7B-Instruct-v0.3"

  const formattedPrompt =
    model.includes("Mistral") || model.includes("mistral") ? `<s>[INST] ${prompt} [/INST]` : prompt

  const result = (await callHuggingFaceAPI(model, {
    inputs: formattedPrompt,
    parameters: {
      max_new_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.95,
      do_sample: options.doSample ?? true,
      return_full_text: false,
    },
  })) as Array<{ generated_text: string }>

  if (Array.isArray(result) && result[0]?.generated_text) {
    return result[0].generated_text.trim()
  }

  throw new Error("Unexpected response format from text generation")
}

// Chat completion with context
export async function chatWithHF(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
  // Build conversation context
  let conversationText = ""

  if (systemPrompt) {
    conversationText += `System: ${systemPrompt}\n\n`
  }

  for (const msg of messages) {
    const role = msg.role === "user" ? "User" : msg.role === "assistant" ? "Assistant" : "System"
    conversationText += `${role}: ${msg.content}\n\n`
  }

  conversationText += "Assistant:"

  // Use Zephyr for better chat quality
  const model = "HuggingFaceH4/zephyr-7b-beta"

  const formattedPrompt = `<|system|>
${systemPrompt || "You are a helpful AI assistant."}
</s>
${messages
  .map(
    (m) => `<|${m.role}|>
${m.content}
</s>`,
  )
  .join("\n")}
<|assistant|>`

  const result = (await callHuggingFaceAPI(model, {
    inputs: formattedPrompt,
    parameters: {
      max_new_tokens: 2048,
      temperature: 0.7,
      top_p: 0.95,
      do_sample: true,
      return_full_text: false,
    },
  })) as Array<{ generated_text: string }>

  if (Array.isArray(result) && result[0]?.generated_text) {
    return result[0].generated_text.trim()
  }

  throw new Error("Unexpected response format from chat")
}

// Image captioning with BLIP
export async function analyzeImageWithHF(imageBase64: string, options: HFOptions = {}): Promise<string> {
  const model = options.model || "Salesforce/blip-image-captioning-large"

  const imageBuffer = Buffer.from(imageBase64, "base64")

  const apiKey = getApiKey()
  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageBuffer,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Image analysis failed: ${errorText}`)
  }

  const result = (await response.json()) as Array<{ generated_text: string }>

  if (Array.isArray(result) && result[0]?.generated_text) {
    return result[0].generated_text
  }

  throw new Error("Unexpected response from image captioning")
}

// Visual Question Answering
export async function visualQAWithHF(imageBase64: string, question: string): Promise<string> {
  const model = "dandelin/vilt-b32-finetuned-vqa"

  const result = (await callHuggingFaceAPI(model, {
    inputs: {
      image: imageBase64,
      question: question,
    },
  })) as Array<{ answer: string; score: number }>

  if (Array.isArray(result) && result[0]?.answer) {
    return result[0].answer
  }

  throw new Error("Unexpected response from VQA")
}

// Zero-shot image classification
export async function classifyImageWithHF(
  imageBase64: string,
  candidateLabels: string[],
): Promise<Array<{ label: string; score: number }>> {
  const model = "openai/clip-vit-large-patch14"

  const imageBuffer = Buffer.from(imageBase64, "base64")

  const apiKey = getApiKey()
  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: imageBase64,
      parameters: {
        candidate_labels: candidateLabels,
      },
    }),
  })

  if (!response.ok) {
    // Fallback - return empty results
    return candidateLabels.map((label) => ({ label, score: 0 }))
  }

  const result = await response.json()

  if (Array.isArray(result)) {
    return result
  }

  return candidateLabels.map((label) => ({ label, score: 0 }))
}

// Object detection with DETR
export async function detectObjectsWithHF(
  imageBase64: string,
): Promise<Array<{ label: string; score: number; box: { xmin: number; ymin: number; xmax: number; ymax: number } }>> {
  const model = "facebook/detr-resnet-50"

  const imageBuffer = Buffer.from(imageBase64, "base64")

  const apiKey = getApiKey()
  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageBuffer,
  })

  if (!response.ok) {
    return []
  }

  const result = await response.json()
  return Array.isArray(result) ? result : []
}

// Image segmentation
export async function segmentImageWithHF(
  imageBase64: string,
): Promise<Array<{ label: string; score: number; mask: string }>> {
  const model = "facebook/detr-resnet-50-panoptic"

  const imageBuffer = Buffer.from(imageBase64, "base64")

  const apiKey = getApiKey()
  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageBuffer,
  })

  if (!response.ok) {
    return []
  }

  const result = await response.json()
  return Array.isArray(result) ? result : []
}

// Text summarization
export async function summarizeTextWithHF(text: string): Promise<string> {
  const model = "facebook/bart-large-cnn"

  const result = (await callHuggingFaceAPI(model, {
    inputs: text,
    parameters: {
      max_length: 500,
      min_length: 50,
      do_sample: false,
    },
  })) as Array<{ summary_text: string }>

  if (Array.isArray(result) && result[0]?.summary_text) {
    return result[0].summary_text
  }

  throw new Error("Unexpected response from summarization")
}

// Named Entity Recognition
export async function extractEntitiesWithHF(
  text: string,
): Promise<Array<{ entity_group: string; word: string; score: number }>> {
  const model = "dslim/bert-base-NER"

  const result = (await callHuggingFaceAPI(model, {
    inputs: text,
  })) as Array<{ entity_group: string; word: string; score: number }>

  return Array.isArray(result) ? result : []
}

// Question Answering
export async function answerQuestionWithHF(
  question: string,
  context: string,
): Promise<{ answer: string; score: number }> {
  const model = "deepset/roberta-base-squad2"

  const result = (await callHuggingFaceAPI(model, {
    inputs: {
      question,
      context,
    },
  })) as { answer: string; score: number }

  return result
}

// Fill mask (for pattern completion)
export async function fillMaskWithHF(
  textWithMask: string,
): Promise<Array<{ sequence: string; score: number; token_str: string }>> {
  const model = "bert-base-uncased"

  const result = (await callHuggingFaceAPI(model, {
    inputs: textWithMask,
  })) as Array<{ sequence: string; score: number; token_str: string }>

  return Array.isArray(result) ? result : []
}

// Sentence similarity
export async function computeSimilarityWithHF(sourceSentence: string, sentences: string[]): Promise<number[]> {
  const model = "sentence-transformers/all-MiniLM-L6-v2"

  const result = (await callHuggingFaceAPI(model, {
    inputs: {
      source_sentence: sourceSentence,
      sentences: sentences,
    },
  })) as number[]

  return Array.isArray(result) ? result : []
}

// Text classification
export async function classifyTextWithHF(text: string): Promise<Array<{ label: string; score: number }>> {
  const model = "distilbert-base-uncased-finetuned-sst-2-english"

  const result = (await callHuggingFaceAPI(model, {
    inputs: text,
  })) as Array<Array<{ label: string; score: number }>>

  return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : []
}
