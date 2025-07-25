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
import { createEnhancedConnection } from '../src/enhancedConnection.js';
import { createServerBuilder, createTool, createResource, createPrompt } from '../src/serverBuilder.js';
import { contextFactory } from '../src/browserContextFactory.js';
import { resolveConfig } from '../src/config.js';

test.describe('Enhanced Connection Simple Tests', () => {

  test('should create enhanced connection with custom tools', async () => {
    const customTool = createTool(
      'test-tool',
      'A test tool for integration',
      z.object({
        message: z.string().describe('Message to process')
      }),
      async (params) => ({
        content: [{ type: 'text', text: `Processed: ${params.message}` }]
      })
    );

    const server = await createServerBuilder({
      config: {
        browser: { headless: true }
      }
    })
    .addTool(customTool)
    .build();

    const config = await resolveConfig({ browser: { headless: true } });
    const factory = contextFactory(config.browser);
    const connection = await createEnhancedConnection(config, factory, server);

    // Test that connection is created successfully
    expect(connection).toBeDefined();
    expect(connection.server).toBeDefined();
    expect(connection.context).toBeDefined();
    
    // Test that custom tools are accessible
    expect(server.getCustomTools()).toHaveLength(1);
    expect(server.getCustomTools()[0].name).toBe('test-tool');

    await connection.close();
  });

  test('should execute custom tool handlers correctly', async () => {
    const mathTool = createTool(
      'math-add',
      'Add two numbers',
      z.object({
        a: z.number().describe('First number'),
        b: z.number().describe('Second number')
      }),
      async (params) => ({
        content: [{ 
          type: 'text', 
          text: `${params.a} + ${params.b} = ${params.a + params.b}` 
        }]
      })
    );

    const server = await createServerBuilder({
      config: {
        browser: { headless: true }
      }
    })
    .addTool(mathTool)
    .build();

    const config = await resolveConfig({ browser: { headless: true } });
    const factory = contextFactory(config.browser);
    const connection = await createEnhancedConnection(config, factory, server);

    // Test tool handler directly
    const customTools = server.getCustomTools();
    expect(customTools).toHaveLength(1);
    
    const tool = customTools[0];
    const result = await tool.handler({ a: 5, b: 3 });
    
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('5 + 3 = 8');
    expect(result.isError).toBeFalsy();

    await connection.close();
  });

  test('should handle custom tool errors gracefully', async () => {
    const errorTool = createTool(
      'error-tool',
      'Tool that can throw errors',
      z.object({
        shouldError: z.boolean().describe('Whether to throw an error')
      }),
      async (params) => {
        if (params.shouldError) {
          throw new Error('Custom tool error');
        }
        return {
          content: [{ type: 'text', text: 'Success' }]
        };
      }
    );

    const server = await createServerBuilder({
      config: {
        browser: { headless: true }
      }
    })
    .addTool(errorTool)
    .build();

    const config = await resolveConfig({ browser: { headless: true } });
    const factory = contextFactory(config.browser);
    const connection = await createEnhancedConnection(config, factory, server);

    const tool = server.getCustomTools()[0];

    // Test success case
    const successResult = await tool.handler({ shouldError: false });
    expect(successResult.isError).toBeFalsy();
    expect(successResult.content[0].text).toBe('Success');

    // Test error case
    try {
      await tool.handler({ shouldError: true });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error.message).toBe('Custom tool error');
    }

    await connection.close();
  });

  test('should integrate custom resources', async () => {
    const dataResource = createResource(
      'data://test',
      'Test Data Resource',
      async () => ({
        contents: [{
          uri: 'data://test',
          mimeType: 'application/json',
          text: JSON.stringify({ message: 'Hello from resource!' })
        }]
      }),
      {
        description: 'A test data resource',
        mimeType: 'application/json'
      }
    );

    const server = await createServerBuilder({
      config: {
        browser: { headless: true }
      }
    })
    .addResource(dataResource)
    .build();

    const config = await resolveConfig({ browser: { headless: true } });
    const factory = contextFactory(config.browser);
    const connection = await createEnhancedConnection(config, factory, server);

    // Test resource integration
    const customResources = server.getCustomResources();
    expect(customResources).toHaveLength(1);
    expect(customResources[0].uri).toBe('data://test');
    expect(customResources[0].name).toBe('Test Data Resource');

    // Test resource handler directly
    const result = await customResources[0].handler();
    expect(result.contents).toBeDefined();
    expect(result.contents[0].uri).toBe('data://test');
    expect(result.contents[0].text).toBe('{"message":"Hello from resource!"}');

    await connection.close();
  });

  test('should integrate custom prompts', async () => {
    const greetingPrompt = createPrompt(
      'greeting',
      async (args) => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `Please greet ${args.name} in a ${args.style} manner.`
          }
        }]
      }),
      {
        description: 'Generate a greeting prompt',
        arguments: {
          name: z.string().describe('Name of person to greet'),
          style: z.enum(['formal', 'casual', 'friendly']).describe('Style of greeting')
        }
      }
    );

    const server = await createServerBuilder({
      config: {
        browser: { headless: true }
      }
    })
    .addPrompt(greetingPrompt)
    .build();

    const config = await resolveConfig({ browser: { headless: true } });
    const factory = contextFactory(config.browser);
    const connection = await createEnhancedConnection(config, factory, server);

    // Test prompt integration
    const customPrompts = server.getCustomPrompts();
    expect(customPrompts).toHaveLength(1);
    expect(customPrompts[0].name).toBe('greeting');

    // Test prompt handler directly
    const result = await customPrompts[0].handler({ name: 'Alice', style: 'friendly' });
    expect(result.messages).toBeDefined();
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.text).toBe('Please greet Alice in a friendly manner.');

    await connection.close();
  });

  test('should handle mixed custom components', async () => {
    // Create multiple custom components
    const tools = [
      createTool('tool1', 'Tool 1', z.object({ value: z.string() }), async (params) => ({ content: [{ type: 'text', text: params.value }] })),
      createTool('tool2', 'Tool 2', z.object({ number: z.number() }), async (params) => ({ content: [{ type: 'text', text: params.number.toString() }] }))
    ];

    const resources = [
      createResource('res://1', 'Resource 1', async () => ({ contents: [{ uri: 'res://1', text: 'content1' }] })),
      createResource('res://2', 'Resource 2', async () => ({ contents: [{ uri: 'res://2', text: 'content2' }] }))
    ];

    const prompts = [
      createPrompt('prompt1', async () => ({ messages: [{ role: 'user', content: { type: 'text', text: 'message1' } }] })),
      createPrompt('prompt2', async () => ({ messages: [{ role: 'user', content: { type: 'text', text: 'message2' } }] }))
    ];

    const server = await createServerBuilder({
      config: {
        browser: { headless: true },
        capabilities: ['vision', 'pdf']
      }
    })
    .addTools(tools)
    .addResources(resources)
    .addPrompts(prompts)
    .build();

    const config = await resolveConfig({ 
      browser: { headless: true },
      capabilities: ['vision', 'pdf']
    });
    const factory = contextFactory(config.browser);
    const connection = await createEnhancedConnection(config, factory, server);

    // Test that all components are integrated
    expect(server.getCustomTools()).toHaveLength(2);
    expect(server.getCustomResources()).toHaveLength(2);
    expect(server.getCustomPrompts()).toHaveLength(2);

    // Test individual components
    const tool1Result = await server.getCustomTools()[0].handler({ value: 'test' });
    expect(tool1Result.content[0].text).toBe('test');

    const resource1Result = await server.getCustomResources()[0].handler();
    expect(resource1Result.contents[0].text).toBe('content1');

    const prompt1Result = await server.getCustomPrompts()[0].handler({});
    expect(prompt1Result.messages[0].content.text).toBe('message1');

    await connection.close();
  });

  test('should validate component creation', async () => {
    const server = await createServerBuilder({
      config: {
        browser: { headless: true }
      }
    })
    .build();

    const config = await resolveConfig({ browser: { headless: true } });
    const factory = contextFactory(config.browser);
    const connection = await createEnhancedConnection(config, factory, server);

    // Test empty server
    expect(server.getCustomTools()).toHaveLength(0);
    expect(server.getCustomResources()).toHaveLength(0);
    expect(server.getCustomPrompts()).toHaveLength(0);

    await connection.close();
  });
});