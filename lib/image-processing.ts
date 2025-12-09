// Image processing utilities for binary matrix detection

export interface ColorAnalysis {
  dominantColors: Array<{ color: string; count: number; percentage: number }>
  gridDetected: boolean
  gridSize: { rows: number; cols: number } | null
  binaryMatrix: number[][] | null
}

export interface PixelData {
  r: number
  g: number
  b: number
  a: number
}

// Color distance calculation (Euclidean)
export function colorDistance(c1: PixelData, c2: PixelData): number {
  return Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2))
}

// Determine if a color is "dark" (black/blue = 1) or "light" (yellow/white = 0)
export function isBinaryOne(pixel: PixelData): boolean {
  // Calculate luminance
  const luminance = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b

  // Check for specific colors used in GSMG puzzle
  // Black: low luminance
  // Blue: high blue, low red/green
  // Yellow: high red+green, low blue
  // White: high luminance

  const isBlack = luminance < 50
  const isBlue = pixel.b > 150 && pixel.r < 100 && pixel.g < 100
  const isDarkBlue = pixel.b > pixel.r && pixel.b > pixel.g && luminance < 100

  return isBlack || isBlue || isDarkBlue
}

// Analyze image for grid pattern (runs on client side with canvas)
export function analyzeImageForGrid(imageData: ImageData, expectedSize = 14): ColorAnalysis {
  const { data, width, height } = imageData
  const colorMap = new Map<string, number>()

  // Sample colors
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i] / 16) * 16
    const g = Math.round(data[i + 1] / 16) * 16
    const b = Math.round(data[i + 2] / 16) * 16
    const key = `${r},${g},${b}`
    colorMap.set(key, (colorMap.get(key) || 0) + 1)
  }

  // Get dominant colors
  const totalPixels = width * height
  const dominantColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([color, count]) => ({
      color: `rgb(${color})`,
      count,
      percentage: (count / totalPixels) * 100,
    }))

  // Try to detect grid
  const cellWidth = Math.floor(width / expectedSize)
  const cellHeight = Math.floor(height / expectedSize)

  if (cellWidth < 2 || cellHeight < 2) {
    return {
      dominantColors,
      gridDetected: false,
      gridSize: null,
      binaryMatrix: null,
    }
  }

  // Sample center of each cell
  const matrix: number[][] = []

  for (let row = 0; row < expectedSize; row++) {
    const matrixRow: number[] = []
    for (let col = 0; col < expectedSize; col++) {
      const centerX = Math.floor(col * cellWidth + cellWidth / 2)
      const centerY = Math.floor(row * cellHeight + cellHeight / 2)
      const pixelIndex = (centerY * width + centerX) * 4

      const pixel: PixelData = {
        r: data[pixelIndex],
        g: data[pixelIndex + 1],
        b: data[pixelIndex + 2],
        a: data[pixelIndex + 3],
      }

      matrixRow.push(isBinaryOne(pixel) ? 1 : 0)
    }
    matrix.push(matrixRow)
  }

  return {
    dominantColors,
    gridDetected: true,
    gridSize: { rows: expectedSize, cols: expectedSize },
    binaryMatrix: matrix,
  }
}

// Format matrix for display
export function formatMatrix(matrix: number[][]): string {
  return matrix.map((row) => row.join(" ")).join("\n")
}

// Convert matrix to compact binary string
export function matrixToBinary(matrix: number[][]): string {
  return matrix.map((row) => row.join("")).join("")
}
