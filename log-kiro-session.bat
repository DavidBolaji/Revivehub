@echo off
REM ReviveHub - Kiro Session Logger (Batch Script)
REM Quick logging for hackathon progress tracking

setlocal enabledelayedexpansion

echo ============================================================
echo ReviveHub - Kiro Session Logger
echo ============================================================
echo.

REM Get timestamp
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (set mydate=%%a-%%b-%%c)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a:%%b)
set timestamp=%mydate% %mytime%

REM Collect session info
set /p focus="What did you work on? (brief description): "
echo.
set /p feature="Which Kiro feature? (vibe/spec/hook/steering/mcp/other): "
echo.
set /p outcome="What was the outcome?: "
echo.
set /p notes="Any notes or learnings?: "
echo.

REM Create log entry
echo. >> KIRO_USAGE.md
echo --- >> KIRO_USAGE.md
echo ### %timestamp% - %focus% >> KIRO_USAGE.md
echo **Feature Used:** %feature% >> KIRO_USAGE.md
echo **Outcome:** %outcome% >> KIRO_USAGE.md
echo **Notes:** %notes% >> KIRO_USAGE.md

REM Update PROGRESS.md
echo - [%timestamp%] %focus% - %outcome% >> PROGRESS.md

echo.
echo ============================================================
echo Session logged successfully!
echo ============================================================
echo.
echo Updated files:
echo   - KIRO_USAGE.md
echo   - PROGRESS.md
echo.

pause
