/**
 * Branch Name Generator for GitHub Integration
 * 
 * Generates unique, descriptive branch names following conventions:
 * - Pattern: revivehub/migration-{framework}-{timestamp}
 * - Maximum length: 255 characters
 * - Allowed characters: alphanumeric, hyphens, forward slashes
 */

export interface BranchNameParams {
  framework: string
  timestamp?: Date
}

export class BranchNameGenerator {
  private static readonly PREFIX = 'revivehub/migration'
  private static readonly MAX_LENGTH = 255
  private static readonly VALID_CHARS_REGEX = /^[a-zA-Z0-9\-\/]+$/
  private static readonly SUFFIX_LENGTH = 4

  /**
   * Generate a branch name following the pattern:
   * revivehub/migration-{framework}-{timestamp}
   * 
   * @param params - Branch name parameters
   * @returns Generated branch name
   */
  generate(params: BranchNameParams): string {
    const { framework, timestamp = new Date() } = params

    // Format timestamp as ISO 8601 with hyphens instead of colons
    // Example: 2024-01-15T10-30-45Z
    const formattedTimestamp = timestamp
      .toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')

    // Sanitize framework name (remove invalid characters)
    const sanitizedFramework = framework
      .toLowerCase()
      .replace(/[^a-z0-9\-]/g, '-')
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens

    const branchName = `${BranchNameGenerator.PREFIX}-${sanitizedFramework}-${formattedTimestamp}`

    // Validate the generated name
    if (!this.validate(branchName)) {
      throw new Error(`Generated branch name is invalid: ${branchName}`)
    }

    return branchName
  }

  /**
   * Ensure branch name is unique by appending a random suffix if needed
   * 
   * @param baseName - Base branch name
   * @param existingBranches - List of existing branch names
   * @returns Unique branch name
   */
  ensureUnique(baseName: string, existingBranches: string[]): string {
    // If base name doesn't exist, return it
    if (!existingBranches.includes(baseName)) {
      return baseName
    }

    // Generate unique name with suffix
    let uniqueName = baseName
    let attempts = 0
    const maxAttempts = 100

    while (existingBranches.includes(uniqueName) && attempts < maxAttempts) {
      const suffix = this.generateRandomSuffix()
      uniqueName = `${baseName}-${suffix}`
      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique branch name after maximum attempts')
    }

    // Validate the unique name
    if (!this.validate(uniqueName)) {
      throw new Error(`Generated unique branch name is invalid: ${uniqueName}`)
    }

    return uniqueName
  }

  /**
   * Validate branch name against constraints:
   * - Maximum length: 255 characters
   * - Only alphanumeric, hyphens, and forward slashes
   * 
   * @param branchName - Branch name to validate
   * @returns True if valid, false otherwise
   */
  validate(branchName: string): boolean {
    // Check length constraint
    if (branchName.length > BranchNameGenerator.MAX_LENGTH) {
      return false
    }

    // Check character constraints
    if (!BranchNameGenerator.VALID_CHARS_REGEX.test(branchName)) {
      return false
    }

    // Additional Git branch name rules
    // - Cannot end with .lock
    // - Cannot contain consecutive slashes
    // - Cannot start or end with slash
    if (branchName.endsWith('.lock')) {
      return false
    }

    if (branchName.includes('//')) {
      return false
    }

    if (branchName.startsWith('/') || branchName.endsWith('/')) {
      return false
    }

    return true
  }

  /**
   * Generate a random 4-character alphanumeric suffix
   * 
   * @returns Random 4-character string
   */
  private generateRandomSuffix(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let suffix = ''

    for (let i = 0; i < BranchNameGenerator.SUFFIX_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length)
      suffix += chars[randomIndex]
    }

    return suffix
  }
}

/**
 * Create a new BranchNameGenerator instance
 */
export function createBranchNameGenerator(): BranchNameGenerator {
  return new BranchNameGenerator()
}
