import Anthropic from '@anthropic-ai/sdk'

export class ClaudeAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public rateLimitInfo?: {
      limit: number
      remaining: number
      resetTime: Date
    }
  ) {
    super(message)
    this.name = 'ClaudeAPIError'
  }
}

export class ClaudeClient {
  private client: Anthropic
  private rateLimitInfo: {
    requestsRemaining: number
    tokensRemaining: number
    resetTime: Date
  } | null = null

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new ClaudeAPIError('Claude API key is required')
    }

    this.client = new Anthropic({ apiKey })
  }

  async makeRequest(
    prompt: string,
    systemPrompt?: string,
    maxTokens: number = 4000
  ): Promise<string> {
    try {
      if (this.rateLimitInfo && this.rateLimitInfo.requestsRemaining <= 0) {
        const now = new Date()
        if (now < this.rateLimitInfo.resetTime) {
          throw new ClaudeAPIError(
            `Rate limit exceeded. Resets at ${this.rateLimitInfo.resetTime.toISOString()}`,
            429,
            {
              limit: 0,
              remaining: this.rateLimitInfo.requestsRemaining,
              resetTime: this.rateLimitInfo.resetTime,
            }
          )
        }
      }

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
        system: systemPrompt,
      })

      this.updateRateLimitInfo(response)

      if (response.content[0].type === 'text') {
        return response.content[0].text
      }

      throw new ClaudeAPIError('Unexpected response format from Claude API')
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) {
          throw new ClaudeAPIError(
            'Claude API rate limit exceeded',
            429,
            this.rateLimitInfo
              ? {
                  limit: 0,
                  remaining: this.rateLimitInfo.requestsRemaining,
                  resetTime: this.rateLimitInfo.resetTime,
                }
              : undefined
          )
        }
        throw new ClaudeAPIError(
          error.message || 'Claude API request failed',
          error.status
        )
      }
      throw error
    }
  }

  private updateRateLimitInfo(response: any) {
    const headers = response.response?.headers
    if (headers) {
      const remaining = headers['x-ratelimit-requests-remaining']
      const reset = headers['x-ratelimit-requests-reset']

      if (remaining && reset) {
        this.rateLimitInfo = {
          requestsRemaining: parseInt(remaining),
          tokensRemaining: 0,
          resetTime: new Date(reset),
        }
      }
    }
  }

  getRateLimitInfo() {
    return this.rateLimitInfo
  }
}
