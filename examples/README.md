# Examples

This directory contains various examples and documentation for using playwright-mcp-advanced.

## Contents

- **[plugins/](./plugins/)** - Example plugin implementations
- **[ai-agents-extension-setup.md](./ai-agents-extension-setup.md)** - Setup guide for AI agents with extension
- **[electron-example.md](./electron-example.md)** - How to use with Electron applications
- **[extension-mode.md](./extension-mode.md)** - Extension mode documentation
- **[generate-test.md](./generate-test.md)** - Test generation examples

## Plugin Examples

The `plugins/` directory contains **three comprehensive plugin examples**:
- **test-plugin** - Simple plugin with basic tool definition
- **example-plugin** - Full-featured plugin with tools, prompts, resources, and properties
- **shadow-demo** - Enhanced navigation plugin with logging

These examples demonstrate:
- Custom tool creation using `defineTool`
- Plugin structure and metadata
- Advanced features like shadowing and lifecycle methods
- Both JavaScript (.js) and TypeScript (.ts) implementations

## Quick Start

To see plugin examples in action:

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the server with the example plugins:
   ```bash
   node dist/cli.js --plugins-folder examples/plugins
   ```

3. The test plugin will be available as `custom_folder_test` tool.

## Development

For active plugin development, use the main `plugins/` directory in the project root rather than these examples.