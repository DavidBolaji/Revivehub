/**
 * SWR configuration and provider setup
 */

import { SWRConfiguration } from 'swr'

/**
 * Global SWR configuration
 * Applied to all SWR hooks in the application
 */
export const swrConfig: SWRConfiguration = {
  // Revalidate when window regains focus
  revalidateOnFocus: true,
  
  // Revalidate when network reconnects
  revalidateOnReconnect: true,
  
  // Dedupe requests within 10 seconds
  dedupingInterval: 10000,
  
  // Don't auto-refresh by default
  refreshInterval: 0,
  
  // Retry on error
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  
  // Keep previous data while revalidating
  keepPreviousData: true,
  
  // Fallback to cache while revalidating
  revalidateIfStale: true,
  
  // Use cache for initial data
  fallbackData: undefined,
}

/**
 * Cache time-to-live configurations (in milliseconds)
 */
export const SWR_CACHE_TTL = {
  REPOSITORY: 10 * 60 * 1000, // 10 minutes
  REPOSITORIES_LIST: 5 * 60 * 1000, // 5 minutes
  SCAN_RESULTS: 5 * 60 * 1000, // 5 minutes (also in localStorage)
  MIGRATION_PLAN: 15 * 60 * 1000, // 15 minutes (also in localStorage)
}
