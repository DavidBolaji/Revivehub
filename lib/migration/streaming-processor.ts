/**
 * Streaming utilities for processing large files and generating diffs
 * Handles files > 1MB with streaming to avoid memory issues
 */

import { Transform } from 'stream'
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

/**
 * File size threshold for streaming (1MB)
 */
export const STREAMING_THRESHOLD = 1024 * 1024 // 1MB

/**
 * Check if file should be streamed based on size
 */
export function shouldStreamFile(content: string): boolean {
  const sizeInBytes = Buffer.byteLength(content, 'utf8')
  return sizeInBytes > STREAMING_THRESHOLD
}

/**
 * Stream transformer for code transformations
 */
export class CodeTransformStream extends Transform {
  private buffer: string = ''
  private transformer: (chunk: string) => Promise<string>

  constructor(transformer: (chunk: string) => Promise<string>) {
    super({ encoding: 'utf8' })
    this.transformer = transformer
  }

  async _transform(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null, data?: any) => void
  ): Promise<void> {
    try {
      this.buffer += chunk.toString()

      // Process complete lines
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        const transformed = await this.transformer(line + '\n')
        this.push(transformed)
      }

      callback()
    } catch (error) {
      callback(error as Error)
    }
  }

  async _flush(callback: (error?: Error | null, data?: any) => void): Promise<void> {
    try {
      // Process remaining buffer
      if (this.buffer) {
        const transformed = await this.transformer(this.buffer)
        this.push(transformed)
      }
      callback()
    } catch (error) {
      callback(error as Error)
    }
  }
}

/**
 * Stream file transformation for large files
 */
export async function streamFileTransformation(
  inputPath: string,
  outputPath: string,
  transformer: (chunk: string) => Promise<string>
): Promise<void> {
  const readStream = createReadStream(inputPath, { encoding: 'utf8' })
  const transformStream = new CodeTransformStream(transformer)
  const writeStream = createWriteStream(outputPath, { encoding: 'utf8' })

  await pipeline(readStream, transformStream, writeStream)
}

/**
 * Stream diff generation for large files
 */
export class DiffGeneratorStream extends Transform {
  private originalLines: string[] = []
  private transformedLines: string[] = []

  private isOriginal = true

  constructor() {
    super({ encoding: 'utf8' })
  }

  _transform(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null, data?: any) => void
  ): void {
    const lines = chunk.toString().split('\n')

    if (this.isOriginal) {
      this.originalLines.push(...lines)
    } else {
      this.transformedLines.push(...lines)
    }

    callback()
  }

  _flush(callback: (error?: Error | null, data?: any) => void): void {
    // Generate diff when both streams are complete
    const diff = this.generateDiff()
    this.push(diff)
    callback()
  }

  switchToTransformed(): void {
    this.isOriginal = false
  }

  private generateDiff(): string {
    const diff: string[] = []

    diff.push('--- original')
    diff.push('+++ transformed')
    diff.push(
      `@@ -1,${this.originalLines.length} +1,${this.transformedLines.length} @@`
    )

    let i = 0
    let j = 0

    while (i < this.originalLines.length || j < this.transformedLines.length) {
      const originalLine = this.originalLines[i]
      const transformedLine = this.transformedLines[j]

      if (i >= this.originalLines.length) {
        diff.push(`+${transformedLine}`)
        j++
      } else if (j >= this.transformedLines.length) {
        diff.push(`-${originalLine}`)
        i++
      } else if (originalLine === transformedLine) {
        diff.push(` ${originalLine}`)
        i++
        j++
      } else {
        diff.push(`-${originalLine}`)
        diff.push(`+${transformedLine}`)
        i++
        j++
      }
    }

    return diff.join('\n')
  }
}

/**
 * Generate diff for large files using streaming
 */
