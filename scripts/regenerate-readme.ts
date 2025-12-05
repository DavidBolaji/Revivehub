#!/usr/bin/env tsx

/**
 * Script to regenerate README.md using AI-powered documentation transformer
 * 
 * This script creates a documentation task and runs it through the DocumentationTransformer
 * to generate a comprehensive, AI-powered README based on the project structure.
 */

import { DocumentationTransformer } from '../lib/transformers/documentation/documentation-transformer'
import type { Task, TransformOptions } from '../types/transformer'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

async function regenerateReadme() {
  console.log('🚀 Starting README regeneration...')

  try {
    // Read current README
    const readmePath = join(process.cwd(), 'README.md')
    let currentReadme = ''
    
    try {
      currentReadme = readFileSync(readmePath, 'utf-8')
      console.log('📖 Current README loaded')
    } catch (error) {
      console.log('📝 No existing README found, will create new one')
    }

    // Create a documentation task that will trigger full README regeneration
    const task: Task = {
      id: 'readme-regen-1',
      name: 'Generate AI-Powered README',
      description: 'Generate comprehensive README using AI based on project structure and dependencies',
      type: 'automated',
      pattern: {
        name: 'AI README Generation',
        category: 'documentation',
        description: 'Generate comprehensive project documentation using AI analysis',
        frameworks: ['*'],
        riskLevel: 'low',
        estimatedMinutes: 5,
        tags: ['documentation', 'readme', 'ai']
      },
      affectedFiles: ['README.md'],
      estimatedMinutes: 5,
      riskLevel: 'low',
      dependencies: [],
      manualSteps: []
    }

    // Create transform options
    const options: TransformOptions = {
      aggressive: false,
      skipTests: true,
      preserveFormatting: true,
      dryRun: false
    }

    // Initialize the documentation transformer
    const transformer = new DocumentationTransformer()
    console.log('🔧 DocumentationTransformer initialized')

    // Check if transformer can handle this task
    const canHandle = transformer.canHandle(task, {
      framework: 'Next.js',
      version: '14',
      language: 'TypeScript',
      packageManager: 'pnpm',
      dependencies: [] as unknown as any
    })

    if (!canHandle) {
      throw new Error('DocumentationTransformer cannot handle this task')
    }

    console.log('✅ Task validation passed')
    console.log('🤖 Generating AI-powered README...')

    // Transform the README
    const result = await transformer.transform(currentReadme, options, task)

    if (!result.success) {
      console.error('❌ Transformation failed:')
      result.errors?.forEach(error => {
        console.error(`  - ${error.message}`)
        if (error.suggestions) {
          error.suggestions.forEach(suggestion => {
            console.error(`    💡 ${suggestion}`)
          })
        }
      })
      process.exit(1)
    }

    // Write the new README
    writeFileSync(readmePath, (result as any).code)
    console.log('✅ README.md updated successfully!')

    // Show summary
    console.log('\n📊 Transformation Summary:')
    console.log(`  - Confidence Score: ${result.metadata?.confidenceScore}%`)
    console.log(`  - Risk Score: ${result.metadata?.riskScore}%`)
    console.log(`  - Lines Added: ${result.metadata?.linesAdded || 0}`)
    console.log(`  - Lines Removed: ${result.metadata?.linesRemoved || 0}`)
    console.log(`  - Estimated Time Saved: ${result.metadata?.estimatedTimeSaved || 'N/A'}`)

    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      result.warnings.forEach(warning => {
        console.log(`  - ${(warning as any).message}`)
      })
    }

    console.log('\n🎉 README regeneration complete!')
    console.log('📖 Check README.md to see your new AI-generated documentation')

  } catch (error) {
    console.error('❌ Error regenerating README:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  regenerateReadme()
}

export { regenerateReadme }