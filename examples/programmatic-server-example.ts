#!/usr/bin/env tsx
/**
 * Programmatic MCP Server Example with shadowItems
 * 
 * Usage:
 * - STDIO: npx tsx examples/programmatic-server-example.ts
 * - HTTP: PORT=3000 npx tsx examples/programmatic-server-example.ts
 */

import { createServerBuilder, createTool, createResource, createPrompt } from '../src/serverBuilder.js';
import { startHttpServer, startHttpTransport, startStdioTransport } from '../src/transport.js';
import { z } from 'zod';

// Simple calculator tool
const calculatorTool = createTool(
  'calculate',
  'Perform mathematical calculations',
  z.object({
    expression: z.string().describe('Math expression (e.g., "2+3*4")'),
  }),
  async (params) => {
    try {
      const sanitized = params.expression.replace(/[^0-9+\-*/().\s]/g, '');
      if (sanitized !== params.expression) throw new Error('Invalid chars');
      const result = Function('"use strict"; return (' + sanitized + ')')();
      return { content: [{ type: 'text', text: `${params.expression} = ${result}` }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${error}` }], isError: true };
    }
  },
  { title: 'Calculator', capability: 'math', type: 'readOnly' }
);

// Enhanced navigation tool (shadows browser_navigate)
const enhancedNavigateTool = createTool(
  'browser_navigate',
  'Enhanced navigation with performance tracking',
  z.object({
    url: z.string().describe('URL to navigate to'),
    trackPerformance: z.boolean().default(true).describe('Track performance'),
  }),
  async (params) => {
    const startTime = Date.now();
    console.log(`🚀 Enhanced navigate to: ${params.url}`);
    
    const duration = Date.now() - startTime;
    return {
      content: [{
        type: 'text',
        text: `✅ Enhanced Navigation Complete!\nURL: ${params.url}\nDuration: ${duration}ms`
      }]
    };
  },
  { title: 'Enhanced Navigation', capability: 'core', type: 'destructive' }
);

// System info resource
const systemInfoResource = createResource(
  'system://info',
  'System Information',
  async () => ({
    contents: [{
      uri: 'system://info',
      mimeType: 'application/json',
      text: JSON.stringify({
        platform: process.platform,
        nodeVersion: process.version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      }, null, 2)
    }]
  }),
  { description: 'Current system info', mimeType: 'application/json' }
);

// Code review prompt
const codeReviewPrompt = createPrompt(
  'code-review',
  async (args) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Review this ${args.language || 'code'}:\n\n\`\`\`\n${args.code}\n\`\`\`\n\nProvide feedback on quality, bugs, and improvements.`
      }
    }]
  }),
  {
    description: 'Generate code review prompts',
    arguments: {
      code: z.string().describe('Code to review'),
      language: z.string().optional().describe('Programming language'),
    }
  }
);

async function main() {
  try {
    console.error('🔧 Building enhanced Playwright MCP server...');
    
    const server = await createServerBuilder({
      config: {
        browser: { headless: false },
        capabilities: ['vision', 'pdf']
      },
      shadowItems: {
        tools: ['browser_navigate', 'browser_navigate_back', 'browser_navigate_forward'],
        prompts: [],
        resources: [],
      }
    })
    .addTools([calculatorTool, enhancedNavigateTool])
    .addResources([systemInfoResource])
    .addPrompts([codeReviewPrompt])
    .build();

    server.setupExitWatchdog();

    const port = process.env.PORT ? parseInt(process.env.PORT) : 3232;
    
    if (port) {
      console.error('🌐 Starting HTTP server mode...');
      const httpServer = await startHttpServer({ port });
      startHttpTransport(httpServer, server);
      
      console.error(`🚀 Server running on http://localhost:${port}`);
      console.error('📋 Custom tools: calculate');
      console.error('🔄 Enhanced tools: browser_navigate (with performance tracking)');
      console.error('📁 Resources: system://info');
      console.error('💬 Prompts: code-review');
      console.error('⚠️  Note: Enhanced tools override standard ones via shadowItems');
      console.error(`🧪 Test: curl -X POST http://localhost:${port}/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`);
    } else {
      console.error('📡 Starting STDIO mode...');
      await startStdioTransport(server);
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});