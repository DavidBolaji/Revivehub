/**
 * Unit tests for ClassToHooksTransformer
 * 
 * Tests React class to hooks conversion including:
 * - State conversion to useState
 * - Lifecycle method conversion to useEffect
 * - Instance method conversion
 * - Props handling
 * - Error scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ClassToHooksTransformer } from '../../lib/transformers/react/class-to-hooks-transformer'
import type { Task, Pattern, TransformOptions, SourceStack } from '@/types/transformer'

// Helper function to create mock task
function createMockTask(
  description: string,
  riskLevel: 'low' | 'medium' | 'high' = 'low'
): Task {
  const pattern: Pattern = {
    id: 'react-class-1',
    name: 'React Class Component',
    category: 'code-quality',
    severity: 'medium',
    occurrences: 1,
    affectedFiles: ['Component.tsx'],
    description,
    automated: true,
  }

  return {
    id: 'react-task-1',
    name: 'Convert to Hooks',
    description,
    type: 'automated',
    estimatedMinutes: 15,
    automatedMinutes: 15,
    riskLevel,
    affectedFiles: ['Component.tsx'],
    dependencies: [],
    breakingChanges: [],
    pattern,
  }
}

describe('ClassToHooksTransformer', () => {
  let transformer: ClassToHooksTransformer
  let options: TransformOptions

  beforeEach(() => {
    transformer = new ClassToHooksTransformer()
    options = {
      preserveFormatting: true,
    }
  })

  describe('constructor', () => {
    it('should initialize with correct metadata', () => {
      const metadata = transformer.getMetadata()

      expect(metadata.name).toBe('ClassToHooksTransformer')
      expect(metadata.supportedPatternCategories).toEqual(['code-quality'])
      expect(metadata.supportedFrameworks).toEqual(['React'])
    })
  })

  describe('transform()', () => {
    it('should convert simple class component to functional component', async () => {
      const code = `
import React from 'react';

class MyComponent extends React.Component {
  render() {
    return <div>Hello World</div>;
  }
}
`

      const task = createMockTask('Convert MyComponent to hooks')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toBeDefined()
      expect(result.code).toContain('function MyComponent')
      expect(result.code).toContain('return <div>Hello World</div>')
      expect(result.code).not.toContain('class MyComponent')
    })

    it('should convert state to useState hooks', async () => {
      const code = `
import React from 'react';

class Counter extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  render() {
    return <div>{this.state.count}</div>;
  }
}
`

      const task = createMockTask('Convert Counter to hooks')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('useState')
      expect(result.code).toContain('const [count, setCount]')
      expect(result.code).toContain('useState(0)')
      expect(result.code).toContain('{count}')
      expect(result.code).not.toContain('this.state.count')
    })

    it('should convert multiple state properties', async () => {
      const code = `
import React from 'react';

class Form extends React.Component {
  state = {
    name: '',
    email: '',
    age: 0
  };

  render() {
    return (
      <div>
        {this.state.name}
        {this.state.email}
        {this.state.age}
      </div>
    );
  }
}
`

      const task = createMockTask('Convert Form to hooks')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('const [name, setName] = useState')
      expect(result.code).toContain('const [email, setEmail] = useState')
      expect(result.code).toContain('const [age, setAge] = useState')
    })

    it('should convert componentDidMount to useEffect', async () => {
      const code = `
import React from 'react';

class DataFetcher extends React.Component {
  componentDidMount() {
    console.log('Component mounted');
    fetchData();
  }

  render() {
    return <div>Data</div>;
  }
}
`

      const task = createMockTask('Convert DataFetcher to hooks')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('useEffect')
      expect(result.code).toContain("console.log('Component mounted')")
      expect(result.code).toContain('fetchData()')
      expect(result.code).toContain('[]') // Empty dependency array
    })

    it('should convert componentWillUnmount to useEffect cleanup', async () => {
      const code = `
import React from 'react';

class Timer extends React.Component {
  componentDidMount() {
    this.interval = setInterval(() => {}, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return <div>Timer</div>;
  }
}
`

      const task = createMockTask('Convert Timer to hooks')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('useEffect')
      expect(result.code).toContain('return')
      expect(result.code).toContain('clearInterval')
    })

    it('should handle class with no React components', async () => {
      const code = `
class RegularClass {
  constructor() {
    this.value = 42;
  }

  getValue() {
    return this.value;
  }
}
`

      const task = createMockTask('Convert class')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toBe(code) // Should remain unchanged
      expect(result.warnings).toContain('No React class components found to transform')
    })

    it('should handle invalid syntax gracefully', async () => {
      const code = `
import React from 'react';

class Broken extends React.Component {
  render() {
    return <div>Unclosed
  }
}
`

      const task = createMockTask('Convert Broken component')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].code).toBe('SYNTAX_ERROR')
    })

    it('should generate diff with line changes', async () => {
      const code = `
import React from 'react';

class Simple extends React.Component {
  render() {
    return <div>Test</div>;
  }
}
`

      const task = createMockTask('Convert Simple component')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.diff).toBeDefined()
      expect(result.diff!.visual.length).toBeGreaterThan(0)
      expect(result.metadata.linesAdded).toBeGreaterThan(0)
      expect(result.metadata.linesRemoved).toBeGreaterThan(0)
    })

    it('should track transformations applied', async () => {
      const code = `
import React from 'react';

class ComponentA extends React.Component {
  render() {
    return <div>A</div>;
  }
}

class ComponentB extends React.Component {
  render() {
    return <div>B</div>;
  }
}
`

      const task = createMockTask('Convert components')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.transformationsApplied.length).toBe(2)
      expect(result.metadata.transformationsApplied[0]).toContain('ComponentA')
      expect(result.metadata.transformationsApplied[1]).toContain('ComponentB')
    })

    it('should calculate confidence score', async () => {
      const code = `
import React from 'react';

class MyComponent extends React.Component {
  render() {
    return <div>Test</div>;
  }
}
`

      const task = createMockTask('Convert component')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.confidenceScore).toBeGreaterThan(0)
      expect(result.metadata.confidenceScore).toBeLessThanOrEqual(100)
    })

    it('should calculate risk score', async () => {
      const code = `
import React from 'react';

class MyComponent extends React.Component {
  render() {
    return <div>Test</div>;
  }
}
`

      const task = createMockTask('Convert component')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.riskScore).toBeGreaterThanOrEqual(0)
      expect(result.metadata.riskScore).toBeLessThanOrEqual(100)
    })

    it('should flag for manual review when warnings present', async () => {
      const code = `
import React from 'react';

class Complex extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }

  render() {
    return <div>Complex</div>;
  }
}
`

      const task = createMockTask('Convert Complex component')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      // Should have warnings about unsupported lifecycle methods
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('isReactComponent()', () => {
    it('should identify React.Component classes', async () => {
      const code = `
import React from 'react';

class MyComponent extends React.Component {
  render() {
    return <div>Test</div>;
  }
}
`

      const task = createMockTask('Test')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.transformationsApplied.length).toBe(1)
    })

    it('should identify Component classes (imported)', async () => {
      const code = `
import { Component } from 'react';

class MyComponent extends Component {
  render() {
    return <div>Test</div>;
  }
}
`

      const task = createMockTask('Test')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.transformationsApplied.length).toBe(1)
    })

    it('should identify PureComponent classes', async () => {
      const code = `
import React from 'react';

class MyComponent extends React.PureComponent {
  render() {
    return <div>Test</div>;
  }
}
`

      const task = createMockTask('Test')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.transformationsApplied.length).toBe(1)
    })

    it('should not identify non-React classes', async () => {
      const code = `
class RegularClass {
  render() {
    return 'not a component';
  }
}
`

      const task = createMockTask('Test')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('No React class components found to transform')
    })
  })

  describe('canHandle()', () => {
    it('should handle code-quality category tasks', () => {
      const task = createMockTask('Convert to hooks')
      const sourceStack: SourceStack = {
        framework: 'React',
        version: '18.0.0',
        language: 'TypeScript',
        dependencies: {},
      }

      expect(transformer.canHandle(task, sourceStack)).toBe(true)
    })

    it('should only handle React framework', () => {
      const task = createMockTask('Convert to hooks')
      
      const reactStack: SourceStack = {
        framework: 'React',
        version: '18.0.0',
        language: 'TypeScript',
        dependencies: {},
      }

      const vueStack: SourceStack = {
        framework: 'Vue',
        version: '3.0.0',
        language: 'TypeScript',
        dependencies: {},
      }

      expect(transformer.canHandle(task, reactStack)).toBe(true)
      expect(transformer.canHandle(task, vueStack)).toBe(false)
    })

    it('should not handle non-code-quality tasks', () => {
      const task = createMockTask('Update dependencies')
      task.pattern.category = 'dependency'

      const sourceStack: SourceStack = {
        framework: 'React',
        version: '18.0.0',
        language: 'TypeScript',
        dependencies: {},
      }

      expect(transformer.canHandle(task, sourceStack)).toBe(false)
    })
  })

  describe('convertToFunction()', () => {
    it('should preserve component name', async () => {
      const code = `
import React from 'react';

class MySpecialComponent extends React.Component {
  render() {
    return <div>Test</div>;
  }
}
`

      const task = createMockTask('Convert')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('function MySpecialComponent')
    })

    it('should add props parameter', async () => {
      const code = `
import React from 'react';

class MyComponent extends React.Component {
  render() {
    return <div>{this.props.title}</div>;
  }
}
`

      const task = createMockTask('Convert')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('function MyComponent(props)')
    })

    it('should handle components without render method', async () => {
      const code = `
import React from 'react';

class Broken extends React.Component {
  componentDidMount() {
    console.log('mounted');
  }
}
`

      const task = createMockTask('Convert')
      const result = await transformer.transform(code, options, task)

      // Should fail gracefully with warning
      expect(result.success).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle empty class body', async () => {
      const code = `
import React from 'react';

class Empty extends React.Component {
  render() {
    return null;
  }
}
`

      const task = createMockTask('Convert')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('function Empty')
      expect(result.code).toContain('return null')
    })

    it('should handle JSX with props', async () => {
      const code = `
import React from 'react';

class Greeting extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}!</h1>;
  }
}
`

      const task = createMockTask('Convert')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('function Greeting')
    })

    it('should handle nested JSX', async () => {
      const code = `
import React from 'react';

class Card extends React.Component {
  render() {
    return (
      <div className="card">
        <h2>{this.props.title}</h2>
        <p>{this.props.description}</p>
      </div>
    );
  }
}
`

      const task = createMockTask('Convert')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('function Card')
      expect(result.code).toContain('<div className="card">')
    })
  })
})
