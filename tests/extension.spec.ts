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
import url from 'url';
import path from 'path';
import { spawnSync } from 'child_process';

// Extension mode only works with Chrome/Chromium
test.describe('Extension Mode Tests', () => {
  // Запускаем тесты только для Chrome
  test.skip(({ browserName }) => browserName !== 'chromium', 'Extension mode tests are only supported in Chrome/Chromium');
  test.use({ mcpBrowser: 'chromium' });

test('extension mode - CDP relay server starts', async ({ startClient }) => {
    // Используем случайный порт, чтобы избежать конфликтов
    const randomPort = 19000 + Math.floor(Math.random() * 1000);
    const { client, stderr } = await startClient({ args: ['--extension', `--port=${randomPort}`] });
  
  // Wait a bit for the server to start and log messages
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const stderrOutput = stderr();
  
  // Verify that CDP relay server started
  expect(stderrOutput).toContain('CDP relay server started');
  expect(stderrOutput).toContain('Extension URL: ws://');
    expect(stderrOutput).toContain('Connect your Chrome extension to the Extension URL to start sharing tabs');
  
  // Verify that the tools are available
  const result = await client.listTools();
  expect(result.tools).toBeDefined();
  expect(result.tools.length).toBeGreaterThan(0);
  
  // Should have basic browser tools available
  const toolNames = result.tools.map(tool => tool.name);
  expect(toolNames).toContain('browser_navigate');
  expect(toolNames).toContain('browser_click');
    expect(toolNames).toContain('browser_snapshot');
});

test('extension mode - capabilities work', async ({ startClient }) => {
    // Используем случайный порт, чтобы избежать конфликтов
    const randomPort = 19000 + Math.floor(Math.random() * 1000);
    const { client } = await startClient({ args: ['--extension', `--port=${randomPort}`] });
  
  // Test capabilities call by listing available tools
  const result = await client.listTools();
  expect(result.tools).toBeDefined();
  expect(result.tools.length).toBeGreaterThan(0);
});

test('extension mode - error handling for no connection', async ({ startClient }) => {
    // Используем случайный порт, чтобы избежать конфликтов
    const randomPort = 19000 + Math.floor(Math.random() * 1000);
    const { client } = await startClient({ args: ['--extension', `--port=${randomPort}`] });
  
  // Test basic functionality - should work even without extension connection
  const tools = await client.listTools();
  expect(tools.tools).toBeDefined();
  expect(tools.tools.length).toBeGreaterThan(0);
  
  // In extension mode, tools are available but browser operations will fail
  // This is expected behavior
});

  test('extension mode - server configuration', async ({ startClient }) => {
    // Используем случайный порт, чтобы избежать конфликтов
    const randomPort = 19000 + Math.floor(Math.random() * 1000);
    const { client, stderr } = await startClient({ args: ['--extension', `--port=${randomPort}`] });
  
  // Wait a bit for the server to start and log messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify server is listening on correct port
  const stderrOutput = stderr();
  expect(stderrOutput).toContain('localhost');
  
  // Verify extension mode is enabled in logs
  expect(stderrOutput).toContain('CDP relay server');
});

test('extension mode - tool schemas are valid', async ({ startClient }) => {
    const { client } = await startClient({ args: ['--extension', '--port=9228'] });
  
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
    const { client } = await startClient({ args: ['--extension', '--port=9229'] });
  
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

  // NOTE: Can be removed when we drop Node.js 18 support and changed to import.meta.filename.
  const __filename = url.fileURLToPath(import.meta.url);

  test('extension mode validation - only supports chromium', async () => {
    const result = spawnSync('node', [
      path.join(__filename, '../../dist/cli.js'), '--extension', '--browser=firefox', '--port=9230'
    ]);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Extension mode is only supported for Chromium browsers.');
  });

  test('extension mode validation - does not support device emulation', async () => {
    const result = spawnSync('node', [
      path.join(__filename, '../../dist/cli.js'), '--extension', '--device=Pixel 5', '--port=9231'
    ]);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Device emulation is not supported with extension mode.');
  });

  test('extension mode validation - requires port for HTTP server', async () => {
    const result = spawnSync('node', [
      path.join(__filename, '../../dist/cli.js'), '--extension'
    ]);
    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0); // Process should exit with non-zero code
    expect(result.stderr.toString()).toContain('Extension mode requires HTTP server, but no port was specified');
  });

}); // End of Extension Mode Tests describe block