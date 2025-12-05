# setupTests.js Fix

## Changes Made

### 1. Updated `isTestFile()` Method

**Problem:** `setupTests.js` was not being detected as a test file because the regex only matched `.test.js` or `.spec.js` patterns.

**Solution:** Added explicit check for `setupTests.js` files:

```typescript
private isTestFile(filePath: string): boolean {
  // Match .test.js, .spec.js, or setupTests.js files
  return /\.(test|spec)\.(tsx?|jsx?)$/i.test(filePath) || 
         /setupTests\.(tsx?|jsx?)$/i.test(filePath)
}
```

### 2. Enhanced Logging for Deletion Detection

**Problem:** Need to see why `src/index.js` and `src/reportWebVitals.js` are not being deleted.

**Solution:** Added comprehensive logging in `planFileChange()`:

```typescript
console.log(`[FileStructureManager] ===== Planning change for: ${normalized} =====`)
const shouldDelete = this.shouldRemoveFile(normalized, spec)
console.log(`[FileStructureManager] Should delete: ${shouldDelete}`)

if (shouldDelete) {
  console.log(`[FileStructureManager] ✓ Marking ${filePath} for DELETION`)
  // ... create deletion change
}
```

## Expected Results

After restarting the server and running the migration, you should see:

### For setupTests.js:
```
[FileStructureManager] ===== Planning change for: src/setupTests.js =====
[FileStructureManager] Should delete: false
[FileStructureManager] File type determined: component
[FileStructureManager] Detected test file: src/setupTests.js
[FileStructureManager] Moving test src/setupTests.js → __tests__/setupTests.tsx
```

### For index.js and reportWebVitals.js:
```
[FileStructureManager] ===== Planning change for: src/index.js =====
[FileStructureManager] shouldRemoveFile check for src/index.js:
[FileStructureManager]   - Source: React (react)
[FileStructureManager]   - Target: nextjs-app (nextjs-app)
[FileStructureManager]   - Is React to Next.js: true
[FileStructureManager]   - Should remove: true
[FileStructureManager] Should delete: true
[FileStructureManager] ✓ Marking src/index.js for DELETION
```

## UI Display

**Successful Transformations:**
- ✅ `src/App.test.js` → `__tests__/App.test.tsx`
- ✅ `src/setupTests.js` → `__tests__/setupTests.tsx` (FIXED!)

**Files Removed:**
- ✅ `src/index.js` (deleted)
- ✅ `src/reportWebVitals.js` (deleted)

## Next Steps

1. **Restart the dev server** (Ctrl+C, then `pnpm dev`)
2. **Run the migration again**
3. **Copy the server logs** showing the `[FileStructureManager]` output
4. **If files are still not being deleted**, paste the logs back to me - the new logging will show exactly why

## Debugging

If `src/index.js` and `src/reportWebVitals.js` are still not being deleted, look for these logs:

1. **Check if shouldRemoveFile is being called:**
   ```
   [FileStructureManager] shouldRemoveFile check for src/index.js:
   ```

2. **Check the framework detection:**
   ```
   [FileStructureManager]   - Source: React (react)
   [FileStructureManager]   - Is React to Next.js: true
   ```

3. **Check if deletion is being marked:**
   ```
   [FileStructureManager] Should delete: true
   [FileStructureManager] ✓ Marking src/index.js for DELETION
   ```

If any of these logs are missing or show unexpected values, copy them back to me and I'll fix it.
