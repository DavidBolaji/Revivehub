/**
 * CSSToTailwindConverter
 *
 * Converts CSS properties to Tailwind utility classes.
 * Provides comprehensive mapping for common CSS properties.
 *
 * Requirements: CSS to Tailwind conversion for Next.js migration
 */

import type { CSSClass, CSSProperty } from './css-analyzer'

export interface TailwindMapping {
  cssClass: string
  tailwindClasses: string[]
  confidence: number
  notes: string[]
}

export class CSSToTailwindConverter {
  private conversionMap: Map<string, (value: string) => string[]>

  constructor() {
    this.conversionMap = this.buildConversionMap()
  }

  /**
   * Convert CSS class to Tailwind classes
   *
   * @param cssClass - CSS class with properties
   * @returns Tailwind mapping with confidence score
   */
  convertClass(cssClass: CSSClass): TailwindMapping {
    const tailwindClasses: string[] = []
    const notes: string[] = []
    let totalConfidence = 0
    let propertyCount = 0

    for (const prop of cssClass.properties) {
      const result = this.convertProperty(prop)

      if (result.classes.length > 0) {
        // Add pseudo-class prefix if present
        if (cssClass.pseudoClass) {
          const prefixed = result.classes.map((c) =>
            this.addPseudoClassPrefix(c, cssClass.pseudoClass!)
          )
          tailwindClasses.push(...prefixed)
        } else {
          tailwindClasses.push(...result.classes)
        }

        totalConfidence += result.confidence
        propertyCount++
      } else {
        notes.push(`Could not convert: ${prop.property}: ${prop.value}`)
      }
    }

    const confidence = propertyCount > 0 ? totalConfidence / propertyCount : 0

    return {
      cssClass: cssClass.name,
      tailwindClasses,
      confidence,
      notes,
    }
  }

  /**
   * Add pseudo-class prefix to Tailwind class
   *
   * @param className - Tailwind class
   * @param pseudoClass - Pseudo-class (hover, focus, etc.)
   * @returns Prefixed class
   */
  private addPseudoClassPrefix(
    className: string,
    pseudoClass: string
  ): string {
    const pseudoMap: Record<string, string> = {
      hover: 'hover',
      focus: 'focus',
      active: 'active',
      disabled: 'disabled',
      visited: 'visited',
      'focus-within': 'focus-within',
      'focus-visible': 'focus-visible',
    }

    const prefix = pseudoMap[pseudoClass]
    return prefix ? `${prefix}:${className}` : className
  }

  /**
   * Convert single CSS property to Tailwind
   *
   * @param prop - CSS property
   * @returns Conversion result with classes and confidence
   */
  convertProperty(prop: CSSProperty): {
    classes: string[]
    confidence: number
  } {
    const converter = this.conversionMap.get(prop.property)

    if (converter) {
      try {
        const classes = converter(prop.value)
        return { classes, confidence: 100 }
      } catch (error) {
        return { classes: [], confidence: 0 }
      }
    }

    return { classes: [], confidence: 0 }
  }

