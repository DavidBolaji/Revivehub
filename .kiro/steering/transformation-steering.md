# Code Transformation Engine Guidelines for ReviveHub

This document provides comprehensive guidelines for implementing code transformation engines that safely and reliably modify source code across multiple languages.

## 1. AST Best Practices

### Parser Selection by Language

**JavaScript/TypeScript:**
```typescript
// Use @babel/parser for JavaScript
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'

// Use TypeScript Compiler API for TypeScript
import * as ts from 'typescript'

const sourceFile = ts.createSourceFile(
  'temp.ts',
  sourceCode,
  ts.ScriptTarget.Latest,
  true // setParentNodes
)
```

**Python:**
```typescript
// Use LibCST for Python - preserves formatting
import * as libcst from 'libcst'

// LibCST maintains whitespace and comments
const module = libcst.parse(pythonCode)
```

**Vue:**
```typescript
// Use @vue/compiler-sfc for Vue components
import { parse } from '@vue/compiler-sfc'

const { descriptor } = parse(vueSource, {
  filename: 'Component.vue'
})
```

**HTML:**
```typescript
// Use parse5 for HTML
import * as parse5 from 'parse5'

const document = parse5.parse(htmlSource, {
  sourceCodeLocationInfo: true
})
```

### Preserve Code Formatting and Comments

**✅ DO: Use formatPreserving parsers**
```typescript
// Babel with recast for format preservation
import * as recast from 'recast'

const ast = recast.parse(code, {
  parser: require('@babel/parser')
})

// Modifications...

const output = recast.print(ast, {
  quote: 'single',
  trailingComma: true
}).code
```

**❌ DON'T: Lose original formatting**
```typescript
// This loses formatting
const ast = parse(code)
const output = generate(ast).code // Original style lost
```

### Maintain Semantic Equivalence

**✅ DO: Verify transformations preserve behavior**
```typescript
interface TransformationResult {
  code: string
  semanticallyEquivalent: boolean
  confidence: number
  warnings: string[]
}

async function verifySemanticEquivalence(
  original: string,
  transformed: string
): Promise<boolean> {
  // Run static analysis
  const originalAST = parse(original)
  const transformedAST = parse(transformed)
  
  // Check control flow equivalence
  const originalCFG = buildControlFlowGraph(originalAST)
  const transformedCFG = buildControlFlowGraph(transformedAST)
  
  return compareControlFlows(originalCFG, transformedCFG)
}
```

### Handle Edge Cases Gracefully

**✅ DO: Account for syntax variations**
```typescript
function transformImport(path: NodePath) {
  // Handle default imports
  if (path.node.specifiers.some(s => t.isImportDefaultSpecifier(s))) {
    // Transform default import
  }
  
  // Handle namespace imports
  if (path.node.specifiers.some(s => t.isImportNamespaceSpecifier(s))) {
    // Transform namespace import
  }
  
  // Handle named imports
  if (path.node.specifiers.some(s => t.isImportSpecifier(s))) {
    // Transform named imports
  }
  
  // Handle side-effect imports
  if (path.node.specifiers.length === 0) {
    // Transform side-effect import
  }
}
```

## 2. Safety Principles

### Never Make Unsafe Assumptions

**✅ DO: Validate before transforming**
```typescript
interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

function validateBeforeTransform(code: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }
  
  // Check syntax validity
  try {
    parse(code)
  } catch (error) {
    result.isValid = false
    result.errors.push(`Syntax error: ${error.message}`)
    return result
  }
  
  // Check for known problematic patterns
  if (code.includes('eval(')) {
    result.warnings.push('Code contains eval() - transformation may be unsafe')
  }
  
  return result
}
```

**❌ DON'T: Assume code structure**
```typescript
// Bad: Assumes specific structure
function badTransform(code: string) {
  // Assumes all functions are named
  return code.replace(/function (\w+)/, 'const $1 = ')
}
```

### Always Validate Before and After Transformation

