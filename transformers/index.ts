import type { TransformationRule } from '@/types'

export class CodeTransformer {
  private rules: TransformationRule[] = []

  addRule(rule: TransformationRule): void {
    this.rules.push(rule)
  }

  transform(code: string, language: string): string {
    let transformedCode = code

    const applicableRules = this.rules.filter((rule) => rule.language === language)

    for (const rule of applicableRules) {
      if (typeof rule.pattern === 'string') {
        transformedCode = transformedCode.replace(
          new RegExp(rule.pattern, 'g'),
          rule.replacement
        )
      } else {
        transformedCode = transformedCode.replace(rule.pattern, rule.replacement)
      }
    }

    return transformedCode
  }

  getApplicableRules(language: string): TransformationRule[] {
    return this.rules.filter((rule) => rule.language === language)
  }
}

// Example transformation rules
export const defaultRules: TransformationRule[] = [
  {
    id: 'js-var-to-const',
    name: 'Replace var with const/let',
    pattern: /\bvar\s+/g,
    replacement: 'const ',
    language: 'javascript',
    category: 'modernization',
  },
  {
    id: 'js-function-to-arrow',
    name: 'Convert function to arrow function',
    pattern: /function\s+(\w+)\s*\((.*?)\)\s*{/g,
    replacement: 'const $1 = ($2) => {',
    language: 'javascript',
    category: 'modernization',
  },
]
