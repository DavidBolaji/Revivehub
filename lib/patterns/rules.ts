/**
 * Pattern Detection Rules Database
 * Central registry for all pattern detection rules
 */

export interface PatternRule {
  id: string
  name: string
  category: 'modernization' | 'security' | 'performance' | 'style'
  language: string
  framework?: string
  detector: RegExp | ((code: string) => boolean)
  description: string
  problem: string
  solution: string
  example: {
    before: string
    after: string
  }
  autoFixable: boolean
  complexity: 'low' | 'medium' | 'high'
  estimatedTime: string
  benefits: string[]
  breakingChanges: string[]
  tags: string[]
}

export interface PatternCategory {
  id: string
  name: string
  description: string
}

export const PATTERN_CATEGORIES: PatternCategory[] = [
  {
    id: 'modernization',
    name: 'Modernization',
    description: 'Upgrade to modern syntax and patterns',
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Fix security vulnerabilities and improve security posture',
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Optimize code for better performance',
  },
  {
    id: 'style',
    name: 'Code Style',
    description: 'Improve code consistency and readability',
  },
]

/**
 * Get all pattern rules
 */
export function getAllPatternRules(): PatternRule[] {
  // Import patterns from other files
  const { REACT_PATTERNS } = require('./react-patterns')
  const { NEXTJS_PATTERNS } = require('./nextjs-patterns')
  const { VUE_PATTERNS } = require('./vue-patterns')
  const { PYTHON_PATTERNS } = require('./python-patterns')
  
  return [
    ...getJavaScriptPatterns(),
    ...getTypeScriptPatterns(),
    ...REACT_PATTERNS,
    ...NEXTJS_PATTERNS,
    ...VUE_PATTERNS,
    ...PYTHON_PATTERNS,
  ]
}

/**
 * Get pattern rules by language
 */
export function getPatternsByLanguage(language: string): PatternRule[] {
  return getAllPatternRules().filter((rule) => rule.language === language)
}

/**
 * Get pattern rules by framework
 */
export function getPatternsByFramework(framework: string): PatternRule[] {
  return getAllPatternRules().filter((rule) => rule.framework === framework)
}

/**
 * Get pattern rules by category
 */
export function getPatternsByCategory(category: string): PatternRule[] {
  return getAllPatternRules().filter((rule) => rule.category === category)
}

/**
 * Detect patterns in code
 */
export function detectPatterns(code: string, language: string): PatternRule[] {
  const rules = getPatternsByLanguage(language)
  const detected: PatternRule[] = []

  for (const rule of rules) {
    if (rule.detector instanceof RegExp) {
      if (rule.detector.test(code)) {
        detected.push(rule)
      }
    } else if (typeof rule.detector === 'function') {
      if (rule.detector(code)) {
        detected.push(rule)
      }
    }
  }

  return detected
}

