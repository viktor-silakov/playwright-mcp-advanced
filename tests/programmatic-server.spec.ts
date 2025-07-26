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
import { z } from 'zod';
import { 
  createServerBuilder, 
  createTool, 
  createResource, 
  createPrompt,
  EnhancedServer 
} from '../src/serverBuilder.js';
import { createEnhancedConnection } from '../src/enhancedConnection.js';
import { contextFactory } from '../src/browserContextFactory.js';
import { resolveConfig } from '../src/config.js';

test.describe('Programmatic Server Creation', () => {
  
  test('should create server builder with basic configuration', async () => {
    const builder = createServerBuilder({
      config: {
        browser: {
          headless: true
        }
      }
    });
    
    expect(builder).toBeDefined();
    
    const server = await builder.build();
    expect(server).toBeInstanceOf(EnhancedServer);
    expect(server.getCustomTools()).toHaveLength(0);
    expect(server.getCustomResources()).toHaveLength(0);
    expect(server.getCustomPrompts()).toHaveLength(0);
  });

  test('should create custom tool with utility function', () => {
    const tool = createTool(
      'test-tool',
      'A test tool',
      z.object({
        input: z.string()
      }),
      async (params) => ({
        content: [{ type: 'text', text: `Processed: ${params.input}` }]
      }),
      {
        title: 'Test Tool',
        capability: 'test',
        type: 'readOnly'
      }
    );

    expect(tool.name).toBe('test-tool');
    expect(tool.title).toBe('Test Tool');
    expect(tool.description).toBe('A test tool');
    expect(tool.capability).toBe('test');
    expect(tool.type).toBe('readOnly');
    expect(tool.inputSchema).toBeDefined();
    expect(tool.handler).toBeDefined();
  });

  test('should create custom resource with utility function', () => {
    const resource = createResource(
      'test://resource',
      'Test Resource',
      async () => ({
        contents: [{
          uri: 'test://resource',
          text: 'test content'
        }]
      }),
      {
        description: 'A test resource',
        mimeType: 'text/plain'
      }
    );

    expect(resource.uri).toBe('test://resource');
    expect(resource.name).toBe('Test Resource');
    expect(resource.description).toBe('A test resource');
    expect(resource.mimeType).toBe('text/plain');
    expect(resource.handler).toBeDefined();
  });

  test('should create custom prompt with utility function', () => {
    const prompt = createPrompt(
      'test-prompt',
      async (args) => ({
        messages: [{
          role: 'user',
          content: { type: 'text', text: `Hello ${args.name}` }
        }]
      }),
      {
        description: 'A test prompt',
        arguments: {
          name: z.string().describe('Name to greet')
        }
      }
    );

    expect(prompt.name).toBe('test-prompt');
    expect(prompt.description).toBe('A test prompt');
    expect(prompt.arguments).toBeDefined();
    expect(prompt.handler).toBeDefined();
  });

  test('should add custom tools to server builder', async () => {
    const tool1 = createTool(
      'tool1',
      'Tool 1',
      z.object({ value: z.string() }),
      async (params) => ({ content: [{ type: 'text', text: params.value }] })
    );

    const tool2 = createTool(
      'tool2',
      'Tool 2',
      z.object({ number: z.number() }),
      async (params) => ({ content: [{ type: 'text', text: params.number.toString() }] })
    );

    const server = await createServerBuilder()
      .addTool(tool1)
      .addTool(tool2)
      .build();

    const customTools = server.getCustomTools();
    expect(customTools).toHaveLength(2);
    expect(customTools[0].name).toBe('tool1');
    expect(customTools[1].name).toBe('tool2');
  });

  test('should add multiple tools at once', async () => {
    const tools = [
      createTool('tool1', 'Tool 1', z.object({}), async () => ({ content: [] })),
      createTool('tool2', 'Tool 2', z.object({}), async () => ({ content: [] })),
      createTool('tool3', 'Tool 3', z.object({}), async () => ({ content: [] }))
    ];

    const server = await createServerBuilder()
      .addTools(tools)
      .build();

    expect(server.getCustomTools()).toHaveLength(3);
  });

  test('should add custom resources to server builder', async () => {
    const resource1 = createResource(
      'test://1',
      'Resource 1',
      async () => ({ contents: [{ uri: 'test://1', text: 'content1' }] })
    );

    const resource2 = createResource(
      'test://2',
      'Resource 2',
      async () => ({ contents: [{ uri: 'test://2', text: 'content2' }] })
    );

    const server = await createServerBuilder()
      .addResource(resource1)
      .addResource(resource2)
      .build();

    const customResources = server.getCustomResources();
    expect(customResources).toHaveLength(2);
    expect(customResources[0].uri).toBe('test://1');
    expect(customResources[1].uri).toBe('test://2');
  });

  test('should add custom prompts to server builder', async () => {
    const prompt1 = createPrompt(
      'prompt1',
      async () => ({ messages: [{ role: 'user', content: { type: 'text', text: 'test1' } }] })
    );

    const prompt2 = createPrompt(
      'prompt2',
      async () => ({ messages: [{ role: 'user', content: { type: 'text', text: 'test2' } }] })
    );

    const server = await createServerBuilder()
      .addPrompt(prompt1)
      .addPrompt(prompt2)
      .build();

    const customPrompts = server.getCustomPrompts();
    expect(customPrompts).toHaveLength(2);
    expect(customPrompts[0].name).toBe('prompt1');
    expect(customPrompts[1].name).toBe('prompt2');
  });

  test('should create enhanced connection with custom components', async () => {
    const tool = createTool(
      'test-calc',
      'Test calculator',
      z.object({
        a: z.number(),
        b: z.number(),
        operation: z.enum(['add', 'subtract'])
      }),
      async (params) => {
        const result = params.operation === 'add' ? params.a + params.b : params.a - params.b;
        return {
          content: [{ type: 'text', text: `Result: ${result}` }]
        };
      }
    );

    const resource = createResource(
      'test://data',
      'Test Data',
      async () => ({
        contents: [{ uri: 'test://data', text: JSON.stringify({ test: true }) }]
      })
    );

    const server = await createServerBuilder({
      config: {
        browser: { headless: true }
      }
    })
    .addTool(tool)
    .addResource(resource)
    .build();

    const config = await resolveConfig({ browser: { headless: true } });
    const factory = contextFactory(config.browser);
    const connection = await createEnhancedConnection(config, factory, server);

    expect(connection).toBeDefined();
    expect(connection.server).toBeDefined();
    expect(connection.context).toBeDefined();

    await connection.close();
  });

  test('should handle tool execution with custom handler', async () => {
    let executionCount = 0;
    
    const tool = createTool(
      'counter',
      'Execution counter',
      z.object({
        increment: z.number().default(1)
      }),
      async (params) => {
        executionCount += params.increment;
        return {
          content: [{ type: 'text', text: `Count: ${executionCount}` }]
        };
      }
    );

    // Test the handler directly
    const result1 = await tool.handler({ increment: 1 });
    expect(result1.content[0].text).toBe('Count: 1');

    const result2 = await tool.handler({ increment: 5 });
    expect(result2.content[0].text).toBe('Count: 6');
  });

  test('should handle tool errors gracefully', async () => {
    const tool = createTool(
      'error-tool',
      'Tool that throws errors',
      z.object({
        shouldError: z.boolean()
      }),
      async (params) => {
        if (params.shouldError) {
          throw new Error('Intentional error');
        }
        return {
          content: [{ type: 'text', text: 'Success' }]
        };
      }
    );

    // Test success case
    const successResult = await tool.handler({ shouldError: false });
    expect(successResult.content[0].text).toBe('Success');

    // Test error case
    try {
      await tool.handler({ shouldError: true });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error.message).toBe('Intentional error');
    }
  });

  test('should validate input schemas for custom tools', () => {
    const tool = createTool(
      'validation-test',
      'Test input validation',
      z.object({
        required: z.string(),
        optional: z.number().optional(),
        email: z.string().email()
      }),
      async (params) => ({
        content: [{ type: 'text', text: `Valid: ${params.required}` }]
      })
    );

    // Test valid input
    const validInput = {
      required: 'test',
      optional: 42,
      email: 'test@example.com'
    };
    
    const parsed = tool.inputSchema.parse(validInput);
    expect(parsed).toEqual(validInput);

    // Test invalid input
    const invalidInput = {
      required: 'test',
      email: 'invalid-email'
    };

    expect(() => tool.inputSchema.parse(invalidInput)).toThrow();
  });

  test('should chain builder methods fluently', async () => {
    const server = await createServerBuilder()
      .config({ browser: { headless: true } })
      .addTool(createTool('tool1', 'Tool 1', z.object({}), async () => ({ content: [] })))
      .addResource(createResource('res://1', 'Resource 1', async () => ({ contents: [] })))
      .addPrompt(createPrompt('prompt1', async () => ({ messages: [] })))
      .addTool(createTool('tool2', 'Tool 2', z.object({}), async () => ({ content: [] })))
      .build();

    expect(server.getCustomTools()).toHaveLength(2);
    expect(server.getCustomResources()).toHaveLength(1);
    expect(server.getCustomPrompts()).toHaveLength(1);
  });

  test('should create server with shadowItems configuration', async () => {
    const server = await createServerBuilder({
      config: {
        browser: { headless: true },
        capabilities: ['vision']
      },
      shadowItems: {
        tools: ['browser_navigate', 'browser_navigate_back'],
        prompts: [],
        resources: [],
      }
    }).build();

    expect(server).toBeInstanceOf(EnhancedServer);
    
    const shadowItems = server.getShadowItems();
    expect(shadowItems.tools).toContain('browser_navigate');
    expect(shadowItems.tools).toContain('browser_navigate_back');
    expect(shadowItems.prompts).toEqual([]);
    expect(shadowItems.resources).toEqual([]);
  });

  test('should properly shadow standard tools with custom ones', async () => {
    // Create custom tool that shadows browser_navigate
    const customNavigateTool = createTool(
      'browser_navigate',
      'Custom navigation tool',
      z.object({
        url: z.string().describe('URL to navigate to'),
        customParam: z.string().optional().describe('Custom parameter'),
      }),
      async (params) => ({
        content: [{ type: 'text', text: `Custom navigate to ${params.url}` }]
      }),
      { title: 'Custom Navigation', capability: 'core', type: 'destructive' }
    );

    const server = await createServerBuilder({
      config: {
        browser: { headless: true },
        capabilities: ['vision']
      },
      shadowItems: {
        tools: ['browser_navigate', 'browser_navigate_back'],
        prompts: [],
        resources: [],
      }
    })
    .addTools([customNavigateTool])
    .build();

    const config = await resolveConfig({});
    const factory = await contextFactory(config);
    const connection = await createEnhancedConnection(config, factory, server);

    // Verify new shadowing behavior: both standard and custom tools exist for execution
    const allTools = connection.context.tools;
    const navigateTools = allTools.filter(tool => tool.schema.name === 'browser_navigate');
    const backTools = allTools.filter(tool => tool.schema.name === 'browser_navigate_back');

    // Both tools should exist (standard + custom)
    expect(navigateTools).toHaveLength(2);
    // One should be the custom tool
    const customTool = navigateTools.find(tool => tool.schema.title === 'Custom Navigation');
    expect(customTool).toBeDefined();
    // One should be the standard tool
    const standardTool = navigateTools.find(tool => tool.schema.title === 'Navigate to a URL');
    expect(standardTool).toBeDefined();
    
    // Back tool should still exist for execution (shadowing only hides from list, doesn't remove)
    expect(backTools).toHaveLength(1);

    // Test that custom tool is executed (has priority)
    if (customTool) {
      const result = await customTool.handle(connection.context, {
        url: 'https://example.com',
        customParam: 'test'
      });

      expect(result.resultOverride?.content?.[0]?.text).toContain('Custom navigate to https://example.com');
    }
  });

  test('should hide shadowed tools from list but keep them executable', async () => {
    const server = await createServerBuilder({
      config: {
        browser: { headless: true },
        capabilities: ['vision']
      },
      shadowItems: {
        tools: ['browser_navigate', 'browser_navigate_back'],
        prompts: [],
        resources: [],
      }
    }).build();

    const config = await resolveConfig({});
    const factory = await contextFactory(config);
    const connection = await createEnhancedConnection(config, factory, server);

    // Check that shadowed tools are hidden from the visible list
    // This would be what ListTools API returns
    const visibleTools = connection.context.tools.filter(tool => 
      !server.getShadowItems().tools?.includes(tool.schema.name)
    );
    
    const visibleNavigateTools = visibleTools.filter(tool => tool.schema.name === 'browser_navigate');
    const visibleBackTools = visibleTools.filter(tool => tool.schema.name === 'browser_navigate_back');
    
    expect(visibleNavigateTools).toHaveLength(0); // Hidden from list
    expect(visibleBackTools).toHaveLength(0); // Hidden from list
    
    // But they should still be available for execution in allTools
    const allTools = connection.context.tools;
    const allNavigateTools = allTools.filter(tool => tool.schema.name === 'browser_navigate');
    const allBackTools = allTools.filter(tool => tool.schema.name === 'browser_navigate_back');
    
    expect(allNavigateTools).toHaveLength(1); // Available for execution
    expect(allBackTools).toHaveLength(1); // Available for execution
  });

  test('should handle empty shadowItems configuration', async () => {
    const server = await createServerBuilder({
      config: { browser: { headless: true } },
      shadowItems: {
        tools: [],
        prompts: [],
        resources: [],
      }
    }).build();

    const shadowItems = server.getShadowItems();
    expect(shadowItems.tools).toEqual([]);
    expect(shadowItems.prompts).toEqual([]);
    expect(shadowItems.resources).toEqual([]);
  });

  test('should update shadowItems via fluent API', async () => {
    const server = await createServerBuilder()
      .shadowItems({
        tools: ['browser_click', 'browser_type'],
        prompts: ['test-prompt'],
        resources: ['test://resource'],
      })
      .build();

    const shadowItems = server.getShadowItems();
    expect(shadowItems.tools).toContain('browser_click');
    expect(shadowItems.tools).toContain('browser_type');
    expect(shadowItems.prompts).toContain('test-prompt');
    expect(shadowItems.resources).toContain('test://resource');
  });
});