/**
 * AST Transformation Engine for Phase 3 Code Migration
 * Provides deterministic code transformations using Abstract Syntax Trees
 * Requirements: 5.1, 5.2, 5.5, 14.4
 * 
 * Current Language Support:
 * - JavaScript (with JSX, class properties, optional chaining)
 * - TypeScript (with decorators, type annotations)
 * 
 * Future Language Support (deferred):
 * - Python (requires LibCST integration via subprocess)
 * - PHP (requires PHP-Parser integration)
 * 
 * The architecture is extensible via addParserConfig() to support additional languages.
 */

import { parse as babelParse } from '@babel/parser'
import traverse, { NodePath } from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'
import type {
  MigrationSpecification,
  TransformationContext,
} from '@/types/migration'

/**
 * Parser configuration for different languages
 */
interface ParserConfig {
  sourceType: 'module' | 'script'
  plugins: any[]
}

/**
 * AST Transformation Engine
 * Handles deterministic code transformations using AST manipulation
 */
export class ASTTransformationEngine {
  private parserConfigs: Map<string, ParserConfig>

  constructor() {
    this.parserConfigs = new Map([
      [
        'javascript',
        {
          sourceType: 'module',
          plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
        },
      ],
      [
        'typescript',
        {
          sourceType: 'module',
          plugins: [
            'jsx',
            'typescript',
            'decorators-legacy',
            'classProperties',
            'optionalChaining',
            'nullishCoalescingOperator',
          ],
        },
      ],
    ])
  }

  /**
   * Parse code into AST
   * Requirements: 5.1, 14.4
   */
  parseCode(code: string, language: string = 'javascript'): t.File {
    try {
      const config = this.parserConfigs.get(language.toLowerCase()) || this.parserConfigs.get('javascript')!

      return babelParse(code, config)
    } catch (error: any) {
      throw new Error(`Failed to parse ${language} code: ${error.message}`)
    }
  }

  /**
   * Deduplicate import declarations in the AST
   * Removes duplicate imports with the same source and specifiers
   */
  private deduplicateImports(ast: t.File): void {
    const program = ast.program
    const imports = program.body.filter((node): node is t.ImportDeclaration => 
      t.isImportDeclaration(node)
    )

    if (imports.length === 0) return

    const originalCount = imports.length

    // Track unique imports by source and specifiers
    const uniqueImports = new Map<string, t.ImportDeclaration>()
    const seenImportKeys = new Set<string>()

    for (const importNode of imports) {
      const source = importNode.source.value
      
      // Create a key that includes source and all specifiers
      const specifierKeys = importNode.specifiers
        .map(spec => {
          if (t.isImportDefaultSpecifier(spec)) {
            return `default:${spec.local.name}`
          } else if (t.isImportNamespaceSpecifier(spec)) {
            return `namespace:${spec.local.name}`
          } else if (t.isImportSpecifier(spec)) {
            const imported = t.isIdentifier(spec.imported) 
              ? spec.imported.name 
              : spec.imported.value
            return `named:${imported}:${spec.local.name}`
          }
          return ''
        })
        .sort()
        .join(',')

      const importKey = `${source}::${specifierKeys}`

      if (!seenImportKeys.has(importKey)) {
        seenImportKeys.add(importKey)
        uniqueImports.set(importKey, importNode)
      }
    }

    const uniqueCount = uniqueImports.size
    if (uniqueCount < originalCount) {
      console.log(`[AST Engine] Deduplicated imports: ${originalCount} -> ${uniqueCount} (removed ${originalCount - uniqueCount} duplicates)`)
    }

    // Remove all import declarations
    program.body = program.body.filter(node => !t.isImportDeclaration(node))

    // Add back only unique imports at the beginning
    const uniqueImportNodes = Array.from(uniqueImports.values())
    program.body.unshift(...uniqueImportNodes)
  }

  /**
   * Generate code from AST with formatting preservation
   * Requirements: 5.4
   */
  generateCode(ast: t.File, preserveFormatting: boolean = true): string {
    try {
      // Deduplicate imports before generating code
      this.deduplicateImports(ast)

      const output = generate(
        ast,
        {
          retainLines: preserveFormatting,
          comments: true,
          compact: false,
        },
        ''
      )

      return output.code
    } catch (error: any) {
      throw new Error(`Failed to generate code: ${error.message}`)
    }
  }

