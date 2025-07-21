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

import http from 'node:http';
import assert from 'node:assert';
import crypto from 'node:crypto';

import debug from 'debug';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { AddressInfo } from 'node:net';
import type { Server } from './server.js';
import { logger } from './logger.js';

export async function startStdioTransport(server: Server) {
  logger.log('🚀🚀🚀 Starting MCP STDIO Transport');
  
  // Create a custom StdioServerTransport with logging
  const transport = new StdioServerTransport();
  
  // Monkey patch the transport to log messages
  const originalSend = transport.send;
  transport.send = function(message: any) {
    logger.log('💬💬💬 Agent STDIO Message:', JSON.stringify(message, null, 2));
    return originalSend.call(this, message);
  };
  
  // Monkey patch the handleMessage method to log incoming messages
  const originalHandleMessage = (transport as any).handleMessage;
  if (originalHandleMessage) {
    (transport as any).handleMessage = function(message: string) {
      try {
        const parsedMessage = JSON.parse(message);
        logger.log('💬💬💬 Incoming Agent STDIO Message:', JSON.stringify(parsedMessage, null, 2));
        
        // Log specific message types with different emojis
        if (parsedMessage.type === 'request') {
          logger.log(`🔄 Agent Request (${parsedMessage.id}):`);
          if (parsedMessage.params?.name) {
            logger.log(`🛠️ Tool: ${parsedMessage.params.name}`);
          }
          if (parsedMessage.params?.arguments) {
            logger.log(`📝 Arguments: ${JSON.stringify(parsedMessage.params.arguments, null, 2)}`);
          }
        }
      } catch (error) {
        logger.error('❌ Error parsing STDIO message:', error);
      }
      
      return originalHandleMessage.call(this, message);
    };
  }
  
  await server.createConnection(transport);
  logger.log('🔌 STDIO Transport connected');
}

const testDebug = debug('pw:mcp:test');

async function handleSSE(server: Server, req: http.IncomingMessage, res: http.ServerResponse, url: URL, sessions: Map<string, SSEServerTransport>) {
  if (req.method === 'POST') {
    const sessionId = url.searchParams.get('sessionId');
    if (!sessionId) {
      res.statusCode = 400;
      return res.end('Missing sessionId');
    }

    const transport = sessions.get(sessionId);
    if (!transport) {
      res.statusCode = 404;
      return res.end('Session not found');
    }

    // Log incoming message from agent
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        logger.log('💬💬💬 Agent SSE Message:', JSON.stringify(message, null, 2));
        
        // Log specific message types with different emojis
        if (message.type === 'request') {
          logger.log(`🔄 Agent Request (${message.id}):`);
          if (message.params?.name) {
            logger.log(`🛠️ Tool: ${message.params.name}`);
          }
          if (message.params?.arguments) {
            logger.log(`📝 Arguments: ${JSON.stringify(message.params.arguments, null, 2)}`);
          }
        }
      } catch (error) {
        logger.error('❌ Error parsing SSE message:', error);
      }
    });

    return await transport.handlePostMessage(req, res);
  } else if (req.method === 'GET') {
    const transport = new SSEServerTransport('/sse', res);
    sessions.set(transport.sessionId, transport);
    testDebug(`create SSE session: ${transport.sessionId}`);
    logger.log(`💬💬💬 New Agent SSE Session: ${transport.sessionId}`);
    
    const connection = await server.createConnection(transport);
    res.on('close', () => {
      testDebug(`delete SSE session: ${transport.sessionId}`);
      logger.log(`💬💬💬 Agent SSE Session Closed: ${transport.sessionId}`);
      sessions.delete(transport.sessionId);
      // eslint-disable-next-line no-console
      void connection.close().catch(e => console.error(e));
    });
    return;
  }

  res.statusCode = 405;
  res.end('Method not allowed');
}

async function handleStreamable(server: Server, req: http.IncomingMessage, res: http.ServerResponse, sessions: Map<string, StreamableHTTPServerTransport>) {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  
  // Log incoming HTTP request
  logger.log(`💬💬💬 Agent HTTP Request: ${req.method} ${req.url}`);
  if (sessionId) {
    logger.log(`🔗 Session ID: ${sessionId}`);
  }
  
  // Log request headers
  logger.log(`🔤 Headers: ${JSON.stringify(req.headers, null, 2)}`);
  
  // Skip detailed request body logging to avoid interfering with stream processing
  
  if (sessionId) {
    const transport = sessions.get(sessionId);
    if (!transport) {
      res.statusCode = 404;
      res.end('Session not found');
      return;
    }
    return await transport.handleRequest(req, res);
  }

  if (req.method === 'POST') {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: sessionId => {
        sessions.set(sessionId, transport);
        logger.log(`💬💬💬 New Agent HTTP Session: ${sessionId}`);
      }
    });
    transport.onclose = () => {
      if (transport.sessionId) {
        logger.log(`💬💬💬 Agent HTTP Session Closed: ${transport.sessionId}`);
        sessions.delete(transport.sessionId);
      }
    };
    await server.createConnection(transport);
    await transport.handleRequest(req, res);
    return;
  }

  res.statusCode = 400;
  res.end('Invalid request');
}

export async function startHttpServer(config: { host?: string, port?: number }): Promise<http.Server> {
  const { host, port } = config;
  const httpServer = http.createServer();
  await new Promise<void>((resolve, reject) => {
    httpServer.on('error', reject);
    httpServer.listen(port, host, () => {
      resolve();
      httpServer.removeListener('error', reject);
    });
  });
  return httpServer;
}

export function startHttpTransport(httpServer: http.Server, mcpServer: Server) {
  const sseSessions = new Map<string, SSEServerTransport>();
  const streamableSessions = new Map<string, StreamableHTTPServerTransport>();
  
  // Log server start with emoji
  logger.log('🚀🚀🚀 Starting MCP HTTP Server');
  
  httpServer.on('request', async (req, res) => {
    const url = new URL(`http://localhost${req.url}`);
    // logger.log(`💬💬💬 Incoming request: ${req.method} ${url.pathname}`);
    
    if (url.pathname.startsWith('/mcp')) {
      // logger.log('🔌 Handling streamable HTTP request');
      await handleStreamable(mcpServer, req, res, streamableSessions);
    } else {
      // logger.log('📡 Handling SSE request');
      await handleSSE(mcpServer, req, res, url, sseSessions);
    }
  });
  
  const url = httpAddressToString(httpServer.address());
  const message = [
    `Listening on ${url}`,
    'Put this in your client config:',
    JSON.stringify({
      'mcpServers': {
        'playwright': {
          'url': `${url}/sse`
        }
      }
    }, undefined, 2),
    'If your client supports streamable HTTP, you can use the /mcp endpoint instead.',
  ].join('\n');
  
  // Log server info with emoji
  logger.log('🌐🌐🌐 MCP Server Info:');
  logger.log(`🔗 Server URL: ${url}`);
  logger.log(`📡 SSE Endpoint: ${url}/sse`);
  logger.log(`🔌 Streamable HTTP Endpoint: ${url}/mcp`);
  
  // eslint-disable-next-line no-console
  console.error(message);
}

export function httpAddressToString(address: string | AddressInfo | null): string {
  assert(address, 'Could not bind server socket');
  if (typeof address === 'string')
    return address;
  const resolvedPort = address.port;
  let resolvedHost = address.family === 'IPv4' ? address.address : `[${address.address}]`;
  if (resolvedHost === '0.0.0.0' || resolvedHost === '[::]')
    resolvedHost = 'localhost';
  return `http://${resolvedHost}:${resolvedPort}`;
}