**✅ DO: Implement comprehensive validation**
```typescript
interface TransformationPipeline {
  preValidation: (code: string) => ValidationResult
  transform: (code: string) => string
  postValidation: (original: string, transformed: string) => ValidationResult
}

async function safeTransform(
  code: string,
  pipeline: TransformationPipeline
): Promise<TransformationResult> {
  // Pre-validation
  const preCheck = pipeline.preValidation(code)
  if (!preCheck.isValid) {
    throw new Error(`Pre-validation failed: ${preCheck.errors.join(', ')}`)
  }
  
  // Transform
  const transformed = pipeline.transform(code)
  
  // Post-validation
  const postCheck = pipeline.postValidation(code, transformed)
  if (!postCheck.isValid) {
    throw new Error(`Post-validation failed: ${postCheck.errors.join(', ')}`)
  }
  
  // Semantic equivalence check
  const isEquivalent = await verifySemanticEquivalence(code, transformed)
  
  return {
    code: transformed,
    semanticallyEquivalent: isEquivalent,
    confidence: calculateConfidence(preCheck, postCheck, isEquivalent),
    warnings: [...preCheck.warnings, ...postCheck.warnings]
  }
}
```

### Create Backups Before Modifying

**✅ DO: Implement backup strategy**
```typescript
interface BackupStrategy {
  createBackup: (filePath: string, content: string) => Promise<string>
  restoreBackup: (backupId: string) => Promise<void>
  cleanupBackup: (backupId: string) => Promise<void>
}

async function transformWithBackup(
  filePath: string,
  content: string,
  transformer: (code: string) => string,
  backup: BackupStrategy
): Promise<string> {
  // Create backup
  const backupId = await backup.createBackup(filePath, content)
  
  try {
    // Attempt transformation
    const transformed = transformer(content)
    
    // Validate
    const validation = await validateTransformation(content, transformed)
    
    if (!validation.isValid) {
      // Restore backup on failure
      await backup.restoreBackup(backupId)
      throw new Error('Transformation validation failed')
    }
    
    // Cleanup backup on success
    await backup.cleanupBackup(backupId)
    
    return transformed
  } catch (error) {
    // Restore backup on error
    await backup.restoreBackup(backupId)
    throw error
  }
}
```

### Flag Complex Transformations for Manual Review

**✅ DO: Calculate complexity scores**
```typescript
interface ComplexityMetrics {
  cyclomaticComplexity: number
  nestingDepth: number
  linesChanged: number
  scopeChanges: number
}

function calculateTransformationComplexity(
  original: string,
  transformed: string
): ComplexityMetrics {
  const originalAST = parse(original)
  const transformedAST = parse(transformed)
  
  return {
    cyclomaticComplexity: calculateCyclomaticComplexity(transformedAST),
    nestingDepth: calculateMaxNestingDepth(transformedAST),
    linesChanged: calculateLinesDiff(original, transformed),
    scopeChanges: calculateScopeChanges(originalAST, transformedAST)
  }
}

function shouldFlagForReview(metrics: ComplexityMetrics): boolean {
  return (
    metrics.cyclomaticComplexity > 10 ||
    metrics.nestingDepth > 4 ||
    metrics.linesChanged > 50 ||
    metrics.scopeChanges > 5
  )
}
```

### Calculate Confidence Scores

**✅ DO: Provide confidence metrics**
```typescript
interface ConfidenceFactors {
  syntaxValid: boolean
  semanticEquivalence: boolean
  testsPassed: boolean
  complexityScore: number
  patternMatches: number
}

function calculateConfidence(factors: ConfidenceFactors): number {
  let confidence = 0
  
  // Syntax validity (30%)
  if (factors.syntaxValid) confidence += 0.3
  
  // Semantic equivalence (40%)
  if (factors.semanticEquivalence) confidence += 0.4
  
  // Tests passed (20%)
  if (factors.testsPassed) confidence += 0.2
  
  // Complexity penalty (10%)
  const complexityFactor = Math.max(0, 1 - factors.complexityScore / 20)
  confidence += 0.1 * complexityFactor
  
  return Math.round(confidence * 100)
}
```

## 3. Multi-Language Support

### JavaScript/TypeScript with Babel

**✅ DO: Use appropriate plugins**
```typescript
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'

function transformJavaScript(code: string): string {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'typescript',
      'decorators-legacy',
      'classProperties',
      'optionalChaining',
      'nullishCoalescingOperator'
    ]
  })
  
  traverse(ast, {
    // Visitor methods
    FunctionDeclaration(path) {
      // Transform function declarations
    },
    ImportDeclaration(path) {
      // Transform imports
    }
  })
  
  return generate(ast, {
    retainLines: true,
    comments: true
  }).code
}
```

