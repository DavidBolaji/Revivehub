import { NextRequest } from 'next/server'
import { auth } from '@/auth'

// Import the global migration store from the details API
const globalMigrations = global as typeof globalThis & {
  migrationStore?: Map<string, any>
}

export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all migrations from the store
    const migrationStore = globalMigrations.migrationStore || new Map()
    const migrations = Array.from(migrationStore.values())
    
    // Sort by creation date (newest first)
    migrations.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA
    })

    console.log(`[Migrations List API] Returning ${migrations.length} migrations`)

    return Response.json({
      migrations,
      total: migrations.length
    })

  } catch (error) {
    console.error('[Migrations List API] Error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