  /**
   * Apply import mappings to transform import statements
   * Requirements: 5.2
   */
  applyImportMappings(
    ast: t.File,
    spec: MigrationSpecification,
    context: TransformationContext
  ): void {
    const importMappings = spec.mappings.imports

    traverse(ast, {
      ImportDeclaration: (path: NodePath<t.ImportDeclaration>) => {
        const source = path.node.source.value

        // Check if this import needs to be mapped
        if (importMappings[source]) {
          const newSource = importMappings[source]
          path.node.source = t.stringLiteral(newSource)

          // Track transformation
          context.imports.push(`${source} -> ${newSource}`)
        }

        // Handle partial path mappings (e.g., @/ prefix changes)
        for (const [oldPath, newPath] of Object.entries(importMappings)) {
          if (source.startsWith(oldPath) && oldPath !== source) {
            const newSource = source.replace(oldPath, newPath)
            path.node.source = t.stringLiteral(newSource)
            context.imports.push(`${source} -> ${newSource}`)
            break
          }
        }

        // Convert relative imports to path aliases for specific directories
        // This handles the case where files are moved (e.g., src/components -> components)
        // and we want to use @/ aliases instead of relative paths
        const convertedSource = this.convertToPathAlias(source, context.filePath, spec)
        if (convertedSource !== source) {
          console.log(`[AST Engine] Converting import: ${source} -> ${convertedSource} in ${context.filePath}`)
          path.node.source = t.stringLiteral(convertedSource)
          context.imports.push(`${source} -> ${convertedSource} (path alias)`)
        }
      },

      // Handle dynamic imports
      CallExpression: (path: NodePath<t.CallExpression>) => {
        if (t.isImport(path.node.callee) && path.node.arguments.length > 0) {
          const arg = path.node.arguments[0]
          if (t.isStringLiteral(arg)) {
            const source = arg.value
            if (importMappings[source]) {
              const newSource = importMappings[source]
              path.node.arguments[0] = t.stringLiteral(newSource)
              context.imports.push(`dynamic: ${source} -> ${newSource}`)
            }

            // Convert relative imports in dynamic imports too
            const convertedSource = this.convertToPathAlias(source, context.filePath, spec)
            if (convertedSource !== source) {
              console.log(`[AST Engine] Converting dynamic import: ${source} -> ${convertedSource} in ${context.filePath}`)
              path.node.arguments[0] = t.stringLiteral(convertedSource)
              context.imports.push(`dynamic: ${source} -> ${convertedSource} (path alias)`)
            }
          }
        }
      },
    })
  }

  /**
   * Convert relative imports to path aliases for specific directories
   * 
   * This handles the case where:
   * - Files are moved from src/components to components
   * - Imports like "../../components/Button" should become "@components/Button"
   * - Imports like "../../lib/utils" should become "@lib/utils"
   * - Imports like "../hooks/useTodos" should become "@hooks/useTodos"
   * 
   * @param importPath - The import path to convert
   * @param currentFilePath - The path of the file containing the import
   * @param spec - Migration specification
   * @returns Converted import path with alias or original path
   */
  private convertToPathAlias(
    importPath: string,
    currentFilePath: string,
    spec: MigrationSpecification
  ): string {
    // Only process relative imports
    if (!importPath.startsWith('.')) {
      return importPath
    }

    // Only convert for Next.js migrations
    if (spec.target.framework !== 'Next.js' && !spec.target.framework.toLowerCase().includes('next')) {
      return importPath
    }

    // Directories that should use path aliases with their specific prefixes
    const aliasDirectories: Record<string, string> = {
      'components': '@components',
      'lib': '@lib',
      'hooks': '@hooks',
      'context': '@context',
      'app': '@app',
      'types': '@types',
      'utils': '@utils',
      'services': '@services'
    }

    try {
      // Resolve the relative path to an absolute path
      const currentDir = currentFilePath.includes('/')
        ? currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))
        : ''

      // Split the import path into segments
      const importSegments = importPath.split('/')
      const currentSegments = currentDir.split('/').filter(Boolean)

      // Count how many levels up we go
      let levelsUp = 0
      for (const segment of importSegments) {
        if (segment === '..') {
          levelsUp++
        } else if (segment !== '.') {
          break
        }
      }

