---
description: Comprehensive guide to the programmatic server creation API with custom tools, resources, and prompts
alwaysApply: false
---

## Programmatic Server Creation API

Added comprehensive API for programmatic creation of enhanced Playwright MCP servers with custom components.

### Core Components

**ServerBuilder** - Fluent API for server configuration:
- `createServerBuilder(options?)` - Create new builder instance
- `.config(config)` - Set server configuration
- `.addTool(tool)` / `.addTools(tools)` - Add custom tools
- `.addResource(resource)` / `.addResources(resources)` - Add custom resources  
- `.addPrompt(prompt)` / `.addPrompts(prompts)` - Add custom prompts
- `.build()` - Build enhanced server instance

**Utility Functions:**
- `createTool(name, description, inputSchema, handler, options?)` - Create custom tool
- `createResource(uri, name, handler, options?)` - Create custom resource
- `createPrompt(name, handler, options?)` - Create custom prompt

### Custom Tool Structure
```typescript
interface CustomTool {
  name: string;
  title: string; 
  description: string;
  inputSchema: z.Schema;
  capability: string;
  type?: 'readOnly' | 'destructive';
  handler: (params: any) => Promise<{
    content?: Array<{ type: 'text' | 'image'; text?: string; data?: string; mimeType?: string }>;
    isError?: boolean;
  }>;
}
```

### Custom Resource Structure
```typescript
interface CustomResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: () => Promise<{
    contents: Array<{ uri: string; mimeType?: string; text?: string; blob?: string }>;
  }>;
}
```

### Custom Prompt Structure
```typescript
interface CustomPrompt {
  name: string;
  description?: string;
  arguments?: Record<string, z.Schema>;
  handler: (args: any) => Promise<{
    messages: Array<{
      role: 'user' | 'assistant';
      content: { type: 'text' | 'image'; text?: string; data?: string; mimeType?: string };
    }>;
  }>;
}
```

### Enhanced Connection
- `createEnhancedConnection(config, browserContextFactory, enhancedServer?)` - Create connection with custom components
- `createConnectionFromEnhancedServer(enhancedServer, browserContextFactory)` - Create connection from enhanced server
- `EnhancedConnection` class extends standard connection with custom component support

### Integration Features
- Seamless integration with all standard Playwright MCP tools
- Full MCP protocol support (tools, resources, prompts)
- Type safety with Zod schema validation
- Error handling and validation
- Capability-based tool filtering
- Support for both STDIO and HTTP transport modes

### File Structure
- `src/serverBuilder.ts` - Main server builder API
- `src/enhancedConnection.ts` - Enhanced connection implementation
- `examples/simple-custom-server.ts` - Minimal example
- `examples/programmatic-server-example.ts` - Comprehensive example
- `docs/programmatic-api.md` - Complete API documentation
- `tests/programmatic-server.spec.ts` - Unit tests
- `tests/enhanced-connection-simple.spec.ts` - Integration tests

### Usage Pattern
```typescript
const server = await createServerBuilder({
  config: { browser: { headless: true } }
})
.addTool(createTool('name', 'desc', schema, handler))
.addResource(createResource('uri', 'name', handler))
.addPrompt(createPrompt('name', handler))
.build();

server.setupExitWatchdog();
// Start with HTTP or STDIO transport
```

### Export Location
All APIs exported from main index: `import { createServerBuilder, createTool, createResource, createPrompt } from 'playwright-mcp-advanced'`