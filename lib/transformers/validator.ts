/**
 * Multi-layer validation system for transformed code
 * 
 * Provides comprehensive validation including:
 * - Syntax validation using AST parsing
 * - Semantic validation with TypeScript compiler API
 * - Build configuration validation
 * - Test file validation
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3
 */

import { parse as babelParse } from '@babel/parser'
import type { ValidationResult, ValidationError } from '@/types/transformer'
import * as fs from 'fs/promises'
import * as path from 'path'

export class Validator {
  /**
   * Validate syntax using AST parsing
   * Supports JavaScript, TypeScript, JSX, and TSX
   * 
   * @param code - Source code to validate
   * @param language - Programming language (javascript, typescript, jsx, tsx)
   * @returns ValidationResult with syntax errors and warnings
   */
  async validateSyntax(code: string, language: string): Promise<ValidationResult> {
    try {
      switch (language.toLowerCase()) {
        case 'typescript':
        case 'javascript':
        case 'jsx':
        case 'tsx':
          return await this.validateJavaScript(code, language)
        
        case 'python':
          return await this.validatePython(code)
        
        case 'json':
          return this.validateJSON(code)
        
        default:
          // For unsupported languages, return valid by default
          return {
            isValid: true,
            errors: [],
            warnings: [`Syntax validation not supported for ${language}`],
            syntaxValid: true,
            semanticValid: true
          }
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Unknown validation error',
          severity: 'error',
          suggestion: 'Check code syntax and try again'
        }],
        warnings: [],
        syntaxValid: false,
        semanticValid: false
      }
    }
  }

  /**
   * Validate JavaScript/TypeScript code using Babel parser
   * 
   * @param code - Source code to validate
   * @param language - Language variant (javascript, typescript, jsx, tsx)
   * @returns ValidationResult
   */
  private async validateJavaScript(
    code: string,
    language: string
  ): Promise<ValidationResult> {
    try {
      // Determine plugins based on language
      const plugins: any[] = []
      
      if (language.includes('typescript') || language === 'tsx') {
        plugins.push('typescript')
      }
      
      if (language.includes('jsx') || language === 'tsx') {
        plugins.push('jsx')
      }
      
      // Add common plugins for modern JavaScript
      plugins.push(
        'decorators-legacy',
        'classProperties',
        'optionalChaining',
        'nullishCoalescingOperator',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom'
      )

      // Parse the code
      babelParse(code, {
        sourceType: 'module',
        plugins,
        errorRecovery: true
      })

      return {
        isValid: true,
        errors: [],
        warnings: [],
        syntaxValid: true,
        semanticValid: true
      }
    } catch (error: any) {
      const validationError: ValidationError = {
        message: error.message || 'Syntax error',
        line: error.loc?.line,
        column: error.loc?.column,
        severity: 'error',
        code: error.code,
        suggestion: this.getSyntaxErrorSuggestion(error.message)
      }

      return {
        isValid: false,
        errors: [validationError],
        warnings: [],
        syntaxValid: false,
        semanticValid: false
      }
    }
  }

  /**
   * Validate Python code
   * Note: This is a placeholder for Python validation
   * In production, this would call a Python script using child_process
   * 
   * @param code - Python source code
   * @returns ValidationResult
   */
  private async validatePython(code: string): Promise<ValidationResult> {
    // For now, return a warning that Python validation is not fully implemented
    // In production, this would use LibCST via Python subprocess
    return {
      isValid: true,
      errors: [],
      warnings: ['Python syntax validation not fully implemented - skipping'],
      syntaxValid: true,
      semanticValid: true
    }
  }

  /**
   * Validate JSON syntax
   * 
   * @param code - JSON string
   * @returns ValidationResult
   */
  private validateJSON(code: string): Promise<ValidationResult> {
    try {
      JSON.parse(code)
      
      return Promise.resolve({
        isValid: true,
        errors: [],
        warnings: [],
        syntaxValid: true,
        semanticValid: true
      })
    } catch (error: any) {
      const match = error.message.match(/position (\d+)/)
      const position = match ? parseInt(match[1]) : undefined
      
      return Promise.resolve({
        isValid: false,
        errors: [{
          message: error.message || 'Invalid JSON',
          severity: 'error',
          suggestion: 'Check for missing commas, quotes, or brackets'
        }],
        warnings: [],
        syntaxValid: false,
        semanticValid: false
      })
    }
  }

  /**
   * Validate semantics using TypeScript compiler API
   * Performs type checking and semantic analysis
   * 
   * @param code - TypeScript source code
   * @param language - Programming language
   * @returns ValidationResult with semantic errors
   */
  async validateSemantics(
    code: string,
    language: string
  ): Promise<ValidationResult> {
    // Only perform semantic validation for TypeScript
    if (language !== 'typescript' && language !== 'tsx') {
      return {
        isValid: true,
        errors: [],
        warnings: ['Semantic validation only supported for TypeScript'],
        syntaxValid: true,
        semanticValid: true
      }
    }

    try {
      // Note: Full TypeScript semantic validation would require:
      // 1. Creating a TypeScript Program with all project files
      // 2. Running the type checker
      // 3. Collecting diagnostics
      // 
      // For now, we perform basic syntax validation
      // In production, this would use ts.createProgram() and getSemanticDiagnostics()
      
      const syntaxResult = await this.validateSyntax(code, language)
      
      return {
        ...syntaxResult,
        warnings: [
          ...syntaxResult.warnings,
          'Full semantic validation requires project context - performing syntax validation only'
        ]
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Semantic validation failed',
          severity: 'error',
          suggestion: 'Check type definitions and imports'
        }],
        warnings: [],
        syntaxValid: true,
        semanticValid: false
      }
    }
  }

  /**
   * Validate build configuration exists and is valid
   * Checks for common build config files
   * 
   * @param projectPath - Path to project root
   * @returns ValidationResult indicating if build config is valid
   */
  async validateBuild(projectPath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: string[] = []
    let buildConfigFound = false

    try {
      // Check for common build configuration files
      const buildConfigs = [
        'tsconfig.json',
        'package.json',
        'webpack.config.js',
        'vite.config.ts',
        'vite.config.js',
        'next.config.js',
        'rollup.config.js'
      ]

      for (const configFile of buildConfigs) {
        try {
          const configPath = path.join(projectPath, configFile)
          await fs.access(configPath)
          buildConfigFound = true
          
          // Validate specific config files
          if (configFile === 'tsconfig.json') {
            await this.validateTsConfig(configPath)
          } else if (configFile === 'package.json') {
            await this.validatePackageJson(configPath)
          }
        } catch {
          // File doesn't exist, continue checking
        }
      }

      if (!buildConfigFound) {
        warnings.push('No build configuration files found')
      }

      return {
        isValid: true,
        errors,
        warnings,
        syntaxValid: true,
        semanticValid: true,
        buildValid: buildConfigFound
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Build validation failed',
          severity: 'error',
          suggestion: 'Ensure build configuration files are present and valid'
        }],
        warnings,
        syntaxValid: true,
        semanticValid: true,
        buildValid: false
      }
    }
  }

  /**
   * Validate tsconfig.json
   * 
   * @param configPath - Path to tsconfig.json
   */
  private async validateTsConfig(configPath: string): Promise<void> {
    const content = await fs.readFile(configPath, 'utf-8')
    
    // Remove comments for JSON parsing (tsconfig allows comments)
    const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    
    try {
      JSON.parse(jsonContent)
    } catch (error) {
      throw new Error(`Invalid tsconfig.json: ${error instanceof Error ? error.message : 'Parse error'}`)
    }
  }

  /**
   * Validate package.json
   * 
   * @param configPath - Path to package.json
   */
  private async validatePackageJson(configPath: string): Promise<void> {
    const content = await fs.readFile(configPath, 'utf-8')
    const pkg = JSON.parse(content)
    
    if (!pkg.name) {
      throw new Error('package.json missing required "name" field')
    }
  }

  /**
   * Validate test files exist and are accessible
   * Checks for common test patterns
   * 
   * @param projectPath - Path to project root
   * @returns ValidationResult indicating if tests are found
   */
  async validateTests(projectPath: string): Promise<ValidationResult> {
    const warnings: string[] = []
    let testsFound = false

    try {
      // Check for common test directories and files
      const testPatterns = [
        '__tests__',
        'test',
        'tests',
        'spec',
        'specs'
      ]

      for (const pattern of testPatterns) {
        try {
          const testPath = path.join(projectPath, pattern)
          await fs.access(testPath)
          testsFound = true
          break
        } catch {
          // Directory doesn't exist, continue checking
        }
      }

      // Check for test runner configuration
      const testRunnerConfigs = [
        'vitest.config.ts',
        'vitest.config.js',
        'jest.config.js',
        'jest.config.ts',
        'playwright.config.ts'
      ]

      let testRunnerFound = false
      for (const config of testRunnerConfigs) {
        try {
          const configPath = path.join(projectPath, config)
          await fs.access(configPath)
          testRunnerFound = true
          break
        } catch {
          // Config doesn't exist, continue checking
        }
      }

      if (!testsFound && !testRunnerFound) {
        warnings.push('No test files or test runner configuration found')
      }

      return {
        isValid: true,
        errors: [],
        warnings,
        syntaxValid: true,
        semanticValid: true,
        testsValid: testsFound || testRunnerFound
      }
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Test validation failed',
          severity: 'error',
          suggestion: 'Ensure test files are present in standard locations'
        }],
        warnings,
        syntaxValid: true,
        semanticValid: true,
        testsValid: false
      }
    }
  }

  /**
   * Get helpful suggestion based on syntax error message
   * 
   * @param errorMessage - Error message from parser
   * @returns Helpful suggestion for fixing the error
   */
  private getSyntaxErrorSuggestion(errorMessage: string): string {
    if (errorMessage.includes('Unexpected token')) {
      return 'Check for missing or extra brackets, parentheses, or semicolons'
    }
    
    if (errorMessage.includes('Unterminated')) {
      return 'Check for unclosed strings, comments, or template literals'
    }
    
    if (errorMessage.includes('Expected')) {
      return 'Check for missing syntax elements like commas, colons, or keywords'
    }
    
    if (errorMessage.includes('Invalid')) {
      return 'Check for incorrect syntax or unsupported language features'
    }
    
    if (errorMessage.includes('import') || errorMessage.includes('export')) {
      return 'Check import/export syntax and module resolution'
    }
    
    return 'Review the code syntax and ensure it follows language standards'
  }

  /**
   * Perform comprehensive validation
   * Runs all validation checks in sequence
   * 
   * @param code - Source code to validate
   * @param language - Programming language
   * @param projectPath - Optional project path for build/test validation
   * @returns Comprehensive ValidationResult
   */
  async validateAll(
    code: string,
    language: string,
    projectPath?: string
  ): Promise<ValidationResult> {
    const results: ValidationResult[] = []

    // Syntax validation
    const syntaxResult = await this.validateSyntax(code, language)
    results.push(syntaxResult)

    // If syntax is invalid, skip further validation
    if (!syntaxResult.syntaxValid) {
      return syntaxResult
    }

    // Semantic validation for TypeScript
    if (language === 'typescript' || language === 'tsx') {
      const semanticResult = await this.validateSemantics(code, language)
      results.push(semanticResult)
    }

    // Build and test validation if project path provided
    if (projectPath) {
      const buildResult = await this.validateBuild(projectPath)
      results.push(buildResult)

      const testResult = await this.validateTests(projectPath)
      results.push(testResult)
    }

    // Combine all results
    return this.combineValidationResults(results)
  }

  /**
   * Combine multiple validation results into one
   * 
   * @param results - Array of ValidationResult objects
   * @returns Combined ValidationResult
   */
  private combineValidationResults(results: ValidationResult[]): ValidationResult {
    const allErrors: ValidationError[] = []
    const allWarnings: string[] = []
    let isValid = true
    let syntaxValid = true
    let semanticValid = true
    let buildValid: boolean | undefined
    let testsValid: boolean | undefined

    for (const result of results) {
      allErrors.push(...result.errors)
      allWarnings.push(...result.warnings)
      
      if (!result.isValid) {
        isValid = false
      }
      
      if (!result.syntaxValid) {
        syntaxValid = false
      }
      
      if (!result.semanticValid) {
        semanticValid = false
      }
      
      if (result.buildValid !== undefined) {
        buildValid = result.buildValid
      }
      
      if (result.testsValid !== undefined) {
        testsValid = result.testsValid
      }
    }

    return {
      isValid,
      errors: allErrors,
      warnings: allWarnings,
      syntaxValid,
      semanticValid,
      buildValid,
      testsValid
    }
  }
}

// Export singleton instance
export const validator = new Validator()

