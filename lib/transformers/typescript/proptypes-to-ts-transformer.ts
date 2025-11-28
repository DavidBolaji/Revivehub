/**
 * PropTypesToTSTransformer - Converts React PropTypes to TypeScript interfaces
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

interface PropTypeDefinition {
  name: string
  type: string
  required: boolean
  shape?: Record<string, PropTypeDefinition>
  arrayOf?: string
}

export class PropTypesToTSTransformer extends BaseTransformer {
  constructor() {
    super('PropTypesToTSTransformer', ['component'], ['React'])
  }

  async transform(
    code: string,
    _options: TransformOptions,
    _task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata([], 80)
    const errors: any[] = []
    const warnings: string[] = []

    try {
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

      const backupId = this.createBackup(code)


      try {
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
        })

        let hasTransformations = false
        const transformedComponents: string[] = []
        const propTypesImportPaths: NodePath<t.ImportDeclaration>[] = []

        const propTypesMap = new Map<string, {
          props: Record<string, PropTypeDefinition>
          assignmentPath: NodePath<t.ExpressionStatement>
          componentPath?: NodePath<any>
        }>()

        const self = this
        
        traverse(ast, {
          ExpressionStatement(path: NodePath<t.ExpressionStatement>) {
            const expr = path.node.expression
            
            if (
              t.isAssignmentExpression(expr) &&
              t.isMemberExpression(expr.left) &&
              t.isIdentifier(expr.left.object) &&
              t.isIdentifier(expr.left.property, { name: 'propTypes' })
            ) {
              if (t.isObjectExpression(expr.right)) {
                const componentName = expr.left.object.name
                const props = self.extractPropTypes(expr.right)
                
                propTypesMap.set(componentName, {
                  props,
                  assignmentPath: path,
                })
              }
            }
          },
          
          ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
            if (path.node.source.value === 'prop-types') {
              propTypesImportPaths.push(path)
            }
          },
        })

        traverse(ast, {
          FunctionDeclaration(path: NodePath<t.FunctionDeclaration>) {
            if (!path.node.id) return
            
            const componentName = path.node.id.name
            const propTypesInfo = propTypesMap.get(componentName)
            
            if (propTypesInfo) {
              propTypesInfo.componentPath = path
            }
          },
          
          VariableDeclarator(path: NodePath<t.VariableDeclarator>) {
            if (!t.isIdentifier(path.node.id)) return
            
            const componentName = path.node.id.name
            const propTypesInfo = propTypesMap.get(componentName)
            
            if (propTypesInfo) {
              let statementPath: NodePath<any> | null = path.parentPath
              while (statementPath && !t.isStatement(statementPath.node)) {
                statementPath = statementPath.parentPath
              }
              if (statementPath) {
                propTypesInfo.componentPath = statementPath
              }
            }
          },
        })


        for (const [componentName, info] of propTypesMap) {
          try {
            const interfaceDecl = this.generateInterface(componentName, info.props)
            
            if (info.componentPath) {
              info.componentPath.insertBefore(interfaceDecl)
              this.addPropsTypeAnnotation(info.componentPath, componentName)
              hasTransformations = true
              transformedComponents.push(componentName)
            }
            
            info.assignmentPath.remove()
          } catch (error: any) {
            warnings.push(
              `Failed to convert PropTypes for ${componentName}: ${error.message}`
            )
          }
        }

        for (const importPath of propTypesImportPaths) {
          importPath.remove()
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
            warnings: ['No PropTypes definitions found to transform'],
          }
        }

        const output = generate(ast, {
          retainLines: false,
          comments: true,
        })

        const transformedCode = output.code
        const diff = this.generateDiff(code, transformedCode)

        metadata.linesAdded = diff.visual.filter((l) => l.type === 'added').length
        metadata.linesRemoved = diff.visual.filter((l) => l.type === 'removed').length
        metadata.transformationsApplied = transformedComponents.map(
          (name) => `Converted PropTypes to TypeScript interface for ${name}`
        )
        metadata.confidenceScore = 85
        metadata.requiresManualReview = warnings.length > 0

        const riskScore = this.calculateRiskScore({
          success: true,
          code: transformedCode,
          diff,
          metadata,
          errors: [],
          warnings,
        })
        metadata.riskScore = riskScore

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
        await this.restoreBackup(backupId)
        throw error
      }
    } catch (error: any) {
      errors.push({
        message: error.message || 'Transformation failed',
        code: 'TRANSFORM_ERROR',
        suggestions: [
          'Ensure the code is valid React',
          'Check PropTypes definitions are properly formatted',
          'Verify component declarations are standard',
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


  private extractPropTypes(
    objectExpr: t.ObjectExpression
  ): Record<string, PropTypeDefinition> {
    const props: Record<string, PropTypeDefinition> = {}

    for (const prop of objectExpr.properties) {
      if (
        t.isObjectProperty(prop) &&
        t.isIdentifier(prop.key) &&
        !prop.computed
      ) {
        const propName = prop.key.name
        const propDef = this.parsePropType(prop.value)
        
        if (propDef) {
          props[propName] = propDef
        }
      }
    }

    return props
  }

  private parsePropType(node: t.Node): PropTypeDefinition | null {
    let required = false
    let currentNode: t.Node = node

    if (
      t.isMemberExpression(currentNode) &&
      t.isIdentifier(currentNode.property, { name: 'isRequired' })
    ) {
      required = true
      currentNode = currentNode.object
    }

    if (t.isMemberExpression(currentNode) || t.isCallExpression(currentNode)) {
      const propType = this.getPropTypeFromMemberExpression(currentNode)
      
      if (propType) {
        return {
          name: '',
          type: propType.type,
          required,
          shape: propType.shape,
          arrayOf: propType.arrayOf,
        }
      }
    }

    return null
  }

  private getPropTypeFromMemberExpression(
    node: t.MemberExpression | t.CallExpression
  ): { type: string; shape?: Record<string, PropTypeDefinition>; arrayOf?: string } | null {
    if (t.isCallExpression(node)) {
      if (
        t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.property, { name: 'shape' }) &&
        node.arguments.length > 0 &&
        t.isObjectExpression(node.arguments[0])
      ) {
        const shape = this.extractPropTypes(node.arguments[0])
        return { type: 'object', shape }
      }

      if (
        t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.property, { name: 'arrayOf' }) &&
        node.arguments.length > 0
      ) {
        const arrayType = this.parsePropType(node.arguments[0])
        return { type: 'array', arrayOf: arrayType?.type || 'any' }
      }
    }

    if (t.isMemberExpression(node) && t.isIdentifier(node.property)) {
      const propTypeName = node.property.name
      const tsType = this.mapPropTypeToTS(propTypeName)
      
      if (tsType) {
        return { type: tsType }
      }
    }

    return null
  }

  private mapPropTypeToTS(propTypeName: string): string | null {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      bool: 'boolean',
      array: 'any[]',
      object: 'object',
      func: 'Function',
      node: 'React.ReactNode',
      element: 'React.ReactElement',
      any: 'any',
      symbol: 'symbol',
    }

    return typeMap[propTypeName] || null
  }


  private generateInterface(
    componentName: string,
    props: Record<string, PropTypeDefinition>
  ): t.TSInterfaceDeclaration {
    const interfaceName = `${componentName}Props`
    const properties: t.TSPropertySignature[] = []

    for (const [propName, propDef] of Object.entries(props)) {
      const typeAnnotation = this.generateTypeAnnotation(propDef)
      
      const property = t.tsPropertySignature(
        t.identifier(propName),
        t.tsTypeAnnotation(typeAnnotation)
      )
      
      property.optional = !propDef.required

      properties.push(property)
    }

    return t.tsInterfaceDeclaration(
      t.identifier(interfaceName),
      null,
      null,
      t.tsInterfaceBody(properties)
    )
  }

  private generateTypeAnnotation(propDef: PropTypeDefinition): t.TSType {
    if (propDef.shape) {
      const members: t.TSPropertySignature[] = []
      
      for (const [key, value] of Object.entries(propDef.shape)) {
        const typeAnnotation = this.generateTypeAnnotation(value)
        const property = t.tsPropertySignature(
          t.identifier(key),
          t.tsTypeAnnotation(typeAnnotation)
        )
        property.optional = !value.required
        members.push(property)
      }
      
      return t.tsTypeLiteral(members)
    }

    if (propDef.arrayOf) {
      const elementType = this.stringToTSType(propDef.arrayOf)
      return t.tsArrayType(elementType)
    }

    return this.stringToTSType(propDef.type)
  }

  private stringToTSType(typeStr: string): t.TSType {
    switch (typeStr) {
      case 'string':
        return t.tsStringKeyword()
      case 'number':
        return t.tsNumberKeyword()
      case 'boolean':
        return t.tsBooleanKeyword()
      case 'any':
        return t.tsAnyKeyword()
      case 'object':
        return t.tsObjectKeyword()
      case 'symbol':
        return t.tsSymbolKeyword()
      case 'Function':
        return t.tsTypeReference(t.identifier('Function'))
      case 'array':
      case 'any[]':
        return t.tsArrayType(t.tsAnyKeyword())
      default:
        if (typeStr.startsWith('React.')) {
          const parts = typeStr.split('.')
          return t.tsTypeReference(
            t.tsQualifiedName(
              t.identifier(parts[0]),
              t.identifier(parts[1])
            )
          )
        }
        return t.tsAnyKeyword()
    }
  }


  private addPropsTypeAnnotation(
    componentPath: NodePath<any>,
    componentName: string
  ): void {
    const interfaceName = `${componentName}Props`

    if (componentPath.isFunctionDeclaration()) {
      const funcNode = componentPath.node as t.FunctionDeclaration
      
      if (funcNode.params.length > 0) {
        const propsParam = funcNode.params[0]
        
        if (t.isIdentifier(propsParam)) {
          propsParam.typeAnnotation = t.tsTypeAnnotation(
            t.tsTypeReference(t.identifier(interfaceName))
          )
        } else if (t.isObjectPattern(propsParam)) {
          propsParam.typeAnnotation = t.tsTypeAnnotation(
            t.tsTypeReference(t.identifier(interfaceName))
          )
        }
      }
    }

    if (componentPath.isVariableDeclaration()) {
      const varDecl = componentPath.node as t.VariableDeclaration
      
      for (const declarator of varDecl.declarations) {
        if (
          t.isArrowFunctionExpression(declarator.init) ||
          t.isFunctionExpression(declarator.init)
        ) {
          const funcNode = declarator.init
          
          if (funcNode.params.length > 0) {
            const propsParam = funcNode.params[0]
            
            if (t.isIdentifier(propsParam)) {
              propsParam.typeAnnotation = t.tsTypeAnnotation(
                t.tsTypeReference(t.identifier(interfaceName))
              )
            } else if (t.isObjectPattern(propsParam)) {
              propsParam.typeAnnotation = t.tsTypeAnnotation(
                t.tsTypeReference(t.identifier(interfaceName))
              )
            }
          }
        }
      }
    }
  }
}
