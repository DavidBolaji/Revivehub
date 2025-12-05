# Next.js Migration Rules

This document outlines the rules enforced by the Next.js Migration Validator for React to Next.js migrations.

## ❌ Files That Should NOT Exist

These files are specific to Create React App and should be removed during migration:

### 1. `src/index.js` or `src/Index.tsx`
- **Why**: Next.js does not use a manual entry point
- **Action**: Remove entirely
- **Reason**: Next.js boots from `app/layout.tsx` + `app/page.tsx`

### 2. `src/reportWebVitals.js` or `src/Reportwebvitals.tsx`
- **Why**: CRA's performance reporting tool
- **Action**: Delete this file
- **Reason**: Next.js has built-in analytics and performance monitoring

### 3. `src/setupTests.js` or `src/Setuptests.tsx`
- **Why**: Test setup should be at project root
- **Action**: Move to `jest.setup.ts` at root or `/tests` directory
- **Reason**: Jest expects setup files at specific locations

### 4. `public/index.html`
- **Why**: CRA entry HTML file
- **Action**: Remove entirely
- **Reason**: Next.js generates HTML automatically

## ✅ Correct File Naming and Locations

### Hooks

**Rule**: Hooks must be camelCase starting with `use`

❌ **Incorrect**:
```
src/hooks/Usetodos.tsx
hooks/Usetodos.ts
```

✅ **Correct**:
```
hooks/useTodos.ts
```

**Additional Rules**:
- Use `.ts` extension unless the hook returns JSX
- If returning JSX, use `.tsx`
- Always start with lowercase `use`

### Context Files

**Rule**: Context files should be PascalCase and in `lib/context/` or `app/context/`

❌ **Incorrect**:
```
src/context/Todocontext.tsx
src/context/todocontext.tsx
```

✅ **Correct**:
```
lib/context/TodoContext.tsx
app/context/TodoContext.tsx
```

**Additional Rules**:
- Never place context in `src/` directory
- Use PascalCase naming (e.g., `TodoContext`, not `todoContext`)
- Prefer `lib/context/` for shared contexts

## 📁 Directory Structure

### Next.js App Router Structure

```
project-root/
├── app/                    # App Router (pages, layouts, etc.)
│   ├── layout.tsx         # Root layout (required)
│   ├── page.tsx           # Home page (required)
│   ├── error.tsx          # Error boundary
│   ├── not-found.tsx      # 404 page
│   └── [feature]/         # Feature routes
├── components/            # React components
│   ├── ui/               # UI components
│   └── [feature]/        # Feature-specific components
├── lib/                   # Utilities and shared logic
│   ├── context/          # React contexts
│   ├── utils/            # Utility functions
│   └── api/              # API clients
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
├── public/                # Static assets
└── styles/                # Global styles
```

### Migration Mapping

| CRA Location | Next.js Location | Notes |
|--------------|------------------|-------|
| `src/App.js` | `app/page.tsx` | Main app becomes home page |
| `src/components/` | `components/` | Move out of src/ |
| `src/hooks/` | `hooks/` | Move out of src/ |
| `src/context/` | `lib/context/` | Prefer lib/ for contexts |
| `src/utils/` | `lib/utils/` | Utilities go in lib/ |
| `src/pages/` | `app/[route]/page.tsx` | Convert to App Router |

## 🔧 Required Next.js Files

These files must exist for a valid Next.js application:

### 1. `app/layout.tsx` (Required)
Root layout that wraps all pages.

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### 2. `app/page.tsx` (Required)
Home page component.

```tsx
export default function HomePage() {
  return <div>Home</div>
}
```

### 3. `next.config.js` (Required)
Next.js configuration file.

```js
/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
```

## ⚠️ Special Cases

### PWA Manifest

If `public/manifest.json` exists:
- **Action**: Install and configure `next-pwa` plugin
- **Alternative**: Remove manifest.json if PWA is not needed

**Installation**:
```bash
npm install next-pwa
```

**Configuration** (`next.config.js`):
```js
const withPWA = require('next-pwa')({
  dest: 'public'
})

module.exports = withPWA({
  // Next.js config
})
```

### Test Setup

If test setup is needed:
- **Location**: `jest.setup.ts` at project root
- **Alternative**: `/tests/setup.ts` with Jest config pointing to it

**Jest Configuration** (`jest.config.js`):
```js
module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // other config
}
```

## 🎯 Validation Severity Levels

### Critical (Must Fix)
- Forbidden files exist (index.js, reportWebVitals.js)
- Required files missing (app/layout.tsx, app/page.tsx)
- Hook naming violations

### High (Should Fix)
- Incorrect file locations (src/context/)
- Incorrect naming conventions

### Medium (Recommended)
- Context files not in lib/
- Hook extensions (.tsx vs .ts)

### Low (Optional)
- PWA manifest without next-pwa
- Code style improvements

## 🔄 Auto-Fixable Issues

The validator can automatically fix:
- ✅ Removing forbidden files
- ✅ Renaming files with incorrect conventions
- ✅ Moving files to correct locations
- ✅ Updating file extensions

## 🚫 Manual Review Required

These issues require manual intervention:
- ❌ Creating missing required files
- ❌ Configuring next-pwa for PWA support
- ❌ Complex code refactoring
- ❌ Dependency updates

## 📊 Validation Report Example

```
============================================================
Next.js Migration Validation Report
============================================================

❌ Validation failed - issues found

Total Issues: 5
Files Removed: 2
Files Renamed: 3

🚨 ERRORS (must fix):

1. This file should not exist in Next.js: src/index.js
   File: src/index.js
   Action: Remove this file. Next.js boots from app/layout.tsx + app/page.tsx

2. Incorrect file path: src/hooks/Usetodos.tsx
   File: src/hooks/Usetodos.tsx
   Action: Rename/move to: hooks/useTodos.ts

⚠️  WARNINGS (should fix):

1. Context files should not be in src/ directory
   File: src/context/TodoContext.tsx
   Action: Move to lib/context/ or app/context/

🗑️  Files Removed:
   - src/index.js
   - src/reportWebVitals.js

📝 Files Renamed:
   src/hooks/Usetodos.tsx → hooks/useTodos.ts
   src/context/TodoContext.tsx → lib/context/TodoContext.tsx
   src/setupTests.js → jest.setup.ts

============================================================
```

## 🛠️ Usage

### Programmatic Usage

```typescript
import { createNextJSValidator } from '@/lib/migration/nextjs-migration-validator'

const validator = createNextJSValidator()

const result = await validator.validate(transformations, spec)

if (!result.isValid) {
  console.log(validator.generateReport(result))
}

// Apply fixes
const fixedTransformations = result.fixedTransformations
```

### CLI Usage

```bash
node scripts/validate-migration.js
```

## 📚 References

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Next.js Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [React Hooks Naming Conventions](https://react.dev/reference/react/hooks)
