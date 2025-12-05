# Migration Planner

Intelligent migration planning system that analyzes codebases and generates comprehensive, phased migration plans with complexity estimates and dependency graphs.

## Features

- **Multi-Phase Planning**: Breaks migrations into logical phases (dependencies → structure → components → docs)
- **AI-Powered Insights**: Intelligent analysis with warnings, tips, and optimization recommendations
- **Complexity Estimation**: Calculates migration complexity based on codebase size, patterns, and framework distance
- **Dependency Graphs**: Builds task dependency graphs with critical path analysis
- **Time Estimates**: Provides both manual and automated time estimates
- **Customization**: Supports aggressiveness levels and selective transformation enabling
- **Risk Assessment**: Identifies breaking changes and risk levels for each task
- **Parallel Execution**: Identifies tasks that can run in parallel for faster migration

## Architecture

```
lib/planner/
├── types.ts                  # TypeScript type definitions
├── migration-planner.ts      # Main planner orchestration
├── ai-enhancer.ts            # AI-powered plan enhancement
├── phase-generator.ts        # Generates migration phases
├── complexity-estimator.ts   # Estimates effort and complexity
├── dependency-graph.ts       # Builds task dependency graphs
├── AI_ENHANCEMENT.md         # AI enhancement documentation
├── ai-example.ts             # AI enhancement example
└── README.md                 # This file
```

## Usage

### Basic Plan Generation

```typescript
import { MigrationPlanner } from '@/lib/planner/migration-planner'

const planner = new MigrationPlanner()

const plan = await planner.createPlan(
  // Source stack
  {
    framework: 'next.js',
    version: '12.0.0',
    language: 'JavaScript',
    dependencies: {
      react: '^17.0.0',
      'next': '^12.0.0',
    },
    patterns: ['pages-router', 'getServerSideProps'],
  },
  // Target stack
  {
    framework: 'next.js',
    version: '14.0.0',
    language: 'TypeScript',
    dependencies: {
      react: '^18.0.0',
      'next': '^14.0.0',
    },
    features: ['app-router', 'server-components'],
  },
  // Detected patterns
  [
    {
      id: 'pages-to-app',
      name: 'Pages Router to App Router',
      category: 'structural',
      severity: 'high',
      occurrences: 15,
      affectedFiles: ['pages/index.tsx', 'pages/about.tsx'],
      description: 'Migrate from Pages Router to App Router',
      automated: true,
    },
  ],
  // Codebase stats
  {
    totalFiles: 50,
    totalLines: 5000,
    testCoverage: 75,
  },
  // Customization (optional)
  {
    aggressiveness: 'balanced',
    skipDocumentation: false,
  }
)

console.log(`Total tasks: ${plan.summary.totalTasks}`)
console.log(`Automation: ${plan.summary.automationPercentage}%`)
console.log(`Complexity: ${plan.summary.overallComplexity}/100`)

// Check for AI insights
if ('aiInsights' in plan) {
  console.log(`AI Confidence: ${plan.aiMetadata.confidenceScore}%`)
  console.log(`AI Insights: ${plan.aiInsights.overall.length}`)
}
```

### Optimize and Validate Plan

```typescript
// Optimize task ordering
const optimizedPlan = await planner.optimizePlan(plan)

// Validate plan integrity
const validation = await planner.validatePlan(optimizedPlan)
if (!validation.valid) {
  console.error('Plan validation errors:', validation.errors)
}
```

### Generate Execution Timeline

```typescript
const timeline = planner.generateExecutionTimeline(plan)

console.log(`Sequential execution: ${timeline.sequential} minutes`)
console.log(`Parallel execution: ${timeline.parallel} minutes`)
console.log(`Execution batches: ${timeline.batches.length}`)
```

### Export Plan

```typescript
// Export as markdown
const markdown = planner.exportPlanSummary(plan)
console.log(markdown)

// Export as JSON
const json = JSON.stringify(plan, null, 2)
```

## API Endpoints

### POST /api/plan

Generate a new migration plan.

