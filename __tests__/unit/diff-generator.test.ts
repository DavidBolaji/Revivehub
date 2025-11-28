/**
 * Unit tests for DiffGenerator
 * 
 * Tests all diff generation formats and utility methods.
 */

import { describe, it, expect } from 'vitest'
import { DiffGenerator } from '../../lib/transformers/diff-generator'

describe('DiffGenerator', () => {
  const generator = new DiffGenerator()

  describe('generate()', () => {
    it('should generate all diff formats', () => {
      const original = 'const x = 1;\nconst y = 2;'
      const transformed = 'const x = 1;\nconst z = 3;'

      const diff = generator.generate(original, transformed)

      expect(diff.original).toBe(original)
      expect(diff.transformed).toBe(transformed)
      expect(diff.unified).toBeDefined()
      expect(diff.visual).toBeDefined()
      expect(diff.characterLevel).toBeDefined()
      expect(Array.isArray(diff.visual)).toBe(true)
      expect(Array.isArray(diff.characterLevel)).toBe(true)
    })

    it('should handle identical code', () => {
      const code = 'const x = 1;'
      const diff = generator.generate(code, code)

      expect(diff.original).toBe(code)
      expect(diff.transformed).toBe(code)
      expect(diff.visual.every(line => line.type === 'unchanged')).toBe(true)
    })

    it('should handle empty strings', () => {
      const diff = generator.generate('', '')

      expect(diff.original).toBe('')
      expect(diff.transformed).toBe('')
      expect(diff.visual).toHaveLength(0)
    })
  })

  describe('generateUnified()', () => {
    it('should generate Git-compatible unified diff', () => {
      const original = 'line1\nline2\nline3'
      const transformed = 'line1\nmodified\nline3'

      const unified = generator.generateUnified(original, transformed)

      // Check that it contains the essential diff markers
      expect(unified).toContain('---')
      expect(unified).toContain('+++')
      expect(unified).toContain('-line2')
      expect(unified).toContain('+modified')
    })

    it('should handle additions', () => {
      const original = 'line1'
      const transformed = 'line1\nline2'

      const unified = generator.generateUnified(original, transformed)

      expect(unified).toContain('+line2')
    })

    it('should handle deletions', () => {
      const original = 'line1\nline2'
      const transformed = 'line1'

      const unified = generator.generateUnified(original, transformed)

      expect(unified).toContain('-line2')
    })
  })

  describe('generateVisual()', () => {
    it('should generate visual diff with line numbers', () => {
      const original = 'const x = 1;\nconst y = 2;'
      const transformed = 'const x = 1;\nconst z = 3;'

      const visual = generator.generateVisual(original, transformed)

      expect(visual).toBeDefined()
      expect(visual.length).toBeGreaterThan(0)
      
      // Check that line numbers are present
      visual.forEach(line => {
        expect(line.lineNumber).toBeDefined()
        expect(line.content).toBeDefined()
        expect(line.type).toMatch(/^(added|removed|unchanged|modified)$/)
      })
    })

    it('should mark unchanged lines correctly', () => {
      const original = 'line1\nline2\nline3'
      const transformed = 'line1\nmodified\nline3'

      const visual = generator.generateVisual(original, transformed)

      const unchangedLines = visual.filter(l => l.type === 'unchanged')
      expect(unchangedLines.length).toBeGreaterThan(0)
      
      unchangedLines.forEach(line => {
        expect(line.oldLineNumber).toBeDefined()
        expect(line.newLineNumber).toBeDefined()
      })
    })

    it('should mark added lines correctly', () => {
      const original = 'line1'
      const transformed = 'line1\nline2'

      const visual = generator.generateVisual(original, transformed)

      const addedLines = visual.filter(l => l.type === 'added')
      expect(addedLines.length).toBeGreaterThan(0)
      
      addedLines.forEach(line => {
        expect(line.newLineNumber).toBeDefined()
      })
    })

    it('should mark removed lines correctly', () => {
      const original = 'line1\nline2'
      const transformed = 'line1'

      const visual = generator.generateVisual(original, transformed)

      const removedLines = visual.filter(l => l.type === 'removed')
      expect(removedLines.length).toBeGreaterThan(0)
      
      removedLines.forEach(line => {
        expect(line.oldLineNumber).toBeDefined()
      })
    })

    it('should handle complex multi-line changes', () => {
      const original = 'function old() {\n  return 1;\n}'
      const transformed = 'function new() {\n  return 2;\n  return 3;\n}'

      const visual = generator.generateVisual(original, transformed)

      expect(visual.length).toBeGreaterThan(0)
      expect(visual.some(l => l.type === 'added')).toBe(true)
      expect(visual.some(l => l.type === 'removed')).toBe(true)
    })
  })

  describe('generateCharacterLevel()', () => {
    it('should generate character-level diff', () => {
      const original = 'hello world'
      const transformed = 'hello there'

      const charDiff = generator.generateCharacterLevel(original, transformed)

      expect(charDiff).toBeDefined()
      expect(Array.isArray(charDiff)).toBe(true)
      expect(charDiff.length).toBeGreaterThan(0)
      
      charDiff.forEach(change => {
        expect(change.value).toBeDefined()
        expect(typeof change.added).toBe('boolean')
        expect(typeof change.removed).toBe('boolean')
      })
    })

    it('should mark unchanged characters', () => {
      const original = 'hello'
      const transformed = 'hello world'

      const charDiff = generator.generateCharacterLevel(original, transformed)

      const unchanged = charDiff.filter(c => !c.added && !c.removed)
      expect(unchanged.length).toBeGreaterThan(0)
      expect(unchanged[0].value).toContain('hello')
    })

    it('should mark added characters', () => {
      const original = 'hello'
      const transformed = 'hello world'

      const charDiff = generator.generateCharacterLevel(original, transformed)

      const added = charDiff.filter(c => c.added)
      expect(added.length).toBeGreaterThan(0)
    })

    it('should mark removed characters', () => {
      const original = 'hello world'
      const transformed = 'hello'

      const charDiff = generator.generateCharacterLevel(original, transformed)

      const removed = charDiff.filter(c => c.removed)
      expect(removed.length).toBeGreaterThan(0)
    })

    it('should handle inline modifications', () => {
      const original = 'const x = 1;'
      const transformed = 'const x = 2;'

      const charDiff = generator.generateCharacterLevel(original, transformed)

      expect(charDiff.some(c => c.removed)).toBe(true)
      expect(charDiff.some(c => c.added)).toBe(true)
      expect(charDiff.some(c => !c.added && !c.removed)).toBe(true)
    })
  })

  describe('generateWithContext()', () => {
    it('should include context lines around changes', () => {
      const original = 'line1\nline2\nline3\nline4\nline5'
      const transformed = 'line1\nline2\nmodified\nline4\nline5'

      const contextDiff = generator.generateWithContext(original, transformed, 1)

      expect(contextDiff.length).toBeGreaterThan(0)
      
      // Should include the changed line and 1 line of context before and after
      const contents = contextDiff.map(l => l.content)
      expect(contents).toContain('line2')
      expect(contents).toContain('modified')
      expect(contents).toContain('line4')
    })

    it('should use default context of 3 lines', () => {
      const original = 'l1\nl2\nl3\nl4\nl5\nl6\nl7'
      const transformed = 'l1\nl2\nl3\nmodified\nl5\nl6\nl7'

      const contextDiff = generator.generateWithContext(original, transformed)

      expect(contextDiff.length).toBeGreaterThan(0)
      
      // Should include 3 lines of context
      const contents = contextDiff.map(l => l.content)
      expect(contents).toContain('l1')
      expect(contents).toContain('modified')
      expect(contents).toContain('l7')
    })

    it('should handle changes with context', () => {
      const lines = Array.from({ length: 20 }, (_, i) => `line${i + 1}`).join('\n')
      const original = lines
      const transformed = lines.replace('line1', 'modified1').replace('line20', 'modified20')

      const contextDiff = generator.generateWithContext(original, transformed, 2)

      // Should include the changed lines and some context
      expect(contextDiff.length).toBeGreaterThan(0)
      expect(contextDiff.some(l => l.content.includes('modified1'))).toBe(true)
      expect(contextDiff.some(l => l.content.includes('modified20'))).toBe(true)
    })

    it('should return empty array for no changes', () => {
      const code = 'line1\nline2\nline3'
      const contextDiff = generator.generateWithContext(code, code)

      expect(contextDiff).toHaveLength(0)
    })

    it('should handle context at file boundaries', () => {
      const original = 'line1\nline2'
      const transformed = 'modified\nline2'

      const contextDiff = generator.generateWithContext(original, transformed, 5)

      // Should not crash with large context at start of file
      expect(contextDiff.length).toBeGreaterThan(0)
    })
  })

  describe('getStats()', () => {
    it('should calculate diff statistics', () => {
      const original = 'line1\nline2\nline3'
      const transformed = 'line1\nmodified\nline3\nline4'

      const diff = generator.generate(original, transformed)
      const stats = generator.getStats(diff)

      expect(stats.linesAdded).toBeGreaterThan(0)
      expect(stats.linesRemoved).toBeGreaterThan(0)
      expect(stats.linesUnchanged).toBeGreaterThan(0)
      expect(stats.totalChanges).toBe(stats.linesAdded + stats.linesRemoved)
    })

    it('should return zero changes for identical code', () => {
      const code = 'line1\nline2'
      const diff = generator.generate(code, code)
      const stats = generator.getStats(diff)

      expect(stats.linesAdded).toBe(0)
      expect(stats.linesRemoved).toBe(0)
      expect(stats.totalChanges).toBe(0)
    })

    it('should count only additions', () => {
      const original = 'line1\n'
      const transformed = 'line1\nline2\nline3\n'

      const diff = generator.generate(original, transformed)
      const stats = generator.getStats(diff)

      expect(stats.linesAdded).toBe(2)
      expect(stats.linesRemoved).toBe(0)
      expect(stats.totalChanges).toBe(2)
    })

    it('should count only removals', () => {
      const original = 'line1\nline2\nline3\n'
      const transformed = 'line1\n'

      const diff = generator.generate(original, transformed)
      const stats = generator.getStats(diff)

      expect(stats.linesAdded).toBe(0)
      expect(stats.linesRemoved).toBe(2)
      expect(stats.totalChanges).toBe(2)
    })
  })

  describe('utility methods', () => {
    it('should detect identical code through generate', () => {
      const code = 'const x = 1;'
      const diff = generator.generate(code, code)
      
      expect(diff.original).toBe(code)
      expect(diff.transformed).toBe(code)
      expect(diff.visual.every(line => line.type === 'unchanged')).toBe(true)
    })

    it('should detect different code through generate', () => {
      const original = 'const x = 1;'
      const transformed = 'const x = 2;'
      const diff = generator.generate(original, transformed)
      
      expect(diff.original).toBe(original)
      expect(diff.transformed).toBe(transformed)
      expect(diff.visual.some(line => line.type === 'added' || line.type === 'removed')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle very long lines', () => {
      const longLine = 'x'.repeat(10000)
      const original = `${longLine}\nline2`
      const transformed = `${longLine}\nmodified`

      const diff = generator.generate(original, transformed)
      expect(diff.visual.length).toBeGreaterThan(0)
    })

    it('should handle many lines', () => {
      const manyLines = Array(1000).fill('line').join('\n')
      const diff = generator.generate(manyLines, manyLines + '\nnew')

      expect(diff.visual.length).toBeGreaterThan(0)
    })

    it('should handle special characters', () => {
      const original = 'hello\tworld\r\n'
      const transformed = 'hello\tworld!\r\n'

      const diff = generator.generate(original, transformed)
      expect(diff.characterLevel.length).toBeGreaterThan(0)
    })

    it('should handle unicode characters', () => {
      const original = '你好世界'
      const transformed = '你好世界!'

      const diff = generator.generate(original, transformed)
      expect(diff.characterLevel.some(c => c.added)).toBe(true)
    })

    it('should handle empty lines', () => {
      const original = 'line1\n\nline3'
      const transformed = 'line1\n\nmodified'

      const diff = generator.generate(original, transformed)
      expect(diff.visual.length).toBeGreaterThan(0)
    })
  })
})
