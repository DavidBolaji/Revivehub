/**
 * Wrapper for MCP Claude Analyzer Tools
 * This wrapper allows Next.js to use MCP tools without ESM import issues
 */

import { ClaudeClient } from '../ai/claude-client'

export interface PatternDetection {
  legacyPatterns: Array<{
    pattern: string
    description: string
    severity: 'low' | 'medium' | 'high'
    occurrences: number
    examples: string[]
  }>
  modernAlternatives: Array<{
    pattern: string
    description: string
    benefits: string[]
  }>
  migrationPriority: Array<{
    pattern: string
    priority: number
    effort: 'low' | 'medium' | 'high'
  }>
}

export interface CodeAnalysis {
  structure: {
    functions: number
    classes: number
    interfaces: number
    imports: number
  }
  patterns: Array<{
    type: string
    description: string
    locations: Array<{
      line: number
      column: number
      snippet: string
    }>
  }>
  metrics: {
    complexity: number
    maintainability: number
    testability: number
  }
  suggestions: Array<{
    type: 'improvement' | 'warning' | 'error'
    message: string
    line?: number
  }>
}

export interface MigrationPlan {
  phases: Array<{
    name: string
    description: string
    tasks: Array<{
      id: string
      title: string
      description: string
      effort: number
      dependencies: string[]
      risks: string[]
    }>
  }>
  timeline: {
    totalEffort: number
    estimatedDuration: string
    criticalPath: string[]
  }
  risks: Array<{
    description: string
    impact: 'low' | 'medium' | 'high'
    mitigation: string
  }>
}

/**
 * MCP-compatible analyzer tools using Claude API
 */
export class MCPAnalyzerWrapper {
  private claude: ClaudeClient

  constructor(apiKey: string) {
    this.claude = new ClaudeClient(apiKey)
  }

  async detectPatterns(args: {
    codebase: string
    patterns?: string[]
    excludePatterns?: string[]
  }): Promise<PatternDetection> {
    const systemPrompt = `You are a legacy code detection expert. You MUST respond with ONLY valid JSON, no other text. Return exactly this JSON structure:
{
  "legacyPatterns": [
    {
      "pattern": "string",
      "description": "string",
      "severity": "low|medium|high",
      "occurrences": number,
      "examples": ["string"]
    }
  ],
  "modernAlternatives": [
    {
      "pattern": "string",
      "description": "string",
      "benefits": ["string"]
    }
  ],
  "migrationPriority": [
    {
      "pattern": "string",
      "priority": number (1-10),
      "effort": "low|medium|high"
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no explanations, no markdown, no other text.`

    const prompt = `Analyze this codebase for legacy and deprecated patterns:

${args.codebase}

${args.patterns ? `Focus on these patterns: ${args.patterns.join(', ')}` : ''}
${args.excludePatterns ? `Exclude these patterns: ${args.excludePatterns.join(', ')}` : ''}

Return ONLY valid JSON with the exact structure specified in the system prompt. No explanations.`

    const response = await this.claude.makeRequest(prompt, systemPrompt)

    try {
      // Try to extract JSON from response if it's wrapped in text
      let jsonStr = response.trim()
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      // Look for JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }
      
      // Try to fix common JSON issues
      // Fix trailing commas before closing brackets
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')
      
      // Fix incomplete arrays (missing closing bracket)
      const openBrackets = (jsonStr.match(/\[/g) || []).length
      const closeBrackets = (jsonStr.match(/\]/g) || []).length
      if (openBrackets > closeBrackets) {
        // Add missing closing brackets
        jsonStr += ']'.repeat(openBrackets - closeBrackets)
      }
      
      // Fix incomplete objects (missing closing brace)
      const openBraces = (jsonStr.match(/\{/g) || []).length
      const closeBraces = (jsonStr.match(/\}/g) || []).length
      if (openBraces > closeBraces) {
        // Add missing closing braces
        jsonStr += '}'.repeat(openBraces - closeBraces)
      }
      
      return JSON.parse(jsonStr)
    } catch (error) {
      console.error('Failed to parse MCP response:', error)
      console.error('Raw response:', response.substring(0, 500) + '...')
      
      // Return empty structure instead of failing
      return {
        legacyPatterns: [],
        modernAlternatives: [],
        migrationPriority: [],
      }
    }
  }

  async analyzeCode(args: {
    code: string
    language: string
    context?: string
  }): Promise<CodeAnalysis> {
    const systemPrompt = `You are a code analysis expert. Analyze the provided code and return a detailed JSON response with the following structure:
{
  "structure": {
    "functions": number,
    "classes": number,
    "interfaces": number,
    "imports": number
  },
  "patterns": [
    {
      "type": "string",
      "description": "string",
      "locations": [
        {
          "line": number,
          "column": number,
          "snippet": "string"
        }
      ]
    }
  ],
  "metrics": {
    "complexity": number (1-10),
    "maintainability": number (1-10),
    "testability": number (1-10)
  },
  "suggestions": [
    {
      "type": "improvement|warning|error",
      "message": "string",
      "line": number (optional)
    }
  ]
}

Focus on code quality, maintainability, and modern best practices.`

    const prompt = `Analyze this ${args.language} code:

\`\`\`${args.language}
${args.code}
\`\`\`

${args.context ? `Context: ${args.context}` : ''}

Provide a comprehensive analysis following the JSON structure specified in the system prompt.`

    const response = await this.claude.makeRequest(prompt, systemPrompt)

    try {
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to parse MCP response:', error)
      return {
        structure: { functions: 0, classes: 0, interfaces: 0, imports: 0 },
        patterns: [],
        metrics: { complexity: 0, maintainability: 0, testability: 0 },
        suggestions: [],
      }
    }
  }

  async generateMigrationPlan(args: {
    source: string
    target: string
    constraints?: string[]
  }): Promise<MigrationPlan> {
    const systemPrompt = `You are a migration planning expert. Create a detailed migration plan with this JSON structure:
{
  "phases": [
    {
      "name": "string",
      "description": "string",
      "tasks": [
        {
          "id": "string",
          "title": "string",
          "description": "string",
          "effort": number (hours),
          "dependencies": ["string"],
          "risks": ["string"]
        }
      ]
    }
  ],
  "timeline": {
    "totalEffort": number,
    "estimatedDuration": "string",
    "criticalPath": ["string"]
  },
  "risks": [
    {
      "description": "string",
      "impact": "low|medium|high",
      "mitigation": "string"
    }
  ]
}`

    const prompt = `Create a migration plan from:

SOURCE:
${args.source}

TARGET:
${args.target}

${args.constraints ? `CONSTRAINTS: ${args.constraints.join(', ')}` : ''}

Provide a detailed, phased migration plan with realistic effort estimates.`

    const response = await this.claude.makeRequest(prompt, systemPrompt, 6000)

    try {
      return JSON.parse(response)
    } catch (error) {
      console.error('Failed to parse MCP response:', error)
      return {
        phases: [],
        timeline: { totalEffort: 0, estimatedDuration: '0 weeks', criticalPath: [] },
        risks: [],
      }
    }
  }
}
