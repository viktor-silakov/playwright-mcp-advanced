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

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import debug from 'debug';
import type { IncomingMessage } from 'http';
import type { WebSocket } from 'ws';

const debugLog = debug('pw:mcp:cdp-relay');

export interface CDPRelayOptions {
  port?: number;
  host?: string;
}

export interface CDPMessage {
  id?: number;
  method?: string;
  params?: any;
  sessionId?: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export interface ConnectionInfo {
  type: 'connection_info';
  sessionId: string;
  targetInfo?: any;
}

export class CDPRelay {
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private port: number;
  private host: string;
  private activeConnection: {
    socket: WebSocket;
    sessionId: string;
    targetInfo?: any;
  } | null = null;
  private pendingMessages: Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    sessionId?: string;
  }> = new Map();
  private nextMessageId = 1;

  constructor(options: CDPRelayOptions = {}) {
    this.port = options.port || 9223;
    this.host = options.host || 'localhost';

    this.server = createServer();
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/extension'
    });

    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      debugLog('New WebSocket connection from extension');

      // Only allow one connection at a time
      if (this.activeConnection) {
        debugLog('Closing existing connection');
        this.activeConnection.socket.close();
        this.activeConnection = null;
      }

      // Set up new connection
      this.activeConnection = {
        socket: ws,
        sessionId: '',
        targetInfo: null
      };

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleExtensionMessage(message);
        } catch (error) {
          debugLog('Error parsing message from extension:', error);
        }
      });

      ws.on('close', () => {
        debugLog('Extension WebSocket connection closed');
        if (this.activeConnection && this.activeConnection.socket === ws) {
          this.activeConnection = null;
        }
        // Reject all pending messages
        this.pendingMessages.forEach(({ reject }) => {
          reject(new Error('Connection closed'));
        });
        this.pendingMessages.clear();
      });

      ws.on('error', (error) => {
        debugLog('Extension WebSocket error:', error);
      });
    });
  }

  private handleExtensionMessage(message: CDPMessage | ConnectionInfo) {
    if ('type' in message && message.type === 'connection_info') {
      // Connection info message
      debugLog('Received connection info:', message);
      if (this.activeConnection) {
        this.activeConnection.sessionId = message.sessionId;
        this.activeConnection.targetInfo = message.targetInfo;
      }
      return;
    }

    // CDP response message
    const cdpMessage = message as CDPMessage;
    
    if (cdpMessage.id && this.pendingMessages.has(cdpMessage.id)) {
      const pending = this.pendingMessages.get(cdpMessage.id)!;
      this.pendingMessages.delete(cdpMessage.id);

      if (cdpMessage.error) {
        pending.reject(new Error(cdpMessage.error.message));
      } else {
        pending.resolve(cdpMessage.result);
      }
    } else if (cdpMessage.method) {
      // This is an event from the browser
      debugLog('Received CDP event:', cdpMessage.method);
      // Events are handled by the browser context, no need to forward
    }
  }

  /**
   * Send a CDP command to the connected browser tab
   */
  async sendCommand(method: string, params?: any, sessionId?: string): Promise<any> {
    if (!this.activeConnection) {
      throw new Error('No active connection to browser tab');
    }

    const id = this.nextMessageId++;
    const message: CDPMessage = {
      id,
      method,
      params,
      sessionId: sessionId || this.activeConnection.sessionId
    };

    return new Promise((resolve, reject) => {
      this.pendingMessages.set(id, { resolve, reject, sessionId });
      
      this.activeConnection!.socket.send(JSON.stringify(message));
      
      // Set timeout for command
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error('Command timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Get the target info for the connected tab
   */
  getTargetInfo(): any {
    return this.activeConnection?.targetInfo;
  }

  /**
   * Check if there's an active connection
   */
  isConnected(): boolean {
    return this.activeConnection !== null;
  }

  /**
   * Get the session ID of the connected tab
   */
  getSessionId(): string | undefined {
    return this.activeConnection?.sessionId;
  }

  /**
   * Start the CDP relay server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        debugLog(`CDP relay server listening on ws://${this.host}:${this.port}/extension`);
        resolve();
      });

      this.server.on('error', (error) => {
        debugLog('CDP relay server error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the CDP relay server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.activeConnection) {
        this.activeConnection.socket.close();
        this.activeConnection = null;
      }

      this.wss.close(() => {
        this.server.close(() => {
          debugLog('CDP relay server stopped');
          resolve();
        });
      });
    });
  }

  /**
   * Get the server URL for the extension
   */
  getServerUrl(): string {
    return `ws://${this.host}:${this.port}/extension`;
  }
}