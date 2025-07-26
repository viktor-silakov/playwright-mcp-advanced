# MCP List Tools Utility

The `mcp-list-tools` utility is a command-line tool for discovering and inspecting available tools, resources, and prompts from an MCP (Model Context Protocol) server over HTTP.

## Overview

This utility connects to an MCP server and retrieves information about:
- **Tools**: Available functions that can be called on the server
- **Resources**: Available resources (files, data sources, etc.)
- **Prompts**: Predefined prompt templates

## Installation

The utility is included with the playwright-mcp-advanced package:

```bash
npm install -g playwright-mcp-advanced
```

## Usage

```bash
mcp-list-tools [url] [options]
```

### Arguments

- `url` - MCP server URL (default: `http://localhost:3232/mcp`)

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-V, --version` | Output the version number | |
| `-f, --format <format>` | Output format (text\|json) | `text` |
| `-d, --detailed` | Show detailed information including input schemas | |
| `-t, --tools-only` | Show only tools | |
| `-r, --resources-only` | Show only resources | |
| `-p, --prompts-only` | Show only prompts | |
| `--timeout <ms>` | Request timeout in milliseconds | `10000` |
| `-h, --help` | Display help for command | |

## Examples

### Basic Usage

List all available tools, resources, and prompts from the default server:

```bash
mcp-list-tools
```

### Connect to Custom Server

```bash
mcp-list-tools http://localhost:8080/mcp
```

### JSON Output

Get machine-readable JSON output:

```bash
mcp-list-tools --format=json
```

### Detailed Information

Show detailed information including input schemas:

```bash
mcp-list-tools --detailed
```

### Show Only Tools

```bash
mcp-list-tools --tools-only
```

### Show Only Resources

```bash
mcp-list-tools --resources-only
```

### Show Only Prompts

```bash
mcp-list-tools --prompts-only
```

### Custom Timeout

Set a custom timeout for server connection:

```bash
mcp-list-tools --timeout 5000
```

## Output Format

### Text Format (Default)

The text format provides a human-readable output with icons and formatting:

```
🛠️  Available Tools (3):

⚠️  browser_click
   Title: Click
   Description: Perform click on a web page

🔒 browser_snapshot
   Title: Page snapshot
   Description: Capture accessibility snapshot of the current page

📖 Legend:
   🔒 Read-only tool
   ⚠️  Destructive tool

📁 Available Resources (1):

📄 System Information
   URI: system://info
   Description: Current system info
   MIME Type: application/json

💬 Available Prompts (1):

💭 code-review
   Description: Generate code review prompts
   Arguments:
     code*: Code to review
     language: Programming language
```

### JSON Format

The JSON format provides structured data suitable for programmatic use:

```json
[
  {
    "name": "browser_click",
    "description": "Perform click on a web page",
    "inputSchema": {
      "type": "object",
      "properties": {
        "selector": {
          "type": "string",
          "description": "CSS selector or text to click"
        }
      },
      "required": ["selector"]
    },
    "annotations": {
      "title": "Click",
      "destructiveHint": true
    }
  }
]
```

## Icon Legend

The utility uses icons to provide quick visual cues about tool characteristics:

- 🔒 **Read-only tool**: Tools that only read data and don't make changes
- ⚠️ **Destructive tool**: Tools that may modify state or perform potentially dangerous operations

## Error Handling

The utility handles common error scenarios:

- **Connection errors**: Clear error messages when unable to connect to the server
- **Timeout errors**: Configurable timeout with descriptive error messages
- **Server errors**: Proper handling of MCP protocol errors
- **Invalid responses**: Graceful handling of malformed server responses

## Exit Codes

- `0`: Success
- `1`: Error (connection failed, server error, etc.)

## Protocol Support

The utility supports MCP protocol version `2024-11-05` and is compatible with any compliant MCP server.

## Integration Examples

### CI/CD Pipeline

Check available tools in a CI pipeline:

```bash
# Check if required tools are available
if mcp-list-tools --format=json | jq -r '.[].name' | grep -q "browser_click"; then
  echo "Required tools available"
else
  echo "Missing required tools"
  exit 1
fi
```

### Development Workflow

Quickly inspect server capabilities during development:

```bash
# Show only tools with detailed schemas
mcp-list-tools --tools-only --detailed

# Check what resources are available
mcp-list-tools --resources-only
```

### Debugging

Use JSON output for debugging server issues:

```bash
# Save full server capabilities for debugging
mcp-list-tools --format=json > server-capabilities.json
```