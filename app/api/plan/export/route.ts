import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { MigrationPlanner } from '@/lib/planner/migration-planner'
import type { MigrationPlan } from '@/lib/planner/types'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { plan, format } = body

    if (!plan) {
      return NextResponse.json({ error: 'Plan required' }, { status: 400 })
    }

    const planner = new MigrationPlanner()
    const exportFormat = format || 'markdown'

    if (exportFormat === 'markdown') {
      const markdown = planner.exportPlanSummary(plan as MigrationPlan)

      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="migration-plan-${plan.id}.md"`,
        },
      })
    }

    if (exportFormat === 'json') {
      return new NextResponse(JSON.stringify(plan, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="migration-plan-${plan.id}.json"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Error exporting migration plan:', error)
    return NextResponse.json(
      {
        error: 'Failed to export migration plan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