  /**
   * Build conversion map for CSS properties to Tailwind
   */
  private buildConversionMap(): Map<string, (value: string) => string[]> {
    const map = new Map<string, (value: string) => string[]>()

    // Display
    map.set('display', (value) => {
      const displayMap: Record<string, string> = {
        block: 'block',
        'inline-block': 'inline-block',
        inline: 'inline',
        flex: 'flex',
        'inline-flex': 'inline-flex',
        grid: 'grid',
        'inline-grid': 'inline-grid',
        hidden: 'hidden',
        none: 'hidden',
        table: 'table',
        'table-row': 'table-row',
        'table-cell': 'table-cell',
      }
      return displayMap[value] ? [displayMap[value]] : []
    })

    // Flexbox
    map.set('flex-direction', (value) => {
      const dirMap: Record<string, string> = {
        row: 'flex-row',
        'row-reverse': 'flex-row-reverse',
        column: 'flex-col',
        'column-reverse': 'flex-col-reverse',
      }
      return dirMap[value] ? [dirMap[value]] : []
    })

    map.set('justify-content', (value) => {
      const justifyMap: Record<string, string> = {
        'flex-start': 'justify-start',
        'flex-end': 'justify-end',
        center: 'justify-center',
        'space-between': 'justify-between',
        'space-around': 'justify-around',
        'space-evenly': 'justify-evenly',
      }
      return justifyMap[value] ? [justifyMap[value]] : []
    })

    map.set('align-items', (value) => {
      const alignMap: Record<string, string> = {
        'flex-start': 'items-start',
        'flex-end': 'items-end',
        center: 'items-center',
        baseline: 'items-baseline',
        stretch: 'items-stretch',
      }
      return alignMap[value] ? [alignMap[value]] : []
    })

    map.set('align-self', (value) => {
      const alignMap: Record<string, string> = {
        auto: 'self-auto',
        'flex-start': 'self-start',
        'flex-end': 'self-end',
        center: 'self-center',
        stretch: 'self-stretch',
      }
      return alignMap[value] ? [alignMap[value]] : []
    })

    map.set('flex-wrap', (value) => {
      const wrapMap: Record<string, string> = {
        wrap: 'flex-wrap',
        'wrap-reverse': 'flex-wrap-reverse',
        nowrap: 'flex-nowrap',
      }
      return wrapMap[value] ? [wrapMap[value]] : []
    })

    // Spacing
    map.set('margin', (value) => this.convertSpacing('m', value))
    map.set('margin-top', (value) => this.convertSpacing('mt', value))
    map.set('margin-right', (value) => this.convertSpacing('mr', value))
    map.set('margin-bottom', (value) => this.convertSpacing('mb', value))
    map.set('margin-left', (value) => this.convertSpacing('ml', value))

    map.set('padding', (value) => this.convertSpacing('p', value))
    map.set('padding-top', (value) => this.convertSpacing('pt', value))
    map.set('padding-right', (value) => this.convertSpacing('pr', value))
    map.set('padding-bottom', (value) => this.convertSpacing('pb', value))
    map.set('padding-left', (value) => this.convertSpacing('pl', value))

    map.set('gap', (value) => this.convertSpacing('gap', value))

    // Sizing
    map.set('width', (value) => this.convertSize('w', value))
    map.set('height', (value) => this.convertSize('h', value))
    map.set('min-width', (value) => this.convertSize('min-w', value))
    map.set('max-width', (value) => this.convertSize('max-w', value))
    map.set('min-height', (value) => this.convertSize('min-h', value))
    map.set('max-height', (value) => this.convertSize('max-h', value))

    // Typography
    map.set('font-size', (value) => this.convertFontSize(value))
    map.set('font-weight', (value) => this.convertFontWeight(value))
    map.set('line-height', (value) => this.convertLineHeight(value))
    map.set('text-align', (value) => {
      const alignMap: Record<string, string> = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
        justify: 'text-justify',
      }
      return alignMap[value] ? [alignMap[value]] : []
    })

    map.set('text-decoration', (value) => {
      const decorationMap: Record<string, string> = {
        underline: 'underline',
        'line-through': 'line-through',
        none: 'no-underline',
      }
      return decorationMap[value] ? [decorationMap[value]] : []
    })

    map.set('text-transform', (value) => {
      const transformMap: Record<string, string> = {
        uppercase: 'uppercase',
        lowercase: 'lowercase',
        capitalize: 'capitalize',
        none: 'normal-case',
      }
      return transformMap[value] ? [transformMap[value]] : []
    })

    // Colors
    map.set('color', (value) => this.convertColor('text', value))
    map.set('background-color', (value) => this.convertColor('bg', value))
    map.set('border-color', (value) => this.convertColor('border', value))

    // Border
    map.set('border-width', (value) => this.convertBorderWidth(value))
    map.set('border-radius', (value) => this.convertBorderRadius(value))
    map.set('border-style', (value) => {
      const styleMap: Record<string, string> = {
        solid: 'border-solid',
        dashed: 'border-dashed',
        dotted: 'border-dotted',
        double: 'border-double',
        none: 'border-none',
      }
      return styleMap[value] ? [styleMap[value]] : []
    })

