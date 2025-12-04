import { NextRequest } from 'next/server'
import { auth } from '@/auth'

// In-memory data store - in production, this would be a database
// Using a global variable to persist across API calls in the same process
const globalMigrations = global as typeof globalThis & {
  migrationStore?: Map<string, any>
}

if (!globalMigrations.migrationStore) {
  globalMigrations.migrationStore = new Map<string, any>()
  
  // Initialize with some sample data
  globalMigrations.migrationStore.set('tx_1764057039073_f2yxpajlh', {
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
}

const mockMigrations = globalMigrations.migrationStore

export async function GET(
  _request: NextRequest,
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
    const migration = mockMigrations.get(migrationId)

    if (!migration) {
      console.log(`[Migration Details API] Migration not found: ${migrationId}`)
      console.log(`[Migration Details API] Available migrations:`, Array.from(mockMigrations.keys()))
      
      return Response.json(
        { 
          error: 'Migration not found',
          message: `No migration found with ID: ${migrationId}`,
          availableMigrations: Array.from(mockMigrations.keys()).length
        },
        { status: 404 }
      )
    }

    console.log(`[Migration Details API] Found migration: ${migrationId}`)
    return Response.json(migration)

  } catch (error) {
    console.error('Migration details API error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST handler to store migration data
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

    console.log(`[Migration Details API] Storing migration: ${migrationId}`)
    console.log(`[Migration Details API] Data:`, {
      status: body.status,
      repository: body.repository,
      sourceFramework: body.sourceFramework?.name,
      targetFramework: body.targetFramework?.name,
      pullRequest: body.pullRequest?.number
    })

    // Store in mock store (in production, this would be a database)
    const migrationData = {
      id: migrationId,
      ...body,
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    mockMigrations.set(migrationId, migrationData)
    
    console.log(`[Migration Details API] Successfully stored migration: ${migrationId}`)
    console.log(`[Migration Details API] Total migrations in store:`, mockMigrations.size)

    return Response.json({ 
      success: true,
      migrationId,
      stored: true
    })

  } catch (error) {
    console.error('[Migration Details API] Storage error:', error)
    return Response.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}