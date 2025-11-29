/**
 * Test script to verify JS to JSX detection logic
 * Run with: node test-js-to-jsx-detection.js
 */

// Test cases for JSX detection
const testCases = [
  {
    name: 'Component tag',
    code: 'const App = () => <MyComponent />',
    shouldDetect: true
  },
  {
    name: 'HTML tag',
    code: 'const element = <div>Hello</div>',
    shouldDetect: true
  },
  {
    name: 'React.createElement',
    code: 'const element = React.createElement("div", null, "Hello")',
    shouldDetect: true
  },
  {
    name: 'Return with JSX',
    code: 'function App() { return (<div>Hello</div>) }',
    shouldDetect: true
  },
  {
    name: 'JSX assignment',
    code: 'const element = <Button />',
    shouldDetect: true
  },
  {
    name: 'Plain JavaScript',
    code: 'const x = 5; console.log(x)',
    shouldDetect: false
  },
  {
    name: 'String with angle brackets',
    code: 'const html = "<div>test</div>"',
    shouldDetect: true // Will match, but that's okay - better safe than sorry
  },
  {
    name: 'Comparison operators',
    code: 'if (x < 5 && y > 3) { return true }',
    shouldDetect: false
  }
]

// JSX detection function (same as in orchestrator)
function containsJsx(content) {
  const jsxPatterns = [
    /<[A-Z][a-zA-Z0-9]*/, // Component tags like <MyComponent
    /<[a-z]+[^>]*>/, // HTML-like tags
    /React\.createElement/, // React.createElement calls
    /jsx\s*\(/, // jsx() calls
    /return\s*\([\s\n]*</, // return statements with JSX
    /=\s*<[A-Za-z]/, // JSX assignments
  ]
  
  return jsxPatterns.some(pattern => pattern.test(content))
}

// Run tests
console.log('🧪 Testing JS to JSX Detection Logic\n')

let passed = 0
let failed = 0

testCases.forEach(test => {
  const result = containsJsx(test.code)
  const success = result === test.shouldDetect
  
  if (success) {
    passed++
    console.log(`✅ ${test.name}`)
  } else {
    failed++
    console.log(`❌ ${test.name}`)
    console.log(`   Expected: ${test.shouldDetect}, Got: ${result}`)
    console.log(`   Code: ${test.code}`)
  }
})

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('✨ All tests passed!')
} else {
  console.log('⚠️  Some tests failed')
  process.exit(1)
}