    // Position
    map.set('position', (value) => {
      const positionMap: Record<string, string> = {
        static: 'static',
        fixed: 'fixed',
        absolute: 'absolute',
        relative: 'relative',
        sticky: 'sticky',
      }
      return positionMap[value] ? [positionMap[value]] : []
    })

    map.set('top', (value) => this.convertSpacing('top', value))
    map.set('right', (value) => this.convertSpacing('right', value))
    map.set('bottom', (value) => this.convertSpacing('bottom', value))
    map.set('left', (value) => this.convertSpacing('left', value))

    // Overflow
    map.set('overflow', (value) => {
      const overflowMap: Record<string, string> = {
        auto: 'overflow-auto',
        hidden: 'overflow-hidden',
        visible: 'overflow-visible',
        scroll: 'overflow-scroll',
      }
      return overflowMap[value] ? [overflowMap[value]] : []
    })

    // Opacity
    map.set('opacity', (value) => {
      const opacity = parseFloat(value)
      if (opacity === 0) return ['opacity-0']
      if (opacity === 0.25) return ['opacity-25']
      if (opacity === 0.5) return ['opacity-50']
      if (opacity === 0.75) return ['opacity-75']
      if (opacity === 1) return ['opacity-100']
      return [`opacity-[${value}]`]
    })

    // Cursor
    map.set('cursor', (value) => {
      const cursorMap: Record<string, string> = {
        auto: 'cursor-auto',
        default: 'cursor-default',
        pointer: 'cursor-pointer',
        wait: 'cursor-wait',
        text: 'cursor-text',
        move: 'cursor-move',
        'not-allowed': 'cursor-not-allowed',
      }
      return cursorMap[value] ? [cursorMap[value]] : []
    })

