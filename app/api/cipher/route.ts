import {
  decryptAES256CBC,
  decryptBeaufort,
  decryptVIC,
  binaryToAscii,
  asciiToBinary,
  sha256Hash,
  md5Hash,
  hexToAscii,
  asciiToHex,
  base64Encode,
  base64Decode,
  rot13,
  caesarCipher,
  atbashCipher,
  vigenereCipher,
  xorStrings,
  readSpiralMatrix,
  parseMatrix,
} from "@/lib/crypto-utils"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { input, password, type, options } = body

    if (!input) {
      return Response.json(
        {
          error: "No input provided",
          success: false,
        },
        { status: 400 },
      )
    }

    let result = ""

    switch (type) {
      case "aes":
      case "aes-256-cbc":
        if (!password) {
          return Response.json(
            {
              error: "Password required for AES decryption",
              success: false,
            },
            { status: 400 },
          )
        }
        result = decryptAES256CBC(input, password)
        break

      case "beaufort":
        if (!password) {
          return Response.json(
            {
              error: "Key required for Beaufort cipher",
              success: false,
            },
            { status: 400 },
          )
        }
        result = decryptBeaufort(input, password)
        break

      case "vic":
        const digitRow1 = options?.digitRow1 ?? 1
        const digitRow2 = options?.digitRow2 ?? 4
        result = decryptVIC(input, password || "FUBCDORALETHINGKYMVPSJQZXW", digitRow1, digitRow2)
        break

      case "binary":
      case "binary-to-ascii":
        result = binaryToAscii(input)
        break

      case "ascii-to-binary":
        result = asciiToBinary(input)
        break

      case "sha256":
        result = sha256Hash(input)
        break

      case "md5":
        result = md5Hash(input)
        break

      case "hex-to-ascii":
        result = hexToAscii(input)
        break

      case "ascii-to-hex":
        result = asciiToHex(input)
        break

      case "base64-encode":
        result = base64Encode(input)
        break

      case "base64-decode":
        result = base64Decode(input)
        break

      case "rot13":
        result = rot13(input)
        break

      case "caesar":
        const shift = options?.shift ?? 3
        result = caesarCipher(input, shift)
        break

      case "atbash":
        result = atbashCipher(input)
        break

      case "vigenere-encrypt":
        if (!password) {
          return Response.json(
            {
              error: "Key required for Vigenere cipher",
              success: false,
            },
            { status: 400 },
          )
        }
        result = vigenereCipher(input, password, false)
        break

      case "vigenere-decrypt":
        if (!password) {
          return Response.json(
            {
              error: "Key required for Vigenere cipher",
              success: false,
            },
            { status: 400 },
          )
        }
        result = vigenereCipher(input, password, true)
        break

      case "xor":
        if (!password) {
          return Response.json(
            {
              error: "Second operand required for XOR",
              success: false,
            },
            { status: 400 },
          )
        }
        const format = options?.format ?? "hex"
        result = xorStrings(input, password, format)
        break

      case "spiral-matrix":
        const rows = options?.rows ?? 14
        const cols = options?.cols ?? 14
        const counterClockwise = options?.counterClockwise ?? true
        const matrix = parseMatrix(input, rows, cols)
        const spiralBinary = readSpiralMatrix(matrix, counterClockwise)
        const spiralAscii = binaryToAscii(spiralBinary)
        result = `Binary (spiral): ${spiralBinary}\n\nASCII: ${spiralAscii}`
        break

      default:
        return Response.json(
          {
            error: `Unknown cipher type: ${type}`,
            success: false,
          },
          { status: 400 },
        )
    }

    return Response.json({
      result,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Cipher processing error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json(
      {
        error: `Cipher processing failed: ${message}`,
        success: false,
      },
      { status: 500 },
    )
  }
}
