// Complete Bitcoin utilities for key validation and wallet checking

import crypto from "crypto"

// Bitcoin address validation regex patterns
const LEGACY_ADDRESS_REGEX = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
const SEGWIT_ADDRESS_REGEX = /^(bc1)[a-zA-HJ-NP-Z0-9]{25,89}$/
const TESTNET_ADDRESS_REGEX = /^[2mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/

// Base58 alphabet for Bitcoin
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

// Validate Bitcoin address format
export function isValidBitcoinAddress(address: string): boolean {
  return LEGACY_ADDRESS_REGEX.test(address) || SEGWIT_ADDRESS_REGEX.test(address) || TESTNET_ADDRESS_REGEX.test(address)
}

// Base58 decode
export function base58Decode(str: string): Buffer {
  const bytes: number[] = [0]

  for (const char of str) {
    const carry = BASE58_ALPHABET.indexOf(char)
    if (carry === -1) {
      throw new Error(`Invalid Base58 character: ${char}`)
    }

    for (let i = 0; i < bytes.length; i++) {
      const n = bytes[i] * 58 + carry
      bytes[i] = n % 256
      if (i === bytes.length - 1 && n >= 256) {
        bytes.push(Math.floor(n / 256))
      } else if (n >= 256) {
        bytes[i + 1] = (bytes[i + 1] || 0) + Math.floor(n / 256)
      }
    }
  }

  // Add leading zeros
  for (const char of str) {
    if (char === "1") {
      bytes.push(0)
    } else {
      break
    }
  }

  return Buffer.from(bytes.reverse())
}

// Base58 encode
export function base58Encode(buffer: Buffer): string {
  const digits = [0]

  for (const byte of buffer) {
    let carry = byte
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] * 256
      digits[i] = carry % 58
      carry = Math.floor(carry / 58)
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = Math.floor(carry / 58)
    }
  }

  // Add leading zeros
  for (const byte of buffer) {
    if (byte === 0) {
      digits.push(0)
    } else {
      break
    }
  }

  return digits
    .reverse()
    .map((d) => BASE58_ALPHABET[d])
    .join("")
}

// Double SHA256 hash
export function doubleSha256(buffer: Buffer): Buffer {
  const first = crypto.createHash("sha256").update(buffer).digest()
  return crypto.createHash("sha256").update(first).digest()
}

// RIPEMD160 hash
export function ripemd160(buffer: Buffer): Buffer {
  return crypto.createHash("ripemd160").update(buffer).digest()
}

// Hash160 (SHA256 + RIPEMD160)
export function hash160(buffer: Buffer): Buffer {
  const sha = crypto.createHash("sha256").update(buffer).digest()
  return ripemd160(sha)
}

// Generate Bitcoin address from private key (uncompressed)
export function privateKeyToAddress(privateKeyHex: string, compressed = true): string {
  // Validate private key length
  if (privateKeyHex.length !== 64) {
    throw new Error("Private key must be 64 hex characters (32 bytes)")
  }

  // Import private key
  const privateKeyBuffer = Buffer.from(privateKeyHex, "hex")

  // Generate public key using Node.js crypto
  const ecdh = crypto.createECDH("secp256k1")
  ecdh.setPrivateKey(privateKeyBuffer)

  let publicKey: Buffer
  if (compressed) {
    // Compressed public key (33 bytes)
    const fullPublicKey = ecdh.getPublicKey()
    const x = fullPublicKey.subarray(1, 33)
    const y = fullPublicKey.subarray(33, 65)
    const prefix = y[31] % 2 === 0 ? 0x02 : 0x03
    publicKey = Buffer.concat([Buffer.from([prefix]), x])
  } else {
    // Uncompressed public key (65 bytes)
    publicKey = ecdh.getPublicKey()
  }

  // Hash160 of public key
  const publicKeyHash = hash160(publicKey)

  // Add version byte (0x00 for mainnet)
  const versionedHash = Buffer.concat([Buffer.from([0x00]), publicKeyHash])

  // Calculate checksum (first 4 bytes of double SHA256)
  const checksum = doubleSha256(versionedHash).subarray(0, 4)

  // Concatenate and encode
  const addressBytes = Buffer.concat([versionedHash, checksum])

  return base58Encode(addressBytes)
}

// Generate WIF (Wallet Import Format) from private key
export function privateKeyToWIF(privateKeyHex: string, compressed = true, mainnet = true): string {
  const privateKeyBuffer = Buffer.from(privateKeyHex, "hex")

  // Version byte: 0x80 for mainnet, 0xEF for testnet
  const version = mainnet ? 0x80 : 0xef

  let extendedKey: Buffer
  if (compressed) {
    // Add 0x01 suffix for compressed
    extendedKey = Buffer.concat([Buffer.from([version]), privateKeyBuffer, Buffer.from([0x01])])
  } else {
    extendedKey = Buffer.concat([Buffer.from([version]), privateKeyBuffer])
  }

  // Calculate checksum
  const checksum = doubleSha256(extendedKey).subarray(0, 4)

  // Encode
  return base58Encode(Buffer.concat([extendedKey, checksum]))
}

