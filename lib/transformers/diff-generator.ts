/**
 * DiffGenerator Utility
 * 
 * Generates comprehensive diffs in multiple formats for code transformations.
 * Supports unified diffs (Git-compatible), visual diffs (UI rendering),
 * character-level diffs (inline highlighting), and context-aware diffs.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import * as Diff from 'diff'
import type { Diff as DiffType, DiffLine, CharacterDiff } from '@/types/transformer'

export class DiffGenerator {
  /**
   * Generate all diff formats in a single call
   * 
   * @param original - Original code before transformation
   * @param transformed - Transformed code after transformation
   * @returns Complete diff object with all formats
   */
  generate(original: string, transformed: string): DiffType {
    return {
      original,
      transformed,
      unified: this.generateUnified(original, transformed),
      visual: this.generateVisual(original, transformed),
      characterLevel: this.generateCharacterLevel(original, transformed),
    }
  }

  /**
   * Generate unified diff format (Git-compatible)
   * 
   * Creates a patch format that can be used with Git and other version control systems.
   * 
   * @param original - Original code
   * @param transformed - Transformed code
   * @returns Unified diff string in patch format
   */
  generateUnified(original: string, transformed: string): string {
    const patch = Diff.createPatch(
      'file',
      original,
      transformed,
      'Original',
      'Transformed'
    )
    
    // Replace the default headers with our custom ones
    return patch
      .replace('--- file', '--- Original')
      .replace('+++ file', '+++ Transformed')
  }

  /**
   * Generate visual diff for UI rendering with line numbers
   * 
   * Creates a line-by-line diff suitable for displaying in a UI with
   * proper line number tracking for both old and new versions.
   * 
   * @param original - Original code
   * @param transformed - Transformed code
   * @returns Array of diff lines with type and line number information
   */
  generateVisual(original: string, transformed: string): DiffLine[] {
    const lines: DiffLine[] = []
    const changes = Diff.diffLines(original, transformed)

    let oldLineNum = 1
    let newLineNum = 1

    for (const change of changes) {
      // Split the change value into lines, filtering out empty trailing lines
      const changeLines = change.value.split('\n')
      
      // Remove the last empty line if it exists (from trailing newline)
      if (changeLines[changeLines.length - 1] === '') {
        changeLines.pop()
      }

      for (const line of changeLines) {
        if (change.added) {
          lines.push({
            type: 'added',
            lineNumber: newLineNum,
            content: line,
            newLineNumber: newLineNum,
          })
          newLineNum++
        } else if (change.removed) {
          lines.push({
            type: 'removed',
            lineNumber: oldLineNum,
            content: line,
            oldLineNumber: oldLineNum,
          })
          oldLineNum++
        } else {
          lines.push({
            type: 'unchanged',
            lineNumber: oldLineNum,
            content: line,
            oldLineNumber: oldLineNum,
            newLineNumber: newLineNum,
          })
          oldLineNum++
          newLineNum++
        }
      }
    }

    return lines
  }

  /**
   * Generate character-level diff for inline highlighting
   * 
   * Creates a character-by-character diff that can be used to highlight
   * specific changes within lines.
   * 
   * @param original - Original code
   * @param transformed - Transformed code
   * @returns Array of character diffs with added/removed flags
   */
  generateCharacterLevel(original: string, transformed: string): CharacterDiff[] {
    const changes = Diff.diffChars(original, transformed)
    
    return changes.map((change) => ({
      value: change.value,
      added: change.added || false,
      removed: change.removed || false,
    }))
  }

  /**
   * Generate diff with configurable context lines
   * 
   * Creates a visual diff that includes a specified number of unchanged
   * lines around each change for context.
   * 
   * @param original - Original code
   * @param transformed - Transformed code
   * @param contextLines - Number of context lines to include (default: 3)
   * @returns Array of diff lines with context
   */
  generateWithContext(
    original: string,
    transformed: string,
    contextLines: number = 3
  ): DiffLine[] {
    const allLines = this.generateVisual(original, transformed)
    
    // Find indices of changed lines
    const changedIndices = new Set<number>()
    allLines.forEach((line, index) => {
      if (line.type === 'added' || line.type === 'removed' || line.type === 'modified') {
        changedIndices.add(index)
      }
    })

    // If no changes, return empty array
    if (changedIndices.size === 0) {
      return []
    }

    // Calculate which lines to include based on context
    const includedIndices = new Set<number>()
    
    for (const changedIndex of changedIndices) {
      // Include the changed line
      includedIndices.add(changedIndex)
      
      // Include context lines before
      for (let i = Math.max(0, changedIndex - contextLines); i < changedIndex; i++) {
        // Only include unchanged lines as context
        if (allLines[i].type === 'unchanged') {
          includedIndices.add(i)
        }
      }
      
      // Include context lines after
      for (
        let i = changedIndex + 1;
        i <= Math.min(allLines.length - 1, changedIndex + contextLines);
        i++
      ) {
        // Only include unchanged lines as context
        if (allLines[i].type === 'unchanged') {
          includedIndices.add(i)
        }
      }
    }

    // Convert set to sorted array and extract lines
    const sortedIndices = Array.from(includedIndices).sort((a, b) => a - b)
    const result: DiffLine[] = []

    for (let i = 0; i < sortedIndices.length; i++) {
      const index = sortedIndices[i]
      result.push(allLines[index])

      // Add separator if there's a gap in line numbers (more than 1 line apart)
      if (i < sortedIndices.length - 1) {
        const gap = sortedIndices[i + 1] - index
        if (gap > 1) {
          result.push({
            type: 'unchanged',
            lineNumber: -1,
            content: '...',
            oldLineNumber: -1,
            newLineNumber: -1,
          })
        }
      }
    }

    return result
  }

  /**
   * Calculate diff statistics
   * 
   * @param diff - Diff object to analyze
   * @returns Statistics about the diff
   */
  getStats(diff: DiffType): {
    linesAdded: number
    linesRemoved: number
    linesUnchanged: number
    totalChanges: number
  } {
    const linesAdded = diff.visual.filter((l) => l.type === 'added').length
    const linesRemoved = diff.visual.filter((l) => l.type === 'removed').length
    const linesUnchanged = diff.visual.filter((l) => l.type === 'unchanged').length

    return {
      linesAdded,
      linesRemoved,
      linesUnchanged,
      totalChanges: linesAdded + linesRemoved,
    }
  }

  /**
   * Check if two code strings are identical
   * 
   * @param original - Original code
   * @param transformed - Transformed code
   * @returns True if codes are identical
   */
  areIdentical(original: string, transformed: string): boolean {
    return original === transformed
  }

  /**
   * Generate a "rename" diff that shows full content for file renames
   * 
   * When a file is renamed (e.g., .js to .jsx) with identical content,
   * this generates a diff that shows the content being "moved" from old to new file.
   * Lines are shown as removed from the old file and added to the new file,
   * making the rename visible in the diff viewer.
   * 
   * @param content - File content (same for both old and new)
   * @param oldPath - Original file path
   * @param newPath - New file path
   * @returns Diff object showing rename as remove + add
   */
  generateRenameDiff(content: string, oldPath: string, newPath: string): DiffType {
    const lines = content.split('\n')
    const visual: DiffLine[] = []

    // Show all lines as removed from old file
    lines.forEach((line, index) => {
      const lineNum = index + 1
      visual.push({
        type: 'removed',
        lineNumber: lineNum,
        content: line,
        oldLineNumber: lineNum,
      })
    })

    // Show all lines as added to new file
    lines.forEach((line, index) => {
      const lineNum = index + 1
      visual.push({
        type: 'added',
        lineNumber: lineNum,
        content: line,
        newLineNumber: lineNum,
      })
    })

    // Create a unified diff showing the rename
    const unified = `--- ${oldPath}
+++ ${newPath}
@@ -1,${lines.length} +1,${lines.length} @@
${lines.map(line => `-${line}`).join('\n')}
${lines.map(line => `+${line}`).join('\n')}`

    return {
      original: content,
      transformed: content,
      unified,
      visual,
      characterLevel: [], // No character changes for renames
    }
  }
}

// Export singleton instance for convenience
export const diffGenerator = new DiffGenerator()
