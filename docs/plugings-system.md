# Plugin System Documentation

The Playwright MCP Advanced includes a powerful plugin system that allows you to extend functionality with custom tools, prompts, resources, and properties.

## Overview

The plugin system supports:
- **Custom Tools**: Add new browser automation capabilities
- **Custom Prompts**: Provide templated prompts for common scenarios
- **Custom Resources**: Expose custom data sources and handlers
- **Custom Properties**: Add configurable properties
- **Shadow Items**: Override or enhance existing tools/prompts/resources

## Getting Started

### 📚 Learn from Examples

Before creating your own plugins, explore the comprehensive examples in `examples/plugins/`:

- **test-plugin** - Simple plugin demonstrating basic structure
- **example-plugin** - Full-featured plugin with all capabilities
- **shadow-demo** - Enhanced navigation plugin with logging

```bash
# Test the example plugins
npm run build
node dist/cli.js --plugins-folder examples/plugins --browser webkit
```

### 🚀 Quick Start

1. **Study the examples** in `examples/plugins/` directory
2. **Create your plugin folder** in the main `plugins/` directory
3. **Copy and modify** an example that matches your needs
4. **Build and test** your plugin

## Plugin Structure

Plugins are stored in subdirectories within the plugins folder (default: `./plugins`). Each plugin must have an `index.js` or `index.ts` file that exports a plugin configuration.

```
plugins/
├── my-plugin/
│   ├── index.js          # Main plugin file
│   ├── package.json      # Optional plugin metadata
│   └── README.md         # Optional plugin documentation
└── another-plugin/
    └── index.js

examples/plugins/          # Example plugins for learning
├── test-plugin/           # Simple example
├── example-plugin/        # Comprehensive example
└── shadow-demo/           # Enhanced navigation example
```

## Basic Plugin Template

```javascript
import { z } from 'zod';
import { defineTool } from '../dist/tools/tool.js';

// Define custom tools
const myTool = defineTool({
  capability: 'core',
  schema: {
    name: 'my_custom_action',
    title: 'My Custom Action',
    description: 'A custom action provided by my plugin',
    type: 'readOnly',
    inputSchema: z.object({
      param: z.string().describe('Parameter description'),
    }),
  },
  async handle(context, { param }) {
    // Your custom logic here
    const tab = await context.ensureTab();
    
    return {
      code: [
        `// My custom action`,
        `console.log('${param}');`,
      ],
      captureSnapshot: false,
      waitForNetwork: false,
      action: async () => ({
        content: [{ 
          type: 'text', 
          text: `Executed with: ${param}` 
        }],
      }),
    };
  },
});

// Plugin definition
const plugin = {
  metadata: {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'My custom plugin',
    author: 'Your Name',
  },
  
  // Custom tools
  tools: [myTool],
  
  // Custom prompts
  prompts: [
    {
      name: 'my_prompt',
      description: 'A custom prompt template',
      arguments: [
        {
          name: 'topic',
          description: 'Topic to ask about',
          required: false,
        }
      ]
    }
  ],
  
  // Custom resources
  resources: [
    {
      name: 'my_resource',
      description: 'A custom resource',
      uri: 'myplugin://resource',
      mimeType: 'text/plain',
      async handler(uri) {
        return {
          content: `Resource content for: ${uri}`,
          mimeType: 'text/plain',
        };
      }
    }
  ],
  
  // Custom properties
  properties: [
    {
      name: 'my_property',
      description: 'A custom property',
      readOnly: true,
      getter() {
        return 'My property value';
      }
    }
  ],
  
  // Shadow existing items (optional)
  shadowItems: {
    tools: ['browser_navigate'],    // Shadow existing tools
    prompts: [],                    // Shadow existing prompts
    resources: [],                  // Shadow existing resources
  },
  
  // Plugin lifecycle
  async initialize() {
    console.log('My plugin initialized');
  },
  
  async cleanup() {
    console.log('My plugin cleaned up');
  }
};

export default plugin;
```

## Import Paths

**Important**: Import paths depend on your plugin location:

### For production plugins in `plugins/` directory:
```javascript
import { defineTool } from '../dist/tools/tool.js';
import type { Plugin } from '../src/plugins/types.js';  // TypeScript only
```

### For example plugins in `examples/plugins/` directory:
```javascript
import { defineTool } from '../../../dist/tools/tool.js';
import type { Plugin } from '../../../src/plugins/types.js';  // TypeScript only
```

## Shadow Items

Shadow items allow plugins to override or enhance existing functionality:

```javascript
const plugin = {
  // ... other config
  
  // Enhanced version of browser_navigate
  tools: [enhancedNavigateTool],
  
  // Shadow the original browser_navigate
  shadowItems: {
    tools: ['browser_navigate'],
  },
};
```

When a tool is shadowed:
1. The original tool becomes unavailable
2. Only the plugin's version is accessible
3. Multiple plugins can shadow the same tool (last loaded wins)

## Tool Development

Custom tools should use the `defineTool` helper:

```javascript
import { defineTool } from '../dist/tools/tool.js';

