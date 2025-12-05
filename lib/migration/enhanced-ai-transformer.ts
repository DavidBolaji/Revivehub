/**
 * Enhanced AI Transformer
 * 
 * Provides advanced AI-powered transformations with:
 * - Context-aware code understanding
 * - Pattern recognition and best practice application
 * - Semantic analysis beyond syntax
 * - Intelligent refactoring suggestions
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  MigrationSpecification,
  TransformationContext,
  AITransformResult,
} from '@/types/migration'

export interface EnhancedTransformOptions {
  preserveComments?: boolean
  applyBestPractices?: boolean
  modernizeSyntax?: boolean
  optimizePerformance?: boolean
  improveAccessibility?: boolean
}

export interface CodePattern {
  name: string
  description: string
  sourcePattern: RegExp
  targetPattern: string
  confidence: number
}

export interface RefactoringSuggestion {
  type: 'performance' | 'accessibility' | 'best-practice' | 'modernization'
  description: string
  before: string
  after: string
  impact: 'low' | 'medium' | 'high'
  autoApplicable: boolean
}

export class EnhancedAITransformer {
  private client: Anthropic
  private patterns: Map<string, CodePattern[]> = new Map()

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY
    
    if (!key) {
      this.client = new Anthropic({ apiKey: 'placeholder' })
    } else {
      this.client = new Anthropic({ apiKey: key })
    }

    this.initializePatterns()
  }

  /**
   * Initialize common code patterns for recognition
   */
  private initializePatterns(): void {
    // React to Next.js patterns
    this.patterns.set('react-to-nextjs', [
      {
        name: 'React Router to Next.js Navigation',
        description: 'Convert React Router hooks to Next.js navigation',
        sourcePattern: /useNavigate\(\)/g,
        targetPattern: 'useRouter()',
        confidence: 95,
      },
      {
        name: 'React Router Link to Next.js Link',
        description: 'Convert React Router Link to Next.js Link',
        sourcePattern: /<Link to=/g,
        targetPattern: '<Link href=',
        confidence: 100,
      },
      {
        name: 'Class Component to Function Component',
        description: 'Convert React class components to function components with hooks',
        sourcePattern: /class\s+\w+\s+extends\s+React\.Component/g,
        targetPattern: 'function Component()',
        confidence: 85,
      },
    ])

    // Performance optimization patterns
    this.patterns.set('performance', [
      {
        name: 'Memoization Opportunity',
        description: 'Identify expensive computations that should be memoized',
        sourcePattern: /const\s+\w+\s+=\s+.*\.map\(.*\)\.filter\(.*\)/g,
        targetPattern: 'useMemo(() => ...)',
        confidence: 80,
      },
      {
        name: 'Callback Optimization',
        description: 'Wrap callbacks in useCallback to prevent re-renders',
        sourcePattern: /onClick=\{.*=>\s*{/g,
        targetPattern: 'useCallback(() => ...)',
        confidence: 75,
      },
    ])

    // Accessibility patterns
    this.patterns.set('accessibility', [
      {
        name: 'Missing Alt Text',
        description: 'Add alt text to images',
        sourcePattern: /<img\s+src=/g,
        targetPattern: '<img src="..." alt="..." />',
        confidence: 100,
      },
      {
        name: 'Button Accessibility',
        description: 'Add aria-label to buttons without text',
        sourcePattern: /<button\s+onClick=/g,
        targetPattern: '<button aria-label="..." onClick=',
        confidence: 90,
      },
    ])
  }

  /**
   * Check if AI is available
   */
  isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY
  }

  /**
   * Enhanced component transformation with context awareness
   */
  async transformWithContext(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext,
    options: EnhancedTransformOptions = {}
  ): Promise<AITransformResult> {
    console.log(`[Enhanced AI] transformWithContext called for ${context.filePath}`)
    console.log(`[Enhanced AI] spec.target.language: "${spec.target.language}"`)
    console.log(`[Enhanced AI] spec.target.framework: "${spec.target.framework}"`)
    
    if (!this.isAvailable()) {
      return {
        code,
        confidence: 0,
        reasoning: 'AI transformation unavailable - no API key',
        warnings: ['AI transformation unavailable - no API key'],
        requiresReview: true,
      }
    }

    const {
      preserveComments = true,
      applyBestPractices = true,
      modernizeSyntax = true,
      optimizePerformance = false,
      improveAccessibility = false,
    } = options

    // Build enhanced prompt with context
    const prompt = this.buildEnhancedPrompt(
      code,
      spec,
      context,
      {
        preserveComments,
        applyBestPractices,
        modernizeSyntax,
        optimizePerformance,
        improveAccessibility,
      }
    )

    // Log the first 500 chars of the prompt to verify TypeScript instructions
    console.log(`[Enhanced AI] Prompt preview (first 500 chars):`)
    console.log(prompt.substring(0, 500))
    console.log(`[Enhanced AI] Prompt contains "TypeScript": ${prompt.includes('TypeScript')}`)
    console.log(`[Enhanced AI] Prompt contains "MUST use TypeScript": ${prompt.includes('MUST use TypeScript')}`)

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        temperature: 0.3, // Lower temperature for more consistent code generation
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
      }

      console.log(`[Enhanced AI] Response preview (first 500 chars):`)
      console.log(content.text.substring(0, 500))
      console.log(`[Enhanced AI] Response contains "interface": ${content.text.includes('interface')}`)
      console.log(`[Enhanced AI] Response contains ": React.FC": ${content.text.includes(': React.FC')}`)

      return this.parseEnhancedResponse(content.text, code, spec)
    } catch (error) {
      console.error('[Enhanced AI] Transformation error:', error)
      return {
        code,
        confidence: 0,
        reasoning: `AI transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        warnings: [`AI transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        requiresReview: true,
      }
    }
  }

  /**
   * Recognize patterns in code
   */
  recognizePatterns(
    code: string,
    category: string = 'react-to-nextjs'
  ): CodePattern[] {
    const patterns = this.patterns.get(category) || []
    const recognized: CodePattern[] = []

    for (const pattern of patterns) {
      if (pattern.sourcePattern.test(code)) {
        recognized.push(pattern)
      }
    }

    return recognized
  }

  /**
   * Generate refactoring suggestions
   */
  async generateRefactoringSuggestions(
    code: string,
    spec: MigrationSpecification
  ): Promise<RefactoringSuggestion[]> {
    if (!this.isAvailable()) {
      return []
    }

    const prompt = `Analyze this code and suggest refactorings for migrating from ${spec.source.framework} to ${spec.target.framework}:

\`\`\`${spec.source.language}
${code}
\`\`\`

Provide suggestions in JSON format:
[
  {
    "type": "performance|accessibility|best-practice|modernization",
    "description": "Brief description",
    "before": "code snippet before",
    "after": "code snippet after",
    "impact": "low|medium|high",
    "autoApplicable": true|false
  }
]

Focus on:
1. Performance optimizations
2. Accessibility improvements
3. Framework best practices
4. Modern syntax patterns`

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        temperature: 0.5,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        return []
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        return []
      }

      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('[Enhanced AI] Error generating suggestions:', error)
      return []
    }
  }

  /**
   * Analyze code semantics
   */
  async analyzeSemantics(
    code: string,
    spec: MigrationSpecification
  ): Promise<{
    intent: string
    complexity: number
    dependencies: string[]
    recommendations: string[]
  }> {
    if (!this.isAvailable()) {
      return {
        intent: 'Unknown',
        complexity: 0,
        dependencies: [],
        recommendations: [],
      }
    }

    const prompt = `Analyze the semantic meaning and intent of this ${spec.source.framework} code:

\`\`\`${spec.source.language}
${code}
\`\`\`

Provide analysis in JSON format:
{
  "intent": "What does this code do?",
  "complexity": 1-10,
  "dependencies": ["list", "of", "dependencies"],
  "recommendations": ["suggestion 1", "suggestion 2"]
}`

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        return {
          intent: 'Unknown',
          complexity: 0,
          dependencies: [],
          recommendations: [],
        }
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return {
          intent: 'Unknown',
          complexity: 0,
          dependencies: [],
          recommendations: [],
        }
      }

      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('[Enhanced AI] Error analyzing semantics:', error)
      return {
        intent: 'Unknown',
        complexity: 0,
        dependencies: [],
        recommendations: [],
      }
    }
  }

  /**
   * Build enhanced prompt with context
   */
  private buildEnhancedPrompt(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext,
    options: EnhancedTransformOptions
  ): string {
    // Special handling for package.json
    if (context.filePath.endsWith('package.json')) {
      return this.buildPackageJsonPrompt(code, spec)
    }

    const instructions: string[] = []

    if (options.preserveComments) {
      instructions.push('- Preserve all comments and documentation')
    }

    if (options.applyBestPractices) {
      instructions.push(`- Apply ${spec.target.framework} best practices`)
    }

    if (options.modernizeSyntax) {
      instructions.push('- Use modern syntax (async/await, destructuring, etc.)')
    }

    if (options.optimizePerformance) {
      instructions.push('- Add performance optimizations (memoization, lazy loading)')
    }

    if (options.improveAccessibility) {
      instructions.push('- Improve accessibility (ARIA labels, semantic HTML)')
    }

    const isTypeScript = spec.target.language === 'typescript' || 
                         spec.target.framework.toLowerCase().includes('next')

    console.log(`[Enhanced AI] Building prompt for ${context.filePath}`)
    console.log(`[Enhanced AI] - Target language: ${spec.target.language}`)
    console.log(`[Enhanced AI] - Target framework: ${spec.target.framework}`)
    console.log(`[Enhanced AI] - isTypeScript: ${isTypeScript}`)

    return `You are an expert code migration assistant. Transform this ${spec.source.framework} code to ${spec.target.framework}.

**Source Code:**
\`\`\`${spec.source.language}
${code}
\`\`\`

**Context:**
- File: ${context.filePath}
- Source Framework: ${spec.source.framework}
- Target Framework: ${spec.target.framework} ${spec.target.version}
- Target Language: ${spec.target.language}
- Target Routing: ${spec.target.routing}

**Instructions:**
${instructions.join('\n')}

**Requirements:**
1. Maintain functionality exactly
2. ${isTypeScript ? '⚠️ CRITICAL: MUST use TypeScript with proper type definitions - DO NOT output JavaScript' : 'Use JavaScript'}
3. ${isTypeScript ? '⚠️ CRITICAL: MUST add interface/type definitions for ALL props and state' : ''}
4. ${isTypeScript ? '⚠️ CRITICAL: MUST use React.FC<PropsType> or explicit return types' : ''}
5. Follow ${spec.target.framework} conventions
6. ${spec.target.routing === 'app-router' || spec.target.routing === 'app' ? '⚠️ CRITICAL: Add "use client" directive at the TOP of the file if the component uses ANY React hooks (useState, useEffect, useCallback, useMemo, useRef, useContext, etc.) or event handlers' : ''}
7. ⚠️ CRITICAL: MUST use path aliases for ALL imports - DO NOT use relative paths
8. Return ONLY the transformed code, no explanations
9. ${isTypeScript ? 'Wrap code in ```typescript tags (NOT ```javascript)' : 'Wrap code in ```javascript tags'}

**Import Path Aliases (⚠️ CRITICAL - MUST FOLLOW):**
YOU MUST use path aliases for ALL imports. NEVER use relative paths like './', '../', './components', '../hooks', etc.

Required import alias mappings:
- Components: import { Button } from '@components/Button' (NOT './components/Button' or '../components/Button')
- Hooks: import { useTodos } from '@hooks/useTodos' (NOT './hooks/useTodos' or '../hooks/useTodos')
- Context: import { TodoContext } from '@context/TodoContext' (NOT './context/TodoContext' or '../context/TodoContext')
- Lib/Utils: import { formatDate } from '@lib/utils' (NOT './lib/utils' or '../lib/utils')
- Types: import type { Todo } from '@types/todo' (NOT './types/todo' or '../types/todo')
- App: import { metadata } from '@app/layout' (NOT './app/layout' or '../app/layout')

Examples of CORRECT imports:
\`\`\`typescript
import { TodoList } from '@components/TodoList'
import { useTodos } from '@hooks/useTodos'
import { TodoContext } from '@context/TodoContext'
import { formatDate } from '@lib/utils'
import type { TodoItem } from '@types/todo'
\`\`\`

Examples of INCORRECT imports (DO NOT USE):
\`\`\`typescript
import { TodoList } from './components/TodoList'  // ❌ WRONG
import { useTodos } from '../hooks/useTodos'      // ❌ WRONG
import { TodoContext } from './context/TodoContext' // ❌ WRONG
import { formatDate } from '../lib/utils'         // ❌ WRONG
\`\`\`

**TypeScript Requirements (⚠️ CRITICAL - MUST FOLLOW):**
${isTypeScript ? `YOU MUST OUTPUT TYPESCRIPT CODE, NOT JAVASCRIPT. This is non-negotiable.

Required TypeScript patterns:
- Define interface for component props: interface FormProps { inputText: string; setInputText: (text: string) => void; ... }
- Use typed component: const Form: React.FC<FormProps> = ({ inputText, setInputText }) => { ... }
- Add type annotations for ALL variables: const [value, setValue] = useState<string>('')
- Type all event handlers: const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
- Use proper React types: React.FC, React.ReactNode, React.MouseEvent, etc.
- Add return type annotations: const myFunction = (): JSX.Element => { ... }

${spec.target.routing === 'app-router' || spec.target.routing === 'app' ? `**Next.js App Router "use client" Directive (⚠️ CRITICAL):**
- If the component uses ANY React hooks (useState, useEffect, useCallback, useMemo, useRef, useContext, useReducer, etc.), you MUST add 'use client' as the FIRST line
- If the component has event handlers (onClick, onChange, onSubmit, etc.), you MUST add 'use client' as the FIRST line
- The directive must be at the very top, before any imports
- Format: 'use client' (with single quotes, followed by semicolon or newline)

Example with hooks:
\`\`\`typescript
'use client'

import { useState } from 'react'

interface MyComponentProps {
  initialValue: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ initialValue }) => {
  const [value, setValue] = useState<string>(initialValue)
  
  return <input value={value} onChange={(e) => setValue(e.target.value)} />
}
\`\`\`

Example without hooks (Server Component - NO 'use client'):
\`\`\`typescript
interface MyComponentProps {
  title: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return <h1>{title}</h1>
}
\`\`\`
` : ''}
Example of CORRECT TypeScript output:
\`\`\`typescript
${spec.target.routing === 'app-router' || spec.target.routing === 'app' ? "'use client'\n\n" : ''}interface MyComponentProps {
  value: string;
  onChange: (value: string) => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ value, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.value);
  };
  
  return <input value={value} onChange={handleChange} />;
};
\`\`\`` : 'Not applicable - target is JavaScript'}

**Output Format:**
\`\`\`${isTypeScript ? 'typescript' : 'javascript'}
// Transformed code here
\`\`\``
  }

  /**
   * Build specialized prompt for package.json transformation
   */
  private buildPackageJsonPrompt(
    code: string,
    spec: MigrationSpecification
  ): string {
    return `You are an expert at migrating package.json files between frameworks. Transform this ${spec.source.framework} package.json to ${spec.target.framework} ${spec.target.version}.

**Source package.json:**
\`\`\`json
${code}
\`\`\`

**Target Framework:** ${spec.target.framework} ${spec.target.version}
**Target Routing:** ${spec.target.routing}

**Requirements:**
1. Update project name to reflect Next.js (e.g., "react-todo-app" → "next-todo-app")
2. Replace ALL React-specific scripts with Next.js scripts:
   - "dev": "next dev"
   - "build": "next build"
   - "start": "next start"
   - "lint": "next lint"
3. Update dependencies:
   - Add: "next": "${spec.target.version}", "react": "^18.3.1", "react-dom": "^18.3.1"
   - Remove: react-scripts, @testing-library/* (unless explicitly needed)
   - Keep: any custom dependencies the app uses
4. Add devDependencies:
   - "eslint": "^9.14.0"
   - "eslint-config-next": "${spec.target.version}"
   - "typescript": "^5" (if using TypeScript)
   - "@types/react": "^18" (if using TypeScript)
   - "@types/react-dom": "^18" (if using TypeScript)
   - "tailwindcss": "^3.4.0"
   - "postcss": "^8"
   - "autoprefixer": "^10"
5. Remove: "browserslist", "eslintConfig" (Next.js handles these)
6. Keep "private": true
7. Update version to "1.0.0" or increment appropriately

**Output Format:**
Return ONLY the transformed package.json wrapped in \`\`\`json tags, no explanations.

\`\`\`json
{
  // Transformed package.json here
}
\`\`\``
  }

  /**
   * Add "use client" directive if component uses hooks or event handlers
   */
  private ensureUseClientDirective(
    code: string,
    spec: MigrationSpecification
  ): string {
    // Only for Next.js App Router
    if (spec.target.routing !== 'app-router' && spec.target.routing !== 'app') {
      console.log('[Enhanced AI] Skipping "use client" check - not App Router')
      return code
    }

    // Check if already has "use client"
    if (code.trim().startsWith("'use client'") || code.trim().startsWith('"use client"')) {
      console.log('[Enhanced AI] "use client" already present')
      return code
    }

    // Check for React hooks (comprehensive list)
    const hasHooks = /\b(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef|useImperativeHandle|useLayoutEffect|useDebugValue|useId|useTransition|useDeferredValue|useSyncExternalStore|useInsertionEffect)\s*\(/.test(code)
    
    // Check for event handlers (comprehensive list)
    const hasEventHandlers = /\b(onClick|onChange|onSubmit|onKeyDown|onKeyUp|onKeyPress|onMouseDown|onMouseUp|onMouseEnter|onMouseLeave|onMouseMove|onFocus|onBlur|onInput|onLoad|onError|onScroll|onWheel|onDrag|onDrop|onTouchStart|onTouchEnd|onTouchMove|onPointerDown|onPointerUp|onPointerMove|onAnimationStart|onAnimationEnd|onTransitionEnd)\s*=/.test(code)
    
    // Check for imports from 'react' that include hooks
    const importsHooks = /import\s*{[^}]*\b(useState|useEffect|useContext|useReducer|useCallback|useMemo|useRef|useImperativeHandle|useLayoutEffect|useSyncExternalStore)[^}]*}\s*from\s*['"]react['"]/.test(code)

    // Check for custom hooks (functions starting with 'use')
    const hasCustomHooks = /\buse[A-Z]\w*\s*\(/.test(code)

    // If has hooks, event handlers, or custom hooks, add "use client"
    if (hasHooks || hasEventHandlers || importsHooks || hasCustomHooks) {
      console.log('[Enhanced AI] ⚠️ ADDING "use client" directive (AI missed it)')
      console.log('[Enhanced AI] - Has hooks:', hasHooks)
      console.log('[Enhanced AI] - Has event handlers:', hasEventHandlers)
      console.log('[Enhanced AI] - Imports hooks:', importsHooks)
      console.log('[Enhanced AI] - Has custom hooks:', hasCustomHooks)
      return `'use client'\n\n${code}`
    }
    
    console.log('[Enhanced AI] ✓ No "use client" needed (server component)')

    return code
  }

  /**
   * Parse enhanced AI response
   */
  private parseEnhancedResponse(
    response: string,
    originalCode: string,
    spec: MigrationSpecification
  ): AITransformResult {
    // Extract code from markdown code blocks (support json, typescript, javascript, tsx, jsx)
    const codeMatch = response.match(/```(?:json|typescript|javascript|tsx|jsx)?\n([\s\S]*?)\n```/)
    
    if (!codeMatch) {
      return {
        code: originalCode,
        confidence: 0,
        reasoning: 'Failed to extract code from AI response',
        warnings: ['Failed to extract code from AI response'],
        requiresReview: true,
      }
    }

    let transformedCode = codeMatch[1].trim()
    
    console.log('[Enhanced AI] Before ensureUseClientDirective:')
    console.log('[Enhanced AI] - Code starts with:', transformedCode.substring(0, 50))
    console.log('[Enhanced AI] - Target routing:', spec.target.routing)
    
    // Ensure "use client" directive is added if needed
    transformedCode = this.ensureUseClientDirective(transformedCode, spec)
    
    console.log('[Enhanced AI] After ensureUseClientDirective:')
    console.log('[Enhanced AI] - Code starts with:', transformedCode.substring(0, 50))

    // Calculate confidence based on code quality indicators
    let confidence = 80

    // Check for common issues
    if (transformedCode.includes('// TODO') || transformedCode.includes('// FIXME')) {
      confidence -= 20
    }

    if (transformedCode.length < originalCode.length * 0.5) {
      confidence -= 15 // Code significantly shorter might indicate missing logic
    }

    if (!transformedCode.includes('export')) {
      confidence -= 10 // Missing exports
    }

    const warnings: string[] = []

    if (confidence < 70) {
      warnings.push('Low confidence transformation - manual review recommended')
    }

    return {
      code: transformedCode,
      confidence: Math.max(0, Math.min(100, confidence)),
      reasoning: `Enhanced AI transformation completed with ${confidence}% confidence`,
      warnings,
      requiresReview: confidence < 80,
    }
  }
}
