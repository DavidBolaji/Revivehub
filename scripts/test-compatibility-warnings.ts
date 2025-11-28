/**
 * Test script for Compatibility Checking
 * 
 * Demonstrates how the dependency updater warns about:
 * - Peer dependency conflicts
 * - Breaking changes
 * - Major version updates
 */

import { DependencyUpdaterTransformer } from '../lib/transformers/dependencies/dependency-updater'
import type { Task } from '../types/transformer'

async function testCompatibilityWarnings() {
  console.log('🧪 Testing Compatibility Warnings\n')

  // Create a package.json with dependencies that will trigger warnings
  const mockPackageJson = {
    name: 'test-project',
    version: '1.0.0',
    dependencies: {
      'react': '^17.0.0',      // Will update to 18.x (breaking changes)
      'react-dom': '^17.0.0',  // Must match react version
      'next': '^13.0.0',       // Will update to 14.x (breaking changes)
    },
    devDependencies: {
      'typescript': '^4.9.0',  // Will update to 5.x (breaking changes)
      'eslint': '^8.0.0',      // Will update to 9.x (breaking changes)
    }
  }

  const code = JSON.stringify(mockPackageJson, null, 2)

  console.log('📦 Original package.json:')
  console.log(code)
  console.log('\n' + '='.repeat(80) + '\n')

  // Create a mock task
  const mockTask: Task = {
    id: 'test-compat-check',
    name: 'Update Dependencies with Compatibility Check',
    description: 'Update outdated packages and check for breaking changes',
    type: 'automated',
    estimatedMinutes: 5,
    automatedMinutes: 5,
    riskLevel: 'medium',
    affectedFiles: ['package.json'],
    dependencies: [],
    breakingChanges: [],
    pattern: {
      id: 'outdated-deps',
      name: 'Outdated Dependencies',
      category: 'dependency',
      description: 'Multiple packages need updates',
      severity: 'medium',
      occurrences: 5,
      affectedFiles: ['package.json'],
      automated: true,
    }
  }

  // Run the transformer
  console.log('🔄 Running DependencyUpdaterTransformer with Compatibility Checking...\n')
  
  const transformer = new DependencyUpdaterTransformer()
  const result = await transformer.transform(code, {}, mockTask)

  console.log('✅ Transformation Result:')
  console.log('Success:', result.success)
  console.log('Errors:', result.errors?.length || 0)
  console.log('Warnings:', result.warnings?.length || 0)
  console.log('\n')

  if (result.success && result.code) {
    console.log('📦 Updated package.json:')
    console.log(result.code)
    console.log('\n' + '='.repeat(80) + '\n')

    // Parse and compare
    const original = JSON.parse(code)
    const updated = JSON.parse(result.code)

    console.log('📊 Changes Applied:')
    console.log('\n✨ Dependencies:')
    for (const [pkg, version] of Object.entries(original.dependencies)) {
      const newVersion = updated.dependencies[pkg]
      if (newVersion !== version) {
        console.log(`  ✓ ${pkg}: ${version} → ${newVersion}`)
      }
    }

    console.log('\n✨ Dev Dependencies:')
    for (const [pkg, version] of Object.entries(original.devDependencies)) {
      const newVersion = updated.devDependencies[pkg]
      if (newVersion !== version) {
        console.log(`  ✓ ${pkg}: ${version} → ${newVersion}`)
      }
    }

    console.log('\n' + '='.repeat(80) + '\n')
  }

  // Display warnings
  if (result.warnings && result.warnings.length > 0) {
    console.log('⚠️  COMPATIBILITY WARNINGS:\n')
    result.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning}`)
    })
    console.log('\n' + '='.repeat(80) + '\n')
  }

  // Display metadata
  if (result.metadata) {
    console.log('📈 Metadata:')
    console.log('  Confidence Score:', result.metadata.confidenceScore)
    console.log('  Risk Score:', result.metadata.riskScore)
    console.log('  Requires Manual Review:', result.metadata.requiresManualReview)
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

  console.log('\n✅ Test completed!')
  console.log('\n💡 Key Takeaways:')
  console.log('  • Compatibility warnings help prevent build failures')
  console.log('  • Breaking changes are documented for each major update')
  console.log('  • Users are guided on what to test after updates')
  console.log('  • Safe, incremental updates (one major version at a time)')
}

// Run the test
testCompatibilityWarnings().catch(console.error)