// Base JavaScript/TypeScript patterns
function getJavaScriptPatterns(): PatternRule[] {
  return [
    {
      id: 'js-var-to-const-let',
      name: 'var to const/let',
      category: 'modernization',
      language: 'javascript',
      detector: /\bvar\s+/,
      description: 'Replace var declarations with const or let',
      problem: 'var has function scope and can lead to unexpected behavior',
      solution: 'Use const for values that don\'t change, let for values that do',
      example: {
        before: 'var count = 0;\nvar name = "John";',
        after: 'let count = 0;\nconst name = "John";',
      },
      autoFixable: true,
      complexity: 'low',
      estimatedTime: '5 minutes',
      benefits: [
        'Block scoping prevents variable leaking',
        'const prevents accidental reassignment',
        'More predictable code behavior',
      ],
      breakingChanges: [
        'Variables are now block-scoped instead of function-scoped',
      ],
      tags: ['es6', 'variables', 'scope'],
    },
    {
      id: 'js-callback-to-async-await',
      name: 'Callbacks to async/await',
      category: 'modernization',
      language: 'javascript',
      detector: (code) => {
        return /function\s*\([^)]*\)\s*{[\s\S]*?callback\s*\(/.test(code) ||
               /\.then\s*\(/.test(code)
      },
      description: 'Convert callback-based or promise chains to async/await',
      problem: 'Callback hell and promise chains are harder to read and maintain',
      solution: 'Use async/await for cleaner asynchronous code',
      example: {
        before: `function fetchData(callback) {
  fetch('/api/data')
    .then(res => res.json())
    .then(data => callback(null, data))
    .catch(err => callback(err));
}`,
        after: `async function fetchData() {
  const res = await fetch('/api/data');
  return await res.json();
}`,
      },
      autoFixable: false,
      complexity: 'medium',
      estimatedTime: '15-30 minutes',
      benefits: [
        'More readable asynchronous code',
        'Better error handling with try/catch',
        'Easier to debug',
      ],
      breakingChanges: [
        'Function now returns a Promise',
        'Error handling changes from callbacks to try/catch',
      ],
      tags: ['async', 'promises', 'callbacks'],
    },
    {
      id: 'js-arrow-functions',
      name: 'Function expressions to arrow functions',
      category: 'modernization',
      language: 'javascript',
      detector: /function\s*\([^)]*\)\s*{[^}]*}/,
      description: 'Replace function expressions with arrow functions',
      problem: 'Function expressions are verbose and have different this binding',
      solution: 'Use arrow functions for concise syntax and lexical this',
      example: {
        before: 'const double = function(x) { return x * 2; };',
        after: 'const double = (x) => x * 2;',
      },
      autoFixable: true,
      complexity: 'low',
      estimatedTime: '5 minutes',
      benefits: [
        'More concise syntax',
        'Lexical this binding',
        'Implicit return for single expressions',
      ],
      breakingChanges: [
        'Different this binding',
        'No arguments object',
      ],
      tags: ['es6', 'arrow-functions', 'functions'],
    },
    {
      id: 'js-template-literals',
      name: 'String concatenation to template literals',
      category: 'style',
      language: 'javascript',
      detector: /['"].*['"]\s*\+\s*\w+\s*\+\s*['"]/,
      description: 'Replace string concatenation with template literals',
      problem: 'String concatenation is verbose and error-prone',
      solution: 'Use template literals for cleaner string interpolation',
      example: {
        before: 'const message = "Hello, " + name + "! You have " + count + " messages.";',
        after: 'const message = `Hello, ${name}! You have ${count} messages.`;',
      },
      autoFixable: true,
      complexity: 'low',
      estimatedTime: '5 minutes',
      benefits: [
        'More readable',
        'Multi-line strings',
        'Expression interpolation',
      ],
      breakingChanges: [],
      tags: ['es6', 'template-literals', 'strings'],
    },
    {
      id: 'js-destructuring',
      name: 'Property access to destructuring',
      category: 'style',
      language: 'javascript',
      detector: (code) => {
        return /const\s+\w+\s*=\s*\w+\.\w+;\s*const\s+\w+\s*=\s*\w+\.\w+/.test(code)
      },
      description: 'Use destructuring for multiple property access',
      problem: 'Repeated property access is verbose',
      solution: 'Use object destructuring for cleaner code',
      example: {
        before: 'const name = user.name;\nconst age = user.age;\nconst email = user.email;',
        after: 'const { name, age, email } = user;',
      },
      autoFixable: true,
      complexity: 'low',
      estimatedTime: '5 minutes',
      benefits: [
        'More concise',
        'Clearer intent',
        'Default values support',
      ],
      breakingChanges: [],
      tags: ['es6', 'destructuring', 'objects'],
    },
    {
      id: 'js-spread-operator',
      name: 'Object.assign to spread operator',
      category: 'modernization',
      language: 'javascript',
      detector: /Object\.assign\s*\(/,
      description: 'Replace Object.assign with spread operator',
      problem: 'Object.assign is verbose and less intuitive',
      solution: 'Use spread operator for cleaner object merging',
      example: {
        before: 'const merged = Object.assign({}, defaults, options);',
        after: 'const merged = { ...defaults, ...options };',
      },
      autoFixable: true,
      complexity: 'low',
      estimatedTime: '5 minutes',
      benefits: [
        'More concise syntax',
        'More intuitive',
        'Better readability',
      ],
      breakingChanges: [],
      tags: ['es6', 'spread-operator', 'objects'],
    },
    {
      id: 'js-optional-chaining',
      name: 'Nested checks to optional chaining',
      category: 'modernization',
      language: 'javascript',
      detector: /\w+\s*&&\s*\w+\.\w+\s*&&\s*\w+\.\w+\.\w+/,
      description: 'Replace nested property checks with optional chaining',
      problem: 'Nested checks are verbose and error-prone',
      solution: 'Use optional chaining (?.) for safer property access',
      example: {
        before: 'const city = user && user.address && user.address.city;',
        after: 'const city = user?.address?.city;',
      },
      autoFixable: true,
      complexity: 'low',
      estimatedTime: '5 minutes',
      benefits: [
        'More concise',
        'Safer property access',
        'Better readability',
      ],
      breakingChanges: [],
      tags: ['es2020', 'optional-chaining', 'safety'],
    },
    {
      id: 'js-nullish-coalescing',
      name: 'OR operator to nullish coalescing',
      category: 'security',
      language: 'javascript',
      detector: /\|\|\s*['"\d]/,
      description: 'Replace || with ?? for default values',
      problem: '|| treats 0, false, "" as falsy, which may not be intended',
      solution: 'Use ?? to only check for null/undefined',
      example: {
        before: 'const count = value || 0;  // Treats 0 as falsy!',
        after: 'const count = value ?? 0;  // Only null/undefined',
      },
      autoFixable: false,
      complexity: 'low',
      estimatedTime: '10 minutes',
      benefits: [
        'More precise null checking',
        'Preserves falsy values like 0, false, ""',
        'Clearer intent',
      ],
      breakingChanges: [
        'Different behavior for falsy values',
      ],
      tags: ['es2020', 'nullish-coalescing', 'operators'],
    },
  ]
}

function getTypeScriptPatterns(): PatternRule[] {
  return [
    {
      id: 'ts-any-to-unknown',
      name: 'any to unknown',
      category: 'security',
      language: 'typescript',
      detector: /:\s*any\b/,
      description: 'Replace any type with unknown for better type safety',
      problem: 'any disables type checking and can hide bugs',
      solution: 'Use unknown and add type guards',
      example: {
        before: 'function process(data: any) {\n  return data.value;\n}',
        after: 'function process(data: unknown) {\n  if (typeof data === "object" && data !== null && "value" in data) {\n    return (data as { value: unknown }).value;\n  }\n}',
      },
      autoFixable: false,
      complexity: 'medium',
      estimatedTime: '10-20 minutes',
      benefits: [
        'Enforces type checking',
        'Catches potential runtime errors',
        'Better IDE support',
      ],
      breakingChanges: [
        'Requires type guards before accessing properties',
      ],
      tags: ['typescript', 'type-safety', 'any'],
    },
    {
      id: 'ts-interface-to-type',
      name: 'Interface to Type for unions',
      category: 'style',
      language: 'typescript',
      detector: /interface\s+\w+\s*{/,
      description: 'Use type alias for union types and complex types',
      problem: 'Interfaces cannot represent unions or mapped types',
      solution: 'Use type alias for more flexibility',
      example: {
        before: 'interface Status {\n  value: "active" | "inactive";\n}',
        after: 'type Status = "active" | "inactive";',
      },
      autoFixable: false,
      complexity: 'low',
      estimatedTime: '5 minutes',
      benefits: [
        'More flexible type definitions',
        'Can represent unions and intersections',
        'Better for mapped types',
      ],
      breakingChanges: [
        'Cannot be extended with extends keyword',
      ],
      tags: ['typescript', 'types', 'interfaces'],
    },
    {
      id: 'ts-enum-to-const',
      name: 'Enum to const object',
      category: 'performance',
      language: 'typescript',
      detector: /enum\s+\w+\s*{/,
      description: 'Replace enums with const objects for better tree-shaking',
      problem: 'Enums generate runtime code and cannot be tree-shaken',
      solution: 'Use const objects with as const assertion',
      example: {
        before: 'enum Status {\n  Active = "active",\n  Inactive = "inactive"\n}',
        after: 'const Status = {\n  Active: "active",\n  Inactive: "inactive"\n} as const;\n\ntype Status = typeof Status[keyof typeof Status];',
      },
      autoFixable: false,
      complexity: 'medium',
      estimatedTime: '15 minutes',
      benefits: [
        'Better tree-shaking',
        'No runtime code',
        'Smaller bundle size',
      ],
      breakingChanges: [
        'Different access pattern',
        'No reverse mapping',
      ],
      tags: ['typescript', 'enums', 'performance', 'tree-shaking'],
    },
    {
      id: 'ts-namespace-to-module',
      name: 'Namespace to ES modules',
      category: 'modernization',
      language: 'typescript',
      detector: /namespace\s+\w+/,
      description: 'Replace TypeScript namespaces with ES modules',
      problem: 'Namespaces are legacy and not standard JavaScript',
      solution: 'Use ES module imports/exports',
      example: {
        before: 'namespace Utils {\n  export function format(s: string) { return s; }\n}',
        after: '// utils.ts\nexport function format(s: string) { return s; }\n\n// usage\nimport { format } from "./utils";',
      },
      autoFixable: false,
      complexity: 'medium',
      estimatedTime: '20-30 minutes',
      benefits: [
        'Standard JavaScript modules',
        'Better tree-shaking',
        'Better tooling support',
      ],
      breakingChanges: [
        'File structure changes',
        'Import statements needed',
      ],
      tags: ['typescript', 'namespaces', 'modules', 'es6'],
    },
  ]
}
