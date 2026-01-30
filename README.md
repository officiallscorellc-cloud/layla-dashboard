# ✨ Layla Dashboard

Real-time task management dashboard for Layla AI.

## Features

- 🟢 Live status indicator (Working/Idle)
- 🎯 Current task display with timing
- 📋 Priority queue with drag ordering
- 🤖 AI-suggested tasks (approve with one click)
- ✅ Completed task history
- 🔄 Real-time sync via WebSocket
- 📱 Remote access from any device

## Quick Start

```bash
cd /Users/layla/clawd/workspace/layla-dashboard
npm start
```

Dashboard runs at: **http://localhost:3847**

## Remote Access

From any device on the same network:
1. Find Mac's IP: System Settings → Network → look for IP address (usually 192.168.x.x)
2. Open browser: `http://[MAC-IP]:3847`

## CLI Commands

```bash
node cli.js status              # Get current status
node cli.js working             # Set status to working
node cli.js idle                # Set status to idle
node cli.js start "Task"        # Start a task
node cli.js complete            # Complete current task
node cli.js add "Task" "" high  # Add to queue
node cli.js urgent "Task"       # Add urgent (jumps queue)
```

## Priority Levels

- 🔥 **Urgent** - Jumps to front, interrupts current task
- 🟠 **High** - Next after urgent
- 🟡 **Medium** - Standard priority
- 🟢 **Low** - When there's time

## Auto-Start on Boot

To run the dashboard automatically on Mac startup:

```bash
# Create launchd plist
cat > ~/Library/LaunchAgents/com.layla.dashboard.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.layla.dashboard</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/layla/clawd/workspace/layla-dashboard/server.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/Users/layla/clawd/workspace/layla-dashboard</string>
</dict>
</plist>
EOF

# Load it
launchctl load ~/Library/LaunchAgents/com.layla.dashboard.plist
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/status | Get full state |
| POST | /api/status | Set status (working/idle) |
| POST | /api/task/current | Set current task |
| POST | /api/task/complete | Complete current task |
| POST | /api/queue/add | Add task to queue |
| POST | /api/queue/urgent | Add urgent task |
| DELETE | /api/queue/:id | Remove from queue |
| POST | /api/suggestions/approve | Approve AI suggestion |
| POST | /api/suggestions/refresh | Get new suggestions |
