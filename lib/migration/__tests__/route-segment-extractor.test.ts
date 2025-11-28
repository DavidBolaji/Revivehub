/**
 * Tests for RouteSegmentExtractor
 */

import { describe, it, expect } from 'vitest'
import { RouteSegmentExtractor } from '../route-segment-extractor'

describe('RouteSegmentExtractor', () => {
  const extractor = new RouteSegmentExtractor()

  describe('extractSegments', () => {
    it('should extract segments from simple page path', () => {
      const segments = extractor.extractSegments('pages/about.tsx')
      expect(segments).toEqual(['about'])
    })

    it('should extract segments from nested page path', () => {
      const segments = extractor.extractSegments('pages/blog/posts.tsx')
      expect(segments).toEqual(['blog', 'posts'])
    })

    it('should handle index files', () => {
      const segments = extractor.extractSegments('pages/index.tsx')
      expect(segments).toEqual([])
    })

    it('should handle nested index files', () => {
      const segments = extractor.extractSegments('pages/blog/index.tsx')
      expect(segments).toEqual(['blog'])
    })

    it('should extract dynamic route segments', () => {
      const segments = extractor.extractSegments('pages/blog/[id].tsx')
      expect(segments).toEqual(['blog', '[id]'])
    })

    it('should extract catch-all route segments', () => {
      const segments = extractor.extractSegments('pages/docs/[...slug].tsx')
      expect(segments).toEqual(['docs', '[...slug]'])
    })

    it('should extract optional catch-all route segments', () => {
      const segments = extractor.extractSegments('pages/shop/[[...slug]].tsx')
      expect(segments).toEqual(['shop', '[[...slug]]'])
    })

    it('should handle src prefix', () => {
      const segments = extractor.extractSegments('src/pages/about.tsx')
      expect(segments).toEqual(['about'])
    })

    it('should handle Windows paths', () => {
      const segments = extractor.extractSegments('pages\\blog\\[id].tsx')
      expect(segments).toEqual(['blog', '[id]'])
    })

    it('should handle API routes', () => {
      const segments = extractor.extractSegments('pages/api/users.ts')
      expect(segments).toEqual(['api', 'users'])
    })
  })

  describe('isDynamicSegment', () => {
    it('should identify dynamic segments', () => {
      expect(extractor.isDynamicSegment('[id]')).toBe(true)
      expect(extractor.isDynamicSegment('[slug]')).toBe(true)
      expect(extractor.isDynamicSegment('[userId]')).toBe(true)
    })

    it('should identify catch-all as dynamic', () => {
      expect(extractor.isDynamicSegment('[...slug]')).toBe(true)
      expect(extractor.isDynamicSegment('[[...slug]]')).toBe(true)
    })

    it('should not identify static segments as dynamic', () => {
      expect(extractor.isDynamicSegment('about')).toBe(false)
      expect(extractor.isDynamicSegment('blog')).toBe(false)
    })
  })

  describe('isCatchAllSegment', () => {
    it('should identify catch-all segments', () => {
      expect(extractor.isCatchAllSegment('[...slug]')).toBe(true)
      expect(extractor.isCatchAllSegment('[...path]')).toBe(true)
    })

    it('should not identify optional catch-all as catch-all', () => {
      expect(extractor.isCatchAllSegment('[[...slug]]')).toBe(false)
    })

    it('should not identify regular dynamic segments as catch-all', () => {
      expect(extractor.isCatchAllSegment('[id]')).toBe(false)
    })

    it('should not identify static segments as catch-all', () => {
      expect(extractor.isCatchAllSegment('about')).toBe(false)
    })
  })

  describe('isOptionalCatchAllSegment', () => {
    it('should identify optional catch-all segments', () => {
      expect(extractor.isOptionalCatchAllSegment('[[...slug]]')).toBe(true)
      expect(extractor.isOptionalCatchAllSegment('[[...path]]')).toBe(true)
    })

    it('should not identify regular catch-all as optional', () => {
      expect(extractor.isOptionalCatchAllSegment('[...slug]')).toBe(false)
    })

    it('should not identify regular dynamic segments as optional catch-all', () => {
      expect(extractor.isOptionalCatchAllSegment('[id]')).toBe(false)
    })
  })

  describe('extractParamName', () => {
    it('should extract param name from dynamic segment', () => {
      expect(extractor.extractParamName('[id]')).toBe('id')
      expect(extractor.extractParamName('[slug]')).toBe('slug')
      expect(extractor.extractParamName('[userId]')).toBe('userId')
    })

    it('should extract param name from catch-all segment', () => {
      expect(extractor.extractParamName('[...slug]')).toBe('slug')
      expect(extractor.extractParamName('[...path]')).toBe('path')
    })

    it('should extract param name from optional catch-all segment', () => {
      expect(extractor.extractParamName('[[...slug]]')).toBe('slug')
      expect(extractor.extractParamName('[[...path]]')).toBe('path')
    })

    it('should return undefined for static segments', () => {
      expect(extractor.extractParamName('about')).toBeUndefined()
      expect(extractor.extractParamName('blog')).toBeUndefined()
    })
  })

  describe('convertToAppRouterPath', () => {
    it('should convert root index to app/page.tsx', () => {
      const path = extractor.convertToAppRouterPath('pages/index.tsx')
      expect(path).toBe('app/page.tsx')
    })

    it('should convert simple page to app/[name]/page.tsx', () => {
      const path = extractor.convertToAppRouterPath('pages/about.tsx')
      expect(path).toBe('app/about/page.tsx')
    })

    it('should convert nested page', () => {
      const path = extractor.convertToAppRouterPath('pages/blog/posts.tsx')
      expect(path).toBe('app/blog/posts/page.tsx')
    })

    it('should convert dynamic route', () => {
      const path = extractor.convertToAppRouterPath('pages/blog/[id].tsx')
      expect(path).toBe('app/blog/[id]/page.tsx')
    })

    it('should convert catch-all route', () => {
      const path = extractor.convertToAppRouterPath('pages/docs/[...slug].tsx')
      expect(path).toBe('app/docs/[...slug]/page.tsx')
    })

    it('should convert API route to route.ts', () => {
      const path = extractor.convertToAppRouterPath('pages/api/users.ts', 'route')
      expect(path).toBe('app/api/users/route.ts')
    })

    it('should convert nested API route', () => {
      const path = extractor.convertToAppRouterPath(
        'pages/api/users/[id].ts',
        'route'
      )
      expect(path).toBe('app/api/users/[id]/route.ts')
    })

    it('should handle src prefix', () => {
      const path = extractor.convertToAppRouterPath('src/pages/about.tsx')
      expect(path).toBe('app/about/page.tsx')
    })
  })

  describe('isApiRoute', () => {
    it('should identify API routes', () => {
      expect(extractor.isApiRoute('pages/api/users.ts')).toBe(true)
      expect(extractor.isApiRoute('pages/api/posts/[id].ts')).toBe(true)
      expect(extractor.isApiRoute('src/pages/api/auth.ts')).toBe(true)
    })

    it('should not identify page routes as API routes', () => {
      expect(extractor.isApiRoute('pages/about.tsx')).toBe(false)
      expect(extractor.isApiRoute('pages/blog/[id].tsx')).toBe(false)
    })
  })

  describe('isPageRoute', () => {
    it('should identify page routes', () => {
      expect(extractor.isPageRoute('pages/about.tsx')).toBe(true)
      expect(extractor.isPageRoute('pages/blog/[id].tsx')).toBe(true)
      expect(extractor.isPageRoute('src/pages/index.tsx')).toBe(true)
    })

    it('should not identify API routes as page routes', () => {
      expect(extractor.isPageRoute('pages/api/users.ts')).toBe(false)
      expect(extractor.isPageRoute('pages/api/posts/[id].ts')).toBe(false)
    })

    it('should not identify component files as page routes', () => {
      expect(extractor.isPageRoute('components/Header.tsx')).toBe(false)
      expect(extractor.isPageRoute('lib/utils.ts')).toBe(false)
    })
  })

  describe('extractDetailedSegments', () => {
    it('should extract detailed segment information', () => {
      const segments = extractor.extractDetailedSegments('pages/blog/[id]/comments.tsx')
      
      expect(segments).toHaveLength(3)
      
      expect(segments[0]).toEqual({
        segment: 'blog',
        isDynamic: false,
        isCatchAll: false,
        isOptionalCatchAll: false,
        paramName: undefined,
      })
      
      expect(segments[1]).toEqual({
        segment: '[id]',
        isDynamic: true,
        isCatchAll: false,
        isOptionalCatchAll: false,
        paramName: 'id',
      })
      
      expect(segments[2]).toEqual({
        segment: 'comments',
        isDynamic: false,
        isCatchAll: false,
        isOptionalCatchAll: false,
        paramName: undefined,
      })
    })

    it('should handle catch-all segments', () => {
      const segments = extractor.extractDetailedSegments('pages/docs/[...slug].tsx')
      
      expect(segments[1]).toEqual({
        segment: '[...slug]',
        isDynamic: true,
        isCatchAll: true,
        isOptionalCatchAll: false,
        paramName: 'slug',
      })
    })

    it('should handle optional catch-all segments', () => {
      const segments = extractor.extractDetailedSegments('pages/shop/[[...slug]].tsx')
      
      expect(segments[1]).toEqual({
        segment: '[[...slug]]',
        isDynamic: true,
        isCatchAll: false,
        isOptionalCatchAll: true,
        paramName: 'slug',
      })
    })
  })

  describe('buildAppRouterPath', () => {
    it('should build path from segments', () => {
      const path = extractor.buildAppRouterPath(['blog', '[id]', 'comments'])
      expect(path).toBe('blog/[id]/comments')
    })

    it('should handle empty segments as root', () => {
      const path = extractor.buildAppRouterPath([])
      expect(path).toBe('(root)')
    })

    it('should handle single segment', () => {
      const path = extractor.buildAppRouterPath(['about'])
      expect(path).toBe('about')
    })
  })
})