    return map
  }

  /**
   * Convert spacing values (margin, padding, gap)
   */
  private convertSpacing(prefix: string, value: string): string[] {
    // Handle multiple values (e.g., "10px 20px")
    const values = value.split(/\s+/)

    if (values.length === 1) {
      const tw = this.spacingValueToTailwind(values[0])
      return tw ? [`${prefix}-${tw}`] : []
    }

    // Handle shorthand (top right bottom left)
    if (values.length === 2) {
      const vertical = this.spacingValueToTailwind(values[0])
      const horizontal = this.spacingValueToTailwind(values[1])
      return [
        vertical ? `${prefix}y-${vertical}` : '',
        horizontal ? `${prefix}x-${horizontal}` : '',
      ].filter(Boolean)
    }

    if (values.length === 4) {
      const [top, right, bottom, left] = values.map((v) =>
        this.spacingValueToTailwind(v)
      )
      return [
        top ? `${prefix}t-${top}` : '',
        right ? `${prefix}r-${right}` : '',
        bottom ? `${prefix}b-${bottom}` : '',
        left ? `${prefix}l-${left}` : '',
      ].filter(Boolean)
    }

    return []
  }

  /**
   * Convert spacing value to Tailwind scale
   */
  private spacingValueToTailwind(value: string): string | null {
    if (value === '0' || value === '0px') return '0'
    if (value === 'auto') return 'auto'

    // Convert px to Tailwind scale (1 unit = 0.25rem = 4px)
    const pxMatch = value.match(/^(\d+(?:\.\d+)?)px$/)
    if (pxMatch) {
      const px = parseFloat(pxMatch[1])
      const scale = px / 4

      const tailwindScale = [
        0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16,
        20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
      ]
      const closest = tailwindScale.reduce((prev, curr) =>
        Math.abs(curr - scale) < Math.abs(prev - scale) ? curr : prev
      )

      return closest.toString()
    }

    // Convert rem to Tailwind scale
    const remMatch = value.match(/^(\d+(?:\.\d+)?)rem$/)
    if (remMatch) {
      const rem = parseFloat(remMatch[1])
      const scale = rem * 4

      const tailwindScale = [
        0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16,
        20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96,
      ]
      const closest = tailwindScale.reduce((prev, curr) =>
        Math.abs(curr - scale) < Math.abs(prev - scale) ? curr : prev
      )

      return closest.toString()
    }

    return null
  }

  /**
   * Convert size values (width, height)
   */
  private convertSize(prefix: string, value: string): string[] {
    // Handle percentage
    if (value.endsWith('%')) {
      const percent = parseInt(value)
      const fractionMap: Record<number, string> = {
        25: '1/4',
        33: '1/3',
        50: '1/2',
        66: '2/3',
        75: '3/4',
        100: 'full',
      }
      const fraction = fractionMap[percent]
      return fraction ? [`${prefix}-${fraction}`] : []
    }

    // Handle fixed sizes
    const sizeMap: Record<string, string> = {
      auto: 'auto',
      'fit-content': 'fit',
      'min-content': 'min',
      'max-content': 'max',
    }

    if (sizeMap[value]) {
      return [`${prefix}-${sizeMap[value]}`]
    }

    // Handle px/rem values
    const tw = this.spacingValueToTailwind(value)
    return tw ? [`${prefix}-${tw}`] : []
  }

  /**
   * Convert font size
   */
  private convertFontSize(value: string): string[] {
    const sizeMap: Record<string, string> = {
      '12px': 'text-xs',
      '14px': 'text-sm',
      '16px': 'text-base',
      '18px': 'text-lg',
      '20px': 'text-xl',
      '24px': 'text-2xl',
      '30px': 'text-3xl',
      '36px': 'text-4xl',
      '48px': 'text-5xl',
      '60px': 'text-6xl',
      '72px': 'text-7xl',
      '96px': 'text-8xl',
      '128px': 'text-9xl',
    }

    return sizeMap[value] ? [sizeMap[value]] : []
  }

  /**
   * Convert font weight
   */
  private convertFontWeight(value: string): string[] {
    const weightMap: Record<string, string> = {
      '100': 'font-thin',
      '200': 'font-extralight',
      '300': 'font-light',
      '400': 'font-normal',
      '500': 'font-medium',
      '600': 'font-semibold',
      '700': 'font-bold',
      '800': 'font-extrabold',
      '900': 'font-black',
      normal: 'font-normal',
      bold: 'font-bold',
    }

    return weightMap[value] ? [weightMap[value]] : []
  }

  /**
   * Convert line height
   */
  private convertLineHeight(value: string): string[] {
    const lineHeightMap: Record<string, string> = {
      '1': 'leading-none',
      '1.25': 'leading-tight',
      '1.375': 'leading-snug',
      '1.5': 'leading-normal',
      '1.625': 'leading-relaxed',
      '2': 'leading-loose',
    }

    return lineHeightMap[value] ? [lineHeightMap[value]] : []
  }

  /**
   * Convert color values
   */
  private convertColor(prefix: string, value: string): string[] {
    // Handle named colors
    const colorMap: Record<string, string> = {
      white: 'white',
      black: 'black',
      transparent: 'transparent',
      red: 'red-500',
      blue: 'blue-500',
      green: 'green-500',
      yellow: 'yellow-500',
      gray: 'gray-500',
      grey: 'gray-500',
    }

    if (colorMap[value]) {
      return [`${prefix}-${colorMap[value]}`]
    }

    // Handle hex colors - use arbitrary value
    if (value.startsWith('#')) {
      return [`${prefix}-[${value}]`]
    }

    // Handle rgb/rgba - use arbitrary value
    if (value.startsWith('rgb')) {
      return [`${prefix}-[${value}]`]
    }

    return []
  }

  /**
   * Convert border width
   */
  private convertBorderWidth(value: string): string[] {
    const widthMap: Record<string, string> = {
      '0': 'border-0',
      '1px': 'border',
      '2px': 'border-2',
      '4px': 'border-4',
      '8px': 'border-8',
    }

    return widthMap[value] ? [widthMap[value]] : []
  }

  /**
   * Convert border radius
   */
  private convertBorderRadius(value: string): string[] {
    const radiusMap: Record<string, string> = {
      '0': 'rounded-none',
      '2px': 'rounded-sm',
      '4px': 'rounded',
      '6px': 'rounded-md',
      '8px': 'rounded-lg',
      '12px': 'rounded-xl',
      '16px': 'rounded-2xl',
      '24px': 'rounded-3xl',
      '9999px': 'rounded-full',
      '50%': 'rounded-full',
    }

    return radiusMap[value] ? [radiusMap[value]] : []
  }
}
