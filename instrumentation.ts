/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts up.
 * Used for configuration validation and initialization tasks.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server-side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateScannerConfig } = await import('./lib/scanner/config')
    
    // Validate scanner configuration on startup
    const validation = validateScannerConfig()
    
    if (!validation.valid) {
      console.error('❌ Scanner configuration validation failed:')
      validation.errors.forEach(error => {
        console.error(`  - ${error}`)
      })
      console.error('\nPlease check your environment variables and try again.')
      console.error('See .env.example for required configuration.\n')
      
      // In production, we might want to exit the process
      // In development, we'll just log the errors and continue
      if (process.env.NODE_ENV === 'production') {
        process.exit(1)
      }
    } else {
      console.log('✅ Scanner configuration validated successfully')
      if (validation.config) {
        console.log(`   - Timeout: ${validation.config.timeoutMs}ms`)
        console.log(`   - Max file size: ${validation.config.maxFileSizeMB}MB`)
        console.log(`   - Cache TTL: ${validation.config.cacheTTLSeconds}s`)
      }
    }
  }
}
