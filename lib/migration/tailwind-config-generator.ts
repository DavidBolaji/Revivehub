/**
 * TailwindConfigGenerator
 *
 * Generates Tailwind configuration based on project analysis
 */

import type { CSSClass } from './css-analyzer'

export interface TailwindConfig {
  content: string[]
  theme: {
    extend: {
      colors?: Record<string, string>
      spacing?: Record<string, string>
      fontFamily?: Record<string, string[]>
    }
  }
  plugins: string[]
}

export class TailwindConfigGenerator {
  /**
   * Generate Tailwind config from CSS analysis
   */
  generateConfig(
    cssClasses: CSSClass[],
    projectStructure: {
      hasAppDir: boolean
      hasPagesDir: boolean
      componentDirs: string[]
    }
  ): TailwindConfig {
    const config: TailwindConfig = {
      content: this.generateContentPaths(projectStructure),
      theme: {
        extend: {
          colors: this.extractCustomColors(cssClasses),
          spacing: this.extractCustomSpacing(cssClasses),
        },
      },
      plugins: [],
    }

    return config
  }

  /**
   * Generate content paths for Tailwind
   */
  private generateContentPaths(projectStructure: {
    hasAppDir: boolean
    hasPagesDir: boolean
    componentDirs: string[]
  }): string[] {
    const paths: string[] = []

    if (projectStructure.hasAppDir) {
      paths.push('./app/**/*.{js,ts,jsx,tsx,mdx}')
    }

    if (projectStructure.hasPagesDir) {
      paths.push('./pages/**/*.{js,ts,jsx,tsx}')
    }

    for (const dir of projectStructure.componentDirs) {
      paths.push(`./${dir}/**/*.{js,ts,jsx,tsx}`)
    }

    if (!paths.some((p) => p.includes('components'))) {
      paths.push('./components/**/*.{js,ts,jsx,tsx}')
    }

    return paths
  }

  /**
   * Extract custom colors from CSS
   */
  private extractCustomColors(cssClasses: CSSClass[]): Record<string, string> {
    const colors: Record<string, string> = {}

    for (const cssClass of cssClasses) {
      for (const prop of cssClass.properties) {
        if (
          prop.property === 'color' ||
          prop.property === 'background-color' ||
          prop.property === 'border-color'
        ) {
          if (prop.value.startsWith('#') || prop.value.startsWith('rgb')) {
            const colorName = this.generateColorName(
              cssClass.name,
              prop.property
            )
            colors[colorName] = prop.value
          }
        }
      }
    }

    return colors
  }

  /**
   * Generate color name from class name and property
   */
  private generateColorName(className: string, property: string): string {
    const prefix = property.includes('background')
      ? 'bg'
      : property.includes('border')
        ? 'border'
        : 'text'
    return `${prefix}-${className}`
  }

  /**
   * Extract custom spacing values
   */
  private extractCustomSpacing(
    cssClasses: CSSClass[]
  ): Record<string, string> {
    const spacing: Record<string, string> = {}
    const spacingValues = new Set<string>()

    for (const cssClass of cssClasses) {
      for (const prop of cssClass.properties) {
        if (
          prop.property.includes('margin') ||
          prop.property.includes('padding') ||
          prop.property.includes('gap')
        ) {
          const match = prop.value.match(/(\d+)px/)
          if (match) {
            spacingValues.add(match[1])
          }
        }
      }
    }

    for (const value of spacingValues) {
      const px = parseInt(value)
      if (px % 4 !== 0) {
        spacing[value] = `${px}px`
      }
    }

    return spacing
  }

  /**
   * Generate Tailwind config file content
   */
  generateConfigFile(config: TailwindConfig): string {
    return `import type { Config } from 'tailwindcss'

const config: Config = {
  content: ${JSON.stringify(config.content, null, 2)},
  theme: {
    extend: ${JSON.stringify(config.theme.extend, null, 6).replace(/"([^"]+)":/g, '$1:')},
  },
  plugins: [],
}

export default config
`
  }
}
