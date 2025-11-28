import { NextRequest } from 'next/server'
import { auth } from '@/auth'

// Mock data store - in production, this would be a database
const mockMigrations = new Map<string, any>()

// Initialize with some sample data
mockMigrations.set('tx_1764057039073_f2yxpajlh', {
  id: 'tx_1764057039073_f2yxpajlh',
  status: 'completed',
  repository: {
    owner: 'example-user',
    name: 'example-repo'
  },
  sourceFramework: {
    name: 'React (Legacy)',
    version: '16.x'
  },
  targetFramework: {
    name: 'Next.js',
    version: '14.x'
  },
  createdAt: new Date(1764057039073).toISOString(),
  completedAt: new Date(1764057039073 + 300000).toISOString(), // 5 minutes later
  pullRequest: {
    number: 42,
    url: 'https://api.github.com/repos/example-user/example-repo/pulls/42',
    htmlUrl: 'https://github.com/example-user/example-repo/pull/42'
  },
  summary: {
    filesChanged: 23,
    linesAdded: 456,
    linesRemoved: 123,
    errors: [],
    warnings: [
      'Some CSS classes could not be automatically converted to Tailwind',
      'Manual review recommended for custom hooks'
    ]
  }
})

export async function GET(
  request: NextRequest,
  { params }: { params: { migrationId: string } }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { migrationId } = params

    if (!migrationId) {
      return Response.json(
        { error: 'Migration ID is required' },
        { status: 400 }
      )
    }

    // In production, this would query a database
    // For now, we'll check our mock store and also try to fetch from a real store if available
    let migration = mockMigrations.get(migrationId)

    if (!migration) {
      // Try to fetch from a real migration store (if implemented)
      try {
        // This would be replaced with actual database query
        // const migration = await db.migrations.findById(migrationId)
        
        // For now, return 404 if not in mock store
        return Response.json(
          { error: 'Migration not found' },
          { status: 404 }
        )
      } catch (error) {
        console.error('Error fetching migration:', error)
        return Response.json(
          { error: 'Failed to fetch migration details' },
          { status: 500 }
        )
      }
    }

    return Response.json(migration)

  } catch (error) {
    console.error('Migration details API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to store migration data (for testing)
export async function POST(
  request: NextRequest,
  { params }: { params: { migrationId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { migrationId } = params
    const body = await request.json()

    // Store in mock store (in production, this would be a database)
    mockMigrations.set(migrationId, {
      id: migrationId,
      ...body,
      createdAt: body.createdAt || new Date().toISOString()
    })

    return Response.json({ success: true })

  } catch (error) {
    console.error('Migration storage API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}