const myTool = defineTool({
  capability: 'core',
  schema: {
    name: 'unique_tool_name',
    title: 'Human Readable Title',
    description: 'Detailed description of what this tool does',
    type: 'readOnly',  // or 'destructive'
    inputSchema: z.object({
      param1: z.string().describe('First parameter'),
      param2: z.number().default(10).describe('Second parameter'),
    }),
  },
  async handle(context, params) {
    // Access browser context
    const tab = await context.ensureTab();
    const page = tab.page;
    
    // Your automation logic
    const result = await page.evaluate(() => {
      // Browser-side code
      return document.title;
    });
    
    return {
      code: [
        `// Generated Playwright code`,
        `const title = await page.evaluate(() => document.title);`,
      ],
      captureSnapshot: true,
      waitForNetwork: false,
      action: async () => ({
        content: [{ 
          type: 'text', 
          text: `Page title: ${result}` 
        }],
      }),
    };
  },
});
```

## Configuration

### Plugin Folder

Change the plugins directory using the `--plugins-folder` parameter:

```bash
# Use main plugins directory (default)
node dist/cli.js --browser webkit

# Use custom plugins directory
node dist/cli.js --plugins-folder ./my-custom-plugins --browser webkit

# Test example plugins
node dist/cli.js --plugins-folder examples/plugins --browser webkit
```

Or in configuration:

```javascript
const config = {
  plugins: {
    folder: './my-custom-plugins'
  }
};
```

### Enable/Disable Plugins

```javascript
const config = {
  plugins: {
    folder: './plugins',
    enabled: ['plugin1', 'plugin2'],  // Only these plugins will load
    disabled: ['plugin3']             // These plugins will be skipped
  }
};
```

## Plugin Management

Use the `plugins_manage` tool to interact with the plugin system:

```javascript
// List all plugins
await context.run('plugins_manage', { action: 'list' });

// Get plugin information
await context.run('plugins_manage', { 
  action: 'info', 
  pluginName: 'my-plugin' 
});

// Reload a plugin
await context.run('plugins_manage', { 
  action: 'reload', 
  pluginName: 'my-plugin' 
});

// Show shadow information
await context.run('plugins_manage', { action: 'shadow-info' });
```

## Examples

### Example 1: Page Analysis Plugin

```javascript
const pageAnalysisTool = defineTool({
  capability: 'core',
  schema: {
    name: 'analyze_page_seo',
    title: 'SEO Page Analysis',
    description: 'Analyze page for SEO elements',
    type: 'readOnly',
    inputSchema: z.object({}),
  },
  async handle(context) {
    const tab = await context.ensureTab();
    
    const analysis = await tab.page.evaluate(() => {
      return {
        title: document.title,
        metaDescription: document.querySelector('meta[name="description"]')?.content,
        h1Count: document.querySelectorAll('h1').length,
        h2Count: document.querySelectorAll('h2').length,
        imageCount: document.querySelectorAll('img').length,
        imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
      };
    });
    
    return {
      code: ['// SEO analysis completed'],
      captureSnapshot: false,
      waitForNetwork: false,
      action: async () => ({
        content: [{
          type: 'text',
          text: `SEO Analysis Results:
Title: ${analysis.title}
Meta Description: ${analysis.metaDescription || 'Missing'}
H1 Tags: ${analysis.h1Count}
H2 Tags: ${analysis.h2Count}
Images: ${analysis.imageCount}
Images without Alt Text: ${analysis.imagesWithoutAlt}`
        }],
      }),
    };
  },
});
```

### Example 2: Enhanced Navigate with Logging

```javascript
const enhancedNavigate = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_navigate',
    title: 'Enhanced Navigate with Logging',
    description: 'Navigate with enhanced logging and performance tracking',
    type: 'destructive',
    inputSchema: z.object({
      url: z.string().describe('URL to navigate to'),
      trackPerformance: z.boolean().default(false),
    }),
  },
  async handle(context, { url, trackPerformance }) {
    console.log(`[Enhanced Navigate] Navigating to: ${url}`);
    
    const tab = await context.ensureTab();
    const startTime = Date.now();
    
    await tab.navigate(url);
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    console.log(`[Enhanced Navigate] Load completed in ${loadTime}ms`);
    
    return {
      code: [
        `// Enhanced navigate to ${url}`,
        `await page.goto('${url}');`,
      ],
      captureSnapshot: true,
      waitForNetwork: true,
      action: async () => ({
        content: [{
          type: 'text',
          text: `Enhanced navigation completed to ${url}${trackPerformance ? ` (Load time: ${loadTime}ms)` : ''}`
        }],
      }),
    };
  },
});