      // Remove the '..' segments from import path
      const remainingSegments = importSegments.filter(s => s !== '..' && s !== '.')

      // Calculate the target directory
      const targetSegments = currentSegments.slice(0, currentSegments.length - levelsUp).concat(remainingSegments)
      const targetPath = targetSegments.join('/')

      console.log(`[AST Engine] Analyzing import path conversion:`)
      console.log(`[AST Engine]   - Import: ${importPath}`)
      console.log(`[AST Engine]   - Current file: ${currentFilePath}`)
      console.log(`[AST Engine]   - Current dir: ${currentDir}`)
      console.log(`[AST Engine]   - Levels up: ${levelsUp}`)
      console.log(`[AST Engine]   - Target path: ${targetPath}`)

      // Check if the target path starts with one of our alias directories
      for (const [aliasDir, aliasPrefix] of Object.entries(aliasDirectories)) {
        if (targetPath.startsWith(aliasDir + '/')) {
          // Extract the path after the directory (e.g., "components/Button" -> "Button")
          const pathAfterDir = targetPath.substring(aliasDir.length + 1)
          const aliasPath = `${aliasPrefix}/${pathAfterDir}`
          console.log(`[AST Engine]   ✓ Converting to alias: ${aliasPath}`)
          return aliasPath
        } else if (targetPath === aliasDir) {
          // Direct import from directory (e.g., "components")
          const aliasPath = aliasPrefix
          console.log(`[AST Engine]   ✓ Converting to alias: ${aliasPath}`)
          return aliasPath
        }
      }

