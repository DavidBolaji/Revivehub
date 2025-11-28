/**
 * ClassToHooksTransformer - Converts React class components to functional components with hooks
 * 
 * Transforms React class components into modern functional components using hooks:
 * - Converts state to useState
 * - Converts lifecycle methods to useEffect
 * - Converts instance methods to regular functions
 * - Preserves propTypes and defaultProps
 * 
 * @example
 * Input:
 * ```jsx
 * class MyComponent extends React.Component {
 *   state = { count: 0 }
 *   componentDidMount() { console.log('mounted') }
 *   render() { return <div>{this.state.count}</div> }
 * }
 * ```
 * 
 * Output:
 * ```jsx
 * function MyComponent(props) {
 *   const [count, setCount] = useState(0)
 *   useEffect(() => { console.log('mounted') }, [])
 *   return <div>{count}</div>
 * }
 * ```
 */

import { parse } from '@babel/parser'
import traverse, { NodePath } from '@babel/traverse'
import generate from '@babel/generator'
import * as t from '@babel/types'
import { BaseTransformer } from '../base-transformer'
import type {
  TransformOptions,
  TransformResult,
  Task,
} from '@/types/transformer'
import { convertStateToHooks, replaceStateReferences } from './state-converter'
import { convertLifecycleToHooks, replaceThisReferences } from './hook-mapper'
import {
  isReactComponentClass,
  getComponentName,
  isLifecycleMethod,
  isRenderMethod,
} from './ast-helpers'

export class ClassToHooksTransformer extends BaseTransformer {
  constructor() {
    super('ClassToHooksTransformer', ['component'], ['React'])
  }

