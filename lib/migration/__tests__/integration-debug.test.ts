/**
 * Debug test to see what's actually being returned
 */

import { describe, it, expect } from 'vitest'
import { HybridTransformationEngine } from '../hybrid-transformation-engine'
import type { MigrationSpecification, RepositoryFile } from '@/types/migration'

describe('Integration Debug', () => {
  it('should show what files are created', async () => {
    const engine = new HybridTransformationEngine()
    
    const migrationSpec: MigrationSpecification = {
      source: {
        language: 'javascript',
        framework: 'react',
        routing: 'react-router',
        patterns: [],
      },
      target: {
        language: 'typescript',
        framework: 'nextjs',
        version: '14.0.0',
        routing: 'app-router',
        fileStructure: {
          pages: 'app',
          components: 'components',
          layouts: 'app/layouts',
          api: 'app/api',
        },
        componentConventions: {
          namingConvention: 'PascalCase',
          fileExtension: '.tsx',
          exportStyle: 'named',
        },
        syntaxMappings: {},
        apiMappings: {},
        lifecycleMappings: {},
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
        estimatedEffort: 'medium',
        breakingChanges: [],
        manualSteps: [],
      },
    }

    const files: RepositoryFile[] = [
      {
        path: 'src/pages/index.tsx',
        content: `export default function Home() { return <div>Home</div> }`,
      },
    ]

    const results = await engine.transformBatch(files, migrationSpec)
    const resultsArray = Array.from(results.values())

    console.log('\n=== RESULTS ===')
    console.log(`Total results: ${resultsArray.length}`)
    
    resultsArray.forEach((result, index) => {
      console.log(`\n[${index}] ${result.newFilePath}`)
      console.log(`  - fileType: ${result.metadata.fileType}`)
      console.log(`  - hasFileStructureChange: ${!!result.metadata.fileStructureChange}`)
      if (result.metadata.fileStructureChange) {
        console.log(`  - action: ${result.metadata.fileStructureChange.action}`)
      }
    })

    const layoutFile = resultsArray.find(r => r.newFilePath === 'app/layout.tsx')
    console.log('\n=== LAYOUT FILE ===')
    console.log('Found:', !!layoutFile)
    if (layoutFile) {
      console.log('Metadata:', JSON.stringify(layoutFile.metadata, null, 2))
    }

    expect(resultsArray.length).toBeGreaterThan(1)
  })
})
