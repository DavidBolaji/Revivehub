#!/usr/bin/env tsx

/**
 * Test script for README generation functionality
 * 
 * This script tests the documentation transformer's ability to:
 * 1. Analyze repository structure from files
 * 2. Generate comprehensive README content
 * 3. Work with both AI and template fallback
 */

import { DocumentationTransformer } from '../lib/transformers/documentation/documentation-transformer'

// Mock repository files for testing
const mockRepositoryFiles = [
  {
    path: 'package.json',
    content: JSON.stringify({
      name: 'my-nextjs-app',
      description: 'A modern Next.js application with TypeScript',
      version: '1.0.0',
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
        test: 'jest'
      },
      dependencies: {
        'next': '^14.0.0',
        'react': '^18.0.0',
        'react-dom': '^18.0.0',
        'antd': '^5.0.0',
        '@tanstack/react-query': '^5.0.0',
        'tailwindcss': '^3.0.0',
        'framer-motion': '^10.0.0'
      },
      devDependencies: {
        'typescript': '^5.0.0',
        '@types/react': '^18.0.0',
        '@types/node': '^20.0.0',
        'eslint': '^8.0.0',
        'jest': '^29.0.0'
      }
    }, null, 2)
  },
  {
    path: 'tsconfig.json',
    content: JSON.stringify({
      compilerOptions: {
        target: 'es5',
        lib: ['dom', 'dom.iterable', 'es6'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'node',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./src/*'] }
      }
    }, null, 2)
  },
  {
    path: 'next.config.js',
    content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`
  },
  {
    path: 'tailwind.config.js',
    content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`
  },
  {
    path: 'app/layout.tsx',
    content: `import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'My Next.js App',
  description: 'A modern web application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`
  },
  {
    path: 'app/page.tsx',
    content: `'use client'

import { useState, useEffect } from 'react'
import { Button } from 'antd'
import { motion } from 'framer-motion'

export default function Home() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    // API integration example
    fetch('/api/data')
      .then(res => res.json())
      .then(data => console.log(data))
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm"
      >
        <h1 className="text-4xl font-bold">Welcome to My App</h1>
        <Button type="primary" onClick={() => setCount(count + 1)}>
          Count: {count}
        </Button>
      </motion.div>
    </main>
  )
}`
  },
  {
    path: 'components/ui/Button.tsx',
    content: `interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={\`px-4 py-2 rounded \${variant === 'primary' ? 'bg-blue-500 text-white' : 'bg-gray-200'}\`}
    >
      {children}
    </button>
  )
}`
  },
  {
    path: 'components/ui/Input.tsx',
    content: `export function Input({ ...props }) {
  return <input className="border rounded px-3 py-2" {...props} />
}`
  },
  {
    path: 'components/forms/ContactForm.tsx',
    content: `import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function ContactForm() {
  return (
    <form className="space-y-4">
      <Input placeholder="Name" />
      <Input placeholder="Email" type="email" />
      <Button>Submit</Button>
    </form>
  )
}`
  },
  {
    path: 'lib/utils/helpers.ts',
    content: `export function formatDate(date: Date): string {
  return date.toLocaleDateString()
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}`
  },
  {
    path: 'lib/api/client.ts',
    content: `export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async get(endpoint: string) {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`)
    return response.json()
  }
}`
  },
  {
    path: 'app/api/users/route.ts',
    content: `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ users: [] })
}`
  },
  {
    path: 'app/dashboard/page.tsx',
    content: `export default function Dashboard() {
  return <div>Dashboard</div>
}`
  },
  {
    path: 'app/dashboard/settings/page.tsx',
    content: `export default function Settings() {
  return <div>Settings</div>
}`
  },
  {
    path: 'public/images/logo.svg',
    content: `<svg><!-- Logo SVG --></svg>`
  },
  {
    path: 'public/favicon.ico',
    content: `// Favicon binary data`
  },
  {
    path: 'docs/api.md',
    content: `# API Documentation

## Endpoints

### GET /api/users
Returns list of users.`
  },
  {
    path: '.env.example',
    content: `# Database
DATABASE_URL=your_database_url

# Authentication
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000

# API Keys
OPENAI_API_KEY=your_openai_key`
  },
  {
    path: '__tests__/components/Button.test.tsx',
    content: `import { render, screen } from '@testing-library/react'
import { Button } from '../../components/ui/Button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})`
  },
  {
    path: '.github/workflows/ci.yml',
    content: `name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test`
  }
]

async function testReadmeGeneration() {
  console.log('🧪 Testing README generation...')
  
  try {
    const transformer = new DocumentationTransformer()
    
    // Test 1: Generate README from scratch
    console.log('\n📝 Test 1: Generate README from scratch')
    const newReadme = await transformer.generateReadmeFromRepository(mockRepositoryFiles)
    console.log('✅ Generated README length:', newReadme.length, 'characters')
    console.log('📄 Preview (first 500 chars):')
    console.log(newReadme.substring(0, 500) + '...')
    
    // Check if the folder structure section is present and shows nesting
    const structureMatch = newReadme.match(/## 📁 Project Structure\n\n```\n([\s\S]*?)\n```/)
    if (structureMatch) {
      console.log('\n🌳 Generated folder structure:')
      console.log(structureMatch[1])
    } else {
      console.log('\n⚠️ No folder structure found in README')
    }
    
    // Test 2: Update existing README
    console.log('\n📝 Test 2: Update existing README')
    const existingReadme = `# My Old App

This is an old README that needs updating.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

Run the app with \`npm start\`.
`
    
    const updatedReadme = await transformer.generateReadmeFromRepository(
      mockRepositoryFiles, 
      existingReadme
    )
    console.log('✅ Updated README length:', updatedReadme.length, 'characters')
    console.log('📄 Preview (first 500 chars):')
    console.log(updatedReadme.substring(0, 500) + '...')
    
    console.log('\n🎉 All tests completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
  }
}

// Run the test
testReadmeGeneration()