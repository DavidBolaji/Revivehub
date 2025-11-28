import { ClaudeClient, ClaudeAPIError } from './claude-client'
import { buildAnalysisPrompt } from './prompts'
import type {
  DetectedPattern,
  ModernizationSuggestion,
  BreakingChange,
  EffortEstimate,
  AnalysisResult,
} from '@/types/patterns'

export class PatternDetector {
  private client: ClaudeClient

  constructor(apiKey: string) {
    this.client = new ClaudeClient(apiKey)
  }

  async detectLegacyPatterns(
    code: string,
    language: string = 'typescript'
  ): Promise<DetectedPattern[]> {
    try {
      const prompt = buildAnalysisPrompt('detect', { code, language })
      const response = await this.client.makeRequest(prompt, undefined, 4000)
      const parsed = this.parseJSON(response)

      return parsed.patterns || []
    } catch (error) {
      if (error instanceof ClaudeAPIError) {
        throw error
      }
      throw new Error(`Pattern detection failed: ${error}`)
    }
  }

  async suggestModernizations(
    patterns: DetectedPattern[]
  ): Promise<ModernizationSuggestion[]> {
    try {
      const patternsJson = JSON.stringify(patterns, null, 2)
      const prompt = buildAnalysisPrompt('modernize', { patterns: patternsJson })
      const response = await this.client.makeRequest(prompt, undefined, 4000)
      const parsed = this.parseJSON(response)

      return parsed.suggestions || []
    } catch (error) {
      if (error instanceof ClaudeAPIError) {
        throw error
      }
      throw new Error(`Modernization suggestion failed: ${error}`)
    }
  }

  async estimateRefactorEffort(
    patterns: DetectedPattern[],
    codebaseSize: number = 1000
  ): Promise<EffortEstimate> {
    try {
      const patternsJson = JSON.stringify(patterns, null, 2)
      const prompt = buildAnalysisPrompt('estimate', {
        patterns: patternsJson,
        codebaseSize,
      })
      const response = await this.client.makeRequest(prompt, undefined, 3000)
      const parsed = this.parseJSON(response)

      return (
        parsed.totalEffort || {
          timeMinutes: 0,
          complexity: 'simple',
          riskLevel: 'low',
          automationPotential: 0,
        }
      )
    } catch (error) {
      if (error instanceof ClaudeAPIError) {
        throw error
      }
      throw new Error(`Effort estimation failed: ${error}`)
    }
  }

  async identifyBreakingChanges(
    sourceCode: string,
    targetFramework: string
  ): Promise<BreakingChange[]> {
    try {
      const prompt = buildAnalysisPrompt('breaking', {
        code: sourceCode,
        targetFramework,
      })
      const response = await this.client.makeRequest(prompt, undefined, 4000)
      const parsed = this.parseJSON(response)

      return parsed.breakingChanges || []
    } catch (error) {
      if (error instanceof ClaudeAPIError) {
        throw error
      }
      throw new Error(`Breaking change detection failed: ${error}`)
    }
  }

  async analyzeCode(
    code: string,
    language: string = 'typescript',
    codebaseSize?: number
  ): Promise<AnalysisResult> {
    const patterns = await this.detectLegacyPatterns(code, language)
    const suggestions = await this.suggestModernizations(patterns)
    const totalEffort = await this.estimateRefactorEffort(patterns, codebaseSize)

    const autoFixableCount = patterns.filter((p) => p.autoFixable).length
    const highSeverityCount = patterns.filter((p) => p.severity === 'high').length

    return {
      patterns,
      suggestions,
      breakingChanges: [],
      totalEffort,
      summary: {
        totalPatterns: patterns.length,
        autoFixableCount,
        highSeverityCount,
        estimatedTotalHours: Math.round(totalEffort.timeMinutes / 60),
      },
    }
  }

  private parseJSON(text: string): any {
    try {
      // Try multiple extraction methods
      let jsonText = text.trim()
      
      // Method 1: Extract from code blocks
      const codeBlockMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim()
      }
      
      // Method 2: Extract JSON object from text
      const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonObjectMatch && !codeBlockMatch) {
        jsonText = jsonObjectMatch[0]
      }
      
      // Method 3: Extract JSON array from text
      const jsonArrayMatch = jsonText.match(/\[[\s\S]*\]/)
      if (jsonArrayMatch && !codeBlockMatch && !jsonObjectMatch) {
        jsonText = jsonArrayMatch[0]
      }

      return JSON.parse(jsonText)
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      console.error('Raw response:', text.substring(0, 200) + '...')
      return {}
    }
  }

  getRateLimitInfo() {
    return this.client.getRateLimitInfo()
  }
}
