// Quick test to verify FileStructureManager logic
const files = new Map([
  ['README.md', '# React App'],
  ['package.json', '{"name": "react-app"}'],
  ['src/App.js', 'import React from "react"'],
  ['src/components/Form.js', 'export const Form = () => {}'],
  ['src/components/TodoList.js', 'export const TodoList = () => {}'],
  ['src/index.css', 'body { margin: 0; }'],
  ['src/App.css', '.App { text-align: center; }'],
])

const spec = {
  source: {
    language: 'javascript',
    framework: 'React',
    version: '17.0.1',
    routing: '',
    patterns: {},
    buildTool: '',
    packageManager: 'npm',
  },
  target: {
    language: 'typescript',
    framework: 'nextjs-app',
    version: '14.x',
    routing: 'app',
    fileStructure: {
      pages: 'app',
      components: 'components',
      layouts: 'app/layouts',
      api: 'app/api',
    },
    componentConventions: {
      fileExtension: '.tsx',
      namingConvention: 'PascalCase',
      exportStyle: 'named',
      serverComponents: true,
    },
    syntaxMappings: {},
    apiMappings: {},
    lifecycleMappings: {},
    buildTool: 'turbopack',
    packageManager: 'pnpm',
  },
  mappings: {
    imports: {},
    routing: {},
    components: {},
    styling: {},
    stateManagement: {},
    buildSystem: {},
  },
  rules: {
    mustPreserve: [],
    mustTransform: [],
    mustRemove: [],
    mustRefactor: [],
    breakingChanges: [],
    deprecations: [],
  },
  metadata: {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    estimatedComplexity: 'medium',
    estimatedDuration: '2-4 hours',
  },
}

console.log('Test Spec:')
console.log('- Framework:', spec.target.framework)
console.log('- Routing:', spec.target.routing)
console.log('\nFiles:')
files.forEach((content, path) => console.log(`- ${path}`))

console.log('\nExpected Results:')
console.log('- src/App.js should be detected as page → app/page.tsx')
console.log('- src/components/*.js should move to components/*.tsx')
console.log('- src/index.css should move to app/globals.css')
console.log('- app/layout.tsx should be created')
console.log('- app/error.tsx should be created')
console.log('- app/not-found.tsx should be created')
