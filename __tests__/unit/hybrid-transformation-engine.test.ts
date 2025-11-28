/**
 * Unit tests for HybridTransformationEngine
 * 
 * Tests the transformation pipeline's ability to:
 * - Apply AST transformations first (deterministic)
 * - Apply AI transformations for semantic changes
 * - Validate with rule engine
 * - Generate diff and metadata
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HybridTransformationEngine } from '@/lib/migration/hybrid-transformation-engine'
import { ASTTransformationEngine } from '@/lib/migration/ast-transformation-engine'
import { AITransformationEngine } from '@/lib/migration/ai-transformation-engine'
import { RuleEngine } from '@/lib/migration/rule-engine'
import type {
  MigrationSpecification,
  RepositoryFile,
  Phase3TransformResult,
} from '@/types/migration'

// Mock the AI engine to avoid actual API calls
vi.mock('@/lib/migration/ai-transformation-engine')

describe('HybridTransformationEngine', () => {
  let engine: HybridTransformationEngine
  let mockASTEngine: ASTTransformationEngine
  let mockAIEngine: AITransformationEngine
  let mockRuleEngine: RuleEngine
  let mockSpec: MigrationSpecification

  beforeEach(() => {
    // Create mock engines
    mockASTEngine = new ASTTransformationEngine()
    mockAIEngine = new AITransformationEngine('test-key')
    mockRuleEngine = new RuleEngine()

    // Create engine with mocks
    engine = new HybridTransformationEngine(
      mockASTEngine,
      mockAIEngine,
      mockRuleEngine
    )

    // Create mock migration spec
    mockSpec = {
      source: {
        language: 'javascript',
        framework: 'React',
        version: '18.0.0',
        routing: 'react-router',
        patterns: {},
        buildTool: 'webpack',
        packageManager: 'npm',
      },
      target: {
        language: 'typescript',
        framework: 'Next.js',
        version: '14.0.0',
        routing: 'app-router',
        fileStructure: {
          pages: 'app',
          components: 'components',
          layouts: 'app/layouts',
          api: 'app/api',
        },
        componentConventions: {
          fileExtension: '.tsx',
          namingConvention: 'PascalCase',
          exportStyle: 'default',
          serverComponents: true,
        },
        syntaxMappings: {},
        apiMappings: {},
        lifecycleMappings: {
          componentDidMount: 'useEffect(() => {}, [])',
          componentWillUnmount: 'useEffect(() => { return () => {} }, [])',
        },
        buildTool: 'turbopack',
        packageManager: 'pnpm',
      },
      mappings: {
        imports: {
          'react-router-dom': 'next/navigation',
        },
        routing: {},
        components: {},
        styling: {},
        stateManagement: {},
        buildSystem: {},
      },
      rules: {
        mustPreserve: ['Business logic'],
        mustTransform: ['Import statements'],
        mustRemove: ['react-router dependencies'],
        mustRefactor: [],
        breakingChanges: [],
        deprecations: [],
      },
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        estimatedComplexity: 'medium',
        estimatedDuration: '2-4 hours',
      },
    }
  })

  describe('Transformation Pipeline', () => {
    it('should execute transformation pipeline in correct order', async () => {
      const file: RepositoryFile = {
        path: 'src/components/Button.jsx',
        content: `import React from 'react';\n\nfunction Button() {\n  return <button>Click me</button>;\n}\n\nexport default Button;`,
        sha: 'abc123',
        size: 100,
        type: 'file',
      }

      // Mock AST transformation
      vi.spyOn(mockASTEngine, 'transformCode').mockResolvedValue({
        code: `import React from 'react';\n\nfunction Button() {\n  return <button>Click me</button>;\n}\n\nexport default Button;`,
        errors: [],
      })

      // Mock AI transformation
      vi.spyOn(mockAIEngine, 'transformComponent').mockResolvedValue({
        code: `'use client';\n\nfunction Button() {\n  return <button>Click me</button>;\n}\n\nexport default Button;`,
        confidence: 85,
        reasoning: 'Converted to Next.js client component',
        warnings: [],
        requiresReview: false,
      })

      // Mock rule validation
      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockReturnValue({
        valid: true,
        violations: [],
        warnings: [],
      })

      const result = await engine.transform(file, mockSpec)

      expect(result).toBeDefined()
      expect(result.code).toBeDefined()
      expect(result.filePath).toBe(file.path)
      expect(result.confidence).toBeGreaterThan(0)
      expect(mockASTEngine.transformCode).toHaveBeenCalled()
      expect(mockAIEngine.transformComponent).toHaveBeenCalled()
      expect(mockRuleEngine.validateAgainstRules).toHaveBeenCalled()
    })

    it('should apply AST transformations first', async () => {
      const file: RepositoryFile = {
        path: 'src/components/App.jsx', // Changed to components to trigger AI transformation
        content: `import { Link } from 'react-router-dom';\n\nfunction App() {\n  return <Link to="/about">About</Link>;\n}`,
        sha: 'def456',
        size: 80,
        type: 'file',
      }

      const callOrder: string[] = []

      vi.spyOn(mockASTEngine, 'transformCode').mockImplementation(async () => {
        callOrder.push('AST')
        return { code: file.content, errors: [] }
      })

      vi.spyOn(mockAIEngine, 'transformComponent').mockImplementation(async () => {
        callOrder.push('AI')
        return {
          code: file.content,
          confidence: 80,
          reasoning: 'Test',
          warnings: [],
          requiresReview: false,
        }
      })

      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockImplementation(() => {
        callOrder.push('Validation')
        return { valid: true, violations: [], warnings: [] }
      })

      await engine.transform(file, mockSpec)

      expect(callOrder[0]).toBe('AST')
      expect(callOrder[1]).toBe('AI')
      expect(callOrder[2]).toBe('Validation')
    })

    it('should generate diff between original and transformed code', async () => {
      const file: RepositoryFile = {
        path: 'src/components/Header.jsx',
        content: `function Header() {\n  return <h1>Hello</h1>;\n}`,
        sha: 'ghi789',
        size: 50,
        type: 'file',
      }

      const transformedCode = `'use client';\n\nfunction Header() {\n  return <h1>Hello</h1>;\n}`

      vi.spyOn(mockASTEngine, 'transformCode').mockResolvedValue({
        code: file.content,
        errors: [],
      })

      vi.spyOn(mockAIEngine, 'transformComponent').mockResolvedValue({
        code: transformedCode,
        confidence: 90,
        reasoning: 'Added client directive',
        warnings: [],
        requiresReview: false,
      })

      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockReturnValue({
        valid: true,
        violations: [],
        warnings: [],
      })

      const result = await engine.transform(file, mockSpec)

      expect(result.diff).toBeDefined()
      expect(result.diff.length).toBeGreaterThan(0)
      expect(result.diff).toContain('--- original')
      expect(result.diff).toContain('+++ transformed')
    })

    it('should generate metadata with transformation details', async () => {
      const file: RepositoryFile = {
        path: 'src/pages/Home.jsx',
        content: `import React from 'react';\n\nfunction Home() {\n  return <div>Home</div>;\n}`,
        sha: 'jkl012',
        size: 70,
        type: 'file',
      }

      vi.spyOn(mockASTEngine, 'transformCode').mockResolvedValue({
        code: file.content,
        errors: [],
      })

      vi.spyOn(mockAIEngine, 'transformComponent').mockResolvedValue({
        code: file.content,
        confidence: 85,
        reasoning: 'Test',
        warnings: [],
        requiresReview: false,
      })

      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockReturnValue({
        valid: true,
        violations: [],
        warnings: [],
      })

      const result = await engine.transform(file, mockSpec)

      expect(result.metadata).toBeDefined()
      expect(result.metadata.newFilePath).toBeDefined()
      expect(result.metadata.fileType).toBeDefined()
      expect(result.metadata.language).toBe(mockSpec.target.language)
      expect(result.metadata.framework).toBe(mockSpec.target.framework)
      expect(result.metadata.notes).toBeDefined()
      expect(Array.isArray(result.metadata.notes)).toBe(true)
    })
  })

  describe('Confidence Calculation', () => {
    it('should calculate high confidence for successful transformations', async () => {
      const file: RepositoryFile = {
        path: 'src/utils/helpers.js',
        content: `export function add(a, b) { return a + b; }`,
        sha: 'mno345',
        size: 40,
        type: 'file',
      }

      vi.spyOn(mockASTEngine, 'transformCode').mockResolvedValue({
        code: file.content,
        errors: [],
      })

      vi.spyOn(mockAIEngine, 'transformComponent').mockResolvedValue({
        code: file.content,
        confidence: 95,
        reasoning: 'Simple utility function',
        warnings: [],
        requiresReview: false,
      })

      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockReturnValue({
        valid: true,
        violations: [],
        warnings: [],
      })

      const result = await engine.transform(file, mockSpec)

      expect(result.confidence).toBeGreaterThan(70)
      expect(result.requiresReview).toBe(false)
    })

    it('should calculate low confidence for problematic transformations', async () => {
      const file: RepositoryFile = {
        path: 'src/complex/Component.jsx',
        content: `class Complex extends React.Component { /* complex code */ }`,
        sha: 'pqr678',
        size: 200,
        type: 'file',
      }

      vi.spyOn(mockASTEngine, 'transformCode').mockResolvedValue({
        code: file.content,
        errors: ['Warning: Complex transformation'],
      })

      vi.spyOn(mockAIEngine, 'transformComponent').mockResolvedValue({
        code: file.content,
        confidence: 40,
        reasoning: 'Complex class component',
        warnings: ['Manual review recommended'],
        requiresReview: true,
      })

      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockReturnValue({
        valid: false,
        violations: [
          {
            id: 'test-violation',
            type: 'incompatibility',
            severity: 'error',
            line: 1,
            column: 1,
            message: 'Test violation',
            suggestion: 'Fix manually',
            autoFixable: false,
          },
        ],
        warnings: ['Validation warning'],
      })

      const result = await engine.transform(file, mockSpec)

      expect(result.confidence).toBeLessThan(70)
      expect(result.requiresReview).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle AST transformation errors gracefully', async () => {
      const file: RepositoryFile = {
        path: 'src/broken.js',
        content: `const x = ;`, // Invalid syntax
        sha: 'stu901',
        size: 10,
        type: 'file',
      }

      vi.spyOn(mockASTEngine, 'transformCode').mockResolvedValue({
        code: file.content,
        errors: ['Syntax error'],
      })

      vi.spyOn(mockAIEngine, 'transformComponent').mockResolvedValue({
        code: file.content,
        confidence: 0,
        reasoning: 'Cannot transform invalid syntax',
        warnings: [],
        requiresReview: true,
      })

      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockReturnValue({
        valid: false,
        violations: [],
        warnings: ['Syntax error detected'],
      })

      const result = await engine.transform(file, mockSpec)

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.requiresReview).toBe(true)
    })

    it('should handle complete transformation failure', async () => {
      const file: RepositoryFile = {
        path: 'src/error.js',
        content: `throw new Error('test');`,
        sha: 'vwx234',
        size: 20,
        type: 'file',
      }

      // Mock the transform method to throw an error at the top level
      vi.spyOn(mockRuleEngine, 'loadRules').mockImplementation(() => {
        throw new Error('Critical error')
      })

      const result = await engine.transform(file, mockSpec)

      expect(result.code).toBe(file.content) // Original code returned
      expect(result.confidence).toBe(0)
      expect(result.requiresReview).toBe(true)
      expect(result.warnings.some(w => w.includes('Critical error'))).toBe(true)
    })
  })

  describe('Batch Transformation', () => {
    it('should transform multiple files', async () => {
      const files: RepositoryFile[] = [
        {
          path: 'src/A.js',
          content: 'const a = 1;',
          sha: 'a1',
          size: 10,
          type: 'file',
        },
        {
          path: 'src/B.js',
          content: 'const b = 2;',
          sha: 'b2',
          size: 10,
          type: 'file',
        },
      ]

      vi.spyOn(mockASTEngine, 'transformCode').mockResolvedValue({
        code: 'transformed',
        errors: [],
      })

      vi.spyOn(mockAIEngine, 'transformComponent').mockResolvedValue({
        code: 'transformed',
        confidence: 80,
        reasoning: 'Test',
        warnings: [],
        requiresReview: false,
      })

      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockReturnValue({
        valid: true,
        violations: [],
        warnings: [],
      })

      const results = await engine.transformBatch(files, mockSpec)

      expect(results.size).toBe(2)
      expect(results.has('src/A.js')).toBe(true)
      expect(results.has('src/B.js')).toBe(true)
    })

    it('should process files in parallel batches of 5', async () => {
      // Create 12 files to test batching (should be 3 batches: 5, 5, 2)
      const files: RepositoryFile[] = Array.from({ length: 12 }, (_, i) => ({
        path: `src/file${i}.js`,
        content: `const x${i} = ${i};`,
        sha: `sha${i}`,
        size: 20,
        type: 'file' as const,
      }))

      const transformOrder: number[] = []
      let currentBatchSize = 0
      let maxConcurrent = 0

      vi.spyOn(mockASTEngine, 'transformCode').mockImplementation(async () => {
        currentBatchSize++
        maxConcurrent = Math.max(maxConcurrent, currentBatchSize)
        
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10))
        
        currentBatchSize--
        transformOrder.push(currentBatchSize)
        
        return { code: 'transformed', errors: [] }
      })

      vi.spyOn(mockAIEngine, 'transformComponent').mockResolvedValue({
        code: 'transformed',
        confidence: 80,
        reasoning: 'Test',
        warnings: [],
        requiresReview: false,
      })

      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockReturnValue({
        valid: true,
        violations: [],
        warnings: [],
      })

      const results = await engine.transformBatch(files, mockSpec)

      expect(results.size).toBe(12)
      // Max concurrent should not exceed 5
      expect(maxConcurrent).toBeLessThanOrEqual(5)
    })

    it('should track progress during batch transformation', async () => {
      const files: RepositoryFile[] = Array.from({ length: 8 }, (_, i) => ({
        path: `src/file${i}.js`,
        content: `const x${i} = ${i};`,
        sha: `sha${i}`,
        size: 20,
        type: 'file' as const,
      }))

      const progressUpdates: Array<{
        totalFiles: number
        processedFiles: number
        currentFile: string
        percentage: number
      }> = []

      vi.spyOn(mockASTEngine, 'transformCode').mockResolvedValue({
        code: 'transformed',
        errors: [],
      })

      vi.spyOn(mockAIEngine, 'transformComponent').mockResolvedValue({
        code: 'transformed',
        confidence: 80,
        reasoning: 'Test',
        warnings: [],
        requiresReview: false,
      })

      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockReturnValue({
        valid: true,
        violations: [],
        warnings: [],
      })

      await engine.transformBatch(files, mockSpec, (progress) => {
        progressUpdates.push(progress)
      })

      // Should have progress updates
      expect(progressUpdates.length).toBeGreaterThan(0)
      
      // First update should be at 0%
      expect(progressUpdates[0].processedFiles).toBe(0)
      expect(progressUpdates[0].percentage).toBe(0)
      
      // Last update should be at 100%
      const lastUpdate = progressUpdates[progressUpdates.length - 1]
      expect(lastUpdate.processedFiles).toBe(8)
      expect(lastUpdate.percentage).toBe(100)
      
      // Progress should be monotonically increasing
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].processedFiles).toBeGreaterThanOrEqual(
          progressUpdates[i - 1].processedFiles
        )
      }
    })

    it('should continue processing remaining files if one fails', async () => {
      const files: RepositoryFile[] = [
        {
          path: 'src/good1.js',
          content: 'const a = 1;',
          sha: 'a1',
          size: 10,
          type: 'file',
        },
        {
          path: 'src/bad.js',
          content: 'const x = ;', // Will fail
          sha: 'b2',
          size: 10,
          type: 'file',
        },
        {
          path: 'src/good2.js',
          content: 'const c = 3;',
          sha: 'c3',
          size: 10,
          type: 'file',
        },
      ]

      let callCount = 0
      vi.spyOn(mockASTEngine, 'transformCode').mockImplementation(async () => {
        callCount++
        if (callCount === 2) {
          throw new Error('Transformation failed')
        }
        return { code: 'transformed', errors: [] }
      })

      vi.spyOn(mockAIEngine, 'transformComponent').mockResolvedValue({
        code: 'transformed',
        confidence: 80,
        reasoning: 'Test',
        warnings: [],
        requiresReview: false,
      })

      vi.spyOn(mockRuleEngine, 'validateAgainstRules').mockReturnValue({
        valid: true,
        violations: [],
        warnings: [],
      })

      const results = await engine.transformBatch(files, mockSpec)

      // All files should have results
      expect(results.size).toBe(3)
      
      // Failed file should have low confidence and require review
      const failedResult = results.get('src/bad.js')
      expect(failedResult).toBeDefined()
      expect(failedResult!.confidence).toBeLessThan(70) // Low confidence due to AST error
      expect(failedResult!.requiresReview).toBe(true)
      expect(failedResult!.warnings.some(w => w.includes('failed'))).toBe(true)
      
      // Other files should succeed
      expect(results.get('src/good1.js')!.confidence).toBeGreaterThan(0)
      expect(results.get('src/good2.js')!.confidence).toBeGreaterThan(0)
    })

    it('should report progress even when transformations fail', async () => {
      const files: RepositoryFile[] = [
        {
          path: 'src/file1.js',
          content: 'const a = 1;',
          sha: 'a1',
          size: 10,
          type: 'file',
        },
        {
          path: 'src/file2.js',
          content: 'const b = 2;',
          sha: 'b2',
          size: 10,
          type: 'file',
        },
      ]

      const progressUpdates: number[] = []

      vi.spyOn(mockASTEngine, 'transformCode').mockRejectedValue(
        new Error('All transformations fail')
      )

      await engine.transformBatch(files, mockSpec, (progress) => {
        progressUpdates.push(progress.processedFiles)
      })

      // Should still track progress to completion
      expect(progressUpdates[progressUpdates.length - 1]).toBe(2)
    })

    it('should get transformation statistics', async () => {
      const results = new Map<string, Phase3TransformResult>()

      results.set('file1.js', {
        code: 'code1',
        filePath: 'file1.js',
        newFilePath: 'file1.tsx',
        metadata: {
          newFilePath: 'file1.tsx',
          fileType: 'component',
          language: 'typescript',
          framework: 'Next.js',
          dependenciesAdded: [],
          dependenciesRemoved: [],
          notes: [],
        },
        diff: '',
        confidence: 85,
        requiresReview: false,
        warnings: [],
      })

      results.set('file2.js', {
        code: 'code2',
        filePath: 'file2.js',
        newFilePath: 'file2.tsx',
        metadata: {
          newFilePath: 'file2.tsx',
          fileType: 'component',
          language: 'typescript',
          framework: 'Next.js',
          dependenciesAdded: [],
          dependenciesRemoved: [],
          notes: [],
        },
        diff: '',
        confidence: 60,
        requiresReview: true,
        warnings: ['Warning 1'],
      })

      const stats = engine.getTransformationStatistics(results)

      expect(stats.totalFiles).toBe(2)
      expect(stats.successfulTransformations).toBe(1) // Only file1 has confidence > 70
      expect(stats.requiresReview).toBe(1)
      expect(stats.averageConfidence).toBeGreaterThan(0)
      expect(stats.totalWarnings).toBe(1)
    })
  })
})
