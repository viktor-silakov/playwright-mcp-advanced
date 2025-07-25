#!/usr/bin/env tsx
/**
 * Simple example of creating a custom Playwright MCP server
 * 
 * Run with:
 * tsx examples/simple-custom-server.ts
 * 
 * Or with HTTP server:
 * PORT=3000 tsx examples/simple-custom-server.ts
 */

import { createServerBuilder, createTool, createResource } from '../src/index.js';
import { startHttpServer, startHttpTransport, startStdioTransport } from '../src/transport.js';
import { z } from 'zod';

// Simple calculator tool
const calculator = createTool(
  'simple-calc',
  'Simple calculator for basic math operations',
  z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
  async (params) => {
    let result: number;
    
    switch (params.operation) {
      case 'add':
        result = params.a + params.b;
        break;
      case 'subtract':
        result = params.a - params.b;
        break;
      case 'multiply':
        result = params.a * params.b;
        break;
      case 'divide':
        if (params.b === 0) {
          return {
            content: [{ type: 'text', text: 'Error: Division by zero' }],
            isError: true
          };
        }
        result = params.a / params.b;
        break;
    }
    
    return {
      content: [{
        type: 'text',
        text: `${params.a} ${params.operation} ${params.b} = ${result}`
      }]
    };
  },
  {
    capability: 'math',
    type: 'readOnly'
  }
);

// Server info resource
const serverInfo = createResource(
  'server://info',
  'Server Information',
  async () => ({
    contents: [{
      uri: 'server://info',
      mimeType: 'application/json',
      text: JSON.stringify({
        name: 'Custom Playwright MCP Server',
        version: '1.0.0',
        capabilities: ['browser automation', 'custom tools'],
        customTools: ['simple-calc'],
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }, null, 2)
    }]
  }),
  {
    description: 'Information about this custom server',
    mimeType: 'application/json'
  }
);

async function main() {
  console.error('🚀 Starting custom Playwright MCP server...');
  
  // Create enhanced server
  const server = await createServerBuilder({
    config: {
      browser: {
        headless: true
      }
    }
  })
  .addTool(calculator)
  .addResource(serverInfo)
  .build();

  server.setupExitWatchdog();

  const port = process.env.PORT ? parseInt(process.env.PORT) : undefined;
  
  if (port) {
    // HTTP mode
    const httpServer = await startHttpServer({ port, host: 'localhost' });
    startHttpTransport(httpServer, server);
    
    console.error(`✅ Server running on http://localhost:${port}`);
    console.error('📋 Custom tools available:');
    console.error('  - simple-calc: Basic math operations');
    console.error('📁 Custom resources available:');
    console.error('  - server://info: Server information');
    console.error('');
    console.error('✨ Plus all standard Playwright tools!');
  } else {
    // STDIO mode
    console.error('✅ Server running in STDIO mode');
    console.error('📋 Custom tools: simple-calc');
    console.error('📁 Custom resources: server://info');
    await startStdioTransport(server);
  }
}

main().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});