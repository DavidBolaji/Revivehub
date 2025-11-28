import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { MigrationPlanner } from '@/lib/planner/migration-planner'
import { PlanRequestSchema } from '@/lib/planner/validation'
import { deduplicatePatterns } from '@/lib/planner/utils/pattern-converter'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    let validated
    
    try {
      validated = PlanRequestSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Invalid request',
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Check if AI is available
    const hasAIKey = !!process.env.ANTHROPIC_API_KEY
    const enableAI = validated.enableAI && hasAIKey
    
    if (validated.enableAI && !hasAIKey) {
      console.warn('AI enhancement requested but ANTHROPIC_API_KEY not configured')
    }

    // Start with patterns from request
    let enhancedPatterns = validated.patterns

    // Enhance patterns with MCP analyzer tools if AI is enabled

    // Deduplicate all patterns
    enhancedPatterns = deduplicatePatterns(enhancedPatterns)

    // Create migration planner
    const planner = new MigrationPlanner()

    // Generate migration plan with AI enhancement
    const plan = await planner.createPlan(
      validated.source,
      validated.target,
      enhancedPatterns,
      validated.codebaseStats,
      validated.customization,
      enableAI,
      validated.healthScore
    )

    // Optimize the plan
    const optimizedPlan = await planner.optimizePlan(plan)

    // Validate the plan
    const validation = await planner.validatePlan(optimizedPlan)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid migration plan',
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    // Generate execution timeline
    const timeline = planner.generateExecutionTimeline(optimizedPlan)

    return NextResponse.json({
      plan: optimizedPlan,
      timeline,
      validation,
    })
  } catch (error) {
    console.error('Error creating migration plan:', error)
    
    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        error: 'Failed to create migration plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // GET endpoint for future use (e.g., retrieving saved plans)
    return NextResponse.json({
      message: 'Use POST to generate a migration plan'
    })
  } catch (error) {
    console.error('Error generating migration plan:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate migration plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
