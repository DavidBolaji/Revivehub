import type { AIAnalysisRequest, AIAnalysisResponse } from '@/types'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4'

export class AIService {
  async analyzeCode(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured')
    }

    const prompt = this.buildAnalysisPrompt(request)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`AI analysis failed: ${response.statusText}`)
    }

    const data = await response.json()
    return this.parseAnalysisResponse(data.content[0].text)
  }

  private buildAnalysisPrompt(request: AIAnalysisRequest): string {
    return `You are a code modernization expert. Analyze the following ${request.language} code and identify:

1. Deprecated APIs or patterns
2. Security vulnerabilities
3. Performance issues
4. Code smells
5. Outdated dependencies or syntax

Code to analyze:
\`\`\`${request.language}
${request.code}
\`\`\`

${request.context ? `Context: ${request.context}` : ''}

Provide your analysis in JSON format with the following structure:
{
  "issues": [
    {
      "type": "deprecated-api|security-vulnerability|performance|code-smell|outdated-dependency",
      "severity": "critical|high|medium|low",
      "line": <line_number>,
      "message": "<description>",
      "pattern": "<pattern_found>"
    }
  ],
  "recommendations": [
    {
      "title": "<recommendation_title>",
      "description": "<detailed_description>",
      "modernCode": "<modern_code_example>",
      "legacyCode": "<legacy_code_found>",
      "confidence": <0-100>,
      "effort": "low|medium|high"
    }
  ],
  "summary": "<overall_summary>"
}`
  }

  private parseAnalysisResponse(text: string): AIAnalysisResponse {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/)
      const jsonText = jsonMatch ? jsonMatch[1] : text

      const parsed = JSON.parse(jsonText)

      return {
        issues: parsed.issues || [],
        recommendations: parsed.recommendations || [],
        summary: parsed.summary || '',
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return {
        issues: [],
        recommendations: [],
        summary: 'Failed to parse analysis results',
      }
    }
  }
}
