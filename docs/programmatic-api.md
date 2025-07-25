# Programmatic Server API

The enhanced Playwright MCP server now supports programmatic creation with custom tools, resources, and prompts. This allows you to extend the server's capabilities beyond the standard Playwright tools and provides advanced features like shadowing (hiding) standard tools.

## Quick Start

```typescript
import { createServerBuilder, createTool, createResource, createPrompt } from 'playwright-mcp-advanced';
import { z } from 'zod';

// Create a custom tool
const myTool = createTool(
  'my-calculator',
  'Simple calculator',
  z.object({
    operation: z.enum(['add', 'subtract']),
    a: z.number(),
    b: z.number()
  }),
  async (params) => {
    const result = params.operation === 'add' ? params.a + params.b : params.a - params.b;
    return {
      content: [{ type: 'text', text: `Result: ${result}` }]
    };
  }
);

// Create an enhanced server
const server = await createServerBuilder()
  .addTool(myTool)
  .build();
```

## API Reference

### Server Builder

#### `createServerBuilder(options?)`

Creates a new server builder instance.

**Parameters:**
- `options.config` - Server configuration (same as regular MCP config)
- `options.cdpRelay` - CDP relay instance for extension mode
- `options.shadowItems` - Configuration to hide specific standard tools/prompts/resources

**Returns:** `ServerBuilder` instance

### Custom Tools

#### `createTool(name, description, inputSchema, handler, options?)`

Creates a custom tool definition.

**Parameters:**
- `name: string` - Tool name (must be unique)
- `description: string` - Tool description for MCP clients
- `inputSchema: z.Schema` - Zod schema for input validation
- `handler: Function` - Async function that executes the tool
- `options.title?: string` - Display title (defaults to name)
- `options.capability?: string` - Tool capability category
- `options.type?: 'readOnly' | 'destructive'` - Tool operation type

**Handler Function:**
```typescript
async (params: ParsedInput) => {
  content?: Array<{ type: 'text' | 'image'; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}
```

**Example:**
```typescript
const fileReader = createTool(
  'read-file',
  'Read file contents',
  z.object({
    path: z.string().describe('File path to read')
  }),
  async (params) => {
    try {
      const content = await fs.readFile(params.path, 'utf-8');
      return {
        content: [{ type: 'text', text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  },
  {
    capability: 'file-system',
    type: 'readOnly'
  }
);
```

### Custom Resources

#### `createResource(uri, name, handler, options?)`

Creates a custom resource definition.

**Parameters:**
- `uri: string` - Resource URI (must be unique)
- `name: string` - Resource name
- `handler: Function` - Async function that provides resource data
- `options.description?: string` - Resource description
- `options.mimeType?: string` - Resource MIME type

**Handler Function:**
```typescript
async () => {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}
```

**Example:**
```typescript
const configResource = createResource(
  'config://app',
  'Application Configuration',
  async () => ({
    contents: [{
      uri: 'config://app',
      mimeType: 'application/json',
      text: JSON.stringify({ version: '1.0.0', debug: true })
    }]
  }),
  {
    description: 'Current application configuration',
    mimeType: 'application/json'
  }
);
```

### Custom Prompts

#### `createPrompt(name, handler, options?)`

Creates a custom prompt definition.

**Parameters:**
- `name: string` - Prompt name (must be unique)
- `handler: Function` - Async function that generates prompt messages
- `options.description?: string` - Prompt description
- `options.arguments?: Record<string, z.Schema>` - Prompt arguments schema

**Handler Function:**
```typescript
async (args: ParsedArguments) => {
  messages: Array<{
    role: 'user' | 'assistant';
    content: { type: 'text' | 'image'; text?: string; data?: string; mimeType?: string };
  }>;
}
```

**Example:**
```typescript
const codeReview = createPrompt(
  'code-review',
  async (args) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Review this ${args.language} code:\\n\\n\`\`\`${args.language}\\n${args.code}\\n\`\`\``
      }
    }]
  }),
  {
    description: 'Generate code review prompts',
    arguments: {
      code: z.string().describe('Code to review'),
      language: z.string().describe('Programming language')
    }
  }
);
```

### Shadow Items (Hiding Standard Components)

Shadow items allow you to hide specific standard tools, prompts, or resources from the server. This is useful when you want to replace standard functionality with custom implementations.

```typescript
import { type ShadowItems } from 'playwright-mcp-advanced';

