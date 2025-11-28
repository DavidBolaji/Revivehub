/**
 * Hook Mapper for React Lifecycle Methods
 * 
 * Maps React class lifecycle methods to appropriate hooks
 */

import * as t from '@babel/types'
import { createUseEffectCall, extractDependencies } from './ast-helpers'

export interface LifecycleConversion {
  useEffectCalls: t.ExpressionStatement[]
  warnings: string[]
}

/**
 * Converts lifecycle methods to useEffect hooks
 */
export function convertLifecycleToHooks(
  classBody: t.ClassBody,
  stateVars: Set<string>,
  propVars: Set<string>
): LifecycleConversion {
  const useEffectCalls: t.ExpressionStatement[] = []
  const warnings: string[] = []

  const lifecycleMethods = new Map<string, t.ClassMethod>()

  // Collect lifecycle methods
  for (const member of classBody.body) {
    if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
      const methodName = member.key.name
      if (isLifecycleMethod(methodName)) {
        lifecycleMethods.set(methodName, member)
      }
    }
  }

  // Convert componentDidMount
  const didMount = lifecycleMethods.get('componentDidMount')
  if (didMount) {
    const effect = convertComponentDidMount(didMount)
    if (effect) {
      useEffectCalls.push(effect)
    }
  }

  // Convert componentDidUpdate
  const didUpdate = lifecycleMethods.get('componentDidUpdate')
  if (didUpdate) {
    const effect = convertComponentDidUpdate(didUpdate, stateVars, propVars)
    if (effect) {
      useEffectCalls.push(effect)
    } else {
      warnings.push(
        'componentDidUpdate conversion may require manual review for complex dependency tracking'
      )
    }
  }

  // Convert componentWillUnmount
  const willUnmount = lifecycleMethods.get('componentWillUnmount')
  if (willUnmount) {
    // Merge with componentDidMount if it exists
    if (didMount) {
      const mountEffect = useEffectCalls[useEffectCalls.length - 1]
      addCleanupToEffect(mountEffect, willUnmount)
    } else {
      const effect = convertComponentWillUnmount(willUnmount)
      if (effect) {
        useEffectCalls.push(effect)
      }
    }
  }

  // Warn about unsupported lifecycle methods
  if (lifecycleMethods.has('shouldComponentUpdate')) {
    warnings.push(
      'shouldComponentUpdate should be replaced with React.memo or useMemo'
    )
  }

  if (lifecycleMethods.has('getSnapshotBeforeUpdate')) {
    warnings.push(
      'getSnapshotBeforeUpdate has no direct hook equivalent - requires manual conversion'
    )
  }

  if (lifecycleMethods.has('componentDidCatch')) {
    warnings.push(
      'componentDidCatch requires an Error Boundary component - cannot be converted to hooks'
    )
  }

  return { useEffectCalls, warnings }
}

/**
 * Converts componentDidMount to useEffect with empty dependency array
 */
function convertComponentDidMount(
  method: t.ClassMethod
): t.ExpressionStatement | null {
  const body = method.body.body

  if (body.length === 0) {
    return null
  }

  // Create useEffect(() => { ... }, [])
  return createUseEffectCall(body, [])
}

/**
 * Converts componentDidUpdate to useEffect with dependencies
 */
function convertComponentDidUpdate(
  method: t.ClassMethod,
  stateVars: Set<string>,
  propVars: Set<string>
): t.ExpressionStatement | null {
  const body = method.body.body

  if (body.length === 0) {
    return null
  }

  // Extract dependencies from method body
  const deps = extractDependencies(method, stateVars, propVars)
  const depExpressions = deps.map((dep) => t.identifier(dep))

  // Create useEffect(() => { ... }, [deps])
  return createUseEffectCall(body, depExpressions)
}

/**
 * Converts componentWillUnmount to useEffect cleanup
 */
function convertComponentWillUnmount(
  method: t.ClassMethod
): t.ExpressionStatement | null {
  const body = method.body.body

  if (body.length === 0) {
    return null
  }

  // Create useEffect(() => { return () => { ... } }, [])
  return createUseEffectCall([], [], body)
}

/**
 * Adds cleanup function to existing useEffect
 */
function addCleanupToEffect(
  effect: t.ExpressionStatement,
  cleanupMethod: t.ClassMethod
): void {
  const callExpr = effect.expression as t.CallExpression
  const effectFn = callExpr.arguments[0] as t.ArrowFunctionExpression
  const effectBody = effectFn.body as t.BlockStatement

  // Add return statement with cleanup function
  const cleanupBody = cleanupMethod.body.body
  effectBody.body.push(
    t.returnStatement(
      t.arrowFunctionExpression([], t.blockStatement(cleanupBody))
    )
  )
}

/**
 * Checks if a method name is a lifecycle method
 */
function isLifecycleMethod(methodName: string): boolean {
  const lifecycleMethods = [
    'componentDidMount',
    'componentDidUpdate',
    'componentWillUnmount',
    'shouldComponentUpdate',
    'getSnapshotBeforeUpdate',
    'componentDidCatch',
  ]
  return lifecycleMethods.includes(methodName)
}

/**
 * Replaces this.props and this.state references in lifecycle methods
 */
export function replaceThisReferences(
  statements: t.Statement[],
  stateVars: Set<string>,
  propVars: Set<string>
): void {
  for (const statement of statements) {
    const replaceInNode = (current: any): any => {
      if (t.isMemberExpression(current)) {
        // Replace this.state.x with x
        if (
          t.isMemberExpression(current.object) &&
          t.isThisExpression(current.object.object) &&
          t.isIdentifier(current.object.property, { name: 'state' }) &&
          t.isIdentifier(current.property)
        ) {
          const stateName = current.property.name
          if (stateVars.has(stateName)) {
            return t.identifier(stateName)
          }
        }

        // Replace this.props.x with x
        if (
          t.isMemberExpression(current.object) &&
          t.isThisExpression(current.object.object) &&
          t.isIdentifier(current.object.property, { name: 'props' }) &&
          t.isIdentifier(current.property)
        ) {
          const propName = current.property.name
          if (propVars.has(propName)) {
            return t.identifier(propName)
          }
        }
      }
      
      // Recurse through children
      for (const key in current) {
        const child = current[key]
        if (child && typeof child === 'object') {
          if (Array.isArray(child)) {
            current[key] = child.map(replaceInNode)
          } else if (child.type) {
            current[key] = replaceInNode(child)
          }
        }
      }
      
      return current
    }
    
    replaceInNode(statement)
  }
}
