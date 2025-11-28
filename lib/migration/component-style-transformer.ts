/**
 * ComponentStyleTransformer
 *
 * Transforms component styles from CSS classes to Tailwind.
 * Handles className attributes and inline styles.
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import generate from '@babel/generator'

export class ComponentStyleTransformer {
  private cssToTailwind: Map<string, string[]>

  constructor(cssToTailwindMap: Map<string, string[]>) {
    this.cssToTailwind = cssToTailwindMap
  }

  /**
   * Transform component code to use Tailwind classes
   */
  async transformComponent(code: string): Promise<{
    code: string
    transformedClasses: number
    unmappedClasses: string[]
  }> {
    const unmappedClasses: string[] = []
    let transformedClasses = 0

    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      })

      traverse(ast, {
        JSXAttribute: (path) => {
          if (
            t.isJSXIdentifier(path.node.name) &&
            path.node.name.name === 'className'
          ) {
            const value = path.node.value

            if (t.isStringLiteral(value)) {
              const originalClasses = value.value.split(/\s+/)
              const tailwindClasses: string[] = []

              for (const cssClass of originalClasses) {
                const mapped = this.cssToTailwind.get(cssClass)
                if (mapped) {
                  tailwindClasses.push(...mapped)
                  transformedClasses++
                } else {
                  tailwindClasses.push(cssClass)
                  if (cssClass) unmappedClasses.push(cssClass)
                }
              }

              path.node.value = t.stringLiteral(tailwindClasses.join(' '))
            }
          }
        },
      })

      const output = generate(ast, {
        retainLines: true,
        comments: true,
      })

      return {
        code: output.code,
        transformedClasses,
        unmappedClasses: Array.from(new Set(unmappedClasses)),
      }
    } catch (error) {
      console.error('Component transformation error:', error)
      throw error
    }
  }

  /**
   * Remove CSS imports from code
   */
  removeCSSImports(code: string): string {
    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
      })

      traverse(ast, {
        ImportDeclaration: (path) => {
          const source = path.node.source.value
          if (/\.(css|scss|sass|less)$/.test(source)) {
            path.remove()
          }
        },
      })

      const output = generate(ast, {
        retainLines: true,
        comments: true,
      })

      return output.code
    } catch (error) {
      console.error('Error removing CSS imports:', error)
      return code
    }
  }
}
