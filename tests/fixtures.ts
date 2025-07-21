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

import fs from 'fs';
import url from 'url';
import path from 'path';
import { chromium } from 'playwright';

import { test as baseTest, expect as baseExpect } from '@playwright/test';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { TestServer } from './testserver/index.ts';

import type { Config } from '../src/types/config.js';
import type { BrowserContext } from 'playwright';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { Stream } from 'stream';

export type TestOptions = {
  mcpBrowser: string | undefined;
  mcpMode: 'docker' | 'extension' | undefined;
};

type CDPServer = {
  endpoint: string;
  start: () => Promise<BrowserContext>;
};

type TestFixtures = {
  client: Client;
  visionClient: Client;
  startClient: (options?: { clientName?: string, args?: string[], config?: Config }) => Promise<{ client: Client, stderr: () => string }>;
  wsEndpoint: string;
  cdpServer: CDPServer;
  server: TestServer;
  httpsServer: TestServer;
  mcpHeadless: boolean;
};

type WorkerFixtures = {
  _workerServers: { server: TestServer, httpsServer: TestServer };
};

export const test = baseTest.extend<TestFixtures & TestOptions, WorkerFixtures>({

  client: async ({ startClient }, use) => {
    const { client } = await startClient();
    await use(client);
  },

  visionClient: async ({ startClient }, use) => {
    const { client } = await startClient({ args: ['--caps=vision'] });
    await use(client);
  },

  startClient: async ({ mcpHeadless, mcpBrowser, mcpMode }, use, testInfo) => {
    const userDataDir = mcpMode !== 'docker' ? testInfo.outputPath('user-data-dir') : undefined;
    const configDir = path.dirname(test.info().config.configFile!);
    let client: Client | undefined;

    await use(async options => {
      const args: string[] = [];
      if (userDataDir)
        args.push('--user-data-dir', userDataDir);
      if (process.env.CI && process.platform === 'linux')
        args.push('--no-sandbox');
      if (mcpHeadless)
        args.push('--headless');
      if (mcpBrowser)
        args.push(`--browser=${mcpBrowser}`);
      if (mcpMode === 'extension') {
        args.push('--extension');
      }
      if (options?.args)
        args.push(...options.args);
      
      // Auto-add vision capabilities for extension mode (both mcpMode and manual --extension)
      const isExtensionMode = mcpMode === 'extension' || options?.args?.includes('--extension');
      const hasExistingCaps = options?.args?.some(arg => arg.startsWith('--caps'));
      if (isExtensionMode && !hasExistingCaps) {
        args.push('--caps=vision');
      }
      if (options?.config) {
        const configFile = testInfo.outputPath('config.json');
        await fs.promises.writeFile(configFile, JSON.stringify(options.config, null, 2));
        args.push(`--config=${path.relative(configDir, configFile)}`);
      }

      client = new Client({ name: options?.clientName ?? 'test', version: '1.0.0' });
      const { transport, stderr } = await createTransport(args, mcpMode);
      let stderrBuffer = '';
      stderr?.on('data', data => {
        if (process.env.PWMCP_DEBUG)
          process.stderr.write(data);
        stderrBuffer += data.toString();
      });
      await client.connect(transport);
      await client.ping();
      return { client, stderr: () => stderrBuffer };
    });

    await client?.close();
  },

  wsEndpoint: async ({ }, use) => {
    const browserServer = await chromium.launchServer();
    await use(browserServer.wsEndpoint());
    await browserServer.close();
  },

  cdpServer: async ({ mcpBrowser }, use, testInfo) => {
    test.skip(!['chrome', 'msedge', 'chromium'].includes(mcpBrowser!), 'CDP is not supported for non-Chromium browsers');

    let browserContext: BrowserContext | undefined;
    const port = 3200 + test.info().parallelIndex;
    await use({
      endpoint: `http://localhost:${port}`,
      start: async () => {
        browserContext = await chromium.launchPersistentContext(testInfo.outputPath('cdp-user-data-dir'), {
          channel: mcpBrowser,
          headless: true,
          args: [
            `--remote-debugging-port=${port}`,
          ],
        });
        return browserContext;
      }
    });
    await browserContext?.close();
  },

  mcpHeadless: async ({ headless }, use) => {
    await use(headless);
  },

  mcpBrowser: ['chrome', { option: true }],

  mcpMode: [undefined, { option: true }],

  _workerServers: [async ({ }, use, workerInfo) => {
    // Generate browser-specific port offset to avoid conflicts between browser projects
    const projectName = workerInfo.project.name;
    const browserOffset = projectName === 'firefox' ? 1000 : projectName === 'webkit' ? 2000 : 0;
    const port = 8907 + browserOffset + workerInfo.workerIndex * 4;
    const server = await TestServer.create(port);

    const httpsPort = port + 1;
    const httpsServer = await TestServer.createHTTPS(httpsPort);

    await use({ server, httpsServer });

    await Promise.all([
      server.stop(),
      httpsServer.stop(),
    ]);
  }, { scope: 'worker' }],

  server: async ({ _workerServers }, use) => {
    _workerServers.server.reset();
    await use(_workerServers.server);
  },

  httpsServer: async ({ _workerServers }, use) => {
    _workerServers.httpsServer.reset();
    await use(_workerServers.httpsServer);
  },
});

