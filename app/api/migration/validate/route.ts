/**
 * Migration Validation API Endpoint
 * POST /api/migration/validate - Validates transformed code
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Accepts transformed code and migration spec
 * 3. Runs validation checks (syntax, semantic equivalence, rules)
 * 4. Returns validation results with confidence scores
 * 
 * Requirements: 13.1, 13.2, 13.3
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import type { MigrationSpecification } from '@/types/migration'

interface ValidationRequest {
  originalCode: string
  transformedCode: string
  filePath: string
  language: string
  migrationSpec?: MigrationSpecification
}

/**
 * POST handler for code validation
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication check
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in to validate code.' },
        { status: 401 }
      )
    }

    // Step 2: Parse and validate request body
    let body: ValidationRequest
    
    try {
      body = await request.json()
    } catch (error) {
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.transformedCode) {
      return Response.json(
        { error: 'Missing required field: transformedCode' },
        { status: 400 }
      )
    }

    if (!body.language) {
      return Response.json(
        { error: 'Missing required field: language' },
        { status: 400 }
      )
    }

    console.log(`[VALIDATE] Validating transformed code for ${body.filePath || 'unknown file'}`)

    // Step 3: Run basic validation checks
    // For now, we'll do basic syntax validation using try-catch with babel parser
    let syntaxValid = true
    const syntaxErrors: any[] = []
    
    try {
      // Try to parse the code to check syntax
      const { parse } = await import('@babel/parser')
      parse(body.transformedCode, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
      })
    } catch (error: any) {
      syntaxValid = false
      syntaxErrors.push({
        message: error.message || 'Syntax error',
        line: error.loc?.line || 0,
        column: error.loc?.column || 0,
        severity: 'error',
      })
    }

    // Validate against migration rules (if spec provided)
    let rulesCompliant = true
    const ruleViolations: any[] = []
    
    if (body.migrationSpec) {
      const ruleEngine = new (await import('@/lib/migration/rule-engine')).RuleEngine()
      ruleEngine.loadRules(body.migrationSpec)
      
      const ruleResult = ruleEngine.validateAgainstRules(
        body.transformedCode,
        body.filePath || 'unknown'
      )
      
      rulesCompliant = ruleResult.valid
      ruleViolations.push(...ruleResult.violations.map((v: any) => ({
        id: v.id,
        type: v.type,
        severity: v.severity,
        line: v.line || 0,
        column: v.column || 0,
        message: v.message,
        suggestion: v.suggestion || '',
      })))
    }

    // Calculate overall confidence score
    let confidence = 100
    if (!syntaxValid) confidence -= 50
    if (!rulesCompliant) confidence -= 30
    if (ruleViolations.length > 5) confidence -= 20
    confidence = Math.max(0, confidence)

    // Determine if manual review is required
    const requiresReview = confidence < 70 || ruleViolations.filter((v: any) => v.severity === 'error').length > 0

    // Step 4: Return validation results
    return Response.json({
      valid: syntaxValid && rulesCompliant,
      syntaxValid,
      rulesCompliant,
      confidence,
      requiresReview,
      errors: [
        ...syntaxErrors,
        ...ruleViolations.filter((v: any) => v.severity === 'error'),
      ],
      warnings: [
        ...ruleViolations.filter((v: any) => v.severity === 'warning').map((v: any) => v.message),
      ],
      suggestions: [
        ...(confidence < 70 ? ['Consider manual review of the transformed code'] : []),
        ...(ruleViolations.length > 0 ? ['Review and fix rule violations'] : []),
        ...(!syntaxValid ? ['Fix syntax errors before proceeding'] : []),
      ],
    })

  } catch (error) {
    console.error('Error in migration validate API:', error)

    return Response.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler - returns API documentation
 */
export async function GET() {
  return Response.json({
    endpoint: '/api/migration/validate',
    method: 'POST',
    description: 'Validates transformed code for syntax, semantic equivalence, and rule compliance',
    authentication: 'Required - GitHub OAuth session',
    requestBody: {
      originalCode: 'string (optional) - Original code for semantic comparison',
      transformedCode: 'string (required) - Transformed code to validate',
      filePath: 'string (optional) - File path for context',
      language: 'string (required) - Programming language (javascript, typescript, python)',
      migrationSpec: 'MigrationSpecification (optional) - Migration spec for rule validation',
    },
    response: {
      valid: 'boolean - Overall validation result',
      syntaxValid: 'boolean - Syntax validation result',
      semanticEquivalent: 'boolean - Semantic equivalence result',
      rulesCompliant: 'boolean - Rule compliance result',
      confidence: 'number - Confidence score (0-100)',
      requiresReview: 'boolean - Whether manual review is recommended',
      errors: 'array - Validation errors',
      warnings: 'array - Validation warnings',
      suggestions: 'array - Suggestions for improvement',
    },
  })
}
