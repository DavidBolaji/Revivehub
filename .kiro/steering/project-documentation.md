---
inclusion: always
---

# Project Documentation Agent

## Pre-Action Requirements

⚠️ **CRITICAL**: BEFORE making ANY code changes, you MUST:

1. **Read the project map FIRST**: Check `.kiro/project-map.json` for existing functionality and file structure
2. **Understand the context**: Review related files, their purposes, exports, and dependencies
3. **Search for duplicates**: Look for similar components, services, or utilities
4. **Ask before proceeding**: If similar functionality exists, ask the user:
   - "Found existing [type] at [path] that handles [purpose]. Should I modify it or create new?"
5. **Update the map AFTER changes**: Run `node scripts/update-project-map.js <file-path>` for each modified file

## Why This Matters

- Prevents duplicate functionality
- Maintains consistency across the codebase
- Provides context for better decision-making
- Keeps documentation synchronized with code

## Auto-Update Rules

After creating or modifying ANY file, you MUST:
1. Run: `node scripts/update-project-map.js <file-path>` for each changed file
2. Verify the update was successful
3. The script automatically updates:
   - File purpose
   - Exports list
   - Dependencies
   - Last modified date

**Note**: The update script runs silently on success. No output means it worked correctly.

## File Classification

Classify files into these categories:
- **components**: React components (.tsx/.jsx files in components/ or app/)
- **services**: Business logic, API calls, external integrations
- **hooks**: Custom React hooks (use* pattern)
- **utilities**: Pure functions, helpers, formatters
- **pages**: Next.js pages and route handlers
- **types**: TypeScript type definitions
- **config**: Configuration files, constants

## Map Structure Example

```json
{
  "components": {
    "components/Auth/LoginForm.tsx": {
      "purpose": "User authentication form with validation",
      "exports": ["LoginForm", "LoginFormProps"],
      "dependencies": ["authService", "useForm"],
      "lastModified": "2025-11-30"
    }
  }
}
```