**Request Body:**
```json
{
  "source": {
    "framework": "next.js",
    "version": "12.0.0",
    "language": "JavaScript",
    "dependencies": {},
    "patterns": []
  },
  "target": {
    "framework": "next.js",
    "version": "14.0.0",
    "language": "TypeScript",
    "dependencies": {},
    "features": []
  },
  "patterns": [
    {
      "id": "pattern-1",
      "name": "Pattern Name",
      "category": "structural",
      "severity": "high",
      "occurrences": 10,
      "affectedFiles": [],
      "description": "Description",
      "automated": true
    }
  ],
  "codebaseStats": {
    "totalFiles": 50,
    "totalLines": 5000,
    "testCoverage": 75
  },
  "customization": {
    "aggressiveness": "balanced",
    "skipDocumentation": false
  },
  "enableAI": true
}
```

**Response:**
```json
{
  "plan": { /* MigrationPlan object */ },
  "timeline": {
    "sequential": 180,
    "parallel": 90,
    "batches": [[]]
  },
  "validation": {
    "valid": true,
    "errors": []
  }
}
```

### POST /api/plan/export

Export a migration plan in various formats.

**Request Body:**
```json
{
  "plan": { /* MigrationPlan object */ },
  "format": "markdown" // or "json"
}
```

## Migration Phases

### Phase 1: Dependency Updates
- **Risk Level**: Low
- **Can Run in Parallel**: Yes
- **Description**: Update package dependencies and resolve version conflicts
- **Tasks**: Package updates, dependency resolution

### Phase 2: Structural Changes
- **Risk Level**: High
- **Can Run in Parallel**: No
- **Description**: Migrate routing, architecture patterns, and core framework features
- **Tasks**: Route migration, API changes, configuration updates

### Phase 3: Component Modernization
- **Risk Level**: Medium
- **Can Run in Parallel**: Yes
- **Description**: Update components to use modern patterns, hooks, and best practices
- **Tasks**: Component refactoring, hook migration, prop updates

### Phase 4: Documentation Updates
- **Risk Level**: Low
- **Can Run in Parallel**: Yes
- **Description**: Update project documentation to reflect migration changes
- **Tasks**: README updates, changelog generation, migration guides

## Task Types

- **automated**: Fully automated transformation (90% time savings)
- **review**: Automated with manual review required (70% time savings)
- **manual**: Requires manual implementation (no automation)

## Customization Options

### Aggressiveness Levels

- **conservative**: More careful, takes longer, lower risk
- **balanced**: Default, balanced approach
- **aggressive**: Faster but riskier, requires more review

### Selective Transformations

```typescript
{
  enabledTransformations: ['transform-1', 'transform-2'],
  disabledTransformations: ['transform-3'],
  selectedPatterns: ['pattern-1', 'pattern-2'],
  skipTests: false,
  skipDocumentation: false
}
```

## Complexity Estimation

The complexity estimator considers:

- **Codebase Size**: Total lines of code
- **File Count**: Number of files to migrate
- **Dependency Count**: Number of dependencies
- **Pattern Complexity**: Severity and automation of detected patterns
- **Framework Distance**: How different source and target frameworks are
- **Custom Code Ratio**: Percentage of custom vs framework code
- **Test Coverage**: Current test coverage percentage

### Complexity Levels

- **trivial** (0-20): Simple migration, minimal changes
- **simple** (20-40): Straightforward migration
- **moderate** (40-60): Average complexity
- **complex** (60-80): Significant effort required
- **very-complex** (80-100): Major migration effort

## Dependency Graph

The dependency graph builder:

- Identifies task dependencies
- Detects circular dependencies
- Marks critical path tasks
- Calculates parallel execution opportunities
- Generates execution batches

### Graph Visualization

```typescript
import { DependencyGraphBuilder } from '@/lib/planner/dependency-graph'

const builder = new DependencyGraphBuilder()
const graph = builder.buildGraph(tasks)
const visualization = builder.visualizeGraph(graph, tasks)

console.log(visualization)
// Output:
// 🔴 Critical Task (task-1)
//   ↳ Depends on: task-0
//   ↳ Blocks: task-2, task-3
// 🟢 Parallel Task (task-4)
// 🟡 Dependent Task (task-5)
//   ↳ Depends on: task-1
```

## Example: Complete Migration Flow