  /**
   * Transforms React class components to functional components with hooks
   */
  async transform(
    code: string,
    _options: TransformOptions,
    _task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata([], 70)
    const errors: any[] = []
    const warnings: string[] = []

    try {
      // Validate syntax
      const validation = await this.validateSyntax(code, 'javascript')
      if (!validation.isValid) {
        return {
          success: false,
          metadata,
          errors: validation.errors.map((e) => ({
            message: e.message,
            code: 'SYNTAX_ERROR',
            suggestions: [],
            severity: 'error' as const,
          })),
          warnings: validation.warnings,
        }
      }

      // Create backup
      const backupId = this.createBackup(code)

      try {
        // Parse code
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
        })

        let hasTransformations = false
        const transformedComponents: string[] = []

        // First pass: collect classes to transform
        const classesToTransform: Array<{
          path: NodePath<t.ClassDeclaration | t.ClassExpression>
          node: t.ClassDeclaration | t.ClassExpression
          name: string
        }> = []

        traverse(ast, {
          ClassDeclaration: (path: NodePath<t.ClassDeclaration>) => {
            const node = path.node
            if (!node.superClass) return
            
            // Check if extends React.Component or Component
            const isReactClass = 
              (t.isMemberExpression(node.superClass) &&
                t.isIdentifier(node.superClass.object, { name: 'React' }) &&
                t.isIdentifier(node.superClass.property) &&
                (node.superClass.property.name === 'Component' || 
                 node.superClass.property.name === 'PureComponent')) ||
              (t.isIdentifier(node.superClass) &&
                (node.superClass.name === 'Component' || 
                 node.superClass.name === 'PureComponent'))
            
            if (isReactClass) {
              classesToTransform.push({
                path,
                node,
                name: getComponentName(node)
              })
            }
          },
          ClassExpression: (path: NodePath<t.ClassExpression>) => {
            const node = path.node
            if (!node.superClass) return
            
            // Check if extends React.Component or Component
            const isReactClass = 
              (t.isMemberExpression(node.superClass) &&
                t.isIdentifier(node.superClass.object, { name: 'React' }) &&
                t.isIdentifier(node.superClass.property) &&
                (node.superClass.property.name === 'Component' || 
                 node.superClass.property.name === 'PureComponent')) ||
              (t.isIdentifier(node.superClass) &&
                (node.superClass.name === 'Component' || 
                 node.superClass.name === 'PureComponent'))
            
            if (isReactClass) {
              classesToTransform.push({
                path,
                node,
                name: 'AnonymousComponent'
              })
            }
          },
        })

        // Second pass: transform collected classes
        for (const { path, node, name } of classesToTransform) {
          try {
            const functionComponent = this.convertToFunction(node, warnings)
            
            // Replace directly in parent's body array to avoid scope issues
            const parent = path.parent
            if (t.isProgram(parent) || t.isBlockStatement(parent)) {
              const index = parent.body.indexOf(node as any)
              if (index !== -1) {
                parent.body[index] = functionComponent as any
                hasTransformations = true
                transformedComponents.push(name)
              }
            }
          } catch (error: any) {
            warnings.push(
              `Failed to convert ${name}: ${error.message}`
            )
          }
        }

        if (!hasTransformations) {
          this.cleanupBackup(backupId)
          return {
            success: true,
            code,
            metadata: {
              ...metadata,
              confidenceScore: 100,
              transformationsApplied: [],
            },
            errors: [],
            warnings: ['No React class components found to transform'],
          }
        }

        // Generate transformed code
        const output = generate(ast, {
          retainLines: false,
          comments: true,
        })

        const transformedCode = output.code

        // Generate diff
        const diff = this.generateDiff(code, transformedCode)

        // Update metadata
        metadata.linesAdded = diff.visual.filter((l) => l.type === 'added').length
        metadata.linesRemoved = diff.visual.filter((l) => l.type === 'removed').length
        metadata.transformationsApplied = transformedComponents.map(
          (name) => `Converted ${name} to functional component`
        )
        metadata.confidenceScore = 75
        metadata.requiresManualReview = warnings.length > 0

        // Calculate risk score
        const riskScore = this.calculateRiskScore({
          success: true,
          code: transformedCode,
          diff,
          metadata,
          errors: [],
          warnings,
        })
        metadata.riskScore = riskScore

        // Cleanup backup
        this.cleanupBackup(backupId)

        return {
          success: true,
          code: transformedCode,
          diff,
          metadata,
          errors: [],
          warnings,
        }
      } catch (error: any) {
        // Restore from backup on error
        await this.restoreBackup(backupId)
        throw error
      }
    } catch (error: any) {
      errors.push({
        message: error.message || 'Transformation failed',
        code: 'TRANSFORM_ERROR',
        suggestions: [
          'Ensure the code is valid React',
          'Check for unsupported patterns',
          'Review class component structure',
        ],
        severity: 'error' as const,
      })

      return {
        success: false,
        metadata,
        errors,
        warnings,
      }
    }
  }

  /**
   * Checks if a class node is a React component
   */
  isReactComponent(node: t.ClassDeclaration | t.ClassExpression): boolean {
    return isReactComponentClass(node)
  }

  /**
   * Converts a class component to a functional component
   */
  convertToFunction(
    classNode: t.ClassDeclaration | t.ClassExpression,
    collectedWarnings?: string[]
  ): t.FunctionDeclaration | t.ArrowFunctionExpression {
    const componentName = getComponentName(classNode)
    const classBody = classNode.body

    // Extract state and convert to useState
    const { stateVars, useStateDeclarations } = convertStateToHooks(classBody)
    const stateVarNames = new Set(stateVars.keys())

    // Extract props from constructor or methods
    const propVars = this.extractPropVariables(classBody)

    // Convert lifecycle methods to useEffect
    const { useEffectCalls, warnings: lifecycleWarnings } = convertLifecycleToHooks(
      classBody,
      stateVarNames,
      propVars
    )
    
    // Collect warnings if array provided
    if (collectedWarnings) {
      collectedWarnings.push(...lifecycleWarnings)
    }

    // Extract render method
    const renderMethod = classBody.body.find(
      (member): member is t.ClassMethod =>
        t.isClassMethod(member) &&
        t.isIdentifier(member.key) &&
        isRenderMethod(member.key.name)
    )

    if (!renderMethod) {
      throw new Error('No render method found')
    }

    // Extract return statement from render
    const renderBody = renderMethod.body.body
    const returnStatement = renderBody.find((stmt): stmt is t.ReturnStatement =>
      t.isReturnStatement(stmt)
    )

    if (!returnStatement || !returnStatement.argument) {
      throw new Error('No return statement in render method')
    }

    // Convert instance methods to regular functions
    const instanceMethods = this.extractInstanceMethods(classBody)

    // Replace this.state and this.props references
    const allStatements = [
      ...useStateDeclarations,
      ...instanceMethods,
      ...useEffectCalls,
    ]

    for (const stmt of allStatements) {
      replaceStateReferences(stmt, stateVars)
      replaceThisReferences([stmt], stateVarNames, propVars)
    }

    // Replace references in return statement
    const clonedReturn = t.cloneNode(returnStatement.argument, true, true)
    replaceStateReferences(clonedReturn, stateVars)
    replaceThisReferences([t.expressionStatement(clonedReturn)], stateVarNames, propVars)

    // Build function body
    const functionBody: t.Statement[] = [
      ...useStateDeclarations,
      ...instanceMethods,
      ...useEffectCalls,
      t.returnStatement(clonedReturn),
    ]

    // Create function declaration
    const propsParam = t.identifier('props')
    
    if (t.isClassDeclaration(classNode) && classNode.id) {
      return t.functionDeclaration(
        t.identifier(componentName),
        [propsParam],
        t.blockStatement(functionBody)
      )
    } else {
      return t.arrowFunctionExpression(
        [propsParam],
        t.blockStatement(functionBody)
      )
    }
  }

  /**
   * Extracts prop variables used in the component
   */
  private extractPropVariables(classBody: t.ClassBody): Set<string> {
    const propVars = new Set<string>()

    for (const member of classBody.body) {
      if (t.isClassMethod(member)) {
        const checkNode = (node: any): void => {
          if (t.isMemberExpression(node)) {
            // Look for this.props.x
            if (
              t.isMemberExpression(node.object) &&
              t.isThisExpression(node.object.object) &&
              t.isIdentifier(node.object.property, { name: 'props' }) &&
              t.isIdentifier(node.property)
            ) {
              propVars.add(node.property.name)
            }
          }
          
          // Recurse through children
          for (const key in node) {
            const child = node[key]
            if (child && typeof child === 'object') {
              if (Array.isArray(child)) {
                child.forEach(checkNode)
              } else if (child.type) {
                checkNode(child)
              }
            }
          }
        }
        
        checkNode(member)
      }
    }

    return propVars
  }

  /**
   * Extracts instance methods (non-lifecycle, non-render)
   */
  private extractInstanceMethods(classBody: t.ClassBody): t.VariableDeclaration[] {
    const methods: t.VariableDeclaration[] = []

    for (const member of classBody.body) {
      if (
        t.isClassMethod(member) &&
        t.isIdentifier(member.key) &&
        !isLifecycleMethod(member.key.name) &&
        !isRenderMethod(member.key.name) &&
        member.kind === 'method'
      ) {
        const methodName = member.key.name
        const params = member.params.filter((p): p is t.Identifier | t.Pattern | t.RestElement => 
          t.isIdentifier(p) || t.isPattern(p) || t.isRestElement(p)
        )
        const body = member.body

        // Convert to arrow function
        const arrowFn = t.arrowFunctionExpression(params, body)

        methods.push(
          t.variableDeclaration('const', [
            t.variableDeclarator(t.identifier(methodName), arrowFn),
          ])
        )
      }
    }

    return methods
  }
}
