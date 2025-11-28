/**
 * Unit tests for PropTypesToTSTransformer
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PropTypesToTSTransformer } from '../../lib/transformers/typescript/proptypes-to-ts-transformer'
import type { Task, Pattern, TransformOptions } from '@/types/transformer'
import type { SourceStack } from '@/types/transformer'

function createMockTask(description: string): Task {
  const pattern: Pattern = {
    id: 'proptypes-1',
    name: 'PropTypes to TypeScript',
    category: 'code-quality',
    severity: 'medium',
    occurrences: 1,
    affectedFiles: ['Component.tsx'],
    description,
    automated: true,
  }

  return {
    id: 'proptypes-task-1',
    name: 'Convert PropTypes',
    description,
    type: 'automated',
    estimatedMinutes: 10,
    automatedMinutes: 10,
    riskLevel: 'low',
    affectedFiles: ['Component.tsx'],
    dependencies: [],
    breakingChanges: [],
    pattern,
  }
}

describe('PropTypesToTSTransformer', () => {
  let transformer: PropTypesToTSTransformer
  let options: TransformOptions

  beforeEach(() => {
    transformer = new PropTypesToTSTransformer()
    options = {
      preserveFormatting: true,
    }
  })

  describe('constructor', () => {
    it('should initialize with correct metadata', () => {
      const metadata = transformer.getMetadata()

      expect(metadata.name).toBe('PropTypesToTSTransformer')
      expect(metadata.supportedPatternCategories).toEqual(['code-quality'])
      expect(metadata.supportedFrameworks).toEqual(['React'])
    })
  })

  describe('transform()', () => {
    it('should convert PropTypes.string to TypeScript', async () => {
      const code = `
import PropTypes from 'prop-types';

function MyComponent({ name }) {
  return <div>{name}</div>;
}

MyComponent.propTypes = {
  name: PropTypes.string
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toBeDefined()
      expect(result.code).toContain('interface MyComponentProps')
      expect(result.code).toContain('name?: string')
      expect(result.code).not.toContain('PropTypes')
      expect(result.code).not.toContain('propTypes')
    })

    it('should handle isRequired modifier', async () => {
      const code = `
import PropTypes from 'prop-types';

function MyComponent({ name, age }) {
  return <div>{name} is {age}</div>;
}

MyComponent.propTypes = {
  name: PropTypes.string.isRequired,
  age: PropTypes.number
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('name: string')
      expect(result.code).toContain('age?: number')
    })

    it('should convert PropTypes.number to TypeScript', async () => {
      const code = `
import PropTypes from 'prop-types';

function Counter({ count }) {
  return <div>{count}</div>;
}

Counter.propTypes = {
  count: PropTypes.number.isRequired
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('count: number')
    })

    it('should convert PropTypes.bool to TypeScript', async () => {
      const code = `
import PropTypes from 'prop-types';

function Toggle({ isActive }) {
  return <div>{isActive ? 'On' : 'Off'}</div>;
}

Toggle.propTypes = {
  isActive: PropTypes.bool
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('isActive?: boolean')
    })

    it('should convert PropTypes.array to TypeScript', async () => {
      const code = `
import PropTypes from 'prop-types';

function List({ items }) {
  return <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}

List.propTypes = {
  items: PropTypes.array
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('items?: any[]')
    })

    it('should convert PropTypes.object to TypeScript', async () => {
      const code = `
import PropTypes from 'prop-types';

function UserCard({ user }) {
  return <div>{user.name}</div>;
}

UserCard.propTypes = {
  user: PropTypes.object.isRequired
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('user: object')
    })

    it('should convert PropTypes.func to TypeScript', async () => {
      const code = `
import PropTypes from 'prop-types';

function Button({ onClick }) {
  return <button onClick={onClick}>Click</button>;
}

Button.propTypes = {
  onClick: PropTypes.func
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('onClick?: Function')
    })


    it('should convert PropTypes.arrayOf to TypeScript', async () => {
      const code = `
import PropTypes from 'prop-types';

function List({ items }) {
  return <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}

List.propTypes = {
  items: PropTypes.arrayOf(PropTypes.string)
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('items?: string[]')
    })

    it('should convert PropTypes.shape to TypeScript', async () => {
      const code = `
import PropTypes from 'prop-types';

function UserCard({ user }) {
  return <div>{user.name}</div>;
}

UserCard.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    age: PropTypes.number
  })
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('interface UserCardProps')
      expect(result.code).toContain('name: string')
      expect(result.code).toContain('age?: number')
    })

    it('should handle multiple PropTypes', async () => {
      const code = `
import PropTypes from 'prop-types';

function Form({ name, email, age, isActive }) {
  return <form></form>;
}

Form.propTypes = {
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  age: PropTypes.number,
  isActive: PropTypes.bool
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('name: string')
      expect(result.code).toContain('email: string')
      expect(result.code).toContain('age?: number')
      expect(result.code).toContain('isActive?: boolean')
    })

    it('should add type annotation to function parameter', async () => {
      const code = `
import PropTypes from 'prop-types';

function MyComponent({ name }) {
  return <div>{name}</div>;
}

MyComponent.propTypes = {
  name: PropTypes.string.isRequired
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('function MyComponent')
      expect(result.code).toContain('MyComponentProps')
    })

    it('should handle arrow function components', async () => {
      const code = `
import PropTypes from 'prop-types';

const MyComponent = ({ name }) => {
  return <div>{name}</div>;
};

MyComponent.propTypes = {
  name: PropTypes.string
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('interface MyComponentProps')
      expect(result.code).toContain('name?: string')
    })

    it('should remove PropTypes import', async () => {
      const code = `
import React from 'react';
import PropTypes from 'prop-types';

function MyComponent({ name }) {
  return <div>{name}</div>;
}

MyComponent.propTypes = {
  name: PropTypes.string
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).not.toContain("import PropTypes from 'prop-types'")
      expect(result.code).toContain("import React from 'react'")
    })

    it('should handle no PropTypes definitions', async () => {
      const code = `
function MyComponent({ name }) {
  return <div>{name}</div>;
}
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toBe(code)
      expect(result.warnings).toContain('No PropTypes definitions found to transform')
    })

    it('should handle invalid syntax gracefully', async () => {
      const code = `
import PropTypes from 'prop-types';

function Broken({ name }) {
  return <div>Unclosed
}

Broken.propTypes = {
  name: PropTypes.string
};
`

      const task = createMockTask('Convert Broken component')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].code).toBe('SYNTAX_ERROR')
    })

    it('should generate diff with line changes', async () => {
      const code = `
import PropTypes from 'prop-types';

function MyComponent({ name }) {
  return <div>{name}</div>;
}

MyComponent.propTypes = {
  name: PropTypes.string
};
`

      const task = createMockTask('Convert component')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.diff).toBeDefined()
      expect(result.diff!.visual.length).toBeGreaterThan(0)
      expect(result.metadata.linesAdded).toBeGreaterThan(0)
      expect(result.metadata.linesRemoved).toBeGreaterThan(0)
    })

    it('should track transformations applied', async () => {
      const code = `
import PropTypes from 'prop-types';

function ComponentA({ name }) {
  return <div>{name}</div>;
}

ComponentA.propTypes = {
  name: PropTypes.string
};

function ComponentB({ age }) {
  return <div>{age}</div>;
}

ComponentB.propTypes = {
  age: PropTypes.number
};
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
import PropTypes from 'prop-types';

function MyComponent({ name }) {
  return <div>{name}</div>;
}

MyComponent.propTypes = {
  name: PropTypes.string
};
`

      const task = createMockTask('Convert component')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.confidenceScore).toBeGreaterThan(0)
      expect(result.metadata.confidenceScore).toBeLessThanOrEqual(100)
    })

    it('should calculate risk score', async () => {
      const code = `
import PropTypes from 'prop-types';

function MyComponent({ name }) {
  return <div>{name}</div>;
}

MyComponent.propTypes = {
  name: PropTypes.string
};
`

      const task = createMockTask('Convert component')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.riskScore).toBeGreaterThanOrEqual(0)
      expect(result.metadata.riskScore).toBeLessThanOrEqual(100)
    })
  })

  describe('canHandle()', () => {
    it('should handle code-quality category tasks', () => {
      const task = createMockTask('Convert PropTypes')
      const sourceStack: SourceStack = {
        framework: 'React',
        version: '18.0.0',
        language: 'TypeScript',
        dependencies: {},
      }

      expect(transformer.canHandle(task, sourceStack)).toBe(true)
    })

    it('should only handle React framework', () => {
      const task = createMockTask('Convert PropTypes')
      
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

  describe('PropTypes patterns', () => {
    it('should handle nested PropTypes.shape', async () => {
      const code = `
import PropTypes from 'prop-types';

function UserProfile({ user }) {
  return <div>{user.name}</div>;
}

UserProfile.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string.isRequired,
    address: PropTypes.shape({
      street: PropTypes.string,
      city: PropTypes.string
    })
  })
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('interface UserProfileProps')
    })

    it('should handle PropTypes.arrayOf with complex types', async () => {
      const code = `
import PropTypes from 'prop-types';

function List({ items }) {
  return <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}

List.propTypes = {
  items: PropTypes.arrayOf(PropTypes.number).isRequired
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('items: number[]')
    })

    it('should handle mixed required and optional props', async () => {
      const code = `
import PropTypes from 'prop-types';

function Form({ name, email, phone }) {
  return <form></form>;
}

Form.propTypes = {
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  phone: PropTypes.string
};
`

      const task = createMockTask('Convert PropTypes')
      const result = await transformer.transform(code, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('name: string')
      expect(result.code).toContain('email: string')
      expect(result.code).toContain('phone?: string')
    })
  })
})
