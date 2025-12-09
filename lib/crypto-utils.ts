// Complete cryptographic utilities for the GSMG.IO puzzle

import crypto from "crypto"

// AES-256-CBC decryption (OpenSSL compatible)
export function decryptAES256CBC(encrypted: string, password: string): string {
  try {
    // Handle both raw passwords and pre-hashed SHA256
    let keyMaterial: Buffer
    if (password.length === 64 && /^[a-fA-F0-9]+$/.test(password)) {
      keyMaterial = Buffer.from(password, "hex")
    } else {
      keyMaterial = crypto.createHash("sha256").update(password).digest()
    }

    // Parse OpenSSL "Salted__" format
    const encryptedBuffer = Buffer.from(encrypted, "base64")

    // Check for "Salted__" header
    const saltedHeader = encryptedBuffer.subarray(0, 8).toString("utf8")

    let salt: Buffer
    let ciphertext: Buffer

    if (saltedHeader === "Salted__") {
      salt = encryptedBuffer.subarray(8, 16)
      ciphertext = encryptedBuffer.subarray(16)
    } else {
      // No salt, use empty buffer and treat entire input as ciphertext
      salt = Buffer.alloc(8)
      ciphertext = encryptedBuffer
    }

    // Derive key and IV using EVP_BytesToKey (OpenSSL method)
    const { key, iv } = evpBytesToKey(keyMaterial, salt, 32, 16)

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
    let decrypted = decipher.update(ciphertext)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString("utf8")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return `AES-256-CBC Decryption Error: ${message}`
  }
}

// OpenSSL EVP_BytesToKey implementation
function evpBytesToKey(password: Buffer, salt: Buffer, keyLen: number, ivLen: number): { key: Buffer; iv: Buffer } {
  const md5Hashes: Buffer[] = []
  let digest = Buffer.from("")
  let totalLen = 0

  while (totalLen < keyLen + ivLen) {
    const data = Buffer.concat([digest, password, salt])
    digest = crypto.createHash("md5").update(data).digest()
    md5Hashes.push(digest)
    totalLen += digest.length
  }

  const combined = Buffer.concat(md5Hashes)
  return {
    key: combined.subarray(0, keyLen),
    iv: combined.subarray(keyLen, keyLen + ivLen),
  }
}

// Beaufort cipher decryption
export function decryptBeaufort(ciphertext: string, key: string): string {
  try {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const normalizedKey = key.toUpperCase().replace(/[^A-Z]/g, "")

    if (normalizedKey.length === 0) {
      return "Error: Key must contain at least one letter"
    }

    let result = ""
    let keyIndex = 0

    for (const char of ciphertext) {
      const upperChar = char.toUpperCase()
      const charIndex = alphabet.indexOf(upperChar)

      if (charIndex !== -1) {
        const keyChar = normalizedKey[keyIndex % normalizedKey.length]
        const keyCharIndex = alphabet.indexOf(keyChar)
        // Beaufort: plaintext = (key - ciphertext) mod 26
        const decryptedIndex = (keyCharIndex - charIndex + 26) % 26

        // Preserve original case
        if (char === upperChar) {
          result += alphabet[decryptedIndex]
        } else {
          result += alphabet[decryptedIndex].toLowerCase()
        }
        keyIndex++
      } else {
        // Non-alphabetic characters pass through unchanged
        result += char
      }
    }

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return `Beaufort Cipher Error: ${message}`
  }
}

// VIC cipher decryption (straddling checkerboard variant)
export function decryptVIC(numbers: string, alphabet: string, digitRow1 = 1, digitRow2 = 4): string {
  try {
    // Clean inputs
    const digits = numbers.replace(/\s/g, "")
    const cleanAlphabet = alphabet.toUpperCase()

    // Build straddling checkerboard
    // First row (single digits 0-9 except digitRow1 and digitRow2)
    // Second row (two-digit numbers starting with digitRow1)
    // Third row (two-digit numbers starting with digitRow2)

    const singleDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== digitRow1 && d !== digitRow2)

    // Map digits to characters
    const charMap = new Map<string, string>()
    let alphabetIndex = 0

    // First 8 characters use single digits
    for (const digit of singleDigits) {
      if (alphabetIndex < cleanAlphabet.length) {
        charMap.set(String(digit), cleanAlphabet[alphabetIndex])
        alphabetIndex++
      }
    }

    // Next 10 characters use digitRow1 + 0-9
    for (let i = 0; i <= 9; i++) {
      if (alphabetIndex < cleanAlphabet.length) {
        charMap.set(`${digitRow1}${i}`, cleanAlphabet[alphabetIndex])
        alphabetIndex++
      }
    }

    // Remaining characters use digitRow2 + 0-9
    for (let i = 0; i <= 9; i++) {
      if (alphabetIndex < cleanAlphabet.length) {
        charMap.set(`${digitRow2}${i}`, cleanAlphabet[alphabetIndex])
        alphabetIndex++
      }
    }

    // Decode message
    let result = ""
    let i = 0

    while (i < digits.length) {
      const singleDigit = digits[i]

      // Check if this is a two-digit code
      if (singleDigit === String(digitRow1) || singleDigit === String(digitRow2)) {
        if (i + 1 < digits.length) {
          const twoDigit = digits.substring(i, i + 2)
          const char = charMap.get(twoDigit)
          if (char) {
            result += char
          }
          i += 2
        } else {
          i++
        }
      } else {
        const char = charMap.get(singleDigit)
        if (char) {
          result += char
        }
        i++
      }
    }

    return result || "Unable to decode. Check alphabet and digit assignments."
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return `VIC Cipher Error: ${message}`
  }
}

