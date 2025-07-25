# Examples

This directory contains examples demonstrating various features of the advanced Playwright MCP server.

## Programmatic Server Creation Examples

### 🚀 Quick Start

**[simple-custom-server.ts](simple-custom-server.ts)** - A minimal example showing how to create a custom MCP server with additional tools and resources.

**Run it:**
```bash
# STDIO mode
tsx examples/simple-custom-server.ts

# HTTP mode  
PORT=3000 tsx examples/simple-custom-server.ts
```

### 📚 Comprehensive Example

**[programmatic-server-example.ts](programmatic-server-example.ts)** - A full-featured example with multiple custom tools, resources, and prompts.

**Features demonstrated:**
- Calculator tool with validation
- Text processing tool
- System information resource
- Server configuration resource
- Code review prompt
- Debug help prompt

### 🔧 Available Custom Components

The examples show how to create:

**Custom Tools:**
- `simple-calc` - Basic calculator (add, subtract, multiply, divide)
- `text-process` - Text manipulation (uppercase, lowercase, reverse, word count)
- `calculate` - Advanced expression evaluator

**Custom Resources:**
- `server://info` - Live server information
- `config://server` - Server configuration and capabilities
- `system://info` - System and Node.js information

**Custom Prompts:**
- `code-review` - Generate code review prompts
- `debug-help` - Generate debugging assistance prompts

### 🎯 Integration Notes

All custom components work seamlessly with standard Playwright tools:
- Browser automation (navigate, click, type, etc.)
- Screenshot tools with advanced options
- HTML extraction tools
- Element snapshot tools
- Vision capabilities (when enabled)
- PDF tools (when enabled)

### 📖 Documentation

- **[Programmatic API Documentation](../docs/programmatic-api.md)** - Complete API reference
- **[Programmatic Server Guide](programmatic-server.md)** - Detailed usage examples

### 🧪 Testing

The examples include comprehensive test coverage:
- **[programmatic-server.spec.ts](../tests/programmatic-server.spec.ts)** - Unit tests for the builder API
- **[enhanced-connection-simple.spec.ts](../tests/enhanced-connection-simple.spec.ts)** - Integration tests

### ⚡ Quick Commands

```bash
# Build the project
npm run build

# Run all tests
npm test

# Run specific tests
npx playwright test tests/programmatic-server.spec.ts
npx playwright test tests/enhanced-connection-simple.spec.ts

# Run example server
tsx examples/simple-custom-server.ts

# Run advanced example
tsx examples/programmatic-server-example.ts
```