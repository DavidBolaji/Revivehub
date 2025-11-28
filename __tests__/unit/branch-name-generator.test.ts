import { describe, it, expect, beforeEach } from 'vitest'
import { BranchNameGenerator, createBranchNameGenerator } from '@/lib/github/branch-name-generator'

describe('BranchNameGenerator', () => {
  let generator: BranchNameGenerator

  beforeEach(() => {
    generator = createBranchNameGenerator()
  })

  describe('generate()', () => {
    it('should generate branch name with correct pattern', () => {
      const branchName = generator.generate({
        framework: 'nextjs',
        timestamp: new Date('2024-01-15T10:30:45.123Z')
      })

      expect(branchName).toMatch(/^revivehub\/migration-nextjs-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/)
      expect(branchName).toContain('revivehub/migration-nextjs-2024-01-15T10-30-45')
    })

    it('should use current timestamp when not provided', () => {
      const before = new Date()
      const branchName = generator.generate({ framework: 'react' })
      const after = new Date()

      expect(branchName).toMatch(/^revivehub\/migration-react-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/)
      
      // Extract timestamp from branch name and verify it's recent
      const timestampPart = branchName.split('migration-react-')[1]
      
      // Convert back to ISO format: 2024-01-15T10-30-45-123Z -> 2024-01-15T10:30:45.123Z
      const isoTimestamp = timestampPart
        .replace(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, '$1-$2-$3T$4:$5:$6.$7Z')
      
      const timestamp = new Date(isoTimestamp)
      
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime() + 1000)
    })

    it('should sanitize framework name with invalid characters', () => {
      const branchName = generator.generate({
        framework: 'Next.js@14.0',
        timestamp: new Date('2024-01-15T10:30:45.123Z')
      })

      expect(branchName).toContain('revivehub/migration-next-js-14-0')
      expect(branchName).not.toContain('.')
      expect(branchName).not.toContain('@')
    })

    it('should handle framework names with multiple consecutive invalid chars', () => {
      const branchName = generator.generate({
        framework: 'React...Native!!!',
        timestamp: new Date('2024-01-15T10:30:45.123Z')
      })

      expect(branchName).toContain('revivehub/migration-react-native')
      expect(branchName).not.toContain('...')
      expect(branchName).not.toContain('!!!')
    })

    it('should remove leading and trailing hyphens from framework', () => {
      const branchName = generator.generate({
        framework: '-vue-',
        timestamp: new Date('2024-01-15T10:30:45.123Z')
      })

      expect(branchName).toContain('revivehub/migration-vue-')
      expect(branchName).not.toMatch(/migration--/)
    })

    it('should convert framework to lowercase', () => {
      const branchName = generator.generate({
        framework: 'NextJS',
        timestamp: new Date('2024-01-15T10:30:45.123Z')
      })

      expect(branchName).toContain('nextjs')
      expect(branchName).not.toContain('NextJS')
    })

    it('should throw error if generated name is invalid', () => {
      // Create a very long framework name that would exceed 255 chars
      const longFramework = 'a'.repeat(300)

      expect(() => {
        generator.generate({
          framework: longFramework,
          timestamp: new Date('2024-01-15T10:30:45.123Z')
        })
      }).toThrow('Generated branch name is invalid')
    })
  })

  describe('ensureUnique()', () => {
    it('should return base name if not in existing branches', () => {
      const baseName = 'revivehub/migration-nextjs-2024-01-15T10-30-45-123Z'
      const existingBranches = [
        'revivehub/migration-react-2024-01-14T09-20-30-456Z',
        'revivehub/migration-vue-2024-01-13T08-10-20-789Z'
      ]

      const uniqueName = generator.ensureUnique(baseName, existingBranches)

      expect(uniqueName).toBe(baseName)
    })

    it('should append 4-character suffix if base name exists', () => {
      const baseName = 'revivehub/migration-nextjs-2024-01-15T10-30-45-123Z'
      const existingBranches = [baseName]

      const uniqueName = generator.ensureUnique(baseName, existingBranches)

      expect(uniqueName).not.toBe(baseName)
      expect(uniqueName).toMatch(/^revivehub\/migration-nextjs-2024-01-15T10-30-45-123Z-[a-z0-9]{4}$/)
    })

    it('should generate different suffixes until unique', () => {
      const baseName = 'revivehub/migration-nextjs-2024-01-15T10-30-45-123Z'
      const existingBranches = [
        baseName,
        `${baseName}-abcd`,
        `${baseName}-efgh`,
        `${baseName}-ijkl`
      ]

      const uniqueName = generator.ensureUnique(baseName, existingBranches)

      expect(uniqueName).not.toBe(baseName)
      expect(existingBranches).not.toContain(uniqueName)
      expect(uniqueName).toMatch(/^revivehub\/migration-nextjs-2024-01-15T10-30-45-123Z-[a-z0-9]{4}$/)
    })

    it('should throw error if cannot generate unique name after max attempts', () => {
      const baseName = 'revivehub/migration-nextjs-2024-01-15T10-30-45-123Z'
      
      // Create a mock that always returns existing branches
      const existingBranches = new Proxy([], {
        get(target, prop) {
          if (prop === 'includes') {
            return () => true // Always return true for includes
          }
          return target[prop as any]
        }
      })

      expect(() => {
        generator.ensureUnique(baseName, existingBranches as string[])
      }).toThrow('Unable to generate unique branch name after maximum attempts')
    })

    it('should validate the unique name', () => {
      const baseName = 'revivehub/migration-nextjs-2024-01-15T10-30-45-123Z'
      const existingBranches = [baseName]

      const uniqueName = generator.ensureUnique(baseName, existingBranches)

      expect(generator.validate(uniqueName)).toBe(true)
    })
  })

  describe('validate()', () => {
    it('should return true for valid branch names', () => {
      const validNames = [
        'revivehub/migration-nextjs-2024-01-15T10-30-45-123Z',
        'revivehub/migration-react-2024-01-15T10-30-45-123Z',
        'feature/my-branch',
        'bugfix/issue-123',
        'main',
        'develop'
      ]

      validNames.forEach(name => {
        expect(generator.validate(name)).toBe(true)
      })
    })

    it('should return false for names exceeding 255 characters', () => {
      const longName = 'revivehub/migration-' + 'a'.repeat(250)

      expect(generator.validate(longName)).toBe(false)
    })

    it('should return false for names with invalid characters', () => {
      const invalidNames = [
        'revivehub/migration nextjs', // space
        'revivehub/migration@nextjs', // @
        'revivehub/migration.nextjs', // .
        'revivehub/migration:nextjs', // :
        'revivehub/migration*nextjs', // *
        'revivehub/migration?nextjs', // ?
        'revivehub/migration[nextjs]', // brackets
        'revivehub/migration{nextjs}', // braces
      ]

      invalidNames.forEach(name => {
        expect(generator.validate(name)).toBe(false)
      })
    })

    it('should return false for names ending with .lock', () => {
      const lockName = 'revivehub/migration-nextjs.lock'

      expect(generator.validate(lockName)).toBe(false)
    })

    it('should return false for names with consecutive slashes', () => {
      const doubleslashName = 'revivehub//migration-nextjs'

      expect(generator.validate(doubleslashName)).toBe(false)
    })

    it('should return false for names starting with slash', () => {
      const startSlashName = '/revivehub/migration-nextjs'

      expect(generator.validate(startSlashName)).toBe(false)
    })

    it('should return false for names ending with slash', () => {
      const endSlashName = 'revivehub/migration-nextjs/'

      expect(generator.validate(endSlashName)).toBe(false)
    })

    it('should return true for names with hyphens', () => {
      const hyphenName = 'revivehub/migration-next-js-14'

      expect(generator.validate(hyphenName)).toBe(true)
    })

    it('should return true for names with numbers', () => {
      const numberName = 'revivehub/migration-nextjs-14-2024'

      expect(generator.validate(numberName)).toBe(true)
    })

    it('should return true for names with single slashes', () => {
      const slashName = 'revivehub/migration/nextjs'

      expect(generator.validate(slashName)).toBe(true)
    })
  })

  describe('integration tests', () => {
    it('should generate and validate a complete workflow', () => {
      // Generate a branch name
      const branchName = generator.generate({
        framework: 'nextjs',
        timestamp: new Date('2024-01-15T10:30:45.123Z')
      })

      // Validate it
      expect(generator.validate(branchName)).toBe(true)

      // Ensure uniqueness
      const existingBranches = [branchName]
      const uniqueName = generator.ensureUnique(branchName, existingBranches)

      // Validate unique name
      expect(generator.validate(uniqueName)).toBe(true)
      expect(uniqueName).not.toBe(branchName)
    })

    it('should handle multiple frameworks correctly', () => {
      const frameworks = ['nextjs', 'react', 'vue', 'angular', 'svelte']
      const timestamp = new Date('2024-01-15T10:30:45.123Z')

      frameworks.forEach(framework => {
        const branchName = generator.generate({ framework, timestamp })
        
        expect(branchName).toContain(`revivehub/migration-${framework}`)
        expect(generator.validate(branchName)).toBe(true)
      })
    })

    it('should generate unique names for same framework at different times', () => {
      const framework = 'nextjs'
      const timestamps = [
        new Date('2024-01-15T10:30:45.123Z'),
        new Date('2024-01-15T10:30:46.123Z'),
        new Date('2024-01-15T10:30:47.123Z')
      ]

      const branchNames = timestamps.map(timestamp => 
        generator.generate({ framework, timestamp })
      )

      // All should be unique
      const uniqueNames = new Set(branchNames)
      expect(uniqueNames.size).toBe(branchNames.length)

      // All should be valid
      branchNames.forEach(name => {
        expect(generator.validate(name)).toBe(true)
      })
    })
  })
})
