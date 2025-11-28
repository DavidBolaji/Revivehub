import { z } from 'zod'

/**
 * Zod schema for validating plan API requests
 */
export const PlanRequestSchema = z.object({
  owner: z.string().min(1, 'Repository owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  source: z.object({
    framework: z.string().min(1, 'Source framework is required'),
    version: z.string().min(1, 'Source version is required'),
    language: z.string().min(1, 'Source language is required'),
    dependencies: z.record(z.string()),
    patterns: z.array(z.string()),
  }),
  target: z.object({
    framework: z.string().min(1, 'Target framework is required'),
    version: z.string().min(1, 'Target version is required'),
    language: z.string().min(1, 'Target language is required'),
    dependencies: z.record(z.string()),
    features: z.array(z.string()),
  }),
  patterns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(['dependency', 'structural', 'component', 'documentation', 'build-tool']),
    severity: z.enum(['low', 'medium', 'high']),
    occurrences: z.number(),
    affectedFiles: z.array(z.string()),
    description: z.string(),
    automated: z.boolean(),
  })),
  codebaseStats: z.object({
    totalFiles: z.number().min(0),
    totalLines: z.number().min(0),
    testCoverage: z.number().min(0).max(100),
  }),
  customization: z.object({
    aggressiveness: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
    enabledTransformations: z.array(z.string()).optional(),
    disabledTransformations: z.array(z.string()).optional(),
    selectedPatterns: z.array(z.string()).optional(),
    skipTests: z.boolean().optional(),
    skipDocumentation: z.boolean().optional(),
  }).optional(),
  enableAI: z.boolean().optional().default(true),
  healthScore: z.object({
    total: z.number().optional(),
    buildHealth: z.number().optional(),
  }).optional(),
})

export type PlanRequest = z.infer<typeof PlanRequestSchema>