```typescript
import { MigrationPlanner } from '@/lib/planner/migration-planner'
import { DependencyGraphBuilder } from '@/lib/planner/dependency-graph'

async function planMigration() {
  const planner = new MigrationPlanner()
  
  // 1. Create plan
  const plan = await planner.createPlan(source, target, patterns, stats)
  
  // 2. Optimize
  const optimized = await planner.optimizePlan(plan)
  
  // 3. Validate
  const validation = await planner.validatePlan(optimized)
  if (!validation.valid) {
    throw new Error(`Invalid plan: ${validation.errors.join(', ')}`)
  }
  
  // 4. Generate timeline
  const timeline = planner.generateExecutionTimeline(optimized)
  
  // 5. Export summary
  const summary = planner.exportPlanSummary(optimized)
  
  // 6. Visualize dependencies
  const builder = new DependencyGraphBuilder()
  const viz = builder.visualizeGraph(optimized.dependencyGraph, 
    optimized.phases.flatMap(p => p.tasks))
  
  return {
    plan: optimized,
    timeline,
    summary,
    visualization: viz,
  }
}
```

## Integration with Pattern Detection

The planner integrates with the pattern detection system:

```typescript
import { PatternDetector } from '@/lib/patterns/detector'
import { MigrationPlanner } from '@/lib/planner/migration-planner'

// 1. Detect patterns
const detector = new PatternDetector()
const patterns = await detector.detectPatterns(codebase)

// 2. Generate plan
const planner = new MigrationPlanner()
const plan = await planner.createPlan(source, target, patterns, stats)

// 3. Execute transformations based on plan
for (const phase of plan.phases) {
  for (const task of phase.tasks) {
    if (task.type === 'automated' && task.transformerId) {
      // Execute transformer
      await executeTransformer(task.transformerId, task.affectedFiles)
    }
  }
}
```

## AI Enhancement

The planner includes AI-powered insights that analyze your migration and provide intelligent recommendations. See [AI_ENHANCEMENT.md](./AI_ENHANCEMENT.md) for detailed documentation.

### Quick Start with AI

```typescript
// AI enhancement is enabled by default
const plan = await planner.createPlan(source, target, patterns, stats, customization, true)

// Access AI insights
if ('aiInsights' in plan) {
  // Overall insights
  plan.aiInsights.overall.forEach(insight => {
    console.log(`${insight.type}: ${insight.message}`)
    console.log(`Confidence: ${insight.confidence}%`)
    console.log(`Action: ${insight.suggestedAction}`)
  })

  // Phase-specific insights
  Object.entries(plan.aiInsights.byPhase).forEach(([phaseId, insights]) => {
    console.log(`Phase ${phaseId}: ${insights.length} insights`)
  })

  // Task-specific insights
  Object.entries(plan.aiInsights.byTask).forEach(([taskId, insights]) => {
    console.log(`Task ${taskId}: ${insights.length} insights`)
  })
}
```

### AI Insight Types

- **Warnings** (⚠️): Critical issues requiring attention
- **Tips** (💡): Helpful recommendations
- **Insights** (ℹ️): Informational observations
- **Optimizations** (⚡): Code quality improvements

### Example AI Insights

```typescript
{
  type: 'warning',
  message: 'Found 2 deprecated dependencies: enzyme, react-router-redux',
  confidence: 90,
  category: 'dependencies',
  affectedItems: ['enzyme', 'react-router-redux'],
  suggestedAction: 'Upgrade or replace deprecated packages before migration'
}
```

Run the example: `npx tsx lib/planner/ai-example.ts`

## Best Practices

1. **Always validate plans** before execution
2. **Review AI insights** - prioritize high-confidence warnings
3. **Review automated tasks** in high-risk phases
4. **Run tests** after each phase completion
5. **Use conservative mode** for production migrations
6. **Export plans** for team review and documentation
7. **Monitor complexity scores** - scores > 80 need extra care
8. **Check dependency graphs** for circular dependencies
9. **Leverage parallel execution** where possible
10. **Act on AI recommendations** - especially security and compatibility warnings

## Future Enhancements

- [ ] Machine learning-based complexity prediction
- [ ] Historical migration data analysis
- [ ] Cost estimation (developer hours × rate)
- [ ] Risk mitigation strategies
- [ ] Rollback plan generation
- [ ] Integration with CI/CD pipelines
- [ ] Real-time progress tracking
- [ ] Team collaboration features