// Binary to ASCII conversion
export function binaryToAscii(binary: string): string {
  try {
    // Remove all whitespace
    const cleaned = binary.replace(/\s/g, "")

    // Validate binary input
    if (!/^[01]+$/.test(cleaned)) {
      return "Error: Input must contain only 0s and 1s"
    }

    // Split into 8-bit chunks
    const chunks = cleaned.match(/.{1,8}/g) || []

    let result = ""
    const invalidChunks: string[] = []

    for (const chunk of chunks) {
      if (chunk.length === 8) {
        const decimal = Number.parseInt(chunk, 2)
        // Only add printable ASCII characters
        if (decimal >= 32 && decimal <= 126) {
          result += String.fromCharCode(decimal)
        } else if (decimal === 10 || decimal === 13) {
          result += String.fromCharCode(decimal) // Newlines
        } else {
          result += `[0x${decimal.toString(16).padStart(2, "0")}]`
        }
      } else {
        invalidChunks.push(chunk)
      }
    }

    if (invalidChunks.length > 0) {
      result += `\n\n[Warning: ${invalidChunks.length} incomplete byte(s) ignored]`
    }

    return result || "No valid 8-bit sequences found"
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return `Binary Conversion Error: ${message}`
  }
}

// ASCII to Binary conversion
export function asciiToBinary(text: string): string {
  try {
    let result = ""
    for (const char of text) {
      const binary = char.charCodeAt(0).toString(2).padStart(8, "0")
      result += binary + " "
    }
    return result.trim()
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return `ASCII to Binary Error: ${message}`
  }
}

// SHA256 hash function
export function sha256Hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex")
}

// MD5 hash function (for OpenSSL key derivation)
export function md5Hash(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex")
}

// Hexadecimal to ASCII
export function hexToAscii(hex: string): string {
  try {
    const cleaned = hex.replace(/\s/g, "").replace(/^0x/i, "")

    if (!/^[a-fA-F0-9]+$/.test(cleaned)) {
      return "Error: Invalid hexadecimal input"
    }

    if (cleaned.length % 2 !== 0) {
      return "Error: Hexadecimal string must have even length"
    }

    let result = ""
    for (let i = 0; i < cleaned.length; i += 2) {
      const byte = Number.parseInt(cleaned.substring(i, i + 2), 16)
      result += String.fromCharCode(byte)
    }

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return `Hex to ASCII Error: ${message}`
  }
}

// ASCII to Hexadecimal
export function asciiToHex(text: string): string {
  let result = ""
  for (const char of text) {
    result += char.charCodeAt(0).toString(16).padStart(2, "0")
  }
  return result
}

// Base64 encode
export function base64Encode(input: string): string {
  return Buffer.from(input).toString("base64")
}

// Base64 decode
export function base64Decode(input: string): string {
  try {
    return Buffer.from(input, "base64").toString("utf8")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return `Base64 Decode Error: ${message}`
  }
}

// ROT13 cipher (simple substitution)
export function rot13(text: string): string {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const base = char <= "Z" ? 65 : 97
    return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base)
  })
}

// Caesar cipher with configurable shift
export function caesarCipher(text: string, shift: number): string {
  const normalizedShift = ((shift % 26) + 26) % 26
  return text.replace(/[a-zA-Z]/g, (char) => {
    const base = char <= "Z" ? 65 : 97
    return String.fromCharCode(((char.charCodeAt(0) - base + normalizedShift) % 26) + base)
  })
}

