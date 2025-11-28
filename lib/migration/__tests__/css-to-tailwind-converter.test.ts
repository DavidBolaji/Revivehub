/**
 * Tests for CSSToTailwindConverter
 */

import { describe, it, expect } from 'vitest'
import { CSSToTailwindConverter } from '../css-to-tailwind-converter'
import type { CSSClass } from '../css-analyzer'

describe('CSSToTailwindConverter', () => {
  const converter = new CSSToTailwindConverter()

  describe('convertClass', () => {
    it('should convert simple padding and background', () => {
      const cssClass: CSSClass = {
        name: 'btn',
        properties: [
          { property: 'padding', value: '10px 20px', important: false },
          { property: 'background-color', value: '#3490dc', important: false },
        ],
        selector: '.btn',
        specificity: 10,
      }

      const result = converter.convertClass(cssClass)

      expect(result.tailwindClasses).toContain('py-2.5')
      expect(result.tailwindClasses).toContain('px-5')
      expect(result.tailwindClasses).toContain('bg-[#3490dc]')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should handle hover pseudo-class', () => {
      const cssClass: CSSClass = {
        name: 'btn',
        properties: [
          { property: 'background-color', value: 'blue', important: false },
        ],
        selector: '.btn:hover',
        specificity: 10,
        pseudoClass: 'hover',
      }

      const result = converter.convertClass(cssClass)

      expect(result.tailwindClasses).toContain('hover:bg-blue-500')
    })

    it('should handle focus pseudo-class', () => {
      const cssClass: CSSClass = {
        name: 'input',
        properties: [
          { property: 'border-color', value: 'blue', important: false },
        ],
        selector: '.input:focus',
        specificity: 10,
        pseudoClass: 'focus',
      }

      const result = converter.convertClass(cssClass)

      expect(result.tailwindClasses).toContain('focus:border-blue-500')
    })

    it('should add notes for unconvertible properties', () => {
      const cssClass: CSSClass = {
        name: 'custom',
        properties: [
          { property: 'unknown-property', value: 'value', important: false },
        ],
        selector: '.custom',
        specificity: 10,
      }

      const result = converter.convertClass(cssClass)

      expect(result.notes.length).toBeGreaterThan(0)
      expect(result.notes[0]).toContain('Could not convert')
    })
  })

  describe('display properties', () => {
    it('should convert display values', () => {
      const testCases = [
        { value: 'flex', expected: 'flex' },
        { value: 'block', expected: 'block' },
        { value: 'inline-block', expected: 'inline-block' },
        { value: 'grid', expected: 'grid' },
        { value: 'none', expected: 'hidden' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'display',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
        expect(result.confidence).toBe(100)
      }
    })
  })

  describe('flexbox properties', () => {
    it('should convert flex-direction', () => {
      const testCases = [
        { value: 'row', expected: 'flex-row' },
        { value: 'column', expected: 'flex-col' },
        { value: 'row-reverse', expected: 'flex-row-reverse' },
        { value: 'column-reverse', expected: 'flex-col-reverse' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'flex-direction',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert justify-content', () => {
      const testCases = [
        { value: 'center', expected: 'justify-center' },
        { value: 'space-between', expected: 'justify-between' },
        { value: 'flex-start', expected: 'justify-start' },
        { value: 'flex-end', expected: 'justify-end' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'justify-content',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert align-items', () => {
      const testCases = [
        { value: 'center', expected: 'items-center' },
        { value: 'flex-start', expected: 'items-start' },
        { value: 'flex-end', expected: 'items-end' },
        { value: 'stretch', expected: 'items-stretch' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'align-items',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })
  })

  describe('spacing properties', () => {
    it('should convert single margin value', () => {
      const result = converter.convertProperty({
        property: 'margin',
        value: '16px',
        important: false,
      })

      expect(result.classes).toContain('m-4')
    })

    it('should convert margin shorthand (2 values)', () => {
      const result = converter.convertProperty({
        property: 'margin',
        value: '10px 20px',
        important: false,
      })

      expect(result.classes).toContain('my-2.5')
      expect(result.classes).toContain('mx-5')
    })

    it('should convert margin shorthand (4 values)', () => {
      const result = converter.convertProperty({
        property: 'margin',
        value: '8px 16px 12px 4px',
        important: false,
      })

      expect(result.classes).toContain('mt-2')
      expect(result.classes).toContain('mr-4')
      expect(result.classes).toContain('mb-3')
      expect(result.classes).toContain('ml-1')
    })

    it('should convert padding values', () => {
      const result = converter.convertProperty({
        property: 'padding',
        value: '20px',
        important: false,
      })

      expect(result.classes).toContain('p-5')
    })

    it('should handle auto value', () => {
      const result = converter.convertProperty({
        property: 'margin',
        value: 'auto',
        important: false,
      })

      expect(result.classes).toContain('m-auto')
    })

    it('should handle zero value', () => {
      const result = converter.convertProperty({
        property: 'padding',
        value: '0',
        important: false,
      })

      expect(result.classes).toContain('p-0')
    })
  })

  describe('sizing properties', () => {
    it('should convert width percentages', () => {
      const testCases = [
        { value: '100%', expected: 'w-full' },
        { value: '50%', expected: 'w-1/2' },
        { value: '33%', expected: 'w-1/3' },
        { value: '25%', expected: 'w-1/4' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'width',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert height values', () => {
      const result = converter.convertProperty({
        property: 'height',
        value: '64px',
        important: false,
      })

      expect(result.classes).toContain('h-16')
    })

    it('should convert max-width', () => {
      const result = converter.convertProperty({
        property: 'max-width',
        value: '384px',
        important: false,
      })

      expect(result.classes).toContain('max-w-96')
    })
  })

  describe('typography properties', () => {
    it('should convert font-size', () => {
      const testCases = [
        { value: '12px', expected: 'text-xs' },
        { value: '14px', expected: 'text-sm' },
        { value: '16px', expected: 'text-base' },
        { value: '18px', expected: 'text-lg' },
        { value: '24px', expected: 'text-2xl' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'font-size',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert font-weight', () => {
      const testCases = [
        { value: '400', expected: 'font-normal' },
        { value: '500', expected: 'font-medium' },
        { value: '600', expected: 'font-semibold' },
        { value: '700', expected: 'font-bold' },
        { value: 'bold', expected: 'font-bold' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'font-weight',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert text-align', () => {
      const testCases = [
        { value: 'left', expected: 'text-left' },
        { value: 'center', expected: 'text-center' },
        { value: 'right', expected: 'text-right' },
        { value: 'justify', expected: 'text-justify' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'text-align',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert text-decoration', () => {
      const testCases = [
        { value: 'underline', expected: 'underline' },
        { value: 'line-through', expected: 'line-through' },
        { value: 'none', expected: 'no-underline' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'text-decoration',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert text-transform', () => {
      const testCases = [
        { value: 'uppercase', expected: 'uppercase' },
        { value: 'lowercase', expected: 'lowercase' },
        { value: 'capitalize', expected: 'capitalize' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'text-transform',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })
  })

  describe('color properties', () => {
    it('should convert named colors', () => {
      const result = converter.convertProperty({
        property: 'color',
        value: 'blue',
        important: false,
      })

      expect(result.classes).toContain('text-blue-500')
    })

    it('should convert hex colors', () => {
      const result = converter.convertProperty({
        property: 'background-color',
        value: '#3490dc',
        important: false,
      })

      expect(result.classes).toContain('bg-[#3490dc]')
    })

    it('should convert rgb colors', () => {
      const result = converter.convertProperty({
        property: 'color',
        value: 'rgb(52, 144, 220)',
        important: false,
      })

      expect(result.classes).toContain('text-[rgb(52, 144, 220)]')
    })

    it('should convert border colors', () => {
      const result = converter.convertProperty({
        property: 'border-color',
        value: 'red',
        important: false,
      })

      expect(result.classes).toContain('border-red-500')
    })
  })

  describe('border properties', () => {
    it('should convert border-width', () => {
      const testCases = [
        { value: '0', expected: 'border-0' },
        { value: '1px', expected: 'border' },
        { value: '2px', expected: 'border-2' },
        { value: '4px', expected: 'border-4' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'border-width',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert border-radius', () => {
      const testCases = [
        { value: '0', expected: 'rounded-none' },
        { value: '4px', expected: 'rounded' },
        { value: '8px', expected: 'rounded-lg' },
        { value: '9999px', expected: 'rounded-full' },
        { value: '50%', expected: 'rounded-full' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'border-radius',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert border-style', () => {
      const testCases = [
        { value: 'solid', expected: 'border-solid' },
        { value: 'dashed', expected: 'border-dashed' },
        { value: 'dotted', expected: 'border-dotted' },
        { value: 'none', expected: 'border-none' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'border-style',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })
  })

  describe('position properties', () => {
    it('should convert position values', () => {
      const testCases = [
        { value: 'relative', expected: 'relative' },
        { value: 'absolute', expected: 'absolute' },
        { value: 'fixed', expected: 'fixed' },
        { value: 'sticky', expected: 'sticky' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'position',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert top/right/bottom/left', () => {
      const result = converter.convertProperty({
        property: 'top',
        value: '16px',
        important: false,
      })

      expect(result.classes).toContain('top-4')
    })
  })

  describe('other properties', () => {
    it('should convert overflow', () => {
      const testCases = [
        { value: 'hidden', expected: 'overflow-hidden' },
        { value: 'auto', expected: 'overflow-auto' },
        { value: 'scroll', expected: 'overflow-scroll' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'overflow',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert opacity', () => {
      const testCases = [
        { value: '0', expected: 'opacity-0' },
        { value: '0.5', expected: 'opacity-50' },
        { value: '1', expected: 'opacity-100' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'opacity',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })

    it('should convert cursor', () => {
      const testCases = [
        { value: 'pointer', expected: 'cursor-pointer' },
        { value: 'not-allowed', expected: 'cursor-not-allowed' },
        { value: 'text', expected: 'cursor-text' },
      ]

      for (const { value, expected } of testCases) {
        const result = converter.convertProperty({
          property: 'cursor',
          value,
          important: false,
        })

        expect(result.classes).toContain(expected)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle unknown properties', () => {
      const result = converter.convertProperty({
        property: 'unknown-property',
        value: 'value',
        important: false,
      })

      expect(result.classes).toHaveLength(0)
      expect(result.confidence).toBe(0)
    })

    it('should handle rem values', () => {
      const result = converter.convertProperty({
        property: 'padding',
        value: '1rem',
        important: false,
      })

      expect(result.classes).toContain('p-4')
    })

    it('should calculate confidence correctly', () => {
      const cssClass: CSSClass = {
        name: 'test',
        properties: [
          { property: 'display', value: 'flex', important: false },
          { property: 'padding', value: '16px', important: false },
        ],
        selector: '.test',
        specificity: 10,
      }

      const result = converter.convertClass(cssClass)

      expect(result.confidence).toBe(100)
    })
  })
})
