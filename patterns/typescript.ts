import type { TransformationRule } from '@/types'

export const typescriptPatterns: TransformationRule[] = [
  {
    id: 'ts-any-to-unknown',
    name: 'Replace any with unknown for better type safety',
    pattern: /:\s*any\b/g,
    replacement: ': unknown',
    language: 'typescript',
    category: 'type-safety',
  },
  {
    id: 'ts-interface-to-type',
    name: 'Consider using type for simple structures',
    pattern: /interface\s+(\w+)\s*{/g,
    replacement: 'type $1 = {',
    language: 'typescript',
    category: 'best-practices',
  },
]

export const typescriptBestPractices = [
  'Enable strict mode in tsconfig.json',
  'Use unknown instead of any',
  'Prefer type over interface for simple types',
  'Use const assertions for literal types',
  'Enable noImplicitAny',
]