### TypeScript with Compiler API

**✅ DO: Use TypeScript transformer factories**
```typescript
import * as ts from 'typescript'

function createTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile) => {
      const visitor = (node: ts.Node): ts.Node => {
        // Transform class declarations
        if (ts.isClassDeclaration(node)) {
          return transformClassDeclaration(node, context)
        }
        
        return ts.visitEachChild(node, visitor, context)
      }
      
      return ts.visitNode(sourceFile, visitor)
    }
  }
}

function transformTypeScript(code: string): string {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    code,
    ts.ScriptTarget.Latest,
    true
  )
  
  const result = ts.transform(sourceFile, [createTransformer()])
  const printer = ts.createPrinter()
  
  return printer.printFile(result.transformed[0])
}
```

### Python with LibCST

**✅ DO: Preserve formatting with LibCST**
```typescript
// Note: This is conceptual - actual implementation would use Python
interface PythonTransformer {
  transformPython(code: string): string
}

// In practice, call Python script via child_process
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function transformPython(code: string): Promise<string> {
  // Write code to temp file
  const tempFile = '/tmp/transform_input.py'
  await fs.writeFile(tempFile, code)
  
  // Run Python transformation script
  const { stdout } = await execAsync(
    `python3 transform_script.py ${tempFile}`
  )
  
  return stdout
}
```

### Vue with Compiler API

**✅ DO: Handle SFC structure**
```typescript
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc'

function transformVue(source: string): string {
  const { descriptor } = parse(source, {
    filename: 'Component.vue'
  })
  
  // Transform script
  if (descriptor.script || descriptor.scriptSetup) {
    const script = compileScript(descriptor, {
      id: 'component'
    })
    // Transform script.content
  }
  
  // Transform template
  if (descriptor.template) {
    const template = compileTemplate({
      source: descriptor.template.content,
      filename: 'Component.vue',
      id: 'component'
    })
    // Transform template
  }
  
  // Transform styles
  descriptor.styles.forEach(style => {
    // Transform style.content
  })
  
  // Reconstruct SFC
  return reconstructSFC(descriptor)
}
```

## 4. Transformation Patterns

### Parse → Analyze → Transform → Validate → Format

**✅ DO: Follow the pipeline pattern**
```typescript
interface TransformationStage<T> {
  name: string
  execute: (input: T) => Promise<T>
  validate: (output: T) => Promise<boolean>
}

class TransformationPipeline {
  private stages: TransformationStage<any>[] = []
  
  addStage<T>(stage: TransformationStage<T>): this {
    this.stages.push(stage)
    return this
  }
  
  async execute(input: string): Promise<string> {
    let current: any = input
    
    for (const stage of this.stages) {
      console.log(`Executing stage: ${stage.name}`)
      
      current = await stage.execute(current)
      
      const isValid = await stage.validate(current)
      if (!isValid) {
        throw new Error(`Stage ${stage.name} validation failed`)
      }
    }
    
    return current
  }
}

// Usage
const pipeline = new TransformationPipeline()
  .addStage({
    name: 'Parse',
    execute: async (code: string) => parse(code),
    validate: async (ast) => ast !== null
  })
  .addStage({
    name: 'Analyze',
    execute: async (ast) => analyzeAST(ast),
    validate: async (analysis) => analysis.errors.length === 0
  })
  .addStage({
    name: 'Transform',
    execute: async (ast) => transformAST(ast),
    validate: async (ast) => validateAST(ast)
  })
  .addStage({
    name: 'Generate',
    execute: async (ast) => generate(ast).code,
    validate: async (code) => code.length > 0
  })
```

### Use Visitor Pattern for AST Traversal

