/**
 * Unit tests for AI Transformation Engine
 * Requirements: 5.3
 * 
 * Tests the transformComponent method for semantic transformations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AITransformationEngine } from '@/lib/migration/ai-transformation-engine'
import type { MigrationSpecification, TransformationContext } from '@/types/migration'

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  }
})

describe('AITransformationEngine', () => {
  let engine: AITransformationEngine
  let mockAnthropicClient: any

  const mockSpec: MigrationSpecification = {
    source: {
      language: 'JavaScript',
      framework: 'React',
      version: '18.0.0',
      routing: 'react-router',
      patterns: { componentStyle: 'functional' },
      buildTool: 'webpack',
      packageManager: 'npm',
    },
    target: {
      language: 'TypeScript',
      framework: 'Next.js',
      version: '14.0.0',
      routing: 'file-based',
      fileStructure: {
        pages: 'app',
        components: 'components',
        layouts: 'app',
        api: 'app/api',
      },
      componentConventions: {
        fileExtension: '.tsx',
        namingConvention: 'PascalCase',
        exportStyle: 'default',
        serverComponents: true,
      },
      syntaxMappings: {},
      apiMappings: {},
      lifecycleMappings: {
        componentDidMount: 'useEffect(() => {}, [])',
        componentWillUnmount: 'useEffect(() => { return () => {} }, [])',
      },
      buildTool: 'next',
      packageManager: 'pnpm',
    },
    mappings: {
      imports: {
        'react-router-dom': 'next/navigation',
      },
      routing: {},
      components: {},
      styling: {},
      stateManagement: {},
      buildSystem: {},
    },
    rules: {
      mustPreserve: ['Business logic', 'Component behavior'],
      mustTransform: ['Import statements', 'Routing configuration'],
      mustRemove: ['react-router dependencies'],
      mustRefactor: [],
      breakingChanges: [],
      deprecations: [],
    },
    metadata: {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      estimatedComplexity: 'medium',
      estimatedDuration: '2 hours',
    },
  }

  const mockContext: TransformationContext = {
    filePath: 'src/components/UserProfile.tsx',
    fileType: 'component',
    dependencies: ['react', 'react-router-dom'],
    imports: ['React', 'Link'],
    exports: ['UserProfile'],
    relatedFiles: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set up mock API key
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
    
    engine = new AITransformationEngine()
    mockAnthropicClient = (engine as any).client
  })

  describe('transformComponent', () => {
    it('should transform component with AI and return structured result', async () => {
      const sourceCode = `
        import React from 'react'
        import { Link } from 'react-router-dom'
        
        export default function UserProfile({ userId }) {
          return (
            <div>
              <h1>User Profile</h1>
              <Link to="/dashboard">Back to Dashboard</Link>
            </div>
          )
        }
      `

      const mockAIResponse = {
        code: `
          import Link from 'next/link'
          
          export default function UserProfile({ userId }: { userId: string }) {
            return (
              <div>
                <h1>User Profile</h1>
                <Link href="/dashboard">Back to Dashboard</Link>
              </div>
            )
          }
        `,
        confidence: 85,
        reasoning: 'Transformed React Router Link to Next.js Link, added TypeScript types',
        warnings: [],
        requiresReview: false,
      }

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockAIResponse),
          },
        ],
      })

      const result = await engine.transformComponent(sourceCode, mockSpec, mockContext)

      expect(result).toBeDefined()
      expect(result.code).toContain('next/link')
      expect(result.confidence).toBe(85)
      expect(result.reasoning).toContain('Transformed')
      expect(result.warnings).toHaveLength(0)
      expect(result.requiresReview).toBe(false)
    })

    it('should build prompt with migration spec and source code', async () => {
      const sourceCode = 'const Component = () => <div>Test</div>'

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 'transformed',
              confidence: 90,
              reasoning: 'test',
              warnings: [],
              requiresReview: false,
            }),
          },
        ],
      })

      await engine.transformComponent(sourceCode, mockSpec, mockContext)

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('React'),
            }),
          ]),
        })
      )

      const callArgs = mockAnthropicClient.messages.create.mock.calls[0][0]
      const prompt = callArgs.messages[0].content

      expect(prompt).toContain('SOURCE FRAMEWORK: React 18.0.0')
      expect(prompt).toContain('TARGET FRAMEWORK: Next.js 14.0.0')
      expect(prompt).toContain('File Path: src/components/UserProfile.tsx')
      expect(prompt).toContain('Must Preserve: Business logic, Component behavior')
      expect(prompt).toContain('react-router-dom → next/navigation')
      expect(prompt).toContain(sourceCode)
    })

    it('should parse AI response and extract transformed code', async () => {
      const sourceCode = 'const x = 1'

      const mockAIResponse = {
        code: 'const x: number = 1',
        confidence: 95,
        reasoning: 'Added TypeScript type annotation',
        warnings: ['Consider using const assertion'],
        requiresReview: true,
      }

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockAIResponse),
          },
        ],
      })

      const result = await engine.transformComponent(sourceCode, mockSpec, mockContext)

      expect(result.code).toBe('const x: number = 1')
      expect(result.confidence).toBe(95)
      expect(result.reasoning).toBe('Added TypeScript type annotation')
      expect(result.warnings).toContain('Consider using const assertion')
      expect(result.requiresReview).toBe(true)
    })

    it('should calculate confidence score from AI response', async () => {
      const sourceCode = 'const test = true'

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 'const test: boolean = true',
              confidence: 75,
              reasoning: 'Simple transformation',
              warnings: [],
              requiresReview: false,
            }),
          },
        ],
      })

      const result = await engine.transformComponent(sourceCode, mockSpec, mockContext)

      expect(result.confidence).toBe(75)
      expect(typeof result.confidence).toBe('number')
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(100)
    })

    it('should handle non-JSON AI responses gracefully', async () => {
      const sourceCode = 'const x = 1'

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'const x: number = 1', // Not JSON
          },
        ],
      })

      const result = await engine.transformComponent(sourceCode, mockSpec, mockContext)

      expect(result.code).toBe('const x: number = 1')
      expect(result.confidence).toBe(50) // Default confidence
      expect(result.reasoning).toContain('not in expected JSON format')
      expect(result.warnings).toContain('Response format was unexpected')
      expect(result.requiresReview).toBe(true)
    })

    it('should retry on transient errors', async () => {
      const sourceCode = 'const x = 1'

      // Fail twice, then succeed
      mockAnthropicClient.messages.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                code: 'const x: number = 1',
                confidence: 90,
                reasoning: 'Success after retries',
                warnings: [],
                requiresReview: false,
              }),
            },
          ],
        })

      const result = await engine.transformComponent(sourceCode, mockSpec, mockContext)

      expect(result.code).toBe('const x: number = 1')
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3)
    })

    it('should throw error after max retries', async () => {
      const sourceCode = 'const x = 1'

      mockAnthropicClient.messages.create.mockRejectedValue(new Error('Persistent error'))

      await expect(
        engine.transformComponent(sourceCode, mockSpec, mockContext)
      ).rejects.toThrow()

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3) // Max retries
    })

    it('should not retry on authentication errors', async () => {
      const sourceCode = 'const x = 1'

      const authError = new Error('Unauthorized')
      ;(authError as any).status = 401

      mockAnthropicClient.messages.create.mockRejectedValue(authError)

      await expect(
        engine.transformComponent(sourceCode, mockSpec, mockContext)
      ).rejects.toThrow()

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(1) // No retries
    })

    it('should include lifecycle mappings in prompt', async () => {
      const sourceCode = `
        class Component extends React.Component {
          componentDidMount() {
            console.log('mounted')
          }
        }
      `

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 'transformed',
              confidence: 80,
              reasoning: 'test',
              warnings: [],
              requiresReview: false,
            }),
          },
        ],
      })

      await engine.transformComponent(sourceCode, mockSpec, mockContext)

      const callArgs = mockAnthropicClient.messages.create.mock.calls[0][0]
      const prompt = callArgs.messages[0].content

      expect(prompt).toContain('LIFECYCLE MAPPINGS:')
      expect(prompt).toContain('componentDidMount → useEffect(() => {}, [])')
      expect(prompt).toContain('componentWillUnmount → useEffect(() => { return () => {} }, [])')
    })

    it('should include component conventions in prompt', async () => {
      const sourceCode = 'const Component = () => <div>Test</div>'

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 'transformed',
              confidence: 80,
              reasoning: 'test',
              warnings: [],
              requiresReview: false,
            }),
          },
        ],
      })

      await engine.transformComponent(sourceCode, mockSpec, mockContext)

      const callArgs = mockAnthropicClient.messages.create.mock.calls[0][0]
      const prompt = callArgs.messages[0].content

      expect(prompt).toContain('COMPONENT CONVENTIONS:')
      expect(prompt).toContain('File Extension: .tsx')
      expect(prompt).toContain('Naming Convention: PascalCase')
      expect(prompt).toContain('Export Style: default')
      expect(prompt).toContain('Use Server Components where possible')
    })
  })

  describe('generateBoilerplate', () => {
    it('should generate boilerplate code for target framework', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`,
          },
        ],
      })

      const result = await engine.generateBoilerplate('layout', mockSpec)

      expect(result).toContain('RootLayout')
      expect(result).toContain('children')
    })

    it('should generate API route boilerplate for Next.js App Router', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Hello from API' })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ received: body })
}`,
          },
        ],
      })

      const result = await engine.generateBoilerplate('api-route', mockSpec)

      expect(result).toContain('NextRequest')
      expect(result).toContain('NextResponse')
      expect(result).toContain('GET')
      expect(result).toContain('POST')
    })

    it('should generate error boundary boilerplate', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}`,
          },
        ],
      })

      const result = await engine.generateBoilerplate('error-boundary', mockSpec)

      expect(result).toContain('use client')
      expect(result).toContain('error')
      expect(result).toContain('reset')
    })

    it('should generate loading state boilerplate', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  )
}`,
          },
        ],
      })

      const result = await engine.generateBoilerplate('loading', mockSpec)

      expect(result).toContain('Loading')
      expect(result).toContain('animate-spin')
    })
  })

  describe('mapLifecycleMethods', () => {
    it('should map componentDidMount to useEffect with empty deps', async () => {
      const sourceCode = `
        class Component extends React.Component {
          componentDidMount() {
            fetchData()
          }
        }
      `

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `
              function Component() {
                useEffect(() => {
                  fetchData()
                }, [])
              }
            `,
          },
        ],
      })

      const result = await engine.mapLifecycleMethods(sourceCode, mockSpec)

      expect(result).toContain('useEffect')
      expect(result).toContain('fetchData')
      expect(result).toContain('[]') // Empty dependency array
    })

    it('should map componentWillUnmount to useEffect cleanup', async () => {
      const sourceCode = `
        class Component extends React.Component {
          componentWillUnmount() {
            clearInterval(this.timer)
          }
        }
      `

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `
              function Component() {
                useEffect(() => {
                  return () => {
                    clearInterval(timer)
                  }
                }, [])
              }
            `,
          },
        ],
      })

      const result = await engine.mapLifecycleMethods(sourceCode, mockSpec)

      expect(result).toContain('useEffect')
      expect(result).toContain('return () => {')
      expect(result).toContain('clearInterval')
    })

    it('should map componentDidUpdate to useEffect with dependencies', async () => {
      const sourceCode = `
        class Component extends React.Component {
          componentDidUpdate(prevProps) {
            if (prevProps.userId !== this.props.userId) {
              fetchUserData(this.props.userId)
            }
          }
        }
      `

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `
              function Component({ userId }) {
                useEffect(() => {
                  fetchUserData(userId)
                }, [userId])
              }
            `,
          },
        ],
      })

      const result = await engine.mapLifecycleMethods(sourceCode, mockSpec)

      expect(result).toContain('useEffect')
      expect(result).toContain('fetchUserData')
      expect(result).toContain('[userId]') // Dependency array with userId
    })

    it('should handle multiple lifecycle methods in one component', async () => {
      const sourceCode = `
        class Component extends React.Component {
          componentDidMount() {
            this.timer = setInterval(() => this.tick(), 1000)
          }
          
          componentWillUnmount() {
            clearInterval(this.timer)
          }
        }
      `

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `
              function Component() {
                useEffect(() => {
                  const timer = setInterval(() => tick(), 1000)
                  
                  return () => {
                    clearInterval(timer)
                  }
                }, [])
              }
            `,
          },
        ],
      })

      const result = await engine.mapLifecycleMethods(sourceCode, mockSpec)

      expect(result).toContain('useEffect')
      expect(result).toContain('setInterval')
      expect(result).toContain('return () => {')
      expect(result).toContain('clearInterval')
    })

    it('should include comprehensive lifecycle mapping guidelines in prompt', async () => {
      const sourceCode = `
        class Component extends React.Component {
          componentDidMount() {
            fetchData()
          }
        }
      `

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'function Component() { useEffect(() => { fetchData() }, []) }',
          },
        ],
      })

      await engine.mapLifecycleMethods(sourceCode, mockSpec)

      const callArgs = mockAnthropicClient.messages.create.mock.calls[0][0]
      const prompt = callArgs.messages[0].content

      // Check that prompt includes comprehensive guidelines
      expect(prompt).toContain('LIFECYCLE MAPPINGS:')
      expect(prompt).toContain('TRANSFORMATION GUIDELINES:')
      expect(prompt).toContain('componentDidMount')
      expect(prompt).toContain('componentWillUnmount')
      expect(prompt).toContain('componentDidUpdate')
      expect(prompt).toContain('shouldComponentUpdate')
      expect(prompt).toContain('getDerivedStateFromProps')
      expect(prompt).toContain('getSnapshotBeforeUpdate')
      expect(prompt).toContain('componentDidCatch')
      expect(prompt).toContain('useEffect')
      expect(prompt).toContain('React.memo')
      expect(prompt).toContain('Preserve ALL business logic')
    })

    it('should handle getDerivedStateFromProps transformation', async () => {
      const sourceCode = `
        class Component extends React.Component {
          static getDerivedStateFromProps(props, state) {
            if (props.value !== state.prevValue) {
              return {
                prevValue: props.value,
                derivedValue: props.value * 2
              }
            }
            return null
          }
        }
      `

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `
              function Component({ value }) {
                const [derivedValue, setDerivedValue] = useState(value * 2)
                
                useEffect(() => {
                  setDerivedValue(value * 2)
                }, [value])
              }
            `,
          },
        ],
      })

      const result = await engine.mapLifecycleMethods(sourceCode, mockSpec)

      expect(result).toContain('useState')
      expect(result).toContain('useEffect')
      expect(result).toContain('setDerivedValue')
    })

    it('should handle shouldComponentUpdate transformation', async () => {
      const sourceCode = `
        class Component extends React.Component {
          shouldComponentUpdate(nextProps, nextState) {
            return nextProps.value !== this.props.value
          }
        }
      `

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `
              const Component = React.memo(({ value }) => {
                // Component logic
              }, (prevProps, nextProps) => {
                return prevProps.value === nextProps.value
              })
            `,
          },
        ],
      })

      const result = await engine.mapLifecycleMethods(sourceCode, mockSpec)

      expect(result).toContain('React.memo')
    })

    it('should preserve business logic during transformation', async () => {
      const sourceCode = `
        class Component extends React.Component {
          componentDidMount() {
            // Fetch user data
            fetch('/api/user')
              .then(res => res.json())
              .then(data => this.setState({ user: data }))
              .catch(err => console.error(err))
          }
        }
      `

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: `
              function Component() {
                useEffect(() => {
                  // Fetch user data
                  fetch('/api/user')
                    .then(res => res.json())
                    .then(data => setUser(data))
                    .catch(err => console.error(err))
                }, [])
              }
            `,
          },
        ],
      })

      const result = await engine.mapLifecycleMethods(sourceCode, mockSpec)

      // Verify business logic is preserved
      expect(result).toContain('fetch(\'/api/user\')')
      expect(result).toContain('.then(res => res.json())')
      expect(result).toContain('.catch(err => console.error(err))')
      expect(result).toContain('// Fetch user data')
    })
  })

  describe('restructureFileLayout', () => {
    it('should restructure files according to target conventions', async () => {
      const files = new Map([
        ['src/pages/Home.jsx', 'export default function Home() {}'],
        ['src/components/Button.jsx', 'export default function Button() {}'],
      ])

      const result = await engine.restructureFileLayout(files, mockSpec)

      expect(result.size).toBe(2)
      
      // Check that files are restructured
      const paths = Array.from(result.keys())
      expect(paths.some(p => p.includes('app'))).toBe(true)
      expect(paths.some(p => p.includes('components'))).toBe(true)
    })

    it('should apply naming conventions to file names', async () => {
      const files = new Map([
        ['src/components/user-profile.jsx', 'export default function UserProfile() {}'],
      ])

      const result = await engine.restructureFileLayout(files, mockSpec)

      const paths = Array.from(result.keys())
      expect(paths[0]).toContain('UserProfile.tsx') // PascalCase + .tsx extension
    })
  })

  describe('error handling', () => {
    it('should throw AIServiceError on API failure', async () => {
      const sourceCode = 'const x = 1'

      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API Error'))

      await expect(
        engine.transformComponent(sourceCode, mockSpec, mockContext)
      ).rejects.toMatchObject({
        name: 'AIServiceError',
        code: 'AI_SERVICE_ERROR',
        recoverable: true,
      })
    })

    it('should mark authentication errors as non-retryable', async () => {
      const sourceCode = 'const x = 1'

      const authError = new Error('Invalid API key')
      ;(authError as any).status = 401

      mockAnthropicClient.messages.create.mockRejectedValue(authError)

      try {
        await engine.transformComponent(sourceCode, mockSpec, mockContext)
      } catch (error: any) {
        expect(error.retryable).toBe(false)
      }
    })
  })
})