// Atbash cipher
export function atbashCipher(text: string): string {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const base = char <= "Z" ? 65 : 97
    return String.fromCharCode(base + (25 - (char.charCodeAt(0) - base)))
  })
}

// Vigenere cipher encrypt/decrypt
export function vigenereCipher(text: string, key: string, decrypt = false): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const normalizedKey = key.toUpperCase().replace(/[^A-Z]/g, "")

  if (normalizedKey.length === 0) {
    return "Error: Key must contain at least one letter"
  }

  let result = ""
  let keyIndex = 0

  for (const char of text) {
    const upperChar = char.toUpperCase()
    const charIndex = alphabet.indexOf(upperChar)

    if (charIndex !== -1) {
      const keyChar = normalizedKey[keyIndex % normalizedKey.length]
      const keyCharIndex = alphabet.indexOf(keyChar)

      let newIndex: number
      if (decrypt) {
        newIndex = (charIndex - keyCharIndex + 26) % 26
      } else {
        newIndex = (charIndex + keyCharIndex) % 26
      }

      if (char === upperChar) {
        result += alphabet[newIndex]
      } else {
        result += alphabet[newIndex].toLowerCase()
      }
      keyIndex++
    } else {
      result += char
    }
  }

  return result
}

// XOR operation for binary strings or hex
export function xorStrings(a: string, b: string, format: "binary" | "hex" = "hex"): string {
  try {
    let bufA: Buffer
    let bufB: Buffer

    if (format === "hex") {
      bufA = Buffer.from(a.replace(/\s/g, ""), "hex")
      bufB = Buffer.from(b.replace(/\s/g, ""), "hex")
    } else {
      bufA = Buffer.from(
        a
          .replace(/\s/g, "")
          .match(/.{8}/g)
          ?.map((b) => Number.parseInt(b, 2)) || [],
      )
      bufB = Buffer.from(
        b
          .replace(/\s/g, "")
          .match(/.{8}/g)
          ?.map((b) => Number.parseInt(b, 2)) || [],
      )
    }

    const length = Math.max(bufA.length, bufB.length)
    const result = Buffer.alloc(length)

    for (let i = 0; i < length; i++) {
      result[i] = (bufA[i % bufA.length] || 0) ^ (bufB[i % bufB.length] || 0)
    }

    if (format === "hex") {
      return result.toString("hex")
    } else {
      return Array.from(result)
        .map((b) => b.toString(2).padStart(8, "0"))
        .join(" ")
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return `XOR Error: ${message}`
  }
}

// Spiral matrix reading (for 14x14 binary matrix)
export function readSpiralMatrix(matrix: number[][], counterClockwise = true): string {
  if (matrix.length === 0) return ""

  const rows = matrix.length
  const cols = matrix[0].length
  const result: number[] = []

  let top = 0,
    bottom = rows - 1,
    left = 0,
    right = cols - 1

  while (top <= bottom && left <= right) {
    if (counterClockwise) {
      // Left column (top to bottom)
      for (let i = top; i <= bottom; i++) {
        result.push(matrix[i][left])
      }
      left++

      // Bottom row (left to right)
      for (let i = left; i <= right; i++) {
        result.push(matrix[bottom][i])
      }
      bottom--

      // Right column (bottom to top)
      if (left <= right) {
        for (let i = bottom; i >= top; i--) {
          result.push(matrix[i][right])
        }
        right--
      }

      // Top row (right to left)
      if (top <= bottom) {
        for (let i = right; i >= left; i--) {
          result.push(matrix[top][i])
        }
        top++
      }
    } else {
      // Clockwise spiral
      // Top row
      for (let i = left; i <= right; i++) {
        result.push(matrix[top][i])
      }
      top++

      // Right column
      for (let i = top; i <= bottom; i++) {
        result.push(matrix[i][right])
      }
      right--

      // Bottom row
      if (top <= bottom) {
        for (let i = right; i >= left; i--) {
          result.push(matrix[bottom][i])
        }
        bottom--
      }

      // Left column
      if (left <= right) {
        for (let i = bottom; i >= top; i--) {
          result.push(matrix[i][left])
        }
        left++
      }
    }
  }

  return result.join("")
}

// Parse matrix from text input
export function parseMatrix(input: string, rows: number, cols: number): number[][] {
  const values = input.replace(/[^01]/g, "").split("").map(Number)
  const matrix: number[][] = []

  for (let i = 0; i < rows; i++) {
    const row: number[] = []
    for (let j = 0; j < cols; j++) {
      const index = i * cols + j
      row.push(values[index] || 0)
    }
    matrix.push(row)
  }

  return matrix
}