**✅ DO: Implement clean visitors**
```typescript
interface Visitor<T> {
  enter?: (node: T, parent: T | null) => void
  exit?: (node: T, parent: T | null) => void
}

class ASTVisitor {
  private visitors: Map<string, Visitor<any>> = new Map()
  
  on(nodeType: string, visitor: Visitor<any>): this {
    this.visitors.set(nodeType, visitor)
    return this
  }
  
  visit(node: any, parent: any = null): void {
    const visitor = this.visitors.get(node.type)
    
    if (visitor?.enter) {
      visitor.enter(node, parent)
    }
    
    // Visit children
    for (const key in node) {
      const child = node[key]
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) {
          child.forEach(c => this.visit(c, node))
        } else if (child.type) {
          this.visit(child, node)
        }
      }
    }
    
    if (visitor?.exit) {
      visitor.exit(node, parent)
    }
  }
}

// Usage
const visitor = new ASTVisitor()
  .on('FunctionDeclaration', {
    enter(node) {
      console.log(`Entering function: ${node.id.name}`)
    },
    exit(node) {
      console.log(`Exiting function: ${node.id.name}`)
    }
  })
  .on('ImportDeclaration', {
    enter(node) {
      // Transform import
    }
  })
```

### Keep Transformations Atomic and Reversible

**✅ DO: Implement reversible transformations**
```typescript
interface ReversibleTransformation {
  forward: (code: string) => string
  backward: (code: string) => string
  description: string
}

class TransformationHistory {
  private history: Array<{
    transformation: ReversibleTransformation
    before: string
    after: string
  }> = []
  
  apply(code: string, transformation: ReversibleTransformation): string {
    const result = transformation.forward(code)
    
    this.history.push({
      transformation,
      before: code,
      after: result
    })
    
    return result
  }
  
  undo(): string | null {
    const last = this.history.pop()
    return last ? last.before : null
  }
  
  redo(code: string): string | null {
    const last = this.history[this.history.length - 1]
    return last ? last.transformation.forward(code) : null
  }
}
```

### Log All Changes with Before/After

**✅ DO: Maintain detailed change logs**
```typescript
interface ChangeLog {
  timestamp: Date
  filePath: string
  transformation: string
  before: string
  after: string
  diff: string
  confidence: number
  metadata: Record<string, any>
}

class TransformationLogger {
  private logs: ChangeLog[] = []
  
  log(entry: Omit<ChangeLog, 'timestamp' | 'diff'>): void {
    const diff = this.generateDiff(entry.before, entry.after)
    
    this.logs.push({
      ...entry,
      timestamp: new Date(),
      diff
    })
  }
  
  private generateDiff(before: string, after: string): string {
    // Use diff library
    const diff = require('diff')
    const changes = diff.createPatch('file', before, after)
    return changes
  }
  
  export(): string {
    return JSON.stringify(this.logs, null, 2)
  }
  
  getLogsByFile(filePath: string): ChangeLog[] {
    return this.logs.filter(log => log.filePath === filePath)
  }
}
```

## 5. Error Handling

### Graceful Degradation

**✅ DO: Provide fallback strategies**
```typescript
interface TransformationStrategy {
  name: string
  transform: (code: string) => Promise<string>
  priority: number
}

class GracefulTransformer {
  private strategies: TransformationStrategy[] = []
  
  addStrategy(strategy: TransformationStrategy): this {
    this.strategies.push(strategy)
    this.strategies.sort((a, b) => b.priority - a.priority)
    return this
  }
  
  async transform(code: string): Promise<{
    code: string
    strategy: string
    success: boolean
  }> {
    for (const strategy of this.strategies) {
      try {
        const result = await strategy.transform(code)
        
        // Validate result
        if (await this.validate(result)) {
          return {
            code: result,
            strategy: strategy.name,
            success: true
          }
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.name} failed:`, error)
        continue
      }
    }
    
    // All strategies failed - return original
    return {
      code,
      strategy: 'none',
      success: false
    }
  }
  
  private async validate(code: string): Promise<boolean> {
    try {
      parse(code)
      return true
    } catch {
      return false
    }
  }
}
```

### Clear Error Messages

**✅ DO: Provide actionable error messages**
```typescript
class TransformationError extends Error {
  constructor(
    message: string,
    public code: string,
    public location?: { line: number; column: number },
    public suggestions?: string[]
  ) {
    super(message)
    this.name = 'TransformationError'
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      location: this.location,
      suggestions: this.suggestions
    }
  }
  
  toString(): string {
    let msg = `${this.name}: ${this.message}\n`
    
    if (this.location) {
      msg += `  at line ${this.location.line}, column ${this.location.column}\n`
    }
    
    if (this.code) {
      msg += `\nCode:\n${this.code}\n`
    }
    
    if (this.suggestions && this.suggestions.length > 0) {
      msg += `\nSuggestions:\n`
      this.suggestions.forEach(s => msg += `  - ${s}\n`)
    }
    
    return msg
  }
}

