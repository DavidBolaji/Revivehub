#!/usr/bin/env tsx

/**
 * Test script to verify progress tracking functionality
 */

// Mock progress messages that would come from SSE
const mockProgressMessages = [
  '📥 Fetching repository files from GitHub...',
  '✓ Fetched 25 files (1.2MB)',
  '🔍 Extracting selected tasks...',
  '✓ Found 3 tasks to execute',
  '📋 Organized into 2 phases',
  '⚙️ Starting Phase 1: Dependencies...',
  '📝 Updating package.json...',
  '✓ package.json transformed (+5 -2 lines)',
  '⚙️ Starting Phase 2: Documentation...',
  '🤖 Analyzing project structure with AI...',
  '📝 Generating README...',
  '✓ README.md transformed (+150 -0 lines)',
  '🎉 Transformation completed successfully!'
]

// Simulate the progress parsing logic
function parseProgressMessage(message: string) {
  // Extract phase information
  const phaseMatch = message.match(/Phase (\d+): (.+)/)
  if (phaseMatch) {
    return {
      type: 'phase' as const,
      order: parseInt(phaseMatch[1]),
      name: phaseMatch[2],
    }
  }

  // Extract task information - more patterns
  const taskMatch = message.match(/⚙️ (.+)\.\.\./) || 
                   message.match(/📝 (.+)\.\.\./) ||
                   message.match(/🔍 (.+)\.\.\./) ||
                   message.match(/🤖 (.+)\.\.\./)
  if (taskMatch) {
    return {
      type: 'task' as const,
      name: taskMatch[1],
    }
  }

  // Extract file information - more patterns
  const fileMatch = message.match(/✓ (.+) transformed/) ||
                   message.match(/✅ (.+) generated/) ||
                   message.match(/📄 (.+) updated/)
  if (fileMatch) {
    return {
      type: 'file' as const,
      path: fileMatch[1],
    }
  }

  // Extract progress indicators
  if (message.includes('Fetching repository files') || 
      message.includes('📥 Fetching')) {
    return { type: 'progress' as const, stage: 'fetching', progress: 10 }
  }
  
  if (message.includes('Extracting selected tasks') || 
      message.includes('🔍 Extracting')) {
    return { type: 'progress' as const, stage: 'extracting', progress: 20 }
  }
  
  if (message.includes('Analyzing repository structure') || 
      message.includes('🤖 Analyzing')) {
    return { type: 'progress' as const, stage: 'analyzing', progress: 30 }
  }

  return null
}

function calculateProgress(message: string, currentProgress: number) {
  const parsed = parseProgressMessage(message)
  let newProgress = currentProgress
  
  // Use parsed progress information if available
  if (parsed?.type === 'progress') {
    newProgress = Math.max(parsed.progress, currentProgress)
  } else if (parsed?.type === 'phase') {
    // Phase-based progress
    const phaseProgress = {
      1: 30, // Dependencies
      2: 50, // Structural
      3: 70, // Components
      4: 85  // Documentation
    }[parsed.order] || currentProgress
    newProgress = Math.max(phaseProgress, currentProgress)
  } else if (parsed?.type === 'file') {
    // Increment progress for each file transformed
    newProgress = Math.min(currentProgress + 3, 95)
  } else if (parsed?.type === 'task') {
    // Small increment for task start
    newProgress = Math.min(currentProgress + 1, 90)
  } else {
    // Fallback to message pattern matching
    if (message.includes('Fetching repository files') || message.includes('📥')) {
      newProgress = Math.max(10, currentProgress)
    } else if (message.includes('Extracting selected tasks') || message.includes('🔍')) {
      newProgress = Math.max(20, currentProgress)
    } else if (message.includes('transformed') || message.includes('✓')) {
      newProgress = Math.min(currentProgress + 2, 95)
    } else if (message.includes('Analyzing') || message.includes('Processing') || message.includes('🤖')) {
      newProgress = Math.min(currentProgress + 1, 90)
    }
  }
  
  return Math.max(newProgress, currentProgress)
}

async function testProgressTracking() {
  console.log('🧪 Testing Progress Tracking...\n')
  
  let currentProgress = 0
  
  for (const message of mockProgressMessages) {
    const newProgress = calculateProgress(message, currentProgress)
    const progressChanged = newProgress !== currentProgress
    
    console.log(`📊 ${currentProgress.toFixed(1)}% → ${newProgress.toFixed(1)}% ${progressChanged ? '📈' : '➡️'} ${message}`)
    
    currentProgress = newProgress
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Final completion
  currentProgress = 100
  console.log(`📊 ${currentProgress.toFixed(1)}% ✅ Transformation completed!\n`)
  
  console.log('🎉 Progress tracking test completed!')
  console.log(`Final progress: ${currentProgress}%`)
}

// Run the test
testProgressTracking()