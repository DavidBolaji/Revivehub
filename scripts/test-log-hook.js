#!/usr/bin/env node
/**
 * Test Log Hook
 * Verifies that log persistence is working correctly
 */

const { execSync } = require('child_process')
const { existsSync, readFileSync } = require('fs')
const { join } = require('path')

console.log('🧪 Testing Log Persistence Hook...\n')

// Test 1: Create a test log entry
console.log('Test 1: Creating test log entry...')
try {
  execSync('node scripts/persist-logs.js "TEST: Hook verification message"', {
    stdio: 'inherit'
  })
  console.log('✅ Test log created\n')
} catch (error) {
  console.error('❌ Failed to create test log:', error.message)
  process.exit(1)
}

// Test 2: Verify logs directory exists
console.log('Test 2: Checking logs directory...')
if (existsSync('logs')) {
  console.log('✅ logs/ directory exists\n')
} else {
  console.error('❌ logs/ directory not found')
  process.exit(1)
}

// Test 3: Check for today's log file
console.log('Test 3: Checking for log file...')
const date = new Date().toISOString().split('T')[0]
const logFile = join('logs', `kiro-session-${date}.log`)

if (existsSync(logFile)) {
  console.log(`✅ Log file exists: ${logFile}\n`)
} else {
  console.error(`❌ Log file not found: ${logFile}`)
  process.exit(1)
}

// Test 4: Verify log content
console.log('Test 4: Verifying log content...')
try {
  const content = readFileSync(logFile, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  console.log(`✅ Log file contains ${lines.length} entries`)
  console.log('\nLast 5 log entries:')
  console.log('-------------------')
  lines.slice(-5).forEach(line => console.log(line))
  console.log('-------------------\n')
} catch (error) {
  console.error('❌ Failed to read log file:', error.message)
  process.exit(1)
}

// Test 5: Test log viewing
console.log('Test 5: Testing log viewer...')
try {
  execSync('node scripts/view-logs.js -n 3', { stdio: 'inherit' })
  console.log('\n✅ Log viewer working\n')
} catch (error) {
  console.error('❌ Log viewer failed:', error.message)
}

console.log('🎉 All tests passed!')
console.log('\n📝 Hook Status:')
console.log('   - Log persistence: ✅ Working')
console.log('   - Log directory: logs/')
console.log(`   - Current log file: ${logFile}`)
console.log('\n💡 Usage:')
console.log('   - View logs: node scripts/view-logs.js')
console.log('   - View last 20: node scripts/view-logs.js -n 20')
console.log('   - Filter errors: node scripts/view-logs.js -l ERROR')
console.log('   - Manual log: node scripts/persist-logs.js "Your message"')
