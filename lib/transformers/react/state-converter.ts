/**
 * State Converter for React Class to Hooks Transformation
 * 
 * Converts class component state to useState hooks
 */

import * as t from '@babel/types'
import { createUseStateCall, extractStateFromConstructor } from './ast-helpers'

export interface StateConversion {
  stateVars: Map<string, t.Expression>
  useStateDeclarations: t.VariableDeclaration[]
}

/**
 * Converts class component state to useState hooks
 */
export function convertStateToHooks(
  classBody: t.ClassBody
): StateConversion {
  const stateVars = new Map<string, t.Expression>()
  const useStateDeclarations: t.VariableDeclaration[] = []

  // Find constructor and extract state
  const constructor = classBody.body.find(
    (member): member is t.ClassMethod =>
      t.isClassMethod(member) &&
      member.kind === 'constructor'
  )

  if (constructor) {
    const stateObject = extractStateFromConstructor(constructor)
    
    if (stateObject) {
      // Convert each state property to useState
      for (const prop of stateObject.properties) {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          const stateName = prop.key.name
          const initialValue = prop.value as t.Expression
          
          stateVars.set(stateName, initialValue)
          useStateDeclarations.push(
            createUseStateCall(stateName, initialValue)
          )
        }
      }
    }
  }

  // Also check for class property state initialization
  for (const member of classBody.body) {
    if (
      t.isClassProperty(member) &&
      !member.static &&
      t.isIdentifier(member.key, { name: 'state' }) &&
      t.isObjectExpression(member.value)
    ) {
      for (const prop of member.value.properties) {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
          const stateName = prop.key.name
          const initialValue = prop.value as t.Expression
          
          if (!stateVars.has(stateName)) {
            stateVars.set(stateName, initialValue)
            useStateDeclarations.push(
              createUseStateCall(stateName, initialValue)
            )
          }
        }
      }
    }
  }

  return { stateVars, useStateDeclarations }
}

/**
 * Replaces this.state references with direct variable references
 */
export function replaceStateReferences(
  node: t.Node,
  stateVars: Map<string, t.Expression>
): void {
  // Manual traversal and replacement
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
    } else if (t.isCallExpression(current)) {
      // Replace this.setState({ x: value }) with setX(value)
      if (
        t.isMemberExpression(current.callee) &&
        t.isThisExpression(current.callee.object) &&
        t.isIdentifier(current.callee.property, { name: 'setState' })
      ) {
        const arg = current.arguments[0]
        
        if (t.isObjectExpression(arg) && arg.properties.length === 1) {
          const prop = arg.properties[0]
          if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
            const stateName = prop.key.name
            if (stateVars.has(stateName)) {
              const setterName = `set${capitalize(stateName)}`
              return t.callExpression(t.identifier(setterName), [
                prop.value as t.Expression,
              ])
            }
          }
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
  
  replaceInNode(node)
}

/**
 * Capitalizes the first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
