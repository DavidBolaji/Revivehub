/**
 * NPM Registry Service
 * Fetches package information from npm registry
 */

export interface NpmPackageInfo {
  name: string
  latestVersion: string
  publishedAt: string
}

export class NpmRegistryService {
  private cache = new Map<string, NpmPackageInfo>()
  private readonly registryUrl = 'https://registry.npmjs.org'
  private readonly batchSize = 5 // Reduced from 10
  private readonly delayMs = 200 // Increased from 100
  private readonly timeoutMs = 5000 // 5 second timeout

  /**
   * Fetch latest version for a package from npm registry with timeout
   */
  async getLatestVersion(packageName: string): Promise<string | null> {
    // Check cache first
    const cached = this.cache.get(packageName)
    if (cached) {
      return cached.latestVersion
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

      const response = await fetch(`${this.registryUrl}/${packageName}/latest`, {
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status !== 404) {
          console.warn(`Failed to fetch ${packageName}: ${response.status}`)
        }
        return null
      }

      const data = await response.json()
      const latestVersion = data.version

      // Cache the result
      this.cache.set(packageName, {
        name: packageName,
        latestVersion,
        publishedAt: data.time?.[latestVersion] || new Date().toISOString()
      })

      return latestVersion
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.warn(`Timeout fetching ${packageName}`)
      } else {
        console.error(`Error fetching ${packageName}:`, error)
      }
      return null
    }
  }

  /**
   * Fetch latest versions for multiple packages in batches with retry
   */
  async getLatestVersionsBatch(packageNames: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    console.log(`[NpmRegistry] Fetching versions for ${packageNames.length} packages...`)

    // Process in batches to avoid rate limiting
    for (let i = 0; i < packageNames.length; i += this.batchSize) {
      const batch = packageNames.slice(i, i + this.batchSize)
      
      const promises = batch.map(async (name) => {
        const version = await this.getLatestVersion(name)
        if (version) {
          results.set(name, version)
        }
      })

      await Promise.all(promises)

      // Progress logging
      const progress = Math.min(i + this.batchSize, packageNames.length)
      console.log(`[NpmRegistry] Progress: ${progress}/${packageNames.length} packages checked`)

      // Add delay between batches
      if (i + this.batchSize < packageNames.length) {
        await new Promise(resolve => setTimeout(resolve, this.delayMs))
      }
    }

    console.log(`[NpmRegistry] Successfully fetched ${results.size}/${packageNames.length} versions`)
    return results
  }
}