const plugin = {
  metadata: {
    name: 'enhanced-navigate',
    version: '1.0.0',
    description: 'Enhanced navigation with logging and performance tracking',
  },
  tools: [enhancedNavigate],
  shadowItems: {
    tools: ['browser_navigate'],
  },
};
```

## Development Workflow

### 1. Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Create Plugin

```bash
# Create plugin directory
mkdir plugins/my-plugin

# Create plugin file
touch plugins/my-plugin/index.js
```

### 3. Test Plugin

```bash
# Test with your plugin
npm run build
node dist/cli.js --browser webkit

# Test with examples first
node dist/cli.js --plugins-folder examples/plugins --browser webkit
```

### 4. Debug Plugin

Check console output for plugin loading messages:
- `My plugin initialized` - Plugin loaded successfully
- Error messages - Check syntax and imports

## Best Practices

1. **Start with examples**: Copy and modify existing examples from `examples/plugins/`
2. **Use descriptive names**: Tool names should be unique and descriptive
3. **Add comprehensive descriptions**: Help users understand what your tools do
4. **Handle errors gracefully**: Wrap operations in try-catch blocks
5. **Use appropriate tool types**: Mark destructive operations as 'destructive'
6. **Provide good defaults**: Use sensible default values for optional parameters
7. **Clean up resources**: Implement cleanup logic in the cleanup() method
8. **Test your plugins**: Create test cases for your plugin functionality
9. **Document your plugins**: Include README files with usage examples
10. **Use correct import paths**: Ensure imports match your plugin location

## Troubleshooting

### Common Issues

- **Plugin not loading**: Check for syntax errors in your plugin file
- **Tool not appearing**: Ensure the tool name is unique and the plugin loaded successfully
- **Shadow not working**: Verify the shadowed item name matches exactly
- **Import errors**: Check that all dependencies are properly imported
- **Wrong import path**: Ensure you're using the correct relative path to `dist/`

### Debugging Steps

1. **Check console output** for plugin initialization messages
2. **Verify file paths** and import statements
3. **Test with example plugins** first to ensure system works
4. **Use `plugins_manage` tool** to list and inspect plugins
5. **Check plugin metadata** and naming conflicts

### Error Messages

- `Cannot find module` - Check import paths
- `Plugin failed to initialize` - Check plugin syntax and dependencies
- `Tool name conflict` - Ensure unique tool names or use shadowing

## Reference Documentation

### 📚 Related Documentation

- **Plugin Examples**: `examples/plugins/README.md` - Detailed examples
- **Plugin System Overview**: `PLUGINS.md` - High-level system overview  
- **Development Summary**: `PLUGIN_SYSTEM_SUMMARY.md` - Technical details
- **Plugin Directory Guide**: `plugins/README.md` - Quick reference

### API Reference

#### Context Object

The context object provides access to browser automation capabilities:

- `context.ensureTab()`: Get or create a browser tab
- `context.config`: Access to configuration
- `context.pluginManager`: Access to plugin manager (if available)

#### Tool Schema Properties

- `name`: Unique identifier for the tool
- `title`: Human-readable title
- `description`: Detailed description
- `type`: 'readOnly' or 'destructive'
- `inputSchema`: Zod schema for input validation

#### Tool Response

Tools must return a ToolResult object:

```javascript
{
  code: ['// Generated code lines'],
  captureSnapshot: boolean,
  waitForNetwork: boolean,
  action?: async () => ({ content: [...] }),
  resultOverride?: { content: [...] }
}
```

## CLI Reference

### Development Commands

```bash
# Build project
npm run build

# Run tests
npm test

# Run specific browser tests
npm run wtest  # WebKit only
npm run ctest  # Chrome only
npm run ftest  # Firefox only
```

### Plugin Commands

```bash
# Default plugins directory
node dist/cli.js --browser webkit

# Custom plugins directory
node dist/cli.js --plugins-folder ./my-plugins --browser webkit

# Example plugins (for learning)
node dist/cli.js --plugins-folder examples/plugins --browser webkit

# Extension mode with plugins
node dist/cli.js --extension --port 3000 --plugins-folder ./plugins --browser chromium
```