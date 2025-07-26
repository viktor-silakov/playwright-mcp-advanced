---
description: Documentation and features of the mcp-list-tools command-line utility
alwaysApply: false
---

The mcp-list-tools utility is a CLI tool included in playwright-mcp-advanced package for discovering MCP server capabilities.

**Location**: /src/cli/mcp-list-tools.ts (source), available as bin command after build

**Key Features**:
- Lists tools, resources, and prompts from MCP servers over HTTP
- Supports text and JSON output formats
- Icon legend system: 🔒 (read-only tools), ⚠️ (destructive tools)  
- Selective filtering: --tools-only, --resources-only, --prompts-only
- Detailed mode with --detailed flag shows input schemas
- Configurable timeout and custom server URLs

**Documentation**: 
- Complete docs at /docs/mcp-list-tools.md
- README section under "Command Line Utilities"
- Installed as bin command: mcp-list-tools

**Output Features**:
- Text format includes formatted icons and legend
- JSON format excludes legend for clean programmatic use
- Legend only shows when relevant tool types are present
- Detailed mode shows parameter schemas and requirements

**Usage Examples**:
- mcp-list-tools (default server)
- mcp-list-tools http://custom:8080/mcp
- mcp-list-tools --format=json --tools-only
- mcp-list-tools --detailed --resources-only