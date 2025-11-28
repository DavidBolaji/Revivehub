#!/usr/bin/env pwsh
# ReviveHub - Kiro Session Logger (PowerShell)
# Quick logging for hackathon progress tracking

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "ReviveHub - Kiro Session Logger" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get timestamp
$timestamp = Get-Date -Format "MMM dd, yyyy HH:mm"
$date = Get-Date -Format "MMM dd, yyyy"

# Collect session info
$focus = Read-Host "What did you work on? (brief description)"
Write-Host ""
$feature = Read-Host "Which Kiro feature? (vibe/spec/hook/steering/mcp/other)"
Write-Host ""
$outcome = Read-Host "What was the outcome?"
Write-Host ""
$notes = Read-Host "Any notes or learnings?"
Write-Host ""

# Create log entry
$entry = @"

---
### $timestamp - $focus
**Feature Used:** $feature
**Outcome:** $outcome
**Notes:** $notes
"@

# Append to KIRO_USAGE.md
try {
    Add-Content -Path "KIRO_USAGE.md" -Value $entry -Encoding UTF8
    Write-Host "✓ Logged to KIRO_USAGE.md" -ForegroundColor Green
} catch {
    Write-Host "✗ Error writing to KIRO_USAGE.md: $_" -ForegroundColor Red
}

# Update PROGRESS.md with quick note
$progressNote = "- [$timestamp] $focus - $outcome"
try {
    $content = Get-Content -Path "PROGRESS.md" -Raw -Encoding UTF8
    
    # Find today's section and add note
    if ($content -match "### $date") {
        $marker = "**Kiro Usage:**`n"
        $content = $content -replace [regex]::Escape($marker), "$marker$progressNote`n"
        Set-Content -Path "PROGRESS.md" -Value $content -Encoding UTF8 -NoNewline
        Write-Host "✓ Updated PROGRESS.md" -ForegroundColor Green
    } else {
        # Just append if today's section not found
        Add-Content -Path "PROGRESS.md" -Value "`n$progressNote" -Encoding UTF8
        Write-Host "✓ Updated PROGRESS.md (appended)" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Error updating PROGRESS.md: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Session logged successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Updated files:" -ForegroundColor Yellow
Write-Host "  - KIRO_USAGE.md"
Write-Host "  - PROGRESS.md"
Write-Host ""
