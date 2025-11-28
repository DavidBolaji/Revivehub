/**
 * Test script for DependencyUpdaterTransformer
 * 
 * Tests the dependency updater by:
 * 1. Creating a mock package.json with outdated dependencies
 * 2. Running the transformer
 * 3. Verifying that dependencies are actually updated
 */

import { DependencyUpdaterTransformer } from '../lib/transformers/dependencies/dependency-updater'
import type { Task } from '../types/transformer'

async function testDependencyUpdater() {
  console.log('🧪 Testing DependencyUpdaterTransformer\n')

  // Create a mock package.json with some outdated dependencies
  const mockPackageJson = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      'react': '^17.0.0',  // Outdated - latest is 18.x
      'next': '^13.0.0',   // Outdated - latest is 14.x
      'axios': '^0.27.0',  // Outdated - latest is 1.x
    },
    devDependencies: {
      'typescript': '^4.9.0',  // Outdated - latest is 5.x
      'eslint': '^8.0.0',      // May be up to date
    }
  }

  const code = JSON.stringify(mockPackageJson, null, 2)

  console.log('📦 Original package.json:')
  console.log(code)
  console.log('\n' + '='.repeat(60) + '\n')

  // Create a mock task
  const mockTask: Task = {
    id: 'test-dep-update',
    name: 'Update Outdated Dependencies',
    description: 'Update outdated npm packages to their latest versions',
    type: 'automated',
    estimatedMinutes: 5,
    automatedMinutes: 5,
    riskLevel: 'low',
    affectedFiles: ['package.json'],
    dependencies: [],
    breakingChanges: [],
    pattern: {
      id: 'outdated-deps',
      name: 'Outdated Dependencies',
      category: 'dependency',
      description: 'Multiple packages need updates',
      severity: 'medium',
      occurrences: 12,
      affectedFiles: ['package.json'],
      automated: true,
    }
  }

  // Run the transformer
  console.log('🔄 Running DependencyUpdaterTransformer...\n')
  
  const transformer = new DependencyUpdaterTransformer()
  const result = await transformer.transform(code, {}, mockTask)

  console.log('✅ Transformation Result:')
  console.log('Success:', result.success)
  console.log('Errors:', result.errors?.length || 0)
  console.log('Warnings:', result.warnings?.length || 0)
  console.log('\n')

  if (result.errors && result.errors.length > 0) {
    console.log('❌ Errors:')
    result.errors.forEach(err => {
      console.log(`  - ${err.message}`)
    })
    console.log('\n')
  }

  if (result.warnings && result.warnings.length > 0) {
    console.log('⚠️  Warnings:')
    result.warnings.forEach(warn => {
      console.log(`  - ${warn}`)
    })
    console.log('\n')
  }

  if (result.success && result.code) {
    console.log('📦 Updated package.json:')
    console.log(result.code)
    console.log('\n' + '='.repeat(60) + '\n')

    // Parse and compare
    const original = JSON.parse(code)
    const updated = JSON.parse(result.code)

    console.log('📊 Changes Summary:')
    console.log('\nDependencies:')
    for (const [pkg, version] of Object.entries(original.dependencies)) {
      const newVersion = updated.dependencies[pkg]
      if (newVersion !== version) {
        console.log(`  ✓ ${pkg}: ${version} → ${newVersion}`)
      } else {
        console.log(`  - ${pkg}: ${version} (no change)`)
      }
    }

    console.log('\nDev Dependencies:')
    for (const [pkg, version] of Object.entries(original.devDependencies)) {
      const newVersion = updated.devDependencies[pkg]
      if (newVersion !== version) {
        console.log(`  ✓ ${pkg}: ${version} → ${newVersion}`)
      } else {
        console.log(`  - ${pkg}: ${version} (no change)`)
      }
    }

    console.log('\n' + '='.repeat(60) + '\n')

    if (result.metadata) {
      console.log('📈 Metadata:')
      console.log('  Confidence Score:', result.metadata.confidenceScore)
      console.log('  Risk Score:', result.metadata.riskScore)
      console.log('  Lines Added:', result.metadata.linesAdded)
      console.log('  Lines Removed:', result.metadata.linesRemoved)
      console.log('  Estimated Time Saved:', result.metadata.estimatedTimeSaved)
      
      if (result.metadata.transformationsApplied) {
        console.log('\n  Transformations Applied:')
        result.metadata.transformationsApplied.forEach((t: string) => {
          console.log(`    - ${t}`)
        })
      }
    }
  }

  console.log('\n✅ Test completed!')
}

// Run the test
testDependencyUpdater().catch(console.error)
