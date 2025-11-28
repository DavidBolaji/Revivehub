import type { TransformationRule } from '@/types'

export const javascriptPatterns: TransformationRule[] = [
  {
    id: 'js-var-to-const',
    name: 'Replace var with const/let',
    pattern: /\bvar\s+/g,
    replacement: 'const ',
    language: 'javascript',
    category: 'es6-modernization',
  },
  {
    id: 'js-require-to-import',
    name: 'Convert require to import',
    pattern: /const\s+(\w+)\s*=\s*require\(['"](.+?)['"]\)/g,
    replacement: "import $1 from '$2'",
    language: 'javascript',
    category: 'es6-modernization',
  },
  {
    id: 'js-callback-to-promise',
    name: 'Suggest Promise over callbacks',
    pattern: /function\s+\w+\([^)]*,\s*callback\s*\)/g,
    replacement: '// Consider using Promise or async/await',
    language: 'javascript',
    category: 'async-modernization',
  },
  {
    id: 'js-string-concat-to-template',
    name: 'String concatenation to template literals',
    pattern: /(['"])(.+?)\1\s*\+\s*(\w+)\s*\+\s*(['"])(.+?)\4/g,
    replacement: '`$2${$3}$5`',
    language: 'javascript',
    category: 'es6-modernization',
  },
]

export const deprecatedAPIs = [
  'String.prototype.substr',
  'Array.prototype.indexOf',
  'document.write',
  'escape',
  'unescape',
]
