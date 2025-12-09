// Bitcoin key validation API endpoint

import {
  validateKeyForAddress,
  checkAddressBalance,
  parsePrivateKey,
  privateKeyToWIF,
  GSMG_TARGET_ADDRESS,
} from "@/lib/bitcoin-utils"

export async function POST(req: Request) {
  try {
    const { key, address } = await req.json()

    if (!key) {
      return Response.json(
        {
          success: false,
          error: "No key provided",
        },
        { status: 400 },
      )
    }

    const targetAddress = address || GSMG_TARGET_ADDRESS

    // Parse the key
    const parsed = parsePrivateKey(key)

    if (parsed.error || parsed.format === "unknown") {
      return Response.json({
        success: false,
        error: parsed.error || "Could not parse key format",
        inputFormat: parsed.format,
      })
    }

    // Validate against target address
    const validation = validateKeyForAddress(parsed.privateKeyHex, targetAddress)

    // Check balance if valid
    let balance = null
    if (validation.valid) {
      balance = await checkAddressBalance(targetAddress)
    }

    // Generate WIF
    let wif = null
    try {
      wif = privateKeyToWIF(parsed.privateKeyHex, true, true)
    } catch {
      // WIF generation failed
    }

    return Response.json({
      success: true,
      valid: validation.valid,
      inputFormat: parsed.format,
      privateKeyHex: parsed.privateKeyHex,
      privateKeyWIF: wif,
      targetAddress,
      generatedAddresses: {
        compressed: validation.generatedAddressCompressed,
        uncompressed: validation.generatedAddressUncompressed,
      },
      matchType: validation.matchType,
      balance: balance,
    })
  } catch (error) {
    console.error("[v0] Key validation error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    )
  }
}
