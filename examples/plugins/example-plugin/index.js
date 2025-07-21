/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';
import { defineTool } from '../../../dist/tools/tool.js';

// Example custom tool
const exampleTool = defineTool({
  capability: 'core',
  schema: {
    name: 'example_action',
    title: 'Example Action',
    description: 'An example custom action provided by a plugin',
    type: 'readOnly',
    inputSchema: z.object({
      message: z.string().describe('Message to display'),
    }),
  },
  async handle(_context, { message }) {
    return {
      code: [
        `// Example plugin action`,
        `console.log('${message}');`,
      ],
      captureSnapshot: false,
      waitForNetwork: false,
      action: async () => ({
        content: [{ 
          type: 'text', 
          text: `Example plugin executed with message: ${message}` 
        }],
      }),
    };
  },
});

// Main plugin definition
const plugin = {
  metadata: {
    name: 'example-plugin',
    version: '1.0.0',
    description: 'An example plugin demonstrating the plugin system',
    author: 'Playwright MCP Advanced',
  },
  
  tools: [exampleTool],
  
  prompts: [
    {
      name: 'example_prompt',
      description: 'An example prompt from a plugin',
      arguments: [
        {
          name: 'topic',
          description: 'Topic to ask about',
          required: false,
        }
      ]
    }
  ],
  
  resources: [
    {
      name: 'example_resource',
      description: 'An example resource from a plugin',
      uri: 'example://resource',
      mimeType: 'text/plain',
      async handler(uri) {
        return {
          content: `Example resource content for URI: ${uri}`,
          mimeType: 'text/plain',
        };
      }
    }
  ],
  
  properties: [
    {
      name: 'example_property',
      description: 'An example property from a plugin',
      readOnly: true,
      getter() {
        return 'Example property value';
      }
    }
  ],
  
  async initialize() {
    console.log('Example plugin initialized');
  },
  
  async cleanup() {
    console.log('Example plugin cleaned up');
  }
};

export default plugin;