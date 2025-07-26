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

import { createServerBuilder, createTool } from '../src/serverBuilder.js';
import { z } from 'zod';

/**
 * Demo: Shadow Items with Wildcard Patterns
 * 
 * This example demonstrates how to use wildcard patterns in shadowItems
 * to hide groups of standard tools while providing custom implementations.
 */
async function shadowPatternsDemo() {
  console.log('🎭 Shadow Items with Patterns Demo\n');

  // Create custom tools that will replace some standard ones
  const customNavigate = createTool(
    'browser_navigate',
    'Enhanced navigation with logging',
    z.object({
      url: z.string().describe('URL to navigate to'),
      trackAnalytics: z.boolean().optional().describe('Whether to track analytics')
    }),
    async (params) => {
      console.log(`🚀 Custom navigation to: ${params.url}`);
      if (params.trackAnalytics) {
        console.log('📊 Analytics tracking enabled');
      }
      return {
        content: [{ 
          type: 'text', 
          text: `Navigated to ${params.url} with enhanced features` 
        }]
      };
    }
  );

  const customScreenshot = createTool(
    'browser_screenshot_enhanced',
    'Enhanced screenshot tool with watermark',
    z.object({
      filename: z.string().optional().describe('Filename for screenshot'),
      watermark: z.string().optional().describe('Watermark text to add')
    }),
    async (params) => {
      console.log(`📸 Taking enhanced screenshot: ${params.filename || 'default.png'}`);
      if (params.watermark) {
        console.log(`💧 Adding watermark: ${params.watermark}`);
      }
      return {
        content: [{ 
          type: 'text', 
          text: `Screenshot taken with enhancements` 
        }]
      };
    }
  );

  // Build server with shadow patterns
  const server = await createServerBuilder({
    config: { 
      capabilities: ['core', 'vision'] 
    },
    shadowItems: {
      tools: [
        'browser_*',        // Hide all browser_ tools  
        '*_screenshot',     // Hide all screenshot tools
        '*_tab_*',          // Hide all tab management tools
        'html_*'            // Hide all HTML tools
      ]
    }
  })
  .addTool(customNavigate)      // Custom tool will be visible despite browser_* pattern
  .addTool(customScreenshot)    // Custom tool will be visible
  .build();

  // Create a simple transport for demo
  const mockTransport = {
    start: async () => {},
    close: async () => {},
    send: async (message: any) => {
      if (message.method === 'tools/list') {
        const connection = await server.createEnhancedConnection(
          { createContext: () => ({ newPage: async () => ({ close: async () => {} }) }) } as any,
          mockTransport as any
        );
        
        const result = await (connection.server as any)._requestHandlers.get('tools/list')(message);
        return { 
          id: message.id,
          result 
        };
      }
      return { id: message.id, result: {} };
    }
  };

  // Test the shadow patterns
  const connection = await server.createEnhancedConnection(
    { createContext: () => ({ newPage: async () => ({ close: async () => {} }) }) } as any,
    mockTransport as any
  );

  const response = await mockTransport.send({
    id: 1,
    method: 'tools/list',
    params: {}
  });

  const tools = response.result.tools;
  const toolNames = tools.map((tool: any) => tool.name);

  console.log('📋 Available tools after applying shadow patterns:');
  console.log('════════════════════════════════════════════════\n');

  // Group tools by category for better display
  const customTools = tools.filter((tool: any) => 
    tool.name === 'browser_navigate' || tool.name === 'browser_screenshot_enhanced'
  );
  const otherTools = tools.filter((tool: any) => 
    tool.name !== 'browser_navigate' && tool.name !== 'browser_screenshot_enhanced'
  );

  console.log('🔧 Custom Tools (overrides/replacements):');
  customTools.forEach((tool: any) => {
    console.log(`  ✅ ${tool.name} - ${tool.description}`);
  });

  console.log('\n🛠️  Other Available Tools:');
  otherTools.slice(0, 10).forEach((tool: any) => {
    console.log(`  • ${tool.name} - ${tool.description}`);
  });
  
  if (otherTools.length > 10) {
    console.log(`  ... and ${otherTools.length - 10} more tools`);
  }

  console.log('\n🚫 Hidden by patterns:');
  console.log('  • browser_* (except custom browser_navigate)');
  console.log('  • *_screenshot (except custom browser_screenshot_enhanced)');
  console.log('  • *_tab_*');
  console.log('  • html_*');

  console.log('\n📊 Summary:');
  console.log(`  Total visible tools: ${tools.length}`);
  console.log(`  Custom tools: ${customTools.length}`);
  console.log(`  Standard tools: ${otherTools.length}`);

  // Verify specific patterns work
  const hiddenBrowserTools = toolNames.filter((name: string) => 
    name.startsWith('browser_') && name !== 'browser_navigate'
  );
  const hiddenScreenshotTools = toolNames.filter((name: string) => 
    name.endsWith('_screenshot')
  );
  const hiddenTabTools = toolNames.filter((name: string) => 
    name.includes('_tab_')
  );
  const hiddenHtmlTools = toolNames.filter((name: string) => 
    name.startsWith('html_')
  );

  console.log('\n✅ Pattern matching verification:');
  console.log(`  browser_* pattern hid: ${hiddenBrowserTools.length === 0 ? 'SUCCESS' : 'FAILED'}`);
  console.log(`  *_screenshot pattern hid: ${hiddenScreenshotTools.length === 0 ? 'SUCCESS' : 'FAILED'}`);
  console.log(`  *_tab_* pattern hid: ${hiddenTabTools.length === 0 ? 'SUCCESS' : 'FAILED'}`);
  console.log(`  html_* pattern hid: ${hiddenHtmlTools.length === 0 ? 'SUCCESS' : 'FAILED'}`);

  await connection.close();
  console.log('\n🏁 Demo completed successfully!');
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  shadowPatternsDemo().catch(console.error);
}