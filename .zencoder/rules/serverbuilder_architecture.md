---
description: Architecture and patterns for EnhancedServer and custom MCP components integration
alwaysApply: false
---

The project uses EnhancedServer pattern for adding custom tools, resources, and prompts to MCP servers:

## Key Components:
- `EnhancedServer` extends base `Server` class with custom component support
- `ServerBuilder` for fluent API to build servers with custom components  
- `createEnhancedConnection()` integrates custom components with standard MCP tools
- Custom components defined via interfaces: CustomTool, CustomResource, CustomPrompt
- `shadowItems` configuration allows hiding/overriding standard tools

## Critical Fix Applied:
EnhancedServer originally inherited createConnection() from base Server class, which created standard connections without custom components. Fixed by overriding createConnection() in EnhancedServer to use createConnectionFromEnhancedServer().

## Usage Pattern:
```typescript
const server = await createServerBuilder({
  config: { browser: { headless: false } },
  shadowItems: { tools: ['browser_navigate'] }  // Hide standard tools
})
.addTools([customCalculatorTool, enhancedNavigateTool])
.addResources([systemInfoResource])
.addPrompts([codeReviewPrompt])
.build();
```

## Custom Component Types:
- Tools: name, description, inputSchema (zod), handler function
- Resources: uri, name, handler returning contents array
- Prompts: name, arguments schema, handler returning messages

Shadow filtering applies before merging, allowing custom tools to replace standard ones.