/**
 * AST Helper Utilities for React Transformations
 * 
 * Provides utility functions for working with Babel AST nodes
 * in React component transformations.
 */

import * as t from '@babel/types'

/**
 * Checks if a node is a React component class
 */
export function isReactComponentClass(node: t.Node): boolean {
  if (!t.isClassDeclaration(node) && !t.isClassExpression(node)) {
    return false
  }

  const superClass = node.superClass

  // Check for React.Component or React.PureComponent
  if (t.isMemberExpression(superClass)) {
    return (
      t.isIdentifier(superClass.object, { name: 'React' }) &&
      t.isIdentifier(superClass.property) &&
      (superClass.property.name === 'Component' ||
        superClass.property.name === 'PureComponent')
    )
  }

  // Check for Component or PureComponent (imported)
  if (t.isIdentifier(superClass)) {
    return (
      superClass.name === 'Component' || superClass.name === 'PureComponent'
    )
  }

  return false
}

/**
 * Extracts the component name from a class declaration
 */
export function getComponentName(
  node: t.ClassDeclaration | t.ClassExpression
): string {
  if (t.isClassDeclaration(node) && node.id) {
    return node.id.name
  }
  return 'Component'
}

/**
 * Checks if a class method is a lifecycle method
 */
export function isLifecycleMethod(methodName: string): boolean {
  const lifecycleMethods = [
    'componentDidMount',
    'componentDidUpdate',
    'componentWillUnmount',
    'shouldComponentUpdate',
    'getSnapshotBeforeUpdate',
    'componentDidCatch',
    'getDerivedStateFromProps',
    'getDerivedStateFromError',
  ]
  return lifecycleMethods.includes(methodName)
}

/**
 * Checks if a class method is a render method
 */
export function isRenderMethod(methodName: string): boolean {
  return methodName === 'render'
}

/**
 * Extracts state initialization from constructor
 */
export function extractStateFromConstructor(
  constructor: t.ClassMethod
): t.ObjectExpression | null {
  const body = constructor.body.body

  for (const statement of body) {
    // Look for this.state = { ... }
    if (
      t.isExpressionStatement(statement) &&
      t.isAssignmentExpression(statement.expression) &&
      t.isMemberExpression(statement.expression.left) &&
      t.isThisExpression(statement.expression.left.object) &&
      t.isIdentifier(statement.expression.left.property, { name: 'state' }) &&
      t.isObjectExpression(statement.expression.right)
    ) {
      return statement.expression.right
    }
  }

  return null
}

/**
 * Extracts prop types from static property
 */
export function extractPropTypes(
  classBody: t.ClassBody
): t.ObjectExpression | null {
  for (const member of classBody.body) {
    if (
      t.isClassProperty(member) &&
      member.static &&
      t.isIdentifier(member.key, { name: 'propTypes' }) &&
      t.isObjectExpression(member.value)
    ) {
      return member.value
    }
  }
  return null
}

/**
 * Extracts default props from static property
 */
export function extractDefaultProps(
  classBody: t.ClassBody
): t.ObjectExpression | null {
  for (const member of classBody.body) {
    if (
      t.isClassProperty(member) &&
      member.static &&
      t.isIdentifier(member.key, { name: 'defaultProps' }) &&
      t.isObjectExpression(member.value)
    ) {
      return member.value
    }
  }
  return null
}

/**
 * Creates a useState hook call
 */
export function createUseStateCall(
  stateName: string,
  initialValue: t.Expression
): t.VariableDeclaration {
  return t.variableDeclaration('const', [
    t.variableDeclarator(
      t.arrayPattern([
        t.identifier(stateName),
        t.identifier(`set${capitalize(stateName)}`),
      ]),
      t.callExpression(t.identifier('useState'), [initialValue])
    ),
  ])
}

/**
 * Creates a useEffect hook call
 */
export function createUseEffectCall(
  body: t.Statement[],
  dependencies: t.Expression[] = [],
  cleanup?: t.Statement[]
): t.ExpressionStatement {
  const effectBody = cleanup
    ? [
        ...body,
        t.returnStatement(
          t.arrowFunctionExpression([], t.blockStatement(cleanup))
        ),
      ]
    : body

  return t.expressionStatement(
    t.callExpression(t.identifier('useEffect'), [
      t.arrowFunctionExpression([], t.blockStatement(effectBody)),
      t.arrayExpression(dependencies),
    ])
  )
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Checks if a method uses 'this'
 */
export function methodUsesThis(method: t.ClassMethod): boolean {
  let usesThis = false

  // Simple check - traverse manually
  const checkNode = (node: any): void => {
    if (t.isThisExpression(node)) {
      usesThis = true
      return
    }
    
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
  
  checkNode(method)
  return usesThis
}

/**
 * Extracts dependencies from a method body for useEffect
 */
export function extractDependencies(
  method: t.ClassMethod,
  stateVars: Set<string>,
  propVars: Set<string>
): string[] {
  const dependencies = new Set<string>()

  // Manual traversal to extract dependencies
  const checkNode = (node: any, parent?: any): void => {
    if (t.isMemberExpression(node)) {
      // Check for this.state.x or this.props.x
      if (t.isThisExpression(node.object) && t.isIdentifier(node.property)) {
        if (node.property.name === 'state' || node.property.name === 'props') {
          // Look at parent to get actual property
          if (parent && t.isMemberExpression(parent) && t.isIdentifier(parent.property)) {
            const propName = parent.property.name
            if (node.property.name === 'state' && stateVars.has(propName)) {
              dependencies.add(propName)
            } else if (node.property.name === 'props' && propVars.has(propName)) {
              dependencies.add(propName)
            }
          }
        }
      }
    } else if (t.isIdentifier(node)) {
      // Add state and prop variables used directly
      if (stateVars.has(node.name) || propVars.has(node.name)) {
        dependencies.add(node.name)
      }
    }
    
    // Recurse through children
    for (const key in node) {
      const child = node[key]
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) {
          child.forEach((c) => checkNode(c, node))
        } else if (child.type) {
          checkNode(child, node)
        }
      }
    }
  }
  
  checkNode(method)
  return Array.from(dependencies)
}

/**
 * Replaces this.state.x with x in expressions
 */
export function replaceThisState(
  node: t.Node,
  _stateVars: Set<string>
): t.Node {
  return t.cloneNode(node, true, true)
}

/**
 * Replaces this.props.x with x in expressions
 */
export function replaceThisProps(
  node: t.Node,
  _propVars: Set<string>
): t.Node {
  return t.cloneNode(node, true, true)
}
