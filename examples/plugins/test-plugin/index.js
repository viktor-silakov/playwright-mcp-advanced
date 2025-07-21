/**
 * Test plugin for custom plugins folder
 */

import { z } from 'zod';
import { defineTool } from '../../../dist/tools/tool.js';

const testTool = defineTool({
  capability: 'core',
  schema: {
    name: 'custom_folder_test',
    title: 'Custom Folder Test',
    description: 'A test tool to verify custom plugins folder functionality',
    type: 'readOnly',
    inputSchema: z.object({
      message: z.string().describe('Test message'),
    }),
  },
  async handle(_context, { message }) {
    return {
      code: [
        `// Custom folder test plugin`,
        `console.log('Custom folder test: ${message}');`,
      ],
      captureSnapshot: false,
      waitForNetwork: false,
      action: async () => ({
        content: [{ 
          type: 'text', 
          text: `Custom folder test executed: ${message}` 
        }],
      }),
    };
  },
});

const plugin = {
  metadata: {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'Test plugin from custom plugins folder',
    author: 'Test',
  },
  
  tools: [testTool],
  
  async initialize() {
    console.log('Test plugin from custom folder initialized');
  },
  
  async cleanup() {
    console.log('Test plugin from custom folder cleaned up');
  }
};

export default plugin;