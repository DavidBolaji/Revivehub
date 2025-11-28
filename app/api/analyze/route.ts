import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PatternDetector } from '@/lib/ai/pattern-detector'
import { ClaudeAPIError } from '@/lib/ai/claude-client'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI service not configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { code, language, action, codebaseSize, targetFramework } = body

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const detector = new PatternDetector(ANTHROPIC_API_KEY)

    switch (action) {
      case 'detect': {
        const patterns = await detector.detectLegacyPatterns(code, language)
        return NextResponse.json({ patterns })
      }

      case 'modernize': {
        const patterns = await detector.detectLegacyPatterns(code, language)
        const suggestions = await detector.suggestModernizations(patterns)
        return NextResponse.json({ patterns, suggestions })
      }

      case 'estimate': {
        const patterns = await detector.detectLegacyPatterns(code, language)
        const effort = await detector.estimateRefactorEffort(patterns, codebaseSize)
        return NextResponse.json({ patterns, effort })
      }

      case 'breaking': {
        const breakingChanges = await detector.identifyBreakingChanges(
          code,
          targetFramework
        )
        return NextResponse.json({ breakingChanges })
      }

      case 'full': {
        const result = await detector.analyzeCode(code, language, codebaseSize)
        return NextResponse.json(result)
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analysis error:', error)

    if (error instanceof ClaudeAPIError) {
      return NextResponse.json(
        {
          error: error.message,
          statusCode: error.statusCode,
          rateLimitInfo: error.rateLimitInfo,
        },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      { error: 'Analysis failed', details: String(error) },
      { status: 500 }
    )
  }
}