export async function streamDiffGeneration(
  originalContent: string,
  transformedContent: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const diffStream = new DiffGeneratorStream()
    let result = ''

    diffStream.on('data', (chunk) => {
      result += chunk.toString()
    })

    diffStream.on('end', () => {
      resolve(result)
    })

    diffStream.on('error', (error) => {
      reject(error)
    })

    // Write original content
    diffStream.write(originalContent)
    diffStream.switchToTransformed()

    // Write transformed content
    diffStream.write(transformedContent)
    diffStream.end()
  })
}

/**
 * Chunk large content for processing
 */
export function* chunkContent(
  content: string,
  chunkSize: number = 100000 // 100KB chunks
): Generator<string> {
  let offset = 0

  while (offset < content.length) {
    yield content.slice(offset, offset + chunkSize)
    offset += chunkSize
  }
}

/**
 * Process large file in chunks
 */
export async function processLargeFile(
  content: string,
  processor: (chunk: string) => Promise<string>
): Promise<string> {
  const chunks: string[] = []

  for (const chunk of chunkContent(content)) {
    const processed = await processor(chunk)
    chunks.push(processed)
  }

  return chunks.join('')
}

/**
 * Server-Sent Events stream for progress updates
 */
export class SSEStream {
  private encoder = new TextEncoder()

  /**
   * Create SSE data message
   */
  createMessage(event: string, data: any): Uint8Array {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    return this.encoder.encode(message)
  }

  /**
   * Create SSE comment (for keep-alive)
   */
  createComment(comment: string): Uint8Array {
    const message = `: ${comment}\n\n`
    return this.encoder.encode(message)
  }

  /**
   * Create readable stream for SSE
   */
  createReadableStream(
    generator: AsyncGenerator<{ event: string; data: any }>
  ): ReadableStream<Uint8Array> {
    const self = this
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const { event, data } of generator) {
            const message = self.createMessage(event, data)
            controller.enqueue(message)
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })
  }
}

/**
 * Progress update generator for SSE
 */
export async function* generateProgressUpdates(
  totalFiles: number,
  onProgress: (callback: (progress: any) => void) => void
): AsyncGenerator<{ event: string; data: any }> {
  let processedFiles = 0
  let currentFile = ''

  // Set up progress callback
  onProgress((progress) => {
    processedFiles = progress.processedFiles
    currentFile = progress.currentFile
  })

  // Yield progress updates
  while (processedFiles < totalFiles) {
    yield {
      event: 'progress',
      data: {
        totalFiles,
        processedFiles,
        currentFile,
        percentage: Math.round((processedFiles / totalFiles) * 100),
      },
    }

    // Wait a bit before next update
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  // Final update
  yield {
    event: 'complete',
    data: {
      totalFiles,
      processedFiles: totalFiles,
      percentage: 100,
    },
  }
}

/**
 * Create SSE response for Next.js API routes
 */
export function createSSEResponse(
  generator: AsyncGenerator<{ event: string; data: any }>
): Response {
  const sseStream = new SSEStream()
  const stream = sseStream.createReadableStream(generator)

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * Batch stream processor for multiple files
 */
export class BatchStreamProcessor {
  private batchSize: number
  private onProgress?: (processed: number, total: number) => void

  constructor(batchSize: number = 10, onProgress?: (processed: number, total: number) => void) {
    this.batchSize = batchSize
    this.onProgress = onProgress
  }

  /**
   * Process files in streaming batches
   */
  async *processFiles<T, R>(
    files: T[],
    processor: (file: T) => Promise<R>
  ): AsyncGenerator<R[]> {
    let processed = 0

    for (let i = 0; i < files.length; i += this.batchSize) {
      const batch = files.slice(i, i + this.batchSize)
      const results = await Promise.all(batch.map(processor))

      processed += batch.length
      if (this.onProgress) {
        this.onProgress(processed, files.length)
      }

      yield results
    }
  }
}

/**
 * Memory-efficient line-by-line processor
 */
export async function processLineByLine(
  content: string,
  processor: (line: string, lineNumber: number) => Promise<string>
): Promise<string> {
  const lines = content.split('\n')
  const processedLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const processedLine = await processor(lines[i], i + 1)
    processedLines.push(processedLine)
  }

  return processedLines.join('\n')
}
