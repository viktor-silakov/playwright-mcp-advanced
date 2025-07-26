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

import { test, expect } from '@playwright/test';
import { createServerBuilder, createTool } from '../src/serverBuilder.js';
import { z } from 'zod';
import { StdioTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { ListToolsResult } from '@modelcontextprotocol/sdk/types.js';

test.describe('Shadow Items with Patterns', () => {
  test('should hide tools matching wildcard patterns', async () => {
    // Create server with shadow patterns
    const server = await createServerBuilder({
      config: { capabilities: ['core'] },
      shadowItems: {
        tools: ['browser_*', '*_screenshot']
      }
    }).build();

    // Create a mock transport for testing
    const mockTransport = {
      start: async () => {},
      close: async () => {},
      send: async (message: any) => {
        if (message.method === 'tools/list') {
          // Get the actual server response
          const connection = await server.createEnhancedConnection(
            { createContext: () => ({ newPage: async () => ({ close: async () => {} }) }) } as any,
            mockTransport as any
          );
          
          // Call the list tools handler directly
          const result = await (connection.server as any)._requestHandlers.get('tools/list')(message);
          return { 
            id: message.id,
            result 
          };
        }
        return { id: message.id, result: {} };
      }
    };

    const connection = await server.createEnhancedConnection(
      { createContext: () => ({ newPage: async () => ({ close: async () => {} }) }) } as any,
      mockTransport as any
    );

    // Get the list of tools
    const response = await mockTransport.send({
      id: 1,
      method: 'tools/list',
      params: {}
    });

    const tools = response.result.tools;
    const toolNames = tools.map((tool: any) => tool.name);

    // Check that browser_* tools are hidden
    expect(toolNames).not.toContain('browser_navigate');
    expect(toolNames).not.toContain('browser_tab_list');
    
    // Check that *_screenshot tools are hidden (if any exist)
    const screenshotTools = toolNames.filter((name: string) => name.endsWith('_screenshot'));
    expect(screenshotTools).toHaveLength(0);

    // Check that non-matching tools are still visible
    // Note: This depends on what tools are actually available in the test environment
    const nonBrowserTools = toolNames.filter((name: string) => 
      !name.startsWith('browser_') && !name.endsWith('_screenshot')
    );
    expect(nonBrowserTools.length).toBeGreaterThan(0);

    await connection.close();
  });

  test('should support exact matches alongside patterns', async () => {
    const server = await createServerBuilder({
      config: { capabilities: ['core'] },
      shadowItems: {
        tools: ['browser_navigate', 'tab_*'] // exact + pattern
      }
    }).build();

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

    // Check exact match is hidden
    expect(toolNames).not.toContain('browser_navigate');
    
    // Check pattern matches are hidden
    const tabTools = toolNames.filter((name: string) => name.startsWith('tab_'));
    expect(tabTools).toHaveLength(0);

    // Check that other browser tools are still visible
    const otherBrowserTools = toolNames.filter((name: string) => 
      name.startsWith('browser_') && name !== 'browser_navigate'
    );
    // Should have some browser tools that don't match the exact pattern
    expect(otherBrowserTools.length).toBeGreaterThan(0);

    await connection.close();
  });

  test('should allow custom tools to override shadowed tools', async () => {
    // Create custom tool with same name as shadowed tool
    const customTool = createTool(
      'browser_navigate',
      'Custom navigate tool',
      z.object({ url: z.string() }),
      async (params) => ({
        content: [{ type: 'text', text: `Custom navigation to ${params.url}` }]
      })
    );

    const server = await createServerBuilder({
      config: { capabilities: ['core'] },
      shadowItems: {
        tools: ['browser_*'] // This should hide the standard browser_navigate
      }
    })
    .addTool(customTool) // But custom tool should still be visible
    .build();

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

    // Custom tool should be visible
    expect(toolNames).toContain('browser_navigate');
    
    // Find the specific tool and verify it's our custom one
    const navigateTool = tools.find((tool: any) => tool.name === 'browser_navigate');
    expect(navigateTool).toBeDefined();
    expect(navigateTool.description).toBe('Custom navigate tool');

    await connection.close();
  });

  test('should handle complex wildcard patterns', async () => {
    const server = await createServerBuilder({
      config: { capabilities: ['core'] },
      shadowItems: {
        tools: ['*browser*', 'test_*_end'] // multiple wildcards
      }
    }).build();

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

    // All tools containing 'browser' should be hidden
    const browserTools = toolNames.filter((name: string) => name.includes('browser'));
    expect(browserTools).toHaveLength(0);

    await connection.close();
  });

  test('should work with empty shadow items', async () => {
    const server = await createServerBuilder({
      config: { capabilities: ['core'] },
      shadowItems: {
        tools: [] // Empty array
      }
    }).build();

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

    // All standard tools should be visible (no shadowing)
    expect(tools.length).toBeGreaterThan(0);

    await connection.close();
  });

  test('should work without shadow items', async () => {
    const server = await createServerBuilder({
      config: { capabilities: ['core'] }
      // No shadowItems specified
    }).build();

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

    // All standard tools should be visible (no shadowing)
    expect(tools.length).toBeGreaterThan(0);

    await connection.close();
  });
});