      console.log(`[AST Engine]   - No alias conversion needed`)
      return importPath
    } catch (error) {
      console.error(`[AST Engine] Error converting import path ${importPath}:`, error)
      return importPath
    }
  }

  /**
   * Apply syntax transformations for language-specific changes
   * Requirements: 5.2
   */
  applySyntaxTransformations(
    ast: t.File,
    spec: MigrationSpecification,
    _context: TransformationContext
  ): void {
    const syntaxMappings = (spec.mappings as any).syntax || {}

    // Apply syntax transformations based on target framework
    if (spec.target.framework === 'Next.js') {
      this.applyNextJsSyntaxTransformations(ast, syntaxMappings)
    }

    // Add TypeScript type annotations if migrating to TypeScript
    if (spec.target.language === 'TypeScript' && spec.source.language === 'JavaScript') {
      this.addTypeScriptAnnotations(ast)
    }
  }

  /**
   * Apply Next.js specific syntax transformations
   */
  private applyNextJsSyntaxTransformations(
    ast: t.File,
    _syntaxMappings: Record<string, string>
  ): void {
    traverse(ast, {
      // Transform <a> tags to <Link> components
      JSXElement: (path: NodePath<t.JSXElement>) => {
        const openingElement = path.node.openingElement
        
        if (t.isJSXIdentifier(openingElement.name) && openingElement.name.name === 'a') {
          // Check if it has an href attribute
          const hrefAttr = openingElement.attributes.find(
            (attr): attr is t.JSXAttribute =>
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name) &&
              attr.name.name === 'href'
          )

          if (hrefAttr && hrefAttr.value) {
            // Convert to Link component
            openingElement.name = t.jsxIdentifier('Link')
            if (path.node.closingElement) {
              path.node.closingElement.name = t.jsxIdentifier('Link')
            }
          }
        }
      },
    })
  }

  /**
   * Add basic TypeScript type annotations
   */
  private addTypeScriptAnnotations(ast: t.File): void {
    traverse(ast, {
      // Add type annotations to function parameters
      FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => {
        // Add 'any' type to untyped parameters
        path.node.params.forEach((param) => {
          if (t.isIdentifier(param) && !param.typeAnnotation) {
            param.typeAnnotation = t.tsTypeAnnotation(t.tsAnyKeyword())
          }
        })
      },

      // Add type annotations to arrow functions
      ArrowFunctionExpression: (path: NodePath<t.ArrowFunctionExpression>) => {
        path.node.params.forEach((param) => {
          if (t.isIdentifier(param) && !param.typeAnnotation) {
            param.typeAnnotation = t.tsTypeAnnotation(t.tsAnyKeyword())
          }
        })
      },

      // Add type annotations to variable declarations
      VariableDeclarator: (path: NodePath<t.VariableDeclarator>) => {
        if (t.isIdentifier(path.node.id) && !path.node.id.typeAnnotation && path.node.init) {
          // Infer type from initializer
          if (t.isNumericLiteral(path.node.init)) {
            path.node.id.typeAnnotation = t.tsTypeAnnotation(t.tsNumberKeyword())
          } else if (t.isStringLiteral(path.node.init)) {
            path.node.id.typeAnnotation = t.tsTypeAnnotation(t.tsStringKeyword())
          } else if (t.isBooleanLiteral(path.node.init)) {
            path.node.id.typeAnnotation = t.tsTypeAnnotation(t.tsBooleanKeyword())
          }
        }
      },
    })
  }

  /**
   * Apply routing transformations
   * Requirements: 5.2
   */
  applyRoutingTransformations(
    ast: t.File,
    spec: MigrationSpecification,
    context: TransformationContext
  ): void {
    const routingMappings = spec.mappings.routing

    // Transform react-router to Next.js routing
    if (spec.source.framework === 'React' && spec.target.framework === 'Next.js') {
      this.transformReactRouterToNextJs(ast, routingMappings, context)
    }
  }

  /**
   * Transform React Router components to Next.js equivalents
   */
  private transformReactRouterToNextJs(
    ast: t.File,
    _routingMappings: Record<string, string>,
    context: TransformationContext
  ): void {
    traverse(ast, {
      // Transform <Link> from react-router-dom to next/link
      JSXElement: (path: NodePath<t.JSXElement>) => {
        const openingElement = path.node.openingElement
        
        if (t.isJSXIdentifier(openingElement.name) && openingElement.name.name === 'Link') {
          // Find 'to' attribute and rename to 'href'
          const toAttr = openingElement.attributes.find(
            (attr): attr is t.JSXAttribute =>
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name) &&
              attr.name.name === 'to'
          )

          if (toAttr) {
            toAttr.name = t.jsxIdentifier('href')
            context.relatedFiles.push('Updated Link component to Next.js format')
          }
        }

        // Transform <Navigate> to redirect or router.push
        if (t.isJSXIdentifier(openingElement.name) && openingElement.name.name === 'Navigate') {
          context.relatedFiles.push('Navigate component requires manual migration to useRouter')
        }
      },

      // Transform useNavigate hook to useRouter
      CallExpression: (path: NodePath<t.CallExpression>) => {
        if (
          t.isIdentifier(path.node.callee) &&
          path.node.callee.name === 'useNavigate'
        ) {
          path.node.callee.name = 'useRouter'
          context.relatedFiles.push('Transformed useNavigate to useRouter')
        }
      },
    })
  }

  /**
   * Validate transformed AST
   * Requirements: 5.5
   */
  validateAST(ast: t.File): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    try {
      // Attempt to generate code to validate AST structure
      generate(ast)
      return { valid: true, errors: [] }
    } catch (error: any) {
      errors.push(`AST validation failed: ${error.message}`)
      return { valid: false, errors }
    }
  }

  /**
   * Transform code using migration specification
   * Main entry point for AST transformations
   * Requirements: 5.1, 5.2
   */
  async transformCode(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext
  ): Promise<{ code: string; errors: string[] }> {
    const errors: string[] = []

    try {
      // Parse code
      const ast = this.parseCode(code, spec.source.language)

      // Apply transformations in order
      this.applyImportMappings(ast, spec, context)
      this.applySyntaxTransformations(ast, spec, context)
      this.applyRoutingTransformations(ast, spec, context)

      // Validate transformed AST
      const validation = this.validateAST(ast)
      if (!validation.valid) {
        errors.push(...validation.errors)
        return { code, errors }
      }

      // Generate code
      const transformedCode = this.generateCode(ast, true)

      return { code: transformedCode, errors }
    } catch (error: any) {
      errors.push(`Transformation failed: ${error.message}`)
      return { code, errors }
    }
  }

  /**
   * Add parser configuration for a new language
   */
  addParserConfig(language: string, config: ParserConfig): void {
    this.parserConfigs.set(language.toLowerCase(), config)
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.parserConfigs.keys())
  }
}
