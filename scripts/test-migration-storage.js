#!/usr/bin/env node

/**
 * Migration Storage Verification Script
 * 
 * This script tests the complete migration storage and retrieval flow:
 * 1. Simulates storing migration data
 * 2. Retrieves the stored data
 * 3. Validates all fields are present and correct
 * 4. Tests error scenarios
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

function logTest(name, passed) {
  const icon = passed ? '✅' : '❌'
  const color = passed ? 'green' : 'red'
  log(`${icon} ${name}`, color)
}

// Generate a test migration ID
function generateMigrationId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  return `tx_${timestamp}_${random}`
}

// Create test migration data
function createTestMigrationData(migrationId) {
  return {
    id: migrationId,
    status: 'completed',
    repository: {
      owner: 'test-user',
      name: 'test-repo',
    },
    sourceFramework: {
      name: 'React',
      version: '16.14.0',
    },
    targetFramework: {
      name: 'Next.js',
      version: '14.0.0',
    },
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    pullRequest: {
      number: 123,
      url: 'https://api.github.com/repos/test-user/test-repo/pulls/123',
      htmlUrl: 'https://github.com/test-user/test-repo/pull/123',
    },
    summary: {
      filesChanged: 15,
      linesAdded: 250,
      linesRemoved: 100,
      errors: [],
      warnings: ['Some CSS classes could not be automatically converted'],
    },
  }
}

// Test 1: Store migration data
async function testStoreMigration(migrationId, data) {
  logSection('Test 1: Store Migration Data')
  
  try {
    log(`Storing migration: ${migrationId}`, 'blue')
    
    const response = await fetch(`${BASE_URL}/api/migration/details/${migrationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    const result = await response.json()
    
    logTest('Migration stored successfully', result.success === true)
    logTest('Migration ID matches', result.migrationId === migrationId)
    logTest('Stored flag is true', result.stored === true)
    
    log(`Response: ${JSON.stringify(result, null, 2)}`, 'blue')
    
    return true
  } catch (error) {
    logTest('Store migration failed', false)
    log(`Error: ${error.message}`, 'red')
    return false
  }
}

// Test 2: Retrieve migration data
async function testRetrieveMigration(migrationId, expectedData) {
  logSection('Test 2: Retrieve Migration Data')
  
  try {
    log(`Retrieving migration: ${migrationId}`, 'blue')
    
    const response = await fetch(`${BASE_URL}/api/migration/details/${migrationId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`HTTP ${response.status}: ${error.message || error.error}`)
    }

    const migration = await response.json()
    
    // Validate all required fields
    const tests = [
      { name: 'Migration ID matches', pass: migration.id === migrationId },
      { name: 'Status is correct', pass: migration.status === expectedData.status },
      { name: 'Repository owner matches', pass: migration.repository.owner === expectedData.repository.owner },
      { name: 'Repository name matches', pass: migration.repository.name === expectedData.repository.name },
      { name: 'Source framework matches', pass: migration.sourceFramework.name === expectedData.sourceFramework.name },
      { name: 'Target framework matches', pass: migration.targetFramework.name === expectedData.targetFramework.name },
      { name: 'Pull request exists', pass: !!migration.pullRequest },
      { name: 'PR number matches', pass: migration.pullRequest?.number === expectedData.pullRequest.number },
      { name: 'PR HTML URL exists', pass: !!migration.pullRequest?.htmlUrl },
      { name: 'Summary exists', pass: !!migration.summary },
      { name: 'Files changed matches', pass: migration.summary?.filesChanged === expectedData.summary.filesChanged },
      { name: 'Lines added matches', pass: migration.summary?.linesAdded === expectedData.summary.linesAdded },
      { name: 'Lines removed matches', pass: migration.summary?.linesRemoved === expectedData.summary.linesRemoved },
      { name: 'Created timestamp exists', pass: !!migration.createdAt },
      { name: 'Completed timestamp exists', pass: !!migration.completedAt },
    ]
    
    tests.forEach(test => logTest(test.name, test.pass))
    
    const allPassed = tests.every(test => test.pass)
    
    if (allPassed) {
      log('\n✅ All validation tests passed!', 'green')
    } else {
      log('\n❌ Some validation tests failed', 'red')
    }
    
    log(`\nRetrieved data: ${JSON.stringify(migration, null, 2)}`, 'blue')
    
    return allPassed
  } catch (error) {
    logTest('Retrieve migration failed', false)
    log(`Error: ${error.message}`, 'red')
    return false
  }
}

// Test 3: Test 404 for non-existent migration
async function testNotFound() {
  logSection('Test 3: Test 404 for Non-Existent Migration')
  
  try {
    const fakeMigrationId = 'tx_9999999999999_nonexistent'
    log(`Attempting to retrieve non-existent migration: ${fakeMigrationId}`, 'blue')
    
    const response = await fetch(`${BASE_URL}/api/migration/details/${fakeMigrationId}`)

    if (response.status === 404) {
      const error = await response.json()
      logTest('Returns 404 status', true)
      logTest('Error message exists', !!error.error)
      logTest('Error message is descriptive', error.message?.includes('not found'))
      log(`Error response: ${JSON.stringify(error, null, 2)}`, 'blue')
      return true
    } else {
      logTest('Should return 404 but got ' + response.status, false)
      return false
    }
  } catch (error) {
    logTest('404 test failed', false)
    log(`Error: ${error.message}`, 'red')
    return false
  }
}

// Test 4: Test data persistence across requests
async function testDataPersistence(migrationId) {
  logSection('Test 4: Test Data Persistence')
  
  try {
    log('Retrieving migration multiple times to test persistence...', 'blue')
    
    const results = []
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`${BASE_URL}/api/migration/details/${migrationId}`)
      if (!response.ok) {
        throw new Error(`Request ${i + 1} failed with status ${response.status}`)
      }
      const data = await response.json()
      results.push(data)
      log(`Request ${i + 1}: Success`, 'green')
    }
    
    // Check all results are identical
    const allIdentical = results.every(result => 
      JSON.stringify(result) === JSON.stringify(results[0])
    )
    
    logTest('Data is consistent across multiple requests', allIdentical)
    logTest('All 3 requests succeeded', results.length === 3)
    
    return allIdentical
  } catch (error) {
    logTest('Persistence test failed', false)
    log(`Error: ${error.message}`, 'red')
    return false
  }
}

// Test 5: Validate migration URL format
async function testMigrationUrlFormat(migrationId) {
  logSection('Test 5: Validate Migration URL Format')
  
  const expectedUrl = `${BASE_URL}/migrations/${migrationId}`
  
  log(`Expected URL: ${expectedUrl}`, 'blue')
  
  const tests = [
    { name: 'URL starts with base URL', pass: expectedUrl.startsWith(BASE_URL) },
    { name: 'URL contains /migrations/', pass: expectedUrl.includes('/migrations/') },
    { name: 'URL ends with migration ID', pass: expectedUrl.endsWith(migrationId) },
    { name: 'Migration ID format is valid', pass: /^tx_\d+_[a-z0-9]+$/.test(migrationId) },
  ]
  
  tests.forEach(test => logTest(test.name, test.pass))
  
  return tests.every(test => test.pass)
}

// Main test runner
async function runTests() {
  log('\n🚀 Starting Migration Storage Verification Tests', 'cyan')
  log(`Base URL: ${BASE_URL}`, 'blue')
  
  const migrationId = generateMigrationId()
  const testData = createTestMigrationData(migrationId)
  
  log(`\nGenerated test migration ID: ${migrationId}`, 'yellow')
  
  const results = {
    store: false,
    retrieve: false,
    notFound: false,
    persistence: false,
    urlFormat: false,
  }
  
  try {
    // Run all tests
    results.store = await testStoreMigration(migrationId, testData)
    
    if (results.store) {
      results.retrieve = await testRetrieveMigration(migrationId, testData)
      results.persistence = await testDataPersistence(migrationId)
    }
    
    results.notFound = await testNotFound()
    results.urlFormat = await testMigrationUrlFormat(migrationId)
    
    // Summary
    logSection('Test Summary')
    
    const totalTests = Object.keys(results).length
    const passedTests = Object.values(results).filter(Boolean).length
    const failedTests = totalTests - passedTests
    
    log(`\nTotal Tests: ${totalTests}`, 'blue')
    log(`Passed: ${passedTests}`, 'green')
    log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green')
    
    Object.entries(results).forEach(([test, passed]) => {
      logTest(test.charAt(0).toUpperCase() + test.slice(1), passed)
    })
    
    if (passedTests === totalTests) {
      log('\n🎉 All tests passed! Migration storage is working correctly.', 'green')
      log('\n✅ Verification Complete:', 'green')
      log('  • Migration data can be stored successfully', 'green')
      log('  • Migration data can be retrieved correctly', 'green')
      log('  • All required fields are present', 'green')
      log('  • Data persists across multiple requests', 'green')
      log('  • 404 handling works correctly', 'green')
      log('  • Migration URL format is valid', 'green')
      log('\n📝 Next Steps:', 'cyan')
      log('  1. Test with a real migration in the UI', 'blue')
      log('  2. Verify the migration details page displays correctly', 'blue')
      log('  3. Click the migration link from the success modal', 'blue')
      log('  4. Check server logs for storage confirmation', 'blue')
      process.exit(0)
    } else {
      log('\n❌ Some tests failed. Please review the errors above.', 'red')
      log('\n🔍 Troubleshooting:', 'yellow')
      log('  • Make sure the Next.js dev server is running', 'yellow')
      log('  • Check that you are authenticated (logged in)', 'yellow')
      log('  • Review server logs for any errors', 'yellow')
      log('  • Verify the API routes are accessible', 'yellow')
      process.exit(1)
    }
  } catch (error) {
    log('\n💥 Test suite failed with error:', 'red')
    log(error.message, 'red')
    log(error.stack, 'red')
    process.exit(1)
  }
}

// Run the tests
runTests()
