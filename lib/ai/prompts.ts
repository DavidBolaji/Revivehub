// AI prompt templates for code analysis

export const PROMPTS = {
  detectLegacyPatterns: (code: string, language: string) => `
Analyze the following ${language} code and identify legacy or outdated patterns.

For each pattern found, provide:
1. Pattern ID (use kebab-case)
2. Category (react/nextjs/vue/typescript/dependencies/async/modules)
3. Name (short descriptive name)
4. Description (what makes it legacy)
5. Severity (low/medium/high)
6. Auto-fixable (true/false)
7. Suggested fix (modern alternative)
8. Estimated time to fix manually (in minutes)
9. Specific locations in code (file, line, snippet)

Focus on these pattern types:
- React: Class components, PropTypes, old lifecycle methods (componentWillMount, etc.)
- Next.js: Pages Router patterns, getInitialProps, old data fetching
- Vue: Options API instead of Composition API
- TypeScript: any types, missing type annotations
- Async: Callback hell, missing async/await
- Modules: CommonJS (require) instead of ESM (import)
- Variables: var instead of let/const
- Dependencies: Deprecated packages

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

IMPORTANT: Return ONLY valid JSON, no explanations, no markdown, no other text. Use exactly this structure:
{
  "patterns": [
    {
      "id": "pattern-id",
      "category": "react",
      "name": "Pattern Name",
      "description": "Why this is legacy",
      "severity": "high",
      "autoFixable": true,
      "suggestedFix": "Modern alternative code",
      "estimatedTimeMinutes": 15,
      "locations": [
        {
          "file": "component.tsx",
          "line": 10,
          "snippet": "class MyComponent extends React.Component"
        }
      ]
    }
  ]
}
`,

  suggestModernizations: (patterns: string) => `
Given these detected legacy patterns, provide detailed modernization suggestions.

For each pattern, provide:
1. Current pattern description
2. Modern alternative
3. Benefits of modernization
4. Step-by-step migration steps
5. Potential breaking changes
6. Effort estimate (time, complexity, risk, automation potential)

Detected patterns:
${patterns}

IMPORTANT: Return ONLY valid JSON, no explanations, no markdown, no other text. Use exactly this structure:
{
  "suggestions": [
    {
      "patternId": "pattern-id",
      "currentPattern": "Description of current approach",
      "modernAlternative": "Description of modern approach",
      "benefits": ["Benefit 1", "Benefit 2"],
      "migrationSteps": ["Step 1", "Step 2"],
      "breakingChanges": ["Change 1", "Change 2"],
      "estimatedEffort": {
        "timeMinutes": 30,
        "complexity": "moderate",
        "riskLevel": "low",
        "automationPotential": 80
      }
    }
  ]
}
`,

  estimateRefactorEffort: (patterns: string, codebaseSize: number) => `
Estimate the total effort required to refactor these patterns in a codebase of ${codebaseSize} lines.

Consider:
- Number of occurrences
- Pattern complexity
- Interdependencies
- Testing requirements
- Risk factors

Patterns to estimate:
${patterns}

Return JSON:
{
  "totalEffort": {
    "timeMinutes": 240,
    "complexity": "moderate",
    "riskLevel": "medium",
    "automationPotential": 60
  },
  "breakdown": [
    {
      "patternId": "pattern-id",
      "occurrences": 15,
      "timePerOccurrence": 10,
      "totalTime": 150
    }
  ]
}
`,

  identifyBreakingChanges: (sourceCode: string, targetFramework: string) => `
Identify breaking changes when migrating from the current code to ${targetFramework}.

Analyze:
- API changes
- Behavior changes
- Dependency changes
- Configuration changes
- Type changes

Source code:
\`\`\`
${sourceCode}
\`\`\`

Target: ${targetFramework}

Return JSON:
{
  "breakingChanges": [
    {
      "type": "api",
      "description": "Method signature changed",
      "impact": "high",
      "affectedFiles": ["file1.ts", "file2.ts"],
      "migrationPath": "Replace X with Y"
    }
  ]
}
`,

  analyzeCodeQuality: (code: string) => `
Analyze code quality and identify improvement opportunities.

Check for:
- Code smells
- Performance issues
- Security concerns
- Maintainability issues
- Best practice violations

Code:
\`\`\`
${code}
\`\`\`

Return JSON with issues and recommendations.
`,
}

export function buildAnalysisPrompt(
  type: 'detect' | 'modernize' | 'estimate' | 'breaking',
  context: {
    code?: string
    language?: string
    patterns?: string
    codebaseSize?: number
    targetFramework?: string
  }
): string {
  switch (type) {
    case 'detect':
      return PROMPTS.detectLegacyPatterns(
        context.code || '',
        context.language || 'typescript'
      )
    case 'modernize':
      return PROMPTS.suggestModernizations(context.patterns || '')
    case 'estimate':
      return PROMPTS.estimateRefactorEffort(
        context.patterns || '',
        context.codebaseSize || 1000
      )
    case 'breaking':
      return PROMPTS.identifyBreakingChanges(
        context.code || '',
        context.targetFramework || 'latest'
      )
    default:
      throw new Error(`Unknown analysis type: ${type}`)
  }
}
