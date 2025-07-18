# Chrome Extension Mode Example

This example shows how to use the Chrome Extension mode to connect existing Chrome tabs to the MCP server.

## Prerequisites

1. Node.js 18 or newer
2. Chrome browser
3. This repository cloned and built

## Step 1: Build the project

```bash
npm install
npm run build
```

## Step 2: Start the MCP server in extension mode

```bash
node cli.js --extension --port 9224
```

You should see output like:
```
CDP relay server started. Extension URL: ws://localhost:9224/extension
Connect your Chrome extension to this URL to start sharing tabs.
Listening on http://localhost:9224
```

## Step 3: Install the Chrome extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked" and select the `extension/` folder from this repository
4. The "Playwright MCP Bridge" extension should now be installed

## Step 4: Connect a Chrome tab

1. Open a Chrome tab and navigate to any website (e.g., https://example.com)
2. Click the Playwright MCP Bridge extension icon in the toolbar
3. The extension popup will show the bridge URL (`ws://localhost:9224/extension`)
4. Click "Share This Tab" to connect the tab to the MCP server

## Step 5: Use MCP tools with the connected tab

Now you can use MCP tools to control the connected Chrome tab. For example:

### With Claude Desktop or other MCP client:

1. Configure your MCP client to connect to the server:
   ```json
   {
     "mcpServers": {
       "playwright-extension": {
         "url": "http://localhost:9224/sse"
       }
     }
   }
   ```

2. Use MCP tools like:
   - `browser_navigate` - Navigate to a different URL
   - `browser_click` - Click on elements
   - `browser_screenshot` - Take screenshots
   - `browser_type` - Type into input fields
   - `browser_snapshot` - Get accessibility snapshot

### Example conversation:

```
User: Take a screenshot of the current page
Assistant: [Uses browser_screenshot tool]

User: Navigate to https://github.com
Assistant: [Uses browser_navigate tool]

User: Click on the "Sign in" button
Assistant: [Uses browser_click tool]
```

## Benefits of Extension Mode

1. **No new browser instances**: Work with your existing Chrome tabs
2. **Authenticated sessions**: Use tabs that are already logged in
3. **Live debugging**: Debug existing web applications
4. **Real-time interaction**: See changes immediately in your browser
5. **Preserve state**: Keep all your browser state, cookies, and session data

## Troubleshooting

- **Connection failed**: Make sure the MCP server is running with `--extension` flag
- **Extension not appearing**: Check that you loaded the extension from the correct folder
- **Permission denied**: Ensure the extension has debugging permissions
- **Tab not responding**: Try refreshing the tab and reconnecting

## Security Notes

- Only one tab can be shared at a time for security
- The extension requires debugger permissions to control tabs
- Always verify the bridge URL matches your MCP server
- Disconnect tabs when not in use to avoid security risks