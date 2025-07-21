# Plugin Examples

This directory contains example plugins that demonstrate how to create custom plugins for playwright-mcp-advanced.

## Available Examples

### 1. Test Plugin (`test-plugin/`)
A simple example plugin that demonstrates:
- Basic plugin structure with metadata
- Custom tool definition using `defineTool`
- Simple text-based tool that returns a message

**Tool:** `custom_folder_test` - A basic test tool that accepts a message and returns it

### 2. Example Plugin (`example-plugin/`)
A comprehensive example demonstrating advanced plugin features:
- Multiple plugin components (tools, prompts, resources, properties)
- Complex tool implementation with logging
- Plugin lifecycle methods (initialize/cleanup)
- Both JavaScript (.js) and TypeScript (.ts) versions available

**Tool:** `example_action` - An example action that demonstrates plugin capabilities

### 3. Shadow Demo Plugin (`shadow-demo/`)
An enhanced navigation plugin that shows:
- Extending existing functionality
- Enhanced logging and debugging
- Custom navigation behavior
- Both JavaScript (.js) and TypeScript (.ts) versions available

**Tool:** `enhanced_navigate` - Enhanced version of browser_navigate with additional logging

## Creating Your Own Plugins

### For Development
1. Create a new folder in the main `plugins/` directory (not in this examples folder)
2. Create an `index.js` file with your plugin definition
3. Import `defineTool` from `../dist/tools/tool.js` (relative to project root)
4. Define your tools and export a plugin object with metadata

### For Testing Examples
You can test these example plugins by running:
```bash
npm run build
node dist/cli.js --plugins-folder examples/plugins --browser webkit
```

## Plugin Structure Template

```javascript
import { defineTool } from '../../../dist/tools/tool.js'; // Note: 3 levels up from examples/plugins/
import { z } from 'zod';

const myTool = defineTool({
  capability: 'core', // or 'vision', 'pdf', etc.
  schema: {
    name: 'my_custom_tool',
    title: 'My Custom Tool',
    description: 'Description of what this tool does',
    type: 'readOnly', // or 'destructive'
    inputSchema: z.object({
      param: z.string().describe('Parameter description'),
    }),
  },
  async handle(context, params) {
    // Your tool implementation
    return {
      code: ['// Generated code'],
      action: async () => {
        // Action implementation
        return {
          content: [{ type: 'text', text: 'Result' }]
        };
      }
    };
  },
});

export default {
  metadata: {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'My custom plugin',
    author: 'Your Name',
  },
  tools: [myTool],
  async initialize() {
    // Plugin initialization
  },
  async cleanup() {
    // Plugin cleanup
  }
};
```

## Notes

- For production plugins, place them in the main `plugins/` directory at the project root
- These examples use paths relative to `examples/plugins/` (3 levels up: `../../../`)
- Active development plugins should use paths relative to `plugins/` (1 level up: `../`)
- Both JavaScript (.js) and TypeScript (.ts) versions are provided for learning purposes