# Migration Plan UI Components

Beautiful, interactive interface for viewing and customizing migration plans.

## Components

### MigrationPlanView
Main container component that orchestrates the entire plan view.

**Features:**
- Summary statistics (time, automation %, tasks, high-risk count)
- Phase timeline visualization
- Expandable phase details
- Plan customization controls
- Start transformation button

### PhaseTimeline
Visual timeline showing all phases sequentially with progress indicators.

**Features:**
- Vertical timeline with connecting line
- Phase status indicators (expanded/collapsed)
- Quick phase overview (time, tasks, automation)
- Color-coded risk levels
- Click to expand/collapse phases

### PhaseDetails
Expandable card showing detailed information about a specific phase.

**Features:**
- Phase description and metadata
- Task list with checkboxes
- Collapsible interface
- Visual feedback for expanded state

### TaskList
List of tasks within a phase with interactive controls.

**Features:**
- Checkbox to enable/disable tasks
- Automated vs manual review badges
- Complexity and risk indicators
- Affected files list (expandable)
- Before/after code previews
- Dependency information

### ComplexityBadge
Visual indicator for task complexity levels.

**Props:**
- `complexity`: 'low' | 'medium' | 'high'

### PlanCustomizer
Advanced controls for customizing the migration plan.

**Features:**
- Toggle all tasks on/off
- Enable only automated tasks
- Phase-by-phase progress bars
- Export plan as JSON
- Share link functionality

## Usage

```tsx
import { MigrationPlanView } from '@/components/planner/MigrationPlanView'

export default function PlanPage() {
  const plan = await getMigrationPlan()
  
  return (
    <MigrationPlanView
      plan={plan}
      repositoryName="owner/repo"
      onStartTransformation={() => {
        // Handle transformation start
      }}
    />
  )
}
```

## Page Route

Access migration plans at: `/dashboard/plan/[repo]?owner=username`

## Visual Indicators

- ✅ Automated tasks
- ⚠️ Manual review required
- 🟢 Low risk
- 🟡 Medium risk
- 🔴 High risk
- ⏱️ Time estimates
- 📋 Task counts
- 🔥 Automation percentage

## Customization

Users can:
- Toggle individual tasks on/off
- Expand/collapse phases
- View affected files
- Preview code changes
- Export plan configuration
- See real-time statistics updates
