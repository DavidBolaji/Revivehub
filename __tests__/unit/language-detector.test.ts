/**
 * Unit Tests for LanguageDetector
 * Tests: Language detection, confidence scoring, multi-language repos, edge cases
 * Requirements: 1.1, 1.2, 1.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { LanguageDetector } from '@/lib/scanner/detectors/language'
import type { RepositoryContext, FileNode } from '@/lib/scanner/types'

describe('LanguageDetector', () => {
  let detector: LanguageDetector

  beforeEach(() => {
    detector = new LanguageDetector()
  })

  // Helper function to create a mock repository context
  const createMockContext = (files: FileNode[], contents: Map<string, string> = new Map()): RepositoryContext => {
    return {
      owner: 'test-owner',
      repo: 'test-repo',
      files: {
        files,
        totalFiles: files.filter(f => f.type === 'file').length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0)
      },
      contents,
      metadata: {
        owner: 'test-owner',
        name: 'test-repo',
        fullName: 'test-owner/test-repo',
        defaultBranch: 'main',
        language: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        pushedAt: new Date(),
        size: 1000,
        stargazersCount: 0,
        forksCount: 0
      }
    }
  }

  describe('JavaScript Detection', () => {
    it('should detect JavaScript files with .js extension', async () => {
      const files: FileNode[] = [
        { path: 'index.js', type: 'file', size: 100, sha: 'abc123' },
        { path: 'utils.js', type: 'file', size: 200, sha: 'def456' }
      ]
      const contents = new Map([
        ['index.js', 'console.log("hello");\n'],
        ['utils.js', 'function test() {\n  return true;\n}\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages).toHaveLength(1)
      expect(result.languages[0].name).toBe('JavaScript')
      expect(result.languages[0].fileCount).toBe(2)
      expect(result.languages[0].linesOfCode).toBe(4)
      expect(result.primaryLanguage?.name).toBe('JavaScript')
    })

    it('should detect JavaScript with package.json config file', async () => {
      const files: FileNode[] = [
        { path: 'index.js', type: 'file', size: 100, sha: 'abc123' },
        { path: 'package.json', type: 'file', size: 50, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['index.js', 'console.log("hello");\n'],
        ['package.json', '{"name": "test"}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].configFiles).toContain('package.json')
      expect(result.languages[0].confidence).toBeGreaterThan(0)
    })

    it('should detect multiple JavaScript file extensions', async () => {
      const files: FileNode[] = [
        { path: 'index.js', type: 'file', size: 100, sha: 'abc1' },
        { path: 'component.jsx', type: 'file', size: 100, sha: 'abc2' },
        { path: 'module.mjs', type: 'file', size: 100, sha: 'abc3' },
        { path: 'common.cjs', type: 'file', size: 100, sha: 'abc4' }
      ]
      const contents = new Map([
        ['index.js', 'const x = 1;\n'],
        ['component.jsx', 'const App = () => <div />;\n'],
        ['module.mjs', 'export default {};\n'],
        ['common.cjs', 'module.exports = {};\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].fileCount).toBe(4)
    })
  })

  describe('TypeScript Detection', () => {
    it('should detect TypeScript files with .ts extension', async () => {
      const files: FileNode[] = [
        { path: 'index.ts', type: 'file', size: 100, sha: 'abc123' },
        { path: 'types.d.ts', type: 'file', size: 50, sha: 'def456' }
      ]
      const contents = new Map([
        ['index.ts', 'const x: number = 1;\n'],
        ['types.d.ts', 'export type Test = string;\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].name).toBe('TypeScript')
      expect(result.languages[0].fileCount).toBe(2)
    })

    it('should detect TypeScript with tsconfig.json', async () => {
      const files: FileNode[] = [
        { path: 'index.ts', type: 'file', size: 100, sha: 'abc123' },
        { path: 'tsconfig.json', type: 'file', size: 50, sha: 'ts123' }
      ]
      const contents = new Map([
        ['index.ts', 'const x: number = 1;\n'],
        ['tsconfig.json', '{"compilerOptions": {}}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].configFiles).toContain('tsconfig.json')
    })
  })

  describe('Python Detection', () => {
    it('should detect Python files with .py extension', async () => {
      const files: FileNode[] = [
        { path: 'main.py', type: 'file', size: 100, sha: 'abc123' },
        { path: 'utils.py', type: 'file', size: 200, sha: 'def456' }
      ]
      const contents = new Map([
        ['main.py', 'def main():\n    print("hello")\n'],
        ['utils.py', 'def helper():\n    return True\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].name).toBe('Python')
      expect(result.languages[0].fileCount).toBe(2)
      expect(result.languages[0].linesOfCode).toBe(4)
    })

    it('should detect Python with requirements.txt', async () => {
      const files: FileNode[] = [
        { path: 'main.py', type: 'file', size: 100, sha: 'abc123' },
        { path: 'requirements.txt', type: 'file', size: 50, sha: 'req123' }
      ]
      const contents = new Map([
        ['main.py', 'print("hello")\n'],
        ['requirements.txt', 'flask==2.0.0\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].configFiles).toContain('requirements.txt')
    })
  })

  describe('Ruby Detection', () => {
    it('should detect Ruby files with .rb extension', async () => {
      const files: FileNode[] = [
        { path: 'app.rb', type: 'file', size: 100, sha: 'abc123' },
        { path: 'helper.rb', type: 'file', size: 50, sha: 'def456' }
      ]
      const contents = new Map([
        ['app.rb', 'def hello\n  puts "world"\nend\n'],
        ['helper.rb', 'class Helper\nend\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].name).toBe('Ruby')
      expect(result.languages[0].fileCount).toBe(2)
    })

    it('should detect Ruby with Gemfile', async () => {
      const files: FileNode[] = [
        { path: 'app.rb', type: 'file', size: 100, sha: 'abc123' },
        { path: 'Gemfile', type: 'file', size: 50, sha: 'gem123' }
      ]
      const contents = new Map([
        ['app.rb', 'puts "hello"\n'],
        ['Gemfile', 'source "https://rubygems.org"\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].configFiles).toContain('Gemfile')
    })
  })

  describe('PHP Detection', () => {
    it('should detect PHP files with .php extension', async () => {
      const files: FileNode[] = [
        { path: 'index.php', type: 'file', size: 100, sha: 'abc123' },
        { path: 'config.php', type: 'file', size: 50, sha: 'def456' }
      ]
      const contents = new Map([
        ['index.php', '<?php\necho "hello";\n?>'],
        ['config.php', '<?php\nreturn [];\n?>']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].name).toBe('PHP')
      expect(result.languages[0].fileCount).toBe(2)
    })

    it('should detect PHP with composer.json', async () => {
      const files: FileNode[] = [
        { path: 'index.php', type: 'file', size: 100, sha: 'abc123' },
        { path: 'composer.json', type: 'file', size: 50, sha: 'comp123' }
      ]
      const contents = new Map([
        ['index.php', '<?php echo "hello"; ?>'],
        ['composer.json', '{"name": "test/project"}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].configFiles).toContain('composer.json')
    })
  })

  describe('Go Detection', () => {
    it('should detect Go files with .go extension', async () => {
      const files: FileNode[] = [
        { path: 'main.go', type: 'file', size: 100, sha: 'abc123' },
        { path: 'utils.go', type: 'file', size: 50, sha: 'def456' }
      ]
      const contents = new Map([
        ['main.go', 'package main\n\nfunc main() {\n}\n'],
        ['utils.go', 'package utils\n\nfunc Helper() {}\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].name).toBe('Go')
      expect(result.languages[0].fileCount).toBe(2)
    })

    it('should detect Go with go.mod', async () => {
      const files: FileNode[] = [
        { path: 'main.go', type: 'file', size: 100, sha: 'abc123' },
        { path: 'go.mod', type: 'file', size: 50, sha: 'mod123' }
      ]
      const contents = new Map([
        ['main.go', 'package main\n'],
        ['go.mod', 'module example.com/test\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].configFiles).toContain('go.mod')
    })
  })

  describe('Java Detection', () => {
    it('should detect Java files with .java extension', async () => {
      const files: FileNode[] = [
        { path: 'Main.java', type: 'file', size: 100, sha: 'abc123' },
        { path: 'Helper.java', type: 'file', size: 50, sha: 'def456' }
      ]
      const contents = new Map([
        ['Main.java', 'public class Main {\n  public static void main(String[] args) {}\n}\n'],
        ['Helper.java', 'public class Helper {}\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].name).toBe('Java')
      expect(result.languages[0].fileCount).toBe(2)
    })

    it('should detect Java with pom.xml', async () => {
      const files: FileNode[] = [
        { path: 'Main.java', type: 'file', size: 100, sha: 'abc123' },
        { path: 'pom.xml', type: 'file', size: 50, sha: 'pom123' }
      ]
      const contents = new Map([
        ['Main.java', 'public class Main {}\n'],
        ['pom.xml', '<project></project>']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].configFiles).toContain('pom.xml')
    })
  })

  describe('C# Detection', () => {
    it('should detect C# files with .cs extension', async () => {
      const files: FileNode[] = [
        { path: 'Program.cs', type: 'file', size: 100, sha: 'abc123' },
        { path: 'Helper.cs', type: 'file', size: 50, sha: 'def456' }
      ]
      const contents = new Map([
        ['Program.cs', 'using System;\n\nclass Program {\n  static void Main() {}\n}\n'],
        ['Helper.cs', 'class Helper {}\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].name).toBe('C#')
      expect(result.languages[0].fileCount).toBe(2)
    })

    it('should detect C# with .csproj file', async () => {
      const files: FileNode[] = [
        { path: 'Program.cs', type: 'file', size: 100, sha: 'abc123' },
        { path: 'MyApp.csproj', type: 'file', size: 50, sha: 'proj123' }
      ]
      const contents = new Map([
        ['Program.cs', 'class Program {}\n'],
        ['MyApp.csproj', '<Project Sdk="Microsoft.NET.Sdk"></Project>']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].configFiles).toContain('MyApp.csproj')
    })
  })

  describe('Confidence Score Calculation', () => {
    it('should calculate higher confidence for more files', async () => {
      const manyFiles: FileNode[] = Array.from({ length: 10 }, (_, i) => ({
        path: `file${i}.js`,
        type: 'file' as const,
        size: 100,
        sha: `sha${i}`
      }))
      const fewFiles: FileNode[] = [
        { path: 'single.js', type: 'file', size: 100, sha: 'sha1' }
      ]

      const manyContents = new Map(manyFiles.map(f => [f.path, 'console.log("test");\n']))
      const fewContents = new Map([['single.js', 'console.log("test");\n']])

      const manyContext = createMockContext(manyFiles, manyContents)
      const fewContext = createMockContext(fewFiles, fewContents)

      const manyResult = await detector.detect(manyContext)
      const fewResult = await detector.detect(fewContext)

      expect(manyResult.languages[0].confidence).toBeGreaterThan(fewResult.languages[0].confidence)
    })

    it('should calculate higher confidence with config files', async () => {
      const withConfig: FileNode[] = [
        { path: 'index.js', type: 'file', size: 100, sha: 'abc1' },
        { path: 'package.json', type: 'file', size: 50, sha: 'pkg1' }
      ]
      const withoutConfig: FileNode[] = [
        { path: 'index.js', type: 'file', size: 100, sha: 'abc1' }
      ]

      const withConfigContents = new Map([
        ['index.js', 'console.log("test");\n'],
        ['package.json', '{}']
      ])
      const withoutConfigContents = new Map([
        ['index.js', 'console.log("test");\n']
      ])

      const withConfigContext = createMockContext(withConfig, withConfigContents)
      const withoutConfigContext = createMockContext(withoutConfig, withoutConfigContents)

      const withConfigResult = await detector.detect(withConfigContext)
      const withoutConfigResult = await detector.detect(withoutConfigContext)

      expect(withConfigResult.languages[0].confidence).toBeGreaterThan(
        withoutConfigResult.languages[0].confidence
      )
    })

    it('should calculate higher confidence for more lines of code', async () => {
      const manyLines = new Map([
        ['large.js', Array(100).fill('console.log("test");').join('\n')]
      ])
      const fewLines = new Map([
        ['small.js', 'console.log("test");\n']
      ])

      const manyLinesFiles: FileNode[] = [
        { path: 'large.js', type: 'file', size: 1000, sha: 'abc1' }
      ]
      const fewLinesFiles: FileNode[] = [
        { path: 'small.js', type: 'file', size: 20, sha: 'abc2' }
      ]

      const manyLinesContext = createMockContext(manyLinesFiles, manyLines)
      const fewLinesContext = createMockContext(fewLinesFiles, fewLines)

      const manyLinesResult = await detector.detect(manyLinesContext)
      const fewLinesResult = await detector.detect(fewLinesContext)

      expect(manyLinesResult.languages[0].confidence).toBeGreaterThan(
        fewLinesResult.languages[0].confidence
      )
    })
  })

  describe('Multi-Language Repositories', () => {
    it('should detect multiple languages in a repository', async () => {
      const files: FileNode[] = [
        { path: 'index.js', type: 'file', size: 100, sha: 'js1' },
        { path: 'app.py', type: 'file', size: 100, sha: 'py1' },
        { path: 'main.go', type: 'file', size: 100, sha: 'go1' }
      ]
      const contents = new Map([
        ['index.js', 'console.log("hello");\n'],
        ['app.py', 'print("hello")\n'],
        ['main.go', 'package main\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages).toHaveLength(3)
      expect(result.languages.map(l => l.name)).toContain('JavaScript')
      expect(result.languages.map(l => l.name)).toContain('Python')
      expect(result.languages.map(l => l.name)).toContain('Go')
    })

    it('should identify primary language correctly in multi-language repo', async () => {
      const files: FileNode[] = [
        { path: 'index.ts', type: 'file', size: 100, sha: 'ts1' },
        { path: 'utils.ts', type: 'file', size: 100, sha: 'ts2' },
        { path: 'helper.ts', type: 'file', size: 100, sha: 'ts3' },
        { path: 'tsconfig.json', type: 'file', size: 50, sha: 'cfg1' },
        { path: 'script.py', type: 'file', size: 50, sha: 'py1' }
      ]
      const contents = new Map([
        ['index.ts', 'const x: number = 1;\n'],
        ['utils.ts', 'export function test() {}\n'],
        ['helper.ts', 'export class Helper {}\n'],
        ['tsconfig.json', '{}'],
        ['script.py', 'print("hello")\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.primaryLanguage?.name).toBe('TypeScript')
      expect(result.languages[0].name).toBe('TypeScript')
      expect(result.languages[0].confidence).toBeGreaterThan(result.languages[1].confidence)
    })

    it('should sort languages by confidence score', async () => {
      const files: FileNode[] = [
        // More Python files
        { path: 'main.py', type: 'file', size: 100, sha: 'py1' },
        { path: 'utils.py', type: 'file', size: 100, sha: 'py2' },
        { path: 'helper.py', type: 'file', size: 100, sha: 'py3' },
        { path: 'requirements.txt', type: 'file', size: 50, sha: 'req1' },
        // Fewer JavaScript files
        { path: 'script.js', type: 'file', size: 50, sha: 'js1' }
      ]
      const contents = new Map([
        ['main.py', 'def main():\n    pass\n'],
        ['utils.py', 'def util():\n    pass\n'],
        ['helper.py', 'def help():\n    pass\n'],
        ['requirements.txt', 'flask==2.0.0\n'],
        ['script.js', 'console.log("test");\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].name).toBe('Python')
      expect(result.languages[1].name).toBe('JavaScript')
      expect(result.languages[0].confidence).toBeGreaterThan(result.languages[1].confidence)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty repository', async () => {
      const context = createMockContext([])
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages).toHaveLength(0)
      expect(result.primaryLanguage).toBeNull()
    })

    it('should handle repository with no code files', async () => {
      const files: FileNode[] = [
        { path: 'README.md', type: 'file', size: 100, sha: 'md1' },
        { path: 'LICENSE', type: 'file', size: 50, sha: 'lic1' }
      ]
      const contents = new Map([
        ['README.md', '# Test\n'],
        ['LICENSE', 'MIT License\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages).toHaveLength(0)
      expect(result.primaryLanguage).toBeNull()
    })

    it('should handle repository with only config files', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 50, sha: 'pkg1' },
        { path: 'tsconfig.json', type: 'file', size: 50, sha: 'ts1' }
      ]
      const contents = new Map([
        ['package.json', '{"name": "test"}'],
        ['tsconfig.json', '{}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages).toHaveLength(0)
      expect(result.primaryLanguage).toBeNull()
    })

    it('should handle files without content', async () => {
      const files: FileNode[] = [
        { path: 'index.js', type: 'file', size: 0, sha: 'js1' }
      ]
      const contents = new Map()

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].fileCount).toBe(1)
      expect(result.languages[0].linesOfCode).toBe(0)
    })

    it('should handle directories in file list', async () => {
      const files: FileNode[] = [
        { path: 'src', type: 'dir', size: 0, sha: 'dir1' },
        { path: 'src/index.js', type: 'file', size: 100, sha: 'js1' }
      ]
      const contents = new Map([
        ['src/index.js', 'console.log("test");\n']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].fileCount).toBe(1)
    })

    it('should handle wildcard config file patterns', async () => {
      const files: FileNode[] = [
        { path: 'Program.cs', type: 'file', size: 100, sha: 'cs1' },
        { path: 'MyApp.csproj', type: 'file', size: 50, sha: 'proj1' },
        { path: 'MyApp.Tests.csproj', type: 'file', size: 50, sha: 'proj2' }
      ]
      const contents = new Map([
        ['Program.cs', 'class Program {}\n'],
        ['MyApp.csproj', '<Project></Project>'],
        ['MyApp.Tests.csproj', '<Project></Project>']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.languages[0].configFiles).toHaveLength(2)
      expect(result.languages[0].configFiles).toContain('MyApp.csproj')
      expect(result.languages[0].configFiles).toContain('MyApp.Tests.csproj')
    })
  })

  describe('Detector Metadata', () => {
    it('should have correct detector name', () => {
      expect(detector.name).toBe('LanguageDetector')
    })

    it('should have no dependencies', () => {
      expect(detector.getDependencies()).toHaveLength(0)
    })

    it('should include detector name in result', async () => {
      const context = createMockContext([])
      const result = await detector.detect(context)

      expect(result.detectorName).toBe('LanguageDetector')
    })
  })
})
