import { Octokit } from '@octokit/rest'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

const OctokitWithPlugins = Octokit.plugin(retry, throttling)

export function createOctokit(accessToken: string) {
  return new OctokitWithPlugins({
    auth: accessToken,
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(`Rate limit hit for ${options.method} ${options.url}`)
        if (retryCount < 2) {
          octokit.log.info(`Retrying after ${retryAfter} seconds`)
          return true
        }
      },
      onSecondaryRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(`Secondary rate limit hit for ${options.method} ${options.url}`)
      },
    },
    retry: {
      doNotRetry: ['429'], // Handle rate limits separately
    },
  })
}