// Usage
throw new TransformationError(
  'Unable to transform class declaration',
  classCode,
  { line: 10, column: 5 },
  [
    'Ensure class has a valid constructor',
    'Check for syntax errors in class body',
    'Verify all decorators are properly formatted'
  ]
)
```

### Rollback Capability

**✅ DO: Implement transaction-like rollback**
```typescript
class TransformationTransaction {
  private changes: Map<string, string> = new Map()
  private committed = false
  
  async transform(
    filePath: string,
    transformer: (content: string) => Promise<string>
  ): Promise<void> {
    if (this.committed) {
      throw new Error('Transaction already committed')
    }
    
    // Read original content
    const original = await fs.readFile(filePath, 'utf-8')
    
    // Store original for rollback
    if (!this.changes.has(filePath)) {
      this.changes.set(filePath, original)
    }
    
    // Apply transformation
    const transformed = await transformer(original)
    
    // Write transformed content
    await fs.writeFile(filePath, transformed)
  }
  
  async commit(): Promise<void> {
    this.committed = true
    this.changes.clear()
  }
  
  async rollback(): Promise<void> {
    for (const [filePath, originalContent] of this.changes) {
      await fs.writeFile(filePath, originalContent)
    }
    
    this.changes.clear()
  }
}

// Usage
const transaction = new TransformationTransaction()

try {
  await transaction.transform('file1.ts', transformer1)
  await transaction.transform('file2.ts', transformer2)
  await transaction.transform('file3.ts', transformer3)
  
  // All succeeded - commit
  await transaction.commit()
} catch (error) {
  // Something failed - rollback all changes
  await transaction.rollback()
  throw error
}
```

### Partial Success Handling

**✅ DO: Report partial successes**
```typescript
interface TransformationResult {
  filePath: string
  success: boolean
  error?: Error
  code?: string
}

interface BatchTransformationResult {
  totalFiles: number
  successful: number
  failed: number
  results: TransformationResult[]
}

async function batchTransform(
  files: string[],
  transformer: (code: string) => Promise<string>
): Promise<BatchTransformationResult> {
  const results: TransformationResult[] = []
  
  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const transformed = await transformer(content)
      
      results.push({
        filePath,
        success: true,
        code: transformed
      })
    } catch (error) {
      results.push({
        filePath,
        success: false,
        error: error as Error
      })
    }
  }
  
  return {
    totalFiles: files.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  }
}
```

## Anti-Patterns to Avoid

### ❌ DON'T: Use regex for code transformation
```typescript
// BAD: Fragile and error-prone
function badTransform(code: string): string {
  return code
    .replace(/var /g, 'let ')
    .replace(/function (\w+)/g, 'const $1 = ')
}
```

### ❌ DON'T: Ignore error recovery
```typescript
// BAD: Fails completely on any error
function badTransform(code: string): string {
  const ast = parse(code) // Throws on syntax error
  return generate(transform(ast)).code
}
```

### ❌ DON'T: Lose source maps
```typescript
// BAD: No way to trace back to original
function badTransform(code: string): string {
  const ast = parse(code)
  return generate(ast).code // Source map lost
}
```

### ❌ DON'T: Make destructive changes without validation
```typescript
// BAD: No validation before writing
async function badTransform(filePath: string): Promise<void> {
  const code = await fs.readFile(filePath, 'utf-8')
  const transformed = transform(code)
  await fs.writeFile(filePath, transformed) // Overwrites without checking
}
```

## Summary

When building code transformation engines for ReviveHub:

1. ✅ Use language-appropriate parsers that preserve formatting
2. ✅ Validate before and after every transformation
3. ✅ Calculate confidence scores and flag complex changes
4. ✅ Implement backup and rollback mechanisms
5. ✅ Follow the Parse → Analyze → Transform → Validate → Format pipeline
6. ✅ Use visitor pattern for clean AST traversal
7. ✅ Keep transformations atomic and reversible
8. ✅ Log all changes with detailed before/after diffs
9. ✅ Provide graceful degradation and clear error messages
10. ✅ Handle partial successes in batch operations
11. ❌ Never use regex for structural code changes
12. ❌ Never make assumptions about code structure
13. ❌ Never lose source maps or formatting information
14. ❌ Never skip validation steps