async function createTransport(args: string[], mcpMode: TestOptions['mcpMode']): Promise<{
  transport: Transport,
  stderr: Stream | null,
}> {
  // NOTE: Can be removed when we drop Node.js 18 support and changed to import.meta.filename.
  const __filename = url.fileURLToPath(import.meta.url);
  if (mcpMode === 'docker') {
    const dockerArgs = ['run', '--rm', '-i', '--network=host', '-v', `${test.info().project.outputDir}:/app/test-results`];
    const transport = new StdioClientTransport({
      command: 'docker',
      args: [...dockerArgs, 'playwright-mcp-dev:latest', ...args],
    });
    return {
      transport,
      stderr: transport.stderr,
    };
  }

  // Check if extension mode is being used
  const isExtensionMode = args.includes('--extension');
  
  if (isExtensionMode) {
    // For extension mode, we need to start the server as a separate process
    // and use HTTP transport to connect to it
    const { spawn } = await import('child_process');
    
    // Use unique port for each test
    let port = '9223';
    const portIndex = args.indexOf('--port');
    if (portIndex >= 0) {
      port = args[portIndex + 1];
    } else {
      // Generate unique port using timestamp + parallel index + random component
      const timestamp = Date.now() % 10000;
      const parallelIndex = test.info().parallelIndex;
      const randomComponent = Math.floor(Math.random() * 100);
      port = (9223 + timestamp + parallelIndex + randomComponent).toString();
      args.push('--port', port);
    }
    
    let stderrOutput = '';
    
    const serverProcess = spawn('node', [path.join(path.dirname(__filename), '../dist/cli.js'), ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(path.dirname(__filename), '..'),
      env: {
        ...process.env,
        DEBUG: 'pw:mcp:test',
        DEBUG_COLORS: '0',
        DEBUG_HIDE_DATE: '1',
      },
    });

    // Wait for server to start
    await new Promise((resolve, reject) => {
      let timeout: NodeJS.Timeout;
      let httpServerStarted = false;
      let cdpServerStarted = false;
      
      const checkReady = (data: Buffer) => {
        const output = data.toString();
        stderrOutput += output;
        if (process.env.PWMCP_DEBUG)
          console.log('Extension server output:', output);
        
        if (output.includes('Listening on http://localhost:')) {
          httpServerStarted = true;
        }
        if (output.includes('CDP relay server started')) {
          cdpServerStarted = true;
        }
        
        // Both servers need to be ready for extension mode
        if (httpServerStarted && cdpServerStarted) {
          clearTimeout(timeout);
          serverProcess.stderr?.off('data', checkReady);
          resolve(null);
        }
      };
      
      serverProcess.stderr?.on('data', checkReady);
      timeout = setTimeout(() => {
        serverProcess.stderr?.off('data', checkReady);
        reject(new Error(`Server did not start within timeout. HTTP: ${httpServerStarted}, CDP: ${cdpServerStarted}. Output: ${stderrOutput}`));
      }, 10000); // Increased timeout to 10 seconds
    });
    
    // Use HTTP transport instead of stdio
    const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');
    const transport = new SSEClientTransport(new URL(`http://localhost:${port}/sse`));
    
    // Create a mock stderr stream that stores the output
    const mockStderr = {
      on: (event: string, callback: (data: Buffer) => void) => {
        if (event === 'data') {
          // No-op for extension mode since we already captured the output
        }
        return mockStderr;
      },
      off: () => mockStderr,
      toString: () => stderrOutput,
    };
    
    // Ensure cleanup of the server process
    const originalClose = transport.close;
    transport.close = async () => {
      if (serverProcess && !serverProcess.killed) {
        serverProcess.kill();
      }
      return originalClose.call(transport);
    };
    
    return {
      transport,
      stderr: {
        on: (event: string, callback: (data: Buffer) => void) => {
          if (event === 'data') {
            // Immediately call the callback with the captured output
            callback(Buffer.from(stderrOutput));
          }
          return mockStderr;
        },
        off: () => mockStderr,
        toString: () => stderrOutput,
      },
    };
  }

  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(path.dirname(__filename), '../dist/cli.js'), ...args],
    cwd: path.join(path.dirname(__filename), '..'),
    stderr: 'pipe',
    env: {
      ...process.env,
      DEBUG: 'pw:mcp:test',
      DEBUG_COLORS: '0',
      DEBUG_HIDE_DATE: '1',
    },
  });
  return {
    transport,
    stderr: transport.stderr!,
  };
}

type Response = Awaited<ReturnType<Client['callTool']>>;

export const expect = baseExpect.extend({
  toHaveTextContent(response: Response, content: string | RegExp) {
    const isNot = this.isNot;
    try {
      const text = (response.content as any)[0].text;
      if (typeof content === 'string') {
        if (isNot)
          baseExpect(text.trim()).not.toBe(content.trim());
        else
          baseExpect(text.trim()).toBe(content.trim());
      } else {
        if (isNot)
          baseExpect(text).not.toMatch(content);
        else
          baseExpect(text).toMatch(content);
      }
    } catch (e) {
      return {
        pass: isNot,
        message: () => e.message,
      };
    }
    return {
      pass: !isNot,
      message: () => ``,
    };
  },

  toContainTextContent(response: Response, content: string) {
    const isNot = this.isNot;
    try {
      const texts = (response.content as any).map(c => c.text).join('\n');
      if (isNot)
        expect(texts).not.toContain(content);
      else
        expect(texts).toContain(content);
    } catch (e) {
      return {
        pass: isNot,
        message: () => e.message,
      };
    }
    return {
      pass: !isNot,
      message: () => ``,
    };
  },
});

export function formatOutput(output: string): string[] {
  return output.split('\n').map(line => line.replace(/^pw:mcp:test /, '').replace(/user data dir.*/, 'user data dir').trim()).filter(Boolean);
}
