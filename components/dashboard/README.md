# Dashboard Health Score Components

Beautiful, animated health score visualization components for ReviveHub.

## Components

### HealthScore
Circular progress indicator showing repository health score (0-100).

**Features:**
- Color-coded: Red (0-40), Yellow (41-70), Green (71-100)
- Smooth animations on mount
- Hover effects
- Three sizes: sm, md, lg

**Usage:**
```tsx
import { HealthScore } from '@/components/dashboard'

<HealthScore score={85} size="md" showLabel={true} animated={true} />
```

### HealthBreakdown
Detailed breakdown of health scores by category with issues and suggestions.

**Features:**
- Category scores with progress bars
- Animated entry for each item
- Issues list with severity indicators
- Suggestions with priority levels
- Expandable/collapsible sections

**Usage:**
```tsx
import { HealthBreakdown } from '@/components/dashboard'

<HealthBreakdown report={healthReport} animated={true} />
```

### HealthScoreSkeleton
Loading state animation while scanning.

**Features:**
- Pulsing circular progress
- Smooth opacity transitions
- Matches HealthScore design

**Usage:**
```tsx
import { HealthScoreSkeleton } from '@/components/dashboard'

{isScanning && <HealthScoreSkeleton />}
```

### RepositoryCard
Enhanced repository card with integrated health scanning.

**Features:**
- One-click health scanning
- Real-time scan progress
- Expandable health breakdown
- Error handling
- Smooth animations

**Usage:**
```tsx
import { RepositoryCard } from '@/components/dashboard'

<RepositoryCard repository={repo} />
```

## Health Report Format

```typescript
interface HealthReport {
  score: number // 0-100
  breakdown: {
    documentation: number
    codeQuality: number
    testing: number
    dependencies: number
    cicd: number
    security: number
  }
  issues: Array<{
    severity: 'critical' | 'warning' | 'info'
    category: string
    message: string
    impact: string
  }>
  suggestions: Array<{
    priority: 'high' | 'medium' | 'low'
    category: string
    message: string
    benefit: string
  }>
}
```

## Animation Details

All components use Framer Motion for smooth, performant animations:
- Staggered entry animations for lists
- Spring physics for natural movement
- Opacity and scale transitions
- Expandable sections with height animations

## Color Scheme

Matches ReviveHub's spooky Halloween theme:
- Purple accents (#a855f7)
- Dark slate backgrounds
- Color-coded health indicators
- Glowing hover effects
