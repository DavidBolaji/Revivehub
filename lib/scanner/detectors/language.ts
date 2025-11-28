import { BaseDetector } from './base'
import type { 
  RepositoryContext, 
  LanguageDetectionResult, 
  DetectedLanguage 
} from '../types'

/**
 * Language detector that identifies programming languages in a repository
 * based on file extensions, configuration files, and code analysis
 */
export class LanguageDetector extends BaseDetector {
  readonly name = 'LanguageDetector'

  // File extension mappings for supported languages
  private readonly languageExtensions: Record<string, string[]> = {
    'JavaScript': ['.js', '.jsx', '.mjs', '.cjs'],
    'TypeScript': ['.ts', '.tsx', '.d.ts'],
    'Python': ['.py', '.pyx', '.pyi', '.pyw'],
    'Ruby': ['.rb', '.rake', '.gemspec'],
    'PHP': ['.php', '.phtml', '.php3', '.php4', '.php5', '.phps'],
    'Go': ['.go'],
    'Java': ['.java'],
    'C#': ['.cs', '.csx']
  }

  // Configuration file mappings for supported languages
  private readonly configFiles: Record<string, string[]> = {
    'JavaScript': ['package.json', '.babelrc', '.eslintrc.js', '.eslintrc.json', 'webpack.config.js'],
    'TypeScript': ['tsconfig.json', 'tsconfig.build.json', 'tslint.json'],
    'Python': ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile', 'environment.yml'],
    'Ruby': ['Gemfile', 'Rakefile', '.ruby-version', 'config.ru'],
    'PHP': ['composer.json', 'composer.lock', '.php-version'],
    'Go': ['go.mod', 'go.sum', 'Gopkg.toml', 'Gopkg.lock'],
    'Java': ['pom.xml', 'build.gradle', 'gradle.properties', 'build.xml'],
    'C#': ['*.csproj', '*.sln', 'packages.config', 'Directory.Build.props']
  }

  async detect(context: RepositoryContext): Promise<LanguageDetectionResult> {
    try {
      const detectedLanguages: DetectedLanguage[] = []

      // Analyze each supported language
      for (const [languageName, extensions] of Object.entries(this.languageExtensions)) {
        const detection = await this.analyzeLanguage(
          context, 
          languageName as DetectedLanguage['name'], 
          extensions
        )
        
        if (detection.fileCount > 0) {
          detectedLanguages.push(detection)
        }
      }

      // Sort by confidence score (highest first)
      detectedLanguages.sort((a, b) => b.confidence - a.confidence)

      // Primary language is the one with highest confidence
      const primaryLanguage = detectedLanguages.length > 0 ? detectedLanguages[0] : null

      return this.createSuccessResult<LanguageDetectionResult>({
        languages: detectedLanguages,
        primaryLanguage
      })

    } catch (error) {
      return this.createErrorResult<LanguageDetectionResult>(
        this.createDetectionError(
          'LANGUAGE_DETECTION_FAILED',
          `Failed to detect languages: ${error instanceof Error ? error.message : 'Unknown error'}`,
          true
        ),
        { languages: [], primaryLanguage: null }
      )
    }
  }

  /**
   * Analyze a specific language in the repository
   */
  private async analyzeLanguage(
    context: RepositoryContext,
    languageName: DetectedLanguage['name'],
    extensions: string[]
  ): Promise<DetectedLanguage> {
    // Find files with matching extensions
    const languageFiles = this.findFilesByExtension(context, extensions)
    const fileCount = languageFiles.length

    // Count lines of code
    const linesOfCode = this.countLinesOfCode(context, languageFiles)

    // Find configuration files
    const configFiles = this.findConfigFiles(context, languageName)

    // Calculate confidence score
    const confidence = this.calculateConfidence(
      fileCount,
      linesOfCode,
      configFiles.length,
      context.files.totalFiles
    )

    return {
      name: languageName,
      confidence,
      fileCount,
      linesOfCode,
      configFiles
    }
  }

  /**
   * Find configuration files for a specific language
   */
  private findConfigFiles(context: RepositoryContext, languageName: string): string[] {
    const configPatterns = this.configFiles[languageName] || []
    const foundConfigs: string[] = []

    for (const pattern of configPatterns) {
      if (pattern.includes('*')) {
        // Handle wildcard patterns like *.csproj
        const matchingFiles = this.findFilesByPattern(context, [pattern])
        foundConfigs.push(...matchingFiles)
      } else {
        // Handle exact file names
        if (this.hasFile(context, pattern)) {
          foundConfigs.push(pattern)
        }
      }
    }

    return foundConfigs
  }

  /**
   * Calculate confidence score based on file count, lines of code, and config files
   * Formula: (fileCount * 0.4) + (linesOfCode * 0.4) + (configFiles * 0.2)
   * Normalized to 0-100 scale
   */
  private calculateConfidence(
    fileCount: number,
    linesOfCode: number,
    configFileCount: number,
    _totalFiles: number
  ): number {
    if (fileCount === 0) return 0

    // Normalize file count using logarithmic scale
    // This gives: 1 file = ~15, 10 files = ~50, 100 files = ~100
    const fileCountScore = Math.min(Math.log10(fileCount + 1) * 50, 100)

    // Normalize lines of code (logarithmic scale to handle large codebases)
    // This gives: 1 line = ~6, 10 lines = ~20, 100 lines = ~40, 1000 lines = ~60
    const locScore = Math.min(Math.log10(linesOfCode + 1) * 20, 100)

    // Config file score (each config file adds 20 points, max 100)
    const configScore = Math.min(configFileCount * 20, 100)

    // Weighted average: 40% file count, 40% lines of code, 20% config files
    const confidence = (fileCountScore * 0.4) + (locScore * 0.4) + (configScore * 0.2)

    return Math.round(Math.min(confidence, 100))
  }
}