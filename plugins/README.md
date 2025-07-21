# Plugins Directory

This directory is automatically scanned for custom plugins when the server starts.

## 📖 Getting Started

**New to plugins?** Check out the comprehensive examples in [`../examples/plugins/`](../examples/plugins/) which include:

- **test-plugin** - Simple plugin example
- **example-plugin** - Full-featured plugin with all capabilities  
- **shadow-demo** - Enhanced navigation plugin example

## 🚀 Quick Start

1. **Learn from examples:**
   ```bash
   # Test the example plugins
   npm run build
   node dist/cli.js --plugins-folder examples/plugins --browser webkit
   ```

2. **Create your plugin:**
   - Create a new folder in this `plugins/` directory
   - Add an `index.js` file with your plugin definition
   - Import from `../dist/tools/tool.js`

## 📁 Plugin Structure

Each plugin should be in its own subdirectory and export a default object:

```javascript
import { defineTool } from '../dist/tools/tool.js';
import { z } from 'zod';

export default {
  metadata: {
    name: 'plugin-name',
    version: '1.0.0',
    description: 'Plugin description',
    author: 'Author name'
  },
  
  tools: [
    // Tool definitions using defineTool()
  ],
  
  prompts: [
    // Prompt definitions (optional)
  ],
  
  resources: [
    // Resource definitions (optional)
  ],
  
  properties: [
    // Property definitions (optional)
  ],
  
  shadowItems: {
    tools: ['tool-name-to-hide'],
    prompts: ['prompt-name-to-hide'],
    resources: ['resource-name-to-hide'],
  },
  
  async initialize() {
    // Plugin initialization code (optional)
  },
  
  async cleanup() {
    // Plugin cleanup code (optional)
  }
};
```

## 🔧 Tool Definition

Tools are defined using the `defineTool` helper:

```javascript
import { defineTool } from '../dist/tools/tool.js';
import { z } from 'zod';

const myTool = defineTool({
  capability: 'core', // or 'vision', 'pdf'
  schema: {
    name: 'my_tool',
    title: 'My Tool',
    description: 'What this tool does',
    type: 'readOnly', // or 'destructive'
    inputSchema: z.object({
      param: z.string().describe('Parameter description')
    })
  },
  async handle(context, params) {
    return {
      code: ['// Generated code'],
      action: async () => ({
        content: [{ type: 'text', text: 'Result' }]
      })
    };
  }
});
```

## 🌟 Shadow Items

The `shadowItems` object allows plugins to hide (shadow) existing tools, prompts, or resources from the MCP Tool listing. Items in the shadow list will not be shown to the client unless they are redefined by the same plugin or another plugin.

This is useful for:
- Replacing core functionality with enhanced versions
- Temporarily disabling certain features
- Creating plugin-specific implementations

## ⚙️ Plugin Configuration

You can configure plugins in the MCP server configuration:

```json
{
  "plugins": {
    "folder": "./plugins",
    "enabled": ["plugin1", "plugin2"],
    "disabled": ["plugin3"]
  }
}
```

- `folder`: Path to plugins directory (default: `./plugins`)
- `enabled`: Array of plugin names to enable (if specified, only these plugins will be loaded)
- `disabled`: Array of plugin names to disable (takes precedence over enabled list)

## 🖥️ CLI Options

- `--plugins-folder <path>`: Override the plugins directory path

## 📚 Documentation

- **Full plugin examples:** [`../examples/plugins/README.md`](../examples/plugins/README.md)
- **Plugin system overview:** [`../PLUGINS.md`](../PLUGINS.md)
- **Development guide:** [`../PLUGIN_SYSTEM_SUMMARY.md`](../PLUGIN_SYSTEM_SUMMARY.md)

---

**💡 Tip:** Start by copying and modifying one of the example plugins!