interface ShadowItems {
  tools?: string[];      // Array of tool names to hide from standard tools
  prompts?: string[];    // Array of prompt names to hide from standard prompts  
  resources?: string[];  // Array of resource URIs to hide from standard resources
}
```

**Example:**
```typescript
const server = await createServerBuilder({
  shadowItems: {
    tools: ['browser_navigate', 'browser_click'],  // Hide these standard tools
    prompts: ['web_analysis'],                     // Hide these standard prompts
    resources: ['page://current']                  // Hide these standard resources
  }
})
.addTool(myCustomNavigateTool)  // Replace with custom implementation
.build();
```

### ServerBuilder Methods

#### `.config(config)`
Set server configuration.

#### `.cdpRelay(cdpRelay)`
Set CDP relay instance for extension mode.

#### `.shadowItems(shadowItems)`
Set shadow items to hide standard tools/prompts/resources.

#### `.addTool(tool)` / `.addTools(tools)`
Add custom tools to the server.

#### `.addResource(resource)` / `.addResources(resources)`
Add custom resources to the server.

#### `.addPrompt(prompt)` / `.addPrompts(prompts)`
Add custom prompts to the server.

#### `.build()`
Build and return the enhanced server instance.

### Enhanced Server

The `EnhancedServer` extends the standard `Server` class with additional methods:

#### `.getCustomTools()`
Returns array of custom tools.

#### `.getCustomResources()`
Returns array of custom resources.

#### `.getCustomPrompts()`
Returns array of custom prompts.

#### `.getShadowItems()`
Returns current shadow items configuration.

#### `.addCustomTool(tool)`
Add a custom tool to the server.

#### `.addCustomResource(resource)`
Add a custom resource to the server.

#### `.addCustomPrompt(prompt)`
Add a custom prompt to the server.

#### `.setShadowItems(shadowItems)`
Update shadow items configuration.

#### `.createEnhancedConnection(browserContextFactory, transport)`
Creates connection with custom components support.

## Complete Example

```typescript
import { 
  createServerBuilder, 
  createTool, 
  createResource, 
  createPrompt,
  startHttpServer,
  startHttpTransport
} from 'playwright-mcp-advanced';
import { z } from 'zod';
import fs from 'fs/promises';

// File system tool
const fileManager = createTool(
  'file-manager',
  'Manage files and directories',
  z.object({
    action: z.enum(['read', 'write', 'list']),
    path: z.string(),
    content: z.string().optional()
  }),
  async (params) => {
    try {
      switch (params.action) {
        case 'read':
          const content = await fs.readFile(params.path, 'utf-8');
          return { content: [{ type: 'text', text: content }] };
        
        case 'write':
          await fs.writeFile(params.path, params.content || '');
          return { content: [{ type: 'text', text: 'File written successfully' }] };
        
        case 'list':
          const items = await fs.readdir(params.path);
          return { content: [{ type: 'text', text: items.join('\\n') }] };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  },
  { capability: 'file-system', type: 'destructive' }
);

// System info resource
const systemInfo = createResource(
  'system://info',
  'System Information',
  async () => ({
    contents: [{
      uri: 'system://info',
      mimeType: 'application/json',
      text: JSON.stringify({
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime()
      })
    }]
  })
);

// Code generation prompt
const codeGen = createPrompt(
  'code-gen',
  async (args) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Generate ${args.language} code for: ${args.description}`
      }
    }]
  }),
  {
    arguments: {
      language: z.string(),
      description: z.string()
    }
  }
);

// Create and start server
async function main() {
  const server = await createServerBuilder({
    config: {
      browser: { headless: false },
      capabilities: ['vision', 'pdf']
    }
  })
  .addTool(fileManager)
  .addResource(systemInfo)
  .addPrompt(codeGen)
  .build();

  server.setupExitWatchdog();

  const httpServer = await startHttpServer({ port: 3000 });
  startHttpTransport(httpServer, server);
  
  console.log('Enhanced server running on http://localhost:3000');
}

main().catch(console.error);
```

## Enhanced Connection

The `EnhancedConnection` class provides advanced connection handling with custom components:

```typescript
import { createEnhancedConnection, createConnectionFromEnhancedServer } from 'playwright-mcp-advanced';

// Create connection directly
const connection = await createEnhancedConnection(config, browserContextFactory, enhancedServer);

// Or create from EnhancedServer
const connection = await createConnectionFromEnhancedServer(enhancedServer, browserContextFactory);

// Connection provides access to server, context, and plugin manager
connection.server;         // MCP Server instance
connection.context;        // Playwright context wrapper
connection.pluginManager;  // Plugin manager instance

// Clean up when done
await connection.close();
```

## Integration with Standard Tools

Your custom components work alongside all standard Playwright tools:

- **Browser automation**: `browser_navigate`, `browser_click`, `browser_type`, etc.
- **Screenshots**: `browser_screenshot` with advanced options
- **HTML extraction**: `browser_get_html_content`, `browser_get_outer_html`
- **Snapshots**: `browser_snapshot`, `browser_element_snapshot`
- **Vision tools**: Available when `vision` capability is enabled
- **PDF tools**: Available when `pdf` capability is enabled

Use shadow items to replace standard tools with custom implementations when needed.

## Error Handling

Always handle errors gracefully in your custom handlers:

```typescript
const safeTool = createTool(
  'safe-operation',
  'Operation with error handling',
  schema,
  async (params) => {
    try {
      // Your operation here
      return { content: [{ type: 'text', text: 'Success' }] };
    } catch (error) {
      // Log error for debugging
      console.error('Tool error:', error);
      
      // Return user-friendly error
      return {
        content: [{ type: 'text', text: `Operation failed: ${error.message}` }],
        isError: true
      };
    }
  }
);
```

## Testing Custom Components

Test your components independently before integration:

```typescript
// Test tool handler
const result = await myTool.handler({ /* test params */ });
expect(result.content[0].text).toBe('expected result');

// Test resource handler
const resource = await myResource.handler();
expect(resource.contents).toHaveLength(1);

// Test prompt handler
const prompt = await myPrompt.handler({ /* test args */ });
expect(prompt.messages[0].role).toBe('user');
```

### Testing Shadow Items

Test that shadow items properly hide standard tools:

```typescript
import { createServerBuilder, createTool, type ShadowItems } from 'playwright-mcp-advanced';

// Create custom tool that replaces standard browser_navigate
const customNavigate = createTool(
  'browser_navigate',
  'Custom navigation with logging',
  z.object({
    url: z.string(),
    trackVisit: z.boolean().optional()
  }),
  async (params) => {
    if (params.trackVisit) {
      console.log(`Navigating to: ${params.url}`);
      // Custom tracking logic here
    }
    // Delegate to standard navigation or implement custom logic
    return {
      content: [{ type: 'text', text: `Navigated to ${params.url}` }]
    };
  }
);

const shadowItems: ShadowItems = {
  tools: ['browser_navigate'],
  prompts: [],
  resources: []
};

const server = await createServerBuilder({ shadowItems })
  .addTool(customNavigate)
  .build();

// Verify shadow items are applied
expect(server.getShadowItems().tools).toContain('browser_navigate');
expect(server.getCustomTools()).toHaveLength(1);
expect(server.getCustomTools()[0].name).toBe('browser_navigate');
```

## Best Practices

1. **Input Validation**: Use comprehensive Zod schemas for all tool inputs
2. **Error Handling**: Always wrap operations in try-catch and return meaningful error messages
3. **Type Safety**: Use TypeScript for better development experience
4. **Documentation**: Provide clear descriptions and argument documentation
5. **Testing**: Test components in isolation before integration
6. **Security**: Be careful with file system and network access
7. **Performance**: Consider async operations and resource usage
8. **Shadow Items**: Use shadow items when replacing standard functionality rather than duplicating tool names
9. **Tool Naming**: Use consistent naming conventions for custom tools (avoid conflicts with standard tools)
10. **Capability Grouping**: Group related tools under appropriate capability categories