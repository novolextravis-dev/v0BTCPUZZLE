// Web scraping utilities for autonomous research

export interface ScrapedContent {
  url: string
  title: string
  content: string
  links: string[]
  images: string[]
  metadata: Record<string, string>
  error?: string
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

// Scrape a URL and extract content
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GSMGPuzzleBot/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ""

    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    const description = metaDescMatch ? metaDescMatch[1] : ""

    // Extract all links
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi)
    const links: string[] = []
    for (const match of linkMatches) {
      try {
        const absoluteUrl = new URL(match[1], url).href
        if (absoluteUrl.startsWith("http")) {
          links.push(absoluteUrl)
        }
      } catch {
        // Invalid URL, skip
      }
    }

    // Extract image sources
    const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)
    const images: string[] = []
    for (const match of imgMatches) {
      try {
        const absoluteUrl = new URL(match[1], url).href
        images.push(absoluteUrl)
      } catch {
        // Invalid URL, skip
      }
    }

    // Extract text content (remove scripts, styles, and HTML tags)
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    // Decode HTML entities
    content = content
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    // Extract metadata
    const metadata: Record<string, string> = { description }

    const metaMatches = html.matchAll(/<meta[^>]*(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']+)["']/gi)
    for (const match of metaMatches) {
      metadata[match[1]] = match[2]
    }

    return {
      url,
      title,
      content: content.slice(0, 50000), // Limit content size
      links: [...new Set(links)].slice(0, 100),
      images: [...new Set(images)].slice(0, 50),
      metadata,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      url,
      title: "",
      content: "",
      links: [],
      images: [],
      metadata: {},
      error: message,
    }
  }
}

// Search using DuckDuckGo HTML (no API key needed)
export async function searchWeb(query: string, maxResults = 10): Promise<SearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GSMGPuzzleBot/1.0)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }

    const html = await response.text()

    const results: SearchResult[] = []

    // Parse DuckDuckGo results
    const resultMatches = html.matchAll(
      /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/gi,
    )

    for (const match of resultMatches) {
      if (results.length >= maxResults) break

      // DuckDuckGo uses redirect URLs, extract actual URL
      const redirectUrl = match[1]
      const urlMatch = redirectUrl.match(/uddg=([^&]+)/)
      const actualUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : redirectUrl

      results.push({
        title: match[2].trim(),
        url: actualUrl,
        snippet: match[3].trim(),
      })
    }

    // Fallback parsing for different result structure
    if (results.length === 0) {
      const altMatches = html.matchAll(
        /<h2[^>]*class="result__title"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi,
      )

      for (const match of altMatches) {
        if (results.length >= maxResults) break
        results.push({
          title: match[2].trim(),
          url: match[1],
          snippet: "",
        })
      }
    }

    return results
  } catch (error) {
    console.error("[v0] Web search error:", error)
    return []
  }
}

// Fetch and parse a puzzle-specific page
export async function fetchPuzzlePage(url: string): Promise<{
  content: string
  binaryData: string[]
  potentialPasswords: string[]
  cryptoReferences: string[]
  urls: string[]
  error?: string
}> {
  const scraped = await scrapeUrl(url)

  if (scraped.error) {
    return {
      content: "",
      binaryData: [],
      potentialPasswords: [],
      cryptoReferences: [],
      urls: [],
      error: scraped.error,
    }
  }

  // Extract binary patterns
  const binaryMatches = scraped.content.match(/[01]{8,}/g) || []

  // Extract potential passwords (lowercase words, no spaces, reasonable length)
  const passwordMatches = scraped.content.match(/\b[a-z]{8,40}\b/g) || []

  // Extract crypto-related terms
  const cryptoTerms = [
    "sha256",
    "aes",
    "cipher",
    "decrypt",
    "encrypt",
    "key",
    "hash",
    "bitcoin",
    "private",
    "wallet",
    "seed",
    "matrix",
    "binary",
    "hex",
    "base64",
    "causality",
    "beaufort",
    "vic",
  ]

  const cryptoReferences: string[] = []
  for (const term of cryptoTerms) {
    const regex = new RegExp(`\\b${term}[a-z]*\\b`, "gi")
    const matches = scraped.content.match(regex) || []
    cryptoReferences.push(...matches)
  }

  return {
    content: scraped.content,
    binaryData: [...new Set(binaryMatches)],
    potentialPasswords: [...new Set(passwordMatches)].slice(0, 50),
    cryptoReferences: [...new Set(cryptoReferences)],
    urls: scraped.links.filter((link) => link.includes("gsmg") || link.includes("puzzle") || link.includes("bitcoin")),
  }
}

// Download and convert image to base64
export async function fetchImageAsBase64(url: string): Promise<{
  base64: string
  mimeType: string
  error?: string
}> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GSMGPuzzleBot/1.0)",
      },
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const contentType = response.headers.get("content-type") || "image/png"
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")

    return {
      base64,
      mimeType: contentType,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return {
      base64: "",
      mimeType: "",
      error: message,
    }
  }
}
