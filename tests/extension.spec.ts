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

import { expect, test } from './fixtures.js';

test('extension mode - CDP relay server starts', async ({ startClient }) => {
  const { client, stderr } = await startClient({ args: ['--extension'] });
  
  // Wait a bit for the server to start and log messages
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const stderrOutput = stderr();
  
  // Verify that CDP relay server started
  expect(stderrOutput).toContain('CDP relay server started');
  expect(stderrOutput).toContain('Extension URL: ws://');
  expect(stderrOutput).toContain('Connect your Chrome extension to this URL to start sharing tabs');
  
  // Verify that the tools are available
  const result = await client.listTools();
  expect(result.tools).toBeDefined();
  expect(result.tools.length).toBeGreaterThan(0);
  
  // Should have basic browser tools available
  const toolNames = result.tools.map(tool => tool.name);
  expect(toolNames).toContain('browser_navigate');
  expect(toolNames).toContain('browser_click');
  expect(toolNames).toContain('browser_take_screenshot');
});

test('extension mode - capabilities work', async ({ startClient }) => {
  const { client } = await startClient({ args: ['--extension'] });
  
  // Test capabilities call by listing available tools
  const result = await client.listTools();
  expect(result.tools).toBeDefined();
  expect(result.tools.length).toBeGreaterThan(0);
});

test('extension mode - error handling for no connection', async ({ startClient }) => {
  const { client } = await startClient({ args: ['--extension'] });
  
  // Test basic functionality - should work even without extension connection
  const tools = await client.listTools();
  expect(tools.tools).toBeDefined();
  expect(tools.tools.length).toBeGreaterThan(0);
  
  // In extension mode, tools are available but browser operations will fail
  // This is expected behavior
});

test('extension mode - server configuration', async ({ startClient }, testInfo) => {
  // WebKit is slower to start, so increase timeout
  if (testInfo.project.name === 'webkit') {
    test.slow();
  }
  
  const { client, stderr } = await startClient({ args: ['--extension'] });
  
  // Wait a bit for the server to start and log messages
  // WebKit needs more time to start up
  const waitTime = testInfo.project.name === 'webkit' ? 2000 : 1000;
  await new Promise(resolve => setTimeout(resolve, waitTime));
  
  // Verify server is listening on correct port
  const stderrOutput = stderr();
  expect(stderrOutput).toContain('localhost');
  
  // Verify extension mode is enabled in logs
  expect(stderrOutput).toContain('CDP relay server');
});

test('extension mode - tool schemas are valid', async ({ startClient }) => {
  const { client } = await startClient({ args: ['--extension'] });
  
  const result = await client.listTools();
  
  // Check that all tools have proper schemas
  for (const tool of result.tools) {
    expect(tool.name).toBeDefined();
    expect(tool.description).toBeDefined();
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.type).toBe('object');
    
    // Verify the schema has the expected structure
    if (tool.inputSchema.properties) {
      expect(typeof tool.inputSchema.properties).toBe('object');
    }
  }
});

test('extension mode - compatible with existing tools', async ({ startClient }) => {
  const { client } = await startClient({ args: ['--extension'] });
  
  // Test that we can still get tool lists and schemas
  const tools = await client.listTools();
  expect(tools.tools).toBeDefined();
  
  // Test that basic MCP protocol works
  const ping = await client.ping();
  expect(ping).toBeDefined();
  
  // Test that we can list tools
  const result = await client.listTools();
  expect(result.tools).toBeDefined();
  expect(result.tools.length).toBeGreaterThan(0);
});