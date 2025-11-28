import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createOctokit } from '@/lib/github/client'
import { handleGitHubError } from '@/lib/github/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string; path: string[] } }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { owner, repo, path } = params

    if (!owner || !repo || !path) {
      return Response.json(
        { error: 'Owner, repository name, and file path are required' },
        { status: 400 }
      )
    }

    // Reconstruct the full file path
    const filePath = path.join('/')

    // Create authenticated Octokit instance
    const octokit = createOctokit(session.accessToken)

    // Get file content
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath
    })

    // Handle single file response
    if ('content' in data && data.type === 'file') {
      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      
      return Response.json({
        path: filePath,
        name: data.name,
        content,
        size: data.size,
        sha: data.sha,
        encoding: data.encoding,
        type: data.type
      })
    }

    // Handle directory or other types
    return Response.json(
      { error: 'Path does not point to a file' },
      { status: 400 }
    )

  } catch (error) {
    console.error('GitHub content API error:', error)
    return handleGitHubError(error)
  }
}