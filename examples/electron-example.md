# Electron Mode Example

This example demonstrates how to use the Playwright MCP server in Electron mode to automate Electron applications.

## ⚠️ **Important: Launch Order**

**You MUST start your Electron application with remote debugging enabled BEFORE starting the MCP server with `--electron` parameters.**

The correct sequence is:
1. **First**: Start Electron app with `--remote-debugging-port`
2. **Then**: Start MCP server with `--electron --cdp-endpoint`
3. **Finally**: Connect your MCP client

## Prerequisites

1. An Electron application running with remote debugging enabled
2. Playwright MCP server with `--electron` and `--cdp-endpoint` options

## Step 1: Start your Electron app with remote debugging

First, start your Electron application with remote debugging enabled:

```bash
# For most Electron apps, you can enable remote debugging like this:
your-electron-app --remote-debugging-port=9222

# Or if building from source, add this to your main process:
# app.commandLine.appendSwitch('remote-debugging-port', '9222')
```

### Real-world Example: VS Code

VS Code is an Electron application that can be automated using this approach:

```bash
# Start VS Code with remote debugging
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
  --remote-debugging-port=3334 \
  --remote-debugging-address=0.0.0.0 \
  --no-sandbox \
  --disable-gpu-sandbox \
  --user-data-dir=/Users/user_home_folder/Projects/.vscode-electron-test \
  --new-window \
  /Users/user_home_folder/Projects

# Wait for VS Code to fully load, then verify CDP endpoint:
curl http://localhost:3334/json
```

### Other Popular Electron Apps

Many popular applications are built with Electron and can be automated:

```bash
# Discord
/Applications/Discord.app/Contents/MacOS/Discord --remote-debugging-port=9222

# Slack
/Applications/Slack.app/Contents/MacOS/Slack --remote-debugging-port=9222

# WhatsApp Desktop
/Applications/WhatsApp.app/Contents/MacOS/WhatsApp --remote-debugging-port=9222

# Spotify (if available)
/Applications/Spotify.app/Contents/MacOS/Spotify --remote-debugging-port=9222
```

## Step 2: Start Playwright MCP Server in Electron Mode

```bash
# Start the MCP server in Electron mode
npx playwright-mcp-advanced --electron --cdp-endpoint http://localhost:9222 --port 3000

# The server will connect to your Electron app and use existing browser contexts

# For VS Code example:
npx playwright-mcp-advanced --electron --cdp-endpoint http://localhost:3334 --port 3000
```

## Step 3: Connect your MCP Client

Once both the Electron app and MCP server are running, configure your MCP client:

```json
{
  "mcpServers": {
    "playwright-electron": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

## Complete Working Example

Here's a complete step-by-step example using VS Code:

```bash
# Terminal 1: Start VS Code with remote debugging
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
  --remote-debugging-port=3334 \
  --no-sandbox \
  --user-data-dir=/Users/user_home_folder/.vscode-electron-test \
  /Users/user_home_folder/Projects

# Wait for VS Code to load, then in Terminal 2: Start MCP server
npx playwright-mcp-advanced \
  --electron \
  --cdp-endpoint http://localhost:3334 \
  --port 3000 \
  --vision

# You should see output like:
# [ELECTRON-FACTORY] 🔌 Connecting to Electron app via CDP...
# [ELECTRON-FACTORY] 🔗 CDP endpoint: http://localhost:3334
# [ELECTRON-FACTORY] 📄 Available contexts: 1
# [ELECTRON-FACTORY] ✅ Found existing page: vscode-file://vscode-app/...
```

Now you can use MCP tools to automate VS Code:
- Take screenshots of the interface
- Click on menu items and buttons  
- Navigate through panels and tabs
- Extract text from the editor
- Automate file operations

## Example Electron App Setup

Here's a minimal example of an Electron app configured for remote debugging:

```javascript
// main.js
const { app, BrowserWindow } = require('electron');

function createWindow() {
  // Enable remote debugging
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);
```

## Key Differences from Regular Browser Mode

1. **Existing Contexts**: Electron mode uses existing browser contexts from your Electron app
2. **No Browser Launch**: The server connects to your running Electron app instead of launching a new browser
3. **File:// URLs**: Electron apps typically use `file://` protocol for local content
4. **Native Integration**: Can interact with Electron's native features through the existing app context

## Example Automation

The MCP server will be able to:

- Navigate to different views in your Electron app
- Interact with UI elements (click, type, etc.)
- Take screenshots of your app
- Extract HTML content from your app's web views
- Execute JavaScript in the context of your Electron app

## Troubleshooting

### Common Issues and Solutions

1. **"No browser contexts found"**
   - **Cause**: Electron app not running or no windows open
   - **Solution**: Make sure your Electron app is fully loaded with at least one window
   - **Check**: Visit `http://localhost:3334/json` to see available contexts

2. **"Connection refused" or "ECONNREFUSED"**
   - **Cause**: Electron app not started or wrong port
   - **Solution**: 
     ```bash
     # Check if port is in use
     lsof -i :3334
     
     # Verify Electron app is running with correct port
     curl http://localhost:3334/json
     ```

3. **"Failed to connect to CDP endpoint"**
   - **Cause**: Started MCP server before Electron app
   - **Solution**: **ALWAYS start Electron app first, then MCP server**
   ```bash
   # ❌ Wrong order
   npx playwright-mcp-advanced --electron --cdp-endpoint http://localhost:3334 --port 3000
   # Then start VS Code - This will fail!
   
   # ✅ Correct order  
   # First: Start VS Code
   "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --remote-debugging-port=3334
   # Wait for VS Code to load...
   # Then: Start MCP server
   npx playwright-mcp-advanced --electron --cdp-endpoint http://localhost:3334 --port 3000
   ```

4. **"Permission denied" or sandbox errors**
   - **Solution**: Add `--no-sandbox --disable-gpu-sandbox` to Electron app launch
   ```bash
   your-electron-app --remote-debugging-port=3334 --no-sandbox --disable-gpu-sandbox
   ```

5. **VS Code specific issues**
   - **"Code already running"**: Use `--new-window` or different `--user-data-dir`
   - **Extensions conflicting**: Use clean profile with `--user-data-dir`
   ```bash
   "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" \
     --remote-debugging-port=3334 \
     --no-sandbox \
     --user-data-dir=/tmp/vscode-electron-test \
     --new-window
   ```

### Verification Steps

1. **Check Electron app is running:**
   ```bash
   curl http://localhost:3334/json
   # Should return JSON with available contexts
   ```

2. **Check MCP server connection:**
   ```bash
   curl http://localhost:3000/sse
   # Should return SSE stream
   ```

3. **Verify Electron contexts:**
   Look for output like:
   ```
   [ELECTRON-FACTORY] 📄 Available contexts: 1
   [ELECTRON-FACTORY] 📄 Pages in context: 1  
   [ELECTRON-FACTORY] ✅ Found existing page: vscode-file://vscode-app/...
   ```

## Advanced Configuration

You can combine Electron mode with other options:

```bash
# With custom output directory
npx playwright-mcp-advanced --electron --cdp-endpoint http://localhost:9222 --port 3000 --output-dir ./electron-screenshots

# With trace saving
npx playwright-mcp-advanced --electron --cdp-endpoint http://localhost:9222 --port 3000 --save-trace

# With custom viewport (if supported by your Electron app)
npx playwright-mcp-advanced --electron --cdp-endpoint http://localhost:9222 --port 3000 --viewport-size 1024,768
```

This makes it easy to automate and test Electron applications using the same Playwright tools and MCP protocol!