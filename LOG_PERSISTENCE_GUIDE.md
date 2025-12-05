# Log Persistence Guide

Your Kiro agent is now automatically persisting logs to files! 🎉

## ✅ Verification

Run this to verify everything is working:
```bash
node scripts/test-log-hook.js
```

## 📂 Where Are Logs Stored?

All logs are saved in the `logs/` directory with daily rotation:
- Format: `kiro-session-YYYY-MM-DD.log`
- Example: `logs/kiro-session-2025-12-05.log`

## 🔍 Viewing Logs

### View all logs
```bash
node scripts/view-logs.js
```

### View last 20 entries
```bash
node scripts/view-logs.js -n 20
```

### Filter by keyword
```bash
node scripts/view-logs.js -f "ERROR"
```

### View specific date
```bash
node scripts/view-logs.js -d 2025-12-05
```

### Filter by level and limit
```bash
node scripts/view-logs.js -l ERROR -n 10
```

## 📝 Manual Logging

Add custom log entries:
```bash
node scripts/persist-logs.js "Your custom message here"
```

## 🧹 Cleanup Old Logs

Remove logs older than 30 days (default):
```bash
node scripts/cleanup-logs.js
```

Remove logs older than specific days:
```bash
node scripts/cleanup-logs.js --days 7
```

## 🪝 How the Hook Works

The Kiro hook (`.kiro/hooks/log-persistence.kiro.hook`) automatically logs:

1. **On Session Start** - When you start a new Kiro session
2. **On Message Sent** - Every message you send to Kiro
3. **On Execution Complete** - When Kiro finishes executing

## 📊 Log Format

Each log entry includes:
- Timestamp (ISO 8601 format)
- Event type (SESSION START, USER MESSAGE, EXECUTION COMPLETE)
- Message content

Example:
```
[2025-12-05T16:02:22.237Z] [SESSION START] New Kiro session started
[2025-12-05T16:03:15.442Z] [USER MESSAGE] how do i know that my hook is working
[2025-12-05T16:03:45.123Z] [EXECUTION COMPLETE] Session completed
```

## 🔧 Troubleshooting

### Hook not triggering?
1. Check if hook is enabled in `.kiro/hooks/log-persistence.kiro.hook`
2. Verify `"enabled": true` in the hook file
3. Restart Kiro or reconnect the hook from the MCP Server view

### Logs not appearing?
1. Run the test: `node scripts/test-log-hook.js`
2. Check if `logs/` directory exists
3. Verify file permissions

### Want to disable logging?
Edit `.kiro/hooks/log-persistence.kiro.hook` and set:
```json
"enabled": false
```

## 🎯 Quick Commands

Add these to your `package.json` scripts for convenience:
```json
{
  "scripts": {
    "logs": "node scripts/view-logs.js",
    "logs:test": "node scripts/test-log-hook.js",
    "logs:clean": "node scripts/cleanup-logs.js"
  }
}
```

Then use:
```bash
npm run logs
npm run logs:test
npm run logs:clean
```

## 📦 What Was Created

- `scripts/persist-logs.js` - Core log persistence script
- `scripts/view-logs.js` - Log viewer with filtering
- `scripts/cleanup-logs.js` - Log cleanup utility
- `scripts/test-log-hook.js` - Hook verification test
- `.kiro/hooks/log-persistence.kiro.hook` - Kiro hook configuration
- `lib/logger/log-persister.ts` - TypeScript logger utility (for programmatic use)

## 🚀 Next Steps

1. Run `node scripts/test-log-hook.js` to verify setup
2. Send a message to Kiro to trigger the hook
3. Check logs with `node scripts/view-logs.js`
4. Set up log rotation/cleanup as needed

Your logs will now persist automatically! 🎊