// Decode WIF to private key hex
export function wifToPrivateKey(wif: string): { privateKey: string; compressed: boolean; mainnet: boolean } {
  const decoded = base58Decode(wif)

  // Verify checksum
  const payload = decoded.subarray(0, -4)
  const checksum = decoded.subarray(-4)
  const calculatedChecksum = doubleSha256(payload).subarray(0, 4)

  if (!checksum.equals(calculatedChecksum)) {
    throw new Error("Invalid WIF checksum")
  }

  const version = payload[0]
  const mainnet = version === 0x80

  let privateKey: Buffer
  let compressed: boolean

  if (payload.length === 34 && payload[33] === 0x01) {
    // Compressed
    privateKey = payload.subarray(1, 33)
    compressed = true
  } else if (payload.length === 33) {
    // Uncompressed
    privateKey = payload.subarray(1, 33)
    compressed = false
  } else {
    throw new Error("Invalid WIF format")
  }

  return {
    privateKey: privateKey.toString("hex"),
    compressed,
    mainnet,
  }
}

// Validate if a private key matches a target address
export function validateKeyForAddress(
  privateKeyHex: string,
  targetAddress: string,
): {
  valid: boolean
  generatedAddressCompressed: string
  generatedAddressUncompressed: string
  matchType: "compressed" | "uncompressed" | "none"
} {
  try {
    const compressedAddress = privateKeyToAddress(privateKeyHex, true)
    const uncompressedAddress = privateKeyToAddress(privateKeyHex, false)

    const matchesCompressed = compressedAddress === targetAddress
    const matchesUncompressed = uncompressedAddress === targetAddress

    return {
      valid: matchesCompressed || matchesUncompressed,
      generatedAddressCompressed: compressedAddress,
      generatedAddressUncompressed: uncompressedAddress,
      matchType: matchesCompressed ? "compressed" : matchesUncompressed ? "uncompressed" : "none",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      valid: false,
      generatedAddressCompressed: `Error: ${message}`,
      generatedAddressUncompressed: `Error: ${message}`,
      matchType: "none",
    }
  }
}

// Check Bitcoin address balance via public APIs
export async function checkAddressBalance(address: string): Promise<{
  balance: number
  balanceBTC: string
  totalReceived: number
  totalSent: number
  txCount: number
  error?: string
}> {
  try {
    // Try Blockchain.info API
    const response = await fetch(`https://blockchain.info/rawaddr/${address}?limit=0`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = (await response.json()) as {
      final_balance: number
      total_received: number
      total_sent: number
      n_tx: number
    }

    return {
      balance: data.final_balance,
      balanceBTC: (data.final_balance / 100000000).toFixed(8),
      totalReceived: data.total_received,
      totalSent: data.total_sent,
      txCount: data.n_tx,
    }
  } catch (error) {
    // Try Blockstream API as fallback
    try {
      const response = await fetch(`https://blockstream.info/api/address/${address}`, {
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const data = (await response.json()) as {
        chain_stats: {
          funded_txo_sum: number
          spent_txo_sum: number
          tx_count: number
        }
      }

      const balance = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum

      return {
        balance,
        balanceBTC: (balance / 100000000).toFixed(8),
        totalReceived: data.chain_stats.funded_txo_sum,
        totalSent: data.chain_stats.spent_txo_sum,
        txCount: data.chain_stats.tx_count,
      }
    } catch (fallbackError) {
      const message = error instanceof Error ? error.message : "Unknown error"
      return {
        balance: 0,
        balanceBTC: "0.00000000",
        totalReceived: 0,
        totalSent: 0,
        txCount: 0,
        error: `Failed to fetch balance: ${message}`,
      }
    }
  }
}

// Parse potential private key from various formats
export function parsePrivateKey(input: string): {
  privateKeyHex: string
  format: "hex" | "wif" | "decimal" | "binary" | "unknown"
  error?: string
} {
  const cleaned = input.trim()

  // Try hex (64 characters)
  if (/^[a-fA-F0-9]{64}$/.test(cleaned)) {
    return { privateKeyHex: cleaned.toLowerCase(), format: "hex" }
  }

  // Try WIF format
  if (/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(cleaned)) {
    try {
      const { privateKey } = wifToPrivateKey(cleaned)
      return { privateKeyHex: privateKey, format: "wif" }
    } catch (error) {
      return {
        privateKeyHex: "",
        format: "unknown",
        error: "Invalid WIF format",
      }
    }
  }

  // Try decimal
  if (/^\d+$/.test(cleaned)) {
    try {
      const bn = BigInt(cleaned)
      const hex = bn.toString(16).padStart(64, "0")
      if (hex.length <= 64) {
        return { privateKeyHex: hex, format: "decimal" }
      }
    } catch {
      // Not a valid decimal
    }
  }

  // Try binary
  if (/^[01]+$/.test(cleaned) && cleaned.length <= 256) {
    try {
      const bn = BigInt("0b" + cleaned)
      const hex = bn.toString(16).padStart(64, "0")
      return { privateKeyHex: hex, format: "binary" }
    } catch {
      // Not valid binary
    }
  }

  // Try hex with 0x prefix
  if (/^0x[a-fA-F0-9]{1,64}$/.test(cleaned)) {
    const hex = cleaned.slice(2).padStart(64, "0").toLowerCase()
    return { privateKeyHex: hex, format: "hex" }
  }

  return {
    privateKeyHex: "",
    format: "unknown",
    error: "Could not parse private key format",
  }
}

// GSMG.IO specific target address
export const GSMG_TARGET_ADDRESS = "1GSMG1JC9wtdSwfwApgj2xcmJPAwx7prBe"
