import { analyzeImageWithHF, visualQAWithHF, classifyImageWithHF, generateTextWithHF } from "@/lib/huggingface"

export async function POST(req: Request) {
  try {
    const { image, analysisType } = await req.json()

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 })
    }

    // Extract base64 data
    const base64Data = image.includes(",") ? image.split(",")[1] : image

    const analysisResults: string[] = []

    // 1. Basic image captioning with BLIP
    try {
      const caption = await analyzeImageWithHF(base64Data, {
        model: "Salesforce/blip-image-captioning-large",
      })
      analysisResults.push(`[Image Description]\n${caption}`)
    } catch (error) {
      analysisResults.push(`[Image Description]\nUnable to generate caption`)
    }

    // 2. Zero-shot classification for puzzle elements
    try {
      const classifications = await classifyImageWithHF(base64Data, [
        "binary matrix grid",
        "colored squares pattern",
        "chess board",
        "QR code",
        "text document",
        "cryptographic puzzle",
        "pixel art",
        "abstract pattern",
      ])

      const classificationText = classifications
        .filter((c: { score: number }) => c.score > 0.1)
        .map((c: { label: string; score: number }) => `  - ${c.label}: ${(c.score * 100).toFixed(1)}%`)
        .join("\n")

      analysisResults.push(`[Pattern Classification]\n${classificationText}`)
    } catch (error) {
      analysisResults.push(`[Pattern Classification]\nUnable to classify patterns`)
    }

    // 3. Visual QA for specific puzzle elements
    const questions = [
      "How many rows and columns are in the grid?",
      "What colors are present in the image?",
      "Is there any text visible?",
      "What shape is the main pattern?",
    ]

    for (const question of questions) {
      try {
        const answer = await visualQAWithHF(base64Data, question)
        analysisResults.push(`[Q: ${question}]\n${answer}`)
      } catch {
        // Skip failed questions
      }
    }

    // 4. Generate comprehensive analysis using text model
    const analysisPrompt = `You are a cryptographic puzzle analyst. Based on the image analysis results below, provide a detailed assessment for the GSMG.IO 5 BTC puzzle:

${analysisResults.join("\n\n")}

Analyze:
1. If this appears to be a binary matrix, estimate the grid dimensions
2. Identify which colors represent binary 1 (typically black/blue) and 0 (typically yellow/white)
3. Suggest the reading pattern (spiral, row-by-row, etc.)
4. Note any hidden text, steganography indicators, or unusual patterns
5. Recommend next steps for decryption

Be specific and technical in your analysis.`

    try {
      const comprehensiveAnalysis = await generateTextWithHF(analysisPrompt, {
        model: "mistralai/Mistral-7B-Instruct-v0.3",
        maxTokens: 1500,
        temperature: 0.3,
      })

      analysisResults.push(`[Comprehensive Analysis]\n${comprehensiveAnalysis}`)
    } catch (error) {
      // Continue without comprehensive analysis
    }

    const fullAnalysis = analysisResults.join("\n\n" + "=".repeat(50) + "\n\n")

    return Response.json({
      analysis: fullAnalysis,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Image analysis error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json(
      {
        error: `Image analysis failed: ${message}`,
        success: false,
      },
      { status: 500 },
    )
  }
}
