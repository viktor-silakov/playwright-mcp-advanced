## Advanced Playwright MCP

This is an advanced version of the [Playwright MCP](https://github.com/microsoft/playwright-mcp) that provides additional tools for browser automation.

A Model Context Protocol (MCP) server that provides browser automation capabilities using [Playwright](https://playwright.dev). This server enables LLMs to interact with web pages through structured accessibility snapshots, bypassing the need for screenshots or visually-tuned models.

### Key Features

- **Fast and lightweight**. Uses Playwright's accessibility tree, not pixel-based input.
- **LLM-friendly**. No vision models needed, operates purely on structured data.
- **Deterministic tool application**. Avoids ambiguity common with screenshot-based approaches.

### 🚀 Advanced Features

This advanced version includes additional capabilities not available in the original Playwright MCP:

#### 📸 Enhanced Screenshot Tools
- **Full page screenshots** - Capture entire scrollable page content with `fullPage: true`
- **Element screenshots by locator** - Screenshot specific elements using Playwright locators (`#id`, `.class`, `text=Hello`)
- **Multiple element screenshots** - Capture multiple elements simultaneously with locator arrays
- **Vision mode enhancements** - All screenshot capabilities available in vision mode

#### 🔍 HTML Content Extraction
- **`browser_get_html_content`** - Extract HTML content from the entire page or specific elements
- **`browser_get_outer_html`** - Get complete element HTML including the element tag itself
- **Batch processing** - Extract HTML from multiple elements in parallel
- **Error handling** - Graceful handling of missing elements

#### 📋 Element Snapshot Tools
- **`browser_element_snapshot`** - Capture accessibility snapshots of specific elements by locator(s)
- **Structured element data** - Get tag names, text content, attributes, and visibility status
- **Multiple element snapshots** - Process multiple elements simultaneously with locator arrays
- **YAML formatted output** - Consistent format matching the main page snapshot tool

#### 💡 Key Improvements
- **Parallel execution** - Multiple operations execute simultaneously for better performance
- **Smart validation** - Prevents conflicting parameter combinations
- **Flexible locators** - Support for any Playwright locator syntax
- **Multiple element handling** - When a single locator finds multiple elements, returns data for each element
- **Developer-friendly** - Clear error messages and formatted output
- **Vision mode compatibility** - All HTML extraction tools work in both snapshot and vision modes

#### 🔗 Chrome Extension Mode
- **`--extension`** - Connect to existing Chrome tabs through a Chrome extension
- **CDP Relay Server** - Bridge between Chrome extension and MCP server
- **Live Session Control** - Work with authenticated sessions and existing browser state
- **Real-time Interaction** - No need to launch new browser instances
- **Tab Sharing** - Share active Chrome tabs with the MCP server

### Requirements
- Node.js 18 or newer
- VS Code, Cursor, Windsurf, Claude Desktop or any other MCP client

### Local Development Setup

To use this advanced version locally:

1. **Clone and build the project:**
   ```bash
   git clone <repository-url>
   cd playwright-mcp-advanced
   npm install
   npm run build
   ```

2. **Configure your MCP client** to use the local build (see configuration examples below)

<!--
// Generate using:
node utils/generate-links.js
-->

### Getting started

First, install the Playwright MCP server with your client.

**Standard config** works in most of the tools:

#### For the original Playwright MCP:
```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "playwright-mcp-advanced@latest"
      ]
    }
  }
}
```

#### For this advanced version (local development):
```js
{
  "mcpServers": {
    "playwright-advanced": {
      "command": "node",
      "args": [
        "/path/to/playwright-mcp-advanced/dist/index.js"
      ]
    }
  }
}
```

[<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect?url=vscode%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522playwright%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540playwright%252Fmcp%2540latest%2522%255D%257D) [<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect?url=vscode-insiders%3Amcp%2Finstall%3F%257B%2522name%2522%253A%2522playwright%2522%252C%2522command%2522%253A%2522npx%2522%252C%2522args%2522%253A%255B%2522%2540playwright%252Fmcp%2540latest%2522%255D%257D)


<details><summary><b>Install in VS Code</b></summary>

You can also install the Playwright MCP server using the VS Code CLI:

```bash
# For VS Code
code --add-mcp '{"name":"playwright","command":"npx","args":["playwright-mcp-advanced@latest"]}'
```

After installation, the Playwright MCP server will be available for use with your GitHub Copilot agent in VS Code.
</details>

<details>
<summary><b>Install in Cursor</b></summary>

#### For original Playwright MCP:

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=playwright&config=eyJjb21tYW5kIjoibnB4IEBwbGF5d3JpZ2h0L21jcEBsYXRlc3QifQ%3D%3D)

Or install manually: Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Name to your liking, use `command` type with the command `npx playwright-mcp-advanced`.

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "playwright-mcp-advanced@latest"
      ]
    }
  }
}
```

#### For this advanced version (local):

Go to `Cursor Settings` -> `MCP` -> `Add new MCP Server`. Use the following configuration:

```js
{
  "mcpServers": {
    "playwright-advanced": {
      "command": "node",
      "args": [
        "/absolute/path/to/playwright-mcp-advanced/dist/index.js"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Windsurf</b></summary>

Follow Windsuff MCP [documentation](https://docs.windsurf.com/windsurf/cascade/mcp). Use following configuration:

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "playwright-mcp-advanced@latest"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Claude Desktop</b></summary>

Follow the MCP install [guide](https://modelcontextprotocol.io/quickstart/user).

#### For original Playwright MCP:
```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "playwright-mcp-advanced@latest"
      ]
    }
  }
}
```

#### For this advanced version (local):
```js
{
  "mcpServers": {
    "playwright-advanced": {
      "command": "node",
      "args": [
        "/absolute/path/to/playwright-mcp-advanced/dist/index.js"
      ]
    }
  }
}
```
</details>

<details>
<summary><b>Install in Qodo Gen</b></summary>

Open [Qodo Gen](https://docs.qodo.ai/qodo-documentation/qodo-gen) chat panel in VSCode or IntelliJ → Connect more tools → + Add new MCP → Paste the following configuration:

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "playwright-mcp-advanced@latest"
      ]
    }
  }
}
```

Click <code>Save</code>.
</details>

### Configuration

Playwright MCP server supports following arguments. They can be provided in the JSON configuration above, as a part of the `"args"` list:

<!--- Options generated by update-readme.ts -->

```
> npx playwright-mcp-advanced@latest --help
  --allowed-origins <origins>  semicolon-separated list of origins to allow the
                               browser to request. Default is to allow all.
  --blocked-origins <origins>  semicolon-separated list of origins to block the
                               browser from requesting. Blocklist is evaluated
                               before allowlist. If used without the allowlist,
                               requests not matching the blocklist are still
                               allowed.
  --block-service-workers      block service workers
  --browser <browser>          browser or chrome channel to use, possible
                               values: chrome, firefox, webkit, msedge.
  --browser-agent <endpoint>   Use browser agent (experimental).
  --caps <caps>                comma-separated list of capabilities to enable,
                               possible values: tabs, pdf, history, wait, files,
                               install. Default is all.
  --cdp-endpoint <endpoint>    CDP endpoint to connect to.
  --config <path>              path to the configuration file.
  --device <device>            device to emulate, for example: "iPhone 15"
  --executable-path <path>     path to the browser executable.
  --extension                  run in extension mode, starts CDP relay server
                               for Chrome extension
  --headless                   run browser in headless mode, headed by default
  --host <host>                host to bind server to. Default is localhost. Use
                               0.0.0.0 to bind to all interfaces.
  --ignore-https-errors        ignore https errors
  --isolated                   keep the browser profile in memory, do not save
                               it to disk.
  --image-responses <mode>     whether to send image responses to the client.
                               Can be "allow", "omit", or "auto". Defaults to
                               "auto", which sends images if the client can
                               display them.
  --no-sandbox                 disable the sandbox for all process types that
                               are normally sandboxed.
  --output-dir <path>          path to the directory for output files.
  --port <port>                port to listen on for SSE transport.
  --proxy-bypass <bypass>      comma-separated domains to bypass proxy, for
                               example ".com,chromium.org,.domain.com"
  --proxy-server <proxy>       specify proxy server, for example
                               "http://myproxy:3128" or "socks5://myproxy:8080"
  --save-trace                 Whether to save the Playwright Trace of the
                               session into the output directory.
  --storage-state <path>       path to the storage state file for isolated
                               sessions.
  --user-agent <ua string>     specify user agent string
  --user-data-dir <path>       path to the user data directory. If not
                               specified, a temporary directory will be created.
  --viewport-size <size>       specify browser viewport size in pixels, for
                               example "1280, 720"
  --vision                     Run server that uses screenshots (Aria snapshots
                               are used by default)
```

<!--- End of options generated section -->

### User profile

You can run Playwright MCP with persistent profile like a regular browser (default), or in the isolated contexts for the testing sessions.

**Persistent profile**

All the logged in information will be stored in the persistent profile, you can delete it between sessions if you'd like to clear the offline state.
Persistent profile is located at the following locations and you can override it with the `--user-data-dir` argument.

```bash
# Windows
%USERPROFILE%\AppData\Local\ms-playwright\mcp-{channel}-profile

# macOS
- ~/Library/Caches/ms-playwright/mcp-{channel}-profile

# Linux
- ~/.cache/ms-playwright/mcp-{channel}-profile
```

**Isolated**

In the isolated mode, each session is started in the isolated profile. Every time you ask MCP to close the browser,
the session is closed and all the storage state for this session is lost. You can provide initial storage state
to the browser via the config's `contextOptions` or via the `--storage-state` argument. Learn more about the storage
state [here](https://playwright.dev/docs/auth).

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "playwright-mcp-advanced@latest",
        "--isolated",
        "--storage-state={path/to/storage.json}"
      ]
    }
  }
}
```

### Configuration file

The Playwright MCP server can be configured using a JSON configuration file. You can specify the configuration file
using the `--config` command line option:

```bash
npx playwright-mcp-advanced@latest --config path/to/config.json
```

<details>
<summary>Configuration file schema</summary>

```typescript
{
  // Browser configuration
  browser?: {
    // Browser type to use (chromium, firefox, or webkit)
    browserName?: 'chromium' | 'firefox' | 'webkit';

    // Keep the browser profile in memory, do not save it to disk.
    isolated?: boolean;

    // Path to user data directory for browser profile persistence
    userDataDir?: string;

    // Browser launch options (see Playwright docs)
    // @see https://playwright.dev/docs/api/class-browsertype#browser-type-launch
    launchOptions?: {
      channel?: string;        // Browser channel (e.g. 'chrome')
      headless?: boolean;      // Run in headless mode
      executablePath?: string; // Path to browser executable
      // ... other Playwright launch options
    };

    // Browser context options
    // @see https://playwright.dev/docs/api/class-browser#browser-new-context
    contextOptions?: {
      viewport?: { width: number, height: number };
      // ... other Playwright context options
    };

    // CDP endpoint for connecting to existing browser
    cdpEndpoint?: string;

    // Remote Playwright server endpoint
    remoteEndpoint?: string;
  },

  // Server configuration
  server?: {
    port?: number;  // Port to listen on
    host?: string;  // Host to bind to (default: localhost)
  },

  // List of enabled capabilities
  capabilities?: Array<
    'core' |    // Core browser automation
    'tabs' |    // Tab management
    'pdf' |     // PDF generation
    'history' | // Browser history
    'wait' |    // Wait utilities
    'files' |   // File handling
    'install' | // Browser installation
    'testing'   // Testing
  >;

  // Enable vision mode (screenshots instead of accessibility snapshots)
  vision?: boolean;

  // Directory for output files
  outputDir?: string;

  // Network configuration
  network?: {
    // List of origins to allow the browser to request. Default is to allow all. Origins matching both `allowedOrigins` and `blockedOrigins` will be blocked.
    allowedOrigins?: string[];

    // List of origins to block the browser to request. Origins matching both `allowedOrigins` and `blockedOrigins` will be blocked.
    blockedOrigins?: string[];
  };
 
  /**
   * Do not send image responses to the client.
   */
  noImageResponses?: boolean;
}
```
</details>

### Standalone MCP server

When running headed browser on system w/o display or from worker processes of the IDEs,
run the MCP server from environment with the DISPLAY and pass the `--port` flag to enable SSE transport.

```bash
npx playwright-mcp-advanced@latest --port 8931
```

And then in MCP client config, set the `url` to the SSE endpoint:

```js
{
  "mcpServers": {
    "playwright": {
      "url": "http://localhost:8931/sse"
    }
  }
}
```

<details>
<summary><b>Docker</b></summary>

**NOTE:** The Docker implementation only supports headless chromium at the moment.

```js
{
  "mcpServers": {
    "playwright": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--init", "--pull=always", "mcr.microsoft.com/playwright/mcp"]
    }
  }
}
```

You can build the Docker image yourself.

```
docker build -t mcr.microsoft.com/playwright/mcp .
```
</details>

<details>
<summary><b>Programmatic usage</b></summary>

```js
import http from 'http';

import { createConnection } from 'playwright-mcp-advanced';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

http.createServer(async (req, res) => {
  // ...

  // Creates a headless Playwright MCP server with SSE transport
  const connection = await createConnection({ browser: { launchOptions: { headless: true } } });
  const transport = new SSEServerTransport('/messages', res);
  await connection.sever.connect(transport);

  // ...
});
```
</details>

## Chrome Extension Mode ✅ **FULLY TESTED & WORKING**

The Chrome Extension mode allows you to connect the MCP server to existing Chrome tabs through a Chrome extension. This feature has been **thoroughly tested and verified working** with complete CDP (Chrome DevTools Protocol) integration.

**Verified capabilities:**
- ✅ Real-time browser control through Chrome extension
- ✅ Navigation and page interaction (`browser_navigate`, `browser_click`)
- ✅ Content extraction (`browser_get_html_content`, `browser_snapshot`)  
- ✅ Screenshot capture (`browser_screen_capture`)
- ✅ Session management with automatic reconnection
- ✅ Full Playwright API compatibility through CDP relay

This is useful for:

- Working with authenticated sessions
- Debugging existing web applications
- Interacting with live browser state
- Avoiding the need to launch new browser instances
- Seamless integration with existing Chrome workflows

### Setting up Chrome Extension Mode

#### 1. Start the MCP server with extension mode

```bash
npx playwright-mcp-advanced@latest --extension --port 9223
```

Or configure your MCP client:

```js
{
  "mcpServers": {
    "playwright-extension": {
      "command": "npx",
      "args": [
        "playwright-mcp-advanced@latest",
        "--extension",
        "--port", "9223"
      ]
    }
  }
}
```

#### 2. Install the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `extension/` folder from this repository
4. The "Playwright MCP Bridge" extension should now be installed

#### 3. Connect a Chrome tab

1. Open the Chrome tab you want to control
2. Click the Playwright MCP Bridge extension icon
3. The extension will show the bridge URL (default: `ws://localhost:9223/extension`)
4. Click "Share This Tab" to connect the tab to the MCP server

#### 4. Use MCP tools with the connected tab

Once connected, you can use all MCP tools like `browser_navigate`, `browser_click`, `browser_screenshot`, etc., and they will operate on the connected Chrome tab.

### Extension Features

- **Real-time connection status** - See which tab is currently shared
- **Easy tab switching** - Switch between shared tabs directly from the extension
- **Automatic reconnection** - Handles connection drops gracefully
- **Single tab limitation** - Only one tab can be shared at a time for security

### Troubleshooting Extension Mode

- **Connection failed**: Check that the MCP server is running with `--extension` flag
- **Permission errors**: Ensure the extension has debugging permissions
- **Tab not responding**: Try refreshing the tab and reconnecting
- **Multiple tabs**: Only one tab can be shared at a time - disconnect current tab first

### Tools

The tools are available in two modes:

1. **Snapshot Mode** (default): Uses accessibility snapshots for better performance and reliability
2. **Vision Mode**: Uses screenshots for visual-based interactions

To use Vision Mode, add the `--vision` flag when starting the server:

```js
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "playwright-mcp-advanced@latest",
        "--vision"
      ]
    }
  }
}
```

Vision Mode works best with the computer use models that are able to interact with elements using
X Y coordinate space, based on the provided screenshot.

**Note:** All HTML content extraction tools (`browser_get_html_content`, `browser_get_outer_html`) are also available in Vision Mode, providing the same functionality regardless of the mode used.

<!--- Tools generated by update-readme.ts -->

<details>
<summary><b>Interactions</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_snapshot**
  - Title: Page snapshot
  - Description: Capture accessibility snapshot of the current page, this is better than screenshot
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_element_snapshot** 🆕
  - Title: Element snapshot
  - Description: Capture accessibility snapshot of specific elements by locator(s). Better than screenshot for specific elements.
  - **Enhancement**: Capture structured accessibility data for specific elements using locators
  - Parameters:
    - `locator` (string, optional): Playwright locator string to capture accessibility snapshot of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.
    - `locators` (array, optional): Array of Playwright locator strings to capture accessibility snapshots of multiple elements. Cannot be combined with locator parameter.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_click**
  - Title: Click
  - Description: Perform click on a web page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_drag**
  - Title: Drag mouse
  - Description: Perform drag and drop between two elements
  - Parameters:
    - `startElement` (string): Human-readable source element description used to obtain the permission to interact with the element
    - `startRef` (string): Exact source element reference from the page snapshot
    - `endElement` (string): Human-readable target element description used to obtain the permission to interact with the element
    - `endRef` (string): Exact target element reference from the page snapshot
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_hover**
  - Title: Hover mouse
  - Description: Hover over element on page
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_type**
  - Title: Type text
  - Description: Type text into editable element
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `text` (string): Text to type into the element
    - `submit` (boolean, optional): Whether to submit entered text (press Enter after)
    - `slowly` (boolean, optional): Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_select_option**
  - Title: Select option
  - Description: Select an option in a dropdown
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `ref` (string): Exact target element reference from the page snapshot
    - `values` (array): Array of values to select in the dropdown. This can be a single value or multiple values.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_press_key**
  - Title: Press a key
  - Description: Press a key on the keyboard
  - Parameters:
    - `key` (string): Name of the key to press or a character to generate, such as `ArrowLeft` or `a`
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_wait_for**
  - Title: Wait for
  - Description: Wait for text to appear or disappear or a specified time to pass
  - Parameters:
    - `time` (number, optional): The time to wait in seconds
    - `text` (string, optional): The text to wait for
    - `textGone` (string, optional): The text to wait for to disappear
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_file_upload**
  - Title: Upload files
  - Description: Upload one or multiple files
  - Parameters:
    - `paths` (array): The absolute paths to the files to upload. Can be a single file or multiple files.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_handle_dialog**
  - Title: Handle a dialog
  - Description: Handle a dialog
  - Parameters:
    - `accept` (boolean): Whether to accept the dialog.
    - `promptText` (string, optional): The text of the prompt in case of a prompt dialog.
  - Read-only: **false**

</details>

<details>
<summary><b>Navigation</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_navigate**
  - Title: Navigate to a URL
  - Description: Navigate to a URL
  - Parameters:
    - `url` (string): The URL to navigate to
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_navigate_back**
  - Title: Go back
  - Description: Go back to the previous page
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_navigate_forward**
  - Title: Go forward
  - Description: Go forward to the next page
  - Parameters: None
  - Read-only: **true**

</details>

<details>
<summary><b>Resources</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_take_screenshot** ⭐
  - Title: Take a screenshot
  - Description: Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.
  - **Enhancement**: Enhanced with fullPage and locator support for flexible screenshot capture
  - Parameters:
    - `raw` (boolean, optional): Whether to return without compression (in PNG format). Default is false, which returns a JPEG image.
    - `filename` (string, optional): File name to save the screenshot to. Defaults to `page-{timestamp}.{png|jpeg}` if not specified.
    - `fullPage` (boolean, optional): Whether to take a screenshot of the full scrollable page. Cannot be combined with element/ref/locator parameters.
    - `locator` (string, optional): Playwright locator string to screenshot a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with element/ref/fullPage parameters.
    - `element` (string, optional): Human-readable element description used to obtain permission to screenshot the element. If not provided, the screenshot will be taken of viewport. If element is provided, ref must be provided too.
    - `ref` (string, optional): Exact target element reference from the page snapshot. If not provided, the screenshot will be taken of viewport. If ref is provided, element must be provided too.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_pdf_save**
  - Title: Save as PDF
  - Description: Save page as PDF
  - Parameters:
    - `filename` (string, optional): File name to save the pdf to. Defaults to `page-{timestamp}.pdf` if not specified.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_network_requests**
  - Title: List network requests
  - Description: Returns all network requests since loading the page
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_console_messages**
  - Title: Get console messages
  - Description: Returns all console messages
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_get_html_content** 🆕
  - Title: Get HTML content
  - Description: Get HTML content of the current page or specific elements. Returns full page HTML by default, or HTML of specific elements when locator(s) provided.
  - **Enhancement**: Extract HTML content from page or specific elements with flexible locator support
  - Parameters:
    - `locator` (string, optional): Playwright locator string to get HTML content of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.
    - `locators` (array, optional): Array of Playwright locator strings to get HTML content of multiple elements. Cannot be combined with locator parameter.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_get_outer_html** 🆕
  - Title: Get outer HTML content
  - Description: Get outer HTML content of specific elements (includes the element tag itself). Requires locator(s) to be specified.
  - **Enhancement**: Get complete element HTML including the element tag itself
  - Parameters:
    - `locator` (string, optional): Playwright locator string to get outer HTML content of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.
    - `locators` (array, optional): Array of Playwright locator strings to get outer HTML content of multiple elements. Cannot be combined with locator parameter.
  - Read-only: **true**

</details>

<details>
<summary><b>Utilities</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_install**
  - Title: Install the browser specified in the config
  - Description: Install the browser specified in the config. Call this if you get an error about the browser not being installed.
  - Parameters: None
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_close**
  - Title: Close browser
  - Description: Close the page
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_resize**
  - Title: Resize browser window
  - Description: Resize the browser window
  - Parameters:
    - `width` (number): Width of the browser window
    - `height` (number): Height of the browser window
  - Read-only: **true**

</details>

<details>
<summary><b>Tabs</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_tab_list**
  - Title: List tabs
  - Description: List browser tabs
  - Parameters: None
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_tab_new**
  - Title: Open a new tab
  - Description: Open a new tab
  - Parameters:
    - `url` (string, optional): The URL to navigate to in the new tab. If not provided, the new tab will be blank.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_tab_select**
  - Title: Select a tab
  - Description: Select a tab by index
  - Parameters:
    - `index` (number): The index of the tab to select
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_tab_close**
  - Title: Close a tab
  - Description: Close a tab
  - Parameters:
    - `index` (number, optional): The index of the tab to close. Closes current tab if not provided.
  - Read-only: **false**

</details>

<details>
<summary><b>Testing</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_generate_playwright_test**
  - Title: Generate a Playwright test
  - Description: Generate a Playwright test for given scenario
  - Parameters:
    - `name` (string): The name of the test
    - `description` (string): The description of the test
    - `steps` (array): The steps of the test
  - Read-only: **true**

</details>

<details>
<summary><b>Vision mode</b></summary>

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_screen_capture** ⭐
  - Title: Take a screenshot
  - Description: Take a screenshot of the current page
  - **Enhancement**: Enhanced with fullPage and locator/locators support for flexible vision mode capture
  - Parameters:
    - `fullPage` (boolean, optional): Whether to take a screenshot of the full scrollable page. Cannot be combined with locator/locators parameters.
    - `locator` (string, optional): Playwright locator string to screenshot a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with fullPage/locators parameters.
    - `locators` (array, optional): Array of Playwright locator strings to screenshot multiple elements. Cannot be combined with fullPage/locator parameters.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_screen_move_mouse**
  - Title: Move mouse
  - Description: Move mouse to a given position
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `x` (number): X coordinate
    - `y` (number): Y coordinate
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_screen_click**
  - Title: Click
  - Description: Click left mouse button
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `x` (number): X coordinate
    - `y` (number): Y coordinate
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_screen_drag**
  - Title: Drag mouse
  - Description: Drag left mouse button
  - Parameters:
    - `element` (string): Human-readable element description used to obtain permission to interact with the element
    - `startX` (number): Start X coordinate
    - `startY` (number): Start Y coordinate
    - `endX` (number): End X coordinate
    - `endY` (number): End Y coordinate
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_screen_type**
  - Title: Type text
  - Description: Type text
  - Parameters:
    - `text` (string): Text to type into the element
    - `submit` (boolean, optional): Whether to submit entered text (press Enter after)
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_press_key**
  - Title: Press a key
  - Description: Press a key on the keyboard
  - Parameters:
    - `key` (string): Name of the key to press or a character to generate, such as `ArrowLeft` or `a`
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_wait_for**
  - Title: Wait for
  - Description: Wait for text to appear or disappear or a specified time to pass
  - Parameters:
    - `time` (number, optional): The time to wait in seconds
    - `text` (string, optional): The text to wait for
    - `textGone` (string, optional): The text to wait for to disappear
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_file_upload**
  - Title: Upload files
  - Description: Upload one or multiple files
  - Parameters:
    - `paths` (array): The absolute paths to the files to upload. Can be a single file or multiple files.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_handle_dialog**
  - Title: Handle a dialog
  - Description: Handle a dialog
  - Parameters:
    - `accept` (boolean): Whether to accept the dialog.
    - `promptText` (string, optional): The text of the prompt in case of a prompt dialog.
  - Read-only: **false**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_get_html_content** 🆕
  - Title: Get HTML content
  - Description: Get HTML content of the current page or specific elements. Returns full page HTML by default, or HTML of specific elements when locator(s) provided.
  - **Enhancement**: Extract HTML content from page or specific elements with flexible locator support
  - Parameters:
    - `locator` (string, optional): Playwright locator string to get HTML content of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.
    - `locators` (array, optional): Array of Playwright locator strings to get HTML content of multiple elements. Cannot be combined with locator parameter.
  - Read-only: **true**

<!-- NOTE: This has been generated via update-readme.ts -->

- **browser_get_outer_html** 🆕
  - Title: Get outer HTML content
  - Description: Get outer HTML content of specific elements (includes the element tag itself). Requires locator(s) to be specified.
  - **Enhancement**: Get complete element HTML including the element tag itself
  - Parameters:
    - `locator` (string, optional): Playwright locator string to get outer HTML content of a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with locators parameter.
    - `locators` (array, optional): Array of Playwright locator strings to get outer HTML content of multiple elements. Cannot be combined with locator parameter.
  - Read-only: **true**

</details>


<!--- End of tools generated section -->
