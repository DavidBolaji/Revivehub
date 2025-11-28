/**
 * React hook for lazy loading components
 * Provides loading state and error handling for dynamically imported components
 */

import { useState, useEffect, useRef } from 'react'

/**
 * Hook for lazy loading components
 */
export function useLazyComponent<T>(
  loader: () => Promise<{ default: T }>,
  options?: {
    preload?: boolean
    onError?: (error: Error) => void
  }
) {
  const [component, setComponent] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const loadedRef = useRef(false)

  const load = async () => {
    if (loadedRef.current) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const module = await loader()
      setComponent(module.default)
      loadedRef.current = true
    } catch (err) {
      const error = err as Error
      setError(error)
      if (options?.onError) {
        options.onError(error)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (options?.preload) {
      load()
    }
  }, [options?.preload])

  return {
    component,
    loading,
    error,
    load,
    isLoaded: loadedRef.current,
  }
}

/**
 * Hook for lazy loading data
 */
export function useLazyData<T>(
  loader: () => Promise<T>,
  options?: {
    autoLoad?: boolean
    onError?: (error: Error) => void
  }
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const loadedRef = useRef(false)

  const load = async () => {
    if (loadedRef.current) {
      return data
    }

    setLoading(true)
    setError(null)

    try {
      const result = await loader()
      setData(result)
      loadedRef.current = true
      return result
    } catch (err) {
      const error = err as Error
      setError(error)
      if (options?.onError) {
        options.onError(error)
      }
      throw error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (options?.autoLoad) {
      load()
    }
  }, [options?.autoLoad])

  return {
    data,
    loading,
    error,
    load,
    isLoaded: loadedRef.current,
    reload: () => {
      loadedRef.current = false
      return load()
    },
  }
}

/**
 * Hook for intersection observer based lazy loading
 */
export function useIntersectionLazyLoad(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const targetRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(callback)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callbackRef.current()
            // Disconnect after first intersection
            if (observerRef.current) {
              observerRef.current.disconnect()
            }
          }
        })
      },
      {
        rootMargin: '50px',
        ...options,
      }
    )

    // Start observing
    observerRef.current.observe(target)

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [options])

  return targetRef
}

/**
 * Hook for deferred loading with priority
 */
export function useDeferredLoad<T>(
  loader: () => Promise<T>,
  priority: 'high' | 'medium' | 'low' = 'medium'
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Delay based on priority
    const delays = {
      high: 0,
      medium: 100,
      low: 500,
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const result = await loader()
        setData(result)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }, delays[priority])

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [loader, priority])

  return { data, loading, error }
}
