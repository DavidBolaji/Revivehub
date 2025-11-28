/**
 * Octokit client setup with retry and throttling plugins
 */

import { Octokit } from '@octokit/rest'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

const OctokitWithPlugins = Octokit.plugin(retry, throttling)

export function createOctokit(accessToken: string) {
  return new OctokitWithPlugins({
    auth: accessToken,
    throttle: {
      onRateLimit: (_retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(
          `Rate limit hit for ${options.method} ${options.url}`
        )
        if (retryCount < 2) {
          octokit.log.info(`Retrying after ${_retryAfter} seconds`)
          return true
        }
        return false
      },
      onSecondaryRateLimit: (_retryAfter, options, octokit) => {
        octokit.log.warn(
          `Secondary rate limit hit for ${options.method} ${options.url}`
        )
        return false
      },
    },
    retry: {
      doNotRetry: ['429'], // Handle rate limits separately
    },
  })
}

export async function checkRateLimit(octokit: Octokit) {
  const { data } = await octokit.rateLimit.get()
  
  return {
    core: {
      limit: data.resources.core.limit,
      remaining: data.resources.core.remaining,
      reset: new Date(data.resources.core.reset * 1000),
      used: data.resources.core.used,
    },
    search: {
      limit: data.resources.search.limit,
      remaining: data.resources.search.remaining,
      reset: new Date(data.resources.search.reset * 1000),
      used: data.resources.search.used,
    },
    graphql: {
      limit: data.resources.graphql?.limit || 0,
      remaining: data.resources.graphql?.remaining || 0,
      reset: new Date((data.resources.graphql?.reset || 0) * 1000),
      used: data.resources.graphql?.used || 0,
    },
  }
}
