import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createOctokit } from '@/lib/github/client'
import { handleGitHubError } from '@/lib/github/errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
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

    const { owner, repo } = params

    if (!owner || !repo) {
      return Response.json(
        { error: 'Owner and repository name are required' },
        { status: 400 }
      )
    }

    // Create authenticated Octokit instance
    const octokit = createOctokit(session.accessToken)

    // Get repository tree (recursive to get all files)
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: 'true'
    })

    // Filter for files (not directories) and relevant file types
    const files = tree.tree
      .filter(item => item.type === 'blob') // Only files, not directories
      .map(item => ({
        path: item.path,
        name: item.path?.split('/').pop() || '',
        sha: item.sha,
        size: item.size,
        url: item.url,
        type: item.path?.split('.').pop() || ''
      }))
      .filter(file => {
        // Filter for relevant file types
        const relevantExtensions = ['js', 'jsx', 'ts', 'tsx', 'vue', 'py', 'json', 'md']
        return relevantExtensions.includes(file.type.toLowerCase())
      })

    return Response.json({
      files,
      totalCount: files.length,
      repository: {
        owner,
        name: repo
      }
    })

  } catch (error) {
    console.error('GitHub files API error:', error)
    return handleGitHubError(error)
  }
}