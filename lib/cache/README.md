# Client-Side Caching

This directory contains client-side caching utilities for ReviveHub.

## Overview

We use a two-tier caching strategy:

1. **localStorage Cache** - For scan results and migration plans (5-15 minutes TTL)
2. **SWR Cache** - For repository metadata and API responses (in-memory, automatic revalidation)

## localStorage Cache (`client-cache.ts`)

Used for caching large, expensive operations that should persist across page reloads.

### Usage

```typescript
import { ClientCache, CacheKeys, CacheTTL } from '@/lib/cache/client-cache'

// Store data
ClientCache.set(
  CacheKeys.scanResults(owner, repo),
  scanData,
  CacheTTL.SCAN_RESULTS
)

// Retrieve data
const cached = ClientCache.get<AnalysisReport>(
  CacheKeys.scanResults(owner, repo)
)

// Invalidate cache
ClientCache.remove(CacheKeys.scanResults(owner, repo))

// Clear all cache for a pattern
ClientCache.clearPattern('scan:')
```

### Cache Keys

- `scan:{owner}:{repo}` - Scan results (5 minutes)
- `repo:{owner}:{repo}` - Repository metadata (10 minutes)
- `plan:{owner}:{repo}` - Migration plans (15 minutes)

## SWR Cache

Used for repository metadata with automatic revalidation and deduplication.

### Hooks

#### `useRepositoryWithCache`

Fetch single repository with caching:

```typescript
import { useRepositoryWithCache } from '@/hooks/useRepositoryWithCache'

function MyComponent() {
  const { repository, loading, error, mutate } = useRepositoryWithCache(
    'owner',
    'repo'
  )

  // Force refresh
  const handleRefresh = () => mutate()

  return <div>{repository?.name}</div>
}
```

#### `useRepositoriesWithCache`

Fetch repositories list with caching:

```typescript
import { useRepositoriesWithCache } from '@/hooks/useRepositoriesWithCache'

function MyComponent() {
  const { repositories, loading, error, pagination, mutate } = 
    useRepositoriesWithCache({
      sort: 'updated',
      direction: 'desc',
      perPage: 30,
    })

  return <div>{repositories.map(r => r.name)}</div>
}
```

## Cache Invalidation

### On Rescan

When user clicks "Rescan Repository", we:
1. Remove localStorage cache for scan results
2. Remove localStorage cache for migration plan
3. Reset component state
4. Trigger new scan

```typescript
// Invalidate cache on rescan
ClientCache.remove(CacheKeys.scanResults(owner, repo))
ClientCache.remove(CacheKeys.migrationPlan(owner, repo))
```

### SWR Automatic Revalidation

SWR automatically revalidates data:
- On window focus
- On network reconnect
- On manual mutate() call

## Performance Benefits

1. **Reduced API calls** - Cached data served instantly
2. **Better UX** - Instant page loads with cached data
3. **Rate limit protection** - Fewer GitHub API calls
4. **Offline support** - localStorage persists across sessions

## Cache TTLs

| Data Type | Storage | TTL | Reason |
|-----------|---------|-----|--------|
| Scan Results | localStorage | 5 min | Expensive operation, changes infrequently |
| Repository Meta | SWR | 10 min | Moderate cost, updates occasionally |
| Migration Plan | localStorage | 15 min | Very expensive, rarely changes |
| Repositories List | SWR | 5 min | Frequent updates expected |
