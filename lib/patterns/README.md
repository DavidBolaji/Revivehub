# Pattern Detection Rules Database

A comprehensive pattern detection system for identifying legacy code patterns and suggesting modern alternatives across multiple languages and frameworks.

## Overview

This system provides 20+ pattern detection rules covering:

- **React**: Class components, PropTypes, Formik, Redux, hooks optimization
- **Next.js**: Pages Router to App Router, Image optimization, API routes
- **Vue**: Options API to Composition API, Vue 2 to Vue 3 migrations
- **Python**: Python 2 to 3, type hints, modern syntax
- **JavaScript/TypeScript**: ES6+ modernization, type safety, performance

## Usage

### Basic Pattern Detection

```typescript
import { analyzeCode, detectPatterns } from '@/lib/patterns'

// Analyze code and get detailed results
const result = analyzeCode(sourceCode, 'javascript')

console.log(`Found ${result.summary.total} patterns`)
console.log(`Auto-fixable: ${result.summary.autoFixableCount}`)
console.log(`Estimated time: ${result.summary.totalEstimatedTime}`)

// Simple detection
const patterns = detectPatterns(sourceCode, 'javascript')
patterns.forEach(pattern => {
  console.log(`- ${pattern.name}: ${pattern.description}`)
})
```

### Filter Patterns

```typescript
import { filterPatterns, getAllPatternRules } from '@/lib/patterns'

// Get all patterns
const allPatterns = getAllPatternRules()

// Filter by category
const securityPatterns = filterPatterns(allPatterns, {
  category: 'security'
})

// Filter by framework
const reactPatterns = filterPatterns(allPatterns, {
  framework: 'react'
})

// Filter auto-fixable patterns
const autoFixable = filterPatterns(allPatterns, {
  autoFixable: true
})

// Filter by tags
const hooksPatterns = filterPatterns(allPatterns, {
  tags: ['hooks']
})
```

### Get Prioritized Recommendations

```typescript
import { getPrioritizedPatterns, detectPatterns } from '@/lib/patterns'

const detected = detectPatterns(sourceCode, 'javascript')
const prioritized = getPrioritizedPatterns(detected)

// Patterns are sorted by:
// 1. Category (security > performance > modernization > style)
// 2. Auto-fixable (auto-fixable first)
// 3. Complexity (easier first)

prioritized.forEach((pattern, index) => {
  console.log(`${index + 1}. [${pattern.category}] ${pattern.name}`)
  console.log(`   Complexity: ${pattern.complexity}`)
  console.log(`   Time: ${pattern.estimatedTime}`)
})
```

### Get Pattern Details

```typescript
import { getPatternById } from '@/lib/patterns'

const pattern = getPatternById('react-class-to-hooks')

if (pattern) {
  console.log(pattern.name)
  console.log(pattern.description)
  console.log('\nBefore:')
  console.log(pattern.example.before)
  console.log('\nAfter:')
  console.log(pattern.example.after)
  console.log('\nBenefits:')
  pattern.benefits.forEach(b => console.log(`- ${b}`))
}
```

## Pattern Structure

Each pattern rule includes:

```typescript
interface PatternRule {
  id: string                    // Unique identifier
  name: string                  // Display name
  category: string              // modernization | security | performance | style
  language: string              // Target language
  framework?: string            // Optional framework
  detector: RegExp | Function   // Pattern matching logic
  description: string           // Short description
  problem: string               // What's wrong with current code
  solution: string              // How to fix it
  example: {
    before: string              // Code before fix
    after: string               // Code after fix
  }
  autoFixable: boolean          // Can be auto-fixed
  complexity: string            // low | medium | high
  estimatedTime: string         // Time to fix manually
  benefits: string[]            // List of benefits
  breakingChanges: string[]     // Potential breaking changes
  tags: string[]                // Searchable tags
}
```

## Available Patterns

### React (12 patterns)
- Class components to hooks
- PropTypes to TypeScript
- Formik to React Hook Form + Zod
- Moment.js to date-fns
- Redux to Zustand
- useEffect cleanup
- Key props in lists
- React.memo optimization
- useCallback for callbacks
- useMemo for calculations
- Fragment shorthand
- defaultProps to default parameters

### Next.js (6 patterns)
- Pages Router to App Router
- img to next/image
- a to next/link
- API routes to route handlers
- Head to Metadata API
- API routes to Server Actions

### Vue (5 patterns)
- Options API to Composition API
- setup() to <script setup>
- v-model Vue 3 syntax
- Filters to methods/computed
- Event bus to provide/inject

### Python (8 patterns)
- Python 2 print to Python 3
- String formatting to f-strings
- Add type hints
- Dictionary .get() for safety
- Loops to list comprehensions
- os.path to pathlib
- Classes to dataclasses
- Manual cleanup to context managers

### JavaScript/TypeScript (8 patterns)
- var to const/let
- Callbacks to async/await
- Arrow functions
- Template literals
- Destructuring
- Spread operator
- Optional chaining
- Nullish coalescing
- any to unknown
- Interface to type
- Enum to const
- Namespace to modules

## Categories

### Modernization
Upgrade to modern syntax and patterns for better maintainability.

### Security
Fix security vulnerabilities and improve security posture.

### Performance
Optimize code for better runtime performance and smaller bundles.

### Style
Improve code consistency and readability.

## Helper Functions

```typescript
// Get available languages
const languages = getAvailableLanguages()
// ['javascript', 'typescript', 'python']

// Get available frameworks
const frameworks = getAvailableFrameworks()
// ['react', 'nextjs', 'vue']

// Get all tags
const tags = getAvailableTags()
// ['hooks', 'typescript', 'es6', ...]

// Get patterns by language
const jsPatterns = getPatternsByLanguage('javascript')

// Get patterns by framework
const reactPatterns = getPatternsByFramework('react')

// Get patterns by category
const perfPatterns = getPatternsByCategory('performance')
```

## Integration with AI

This pattern database is designed to work with AI-powered code analysis:

```typescript
import { analyzeCode } from '@/lib/patterns'
import { generateMigrationPlan } from '@/lib/ai/claude-client'

// Detect patterns
const analysis = analyzeCode(sourceCode, 'javascript')

// Generate AI migration plan
const plan = await generateMigrationPlan({
  code: sourceCode,
  patterns: analysis.patterns,
  priority: 'security-first'
})
```

## Adding New Patterns

To add new patterns:

1. Choose the appropriate file (react-patterns.ts, vue-patterns.ts, etc.)
2. Add your pattern to the array following the PatternRule interface
3. Test the detector function with sample code
4. Document benefits and breaking changes

Example:

```typescript
{
  id: 'my-new-pattern',
  name: 'Old Pattern to New Pattern',
  category: 'modernization',
  language: 'javascript',
  detector: /oldPattern\(/,
  description: 'Replace old pattern with new pattern',
  problem: 'Old pattern is deprecated',
  solution: 'Use new pattern instead',
  example: {
    before: 'oldPattern()',
    after: 'newPattern()',
  },
  autoFixable: true,
  complexity: 'low',
  estimatedTime: '5 minutes',
  benefits: ['Better performance', 'Modern syntax'],
  breakingChanges: [],
  tags: ['modernization', 'deprecated'],
}
```

## License

Part of ReviveHub - AI-powered code modernization platform.
