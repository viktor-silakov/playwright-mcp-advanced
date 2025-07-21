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
import { WebSocket } from 'ws';
import { logger } from './logger.js';

const debugLog = debug('pw:mcp:cdp-relay');

export interface CDPRelayOptions {
  port?: number;
  host?: string;
  server?: ReturnType<typeof createServer>;
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
  private ownsServer: boolean;
  private activeConnection: {
    socket: WebSocket;
    sessionId: string;
    targetInfo?: any;
  } | null = null;
  private playwrightSocket: WebSocket | null = null;
  private pendingMessages: Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    sessionId?: string;
    originalMethod?: string;
    originalParams?: any;
  }> = new Map();
  private nextMessageId = 1;

  constructor(options: CDPRelayOptions = {}) {
    this.port = options.port || 9223;
    this.host = options.host || 'localhost';
    this.ownsServer = !options.server;

    this.server = options.server || createServer();
    this.wss = new WebSocketServer({ 
      server: this.server
    });

    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      const url = new URL(`http://localhost${request.url}`);
      debugLog(`New WebSocket connection to ${url.pathname}`);

      if (url.pathname === '/extension') {
        this._handleExtensionConnection(ws);
      } else if (url.pathname === '/cdp') {
        this._handlePlaywrightConnection(ws);
      } else {
        debugLog(`Invalid path: ${url.pathname}`);
        ws.close(4004, 'Invalid path');
      }
    });
  }

  /**
   * Handle Extension connection
   */
  private _handleExtensionConnection(ws: WebSocket): void {
    debugLog('Extension connecting');
    logger.log('🔌 Extension WebSocket connection established');

      // Only allow one connection at a time
      if (this.activeConnection) {
      debugLog('Closing existing extension connection');
      logger.warn('⚠️ Closing existing extension connection');
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
          
          // Добавляем дополнительные поля для логирования
          let additionalInfo: Record<string, any> = {};
          
          if ('id' in message) {
            // Это ответ на команду
            const pendingInfo = this.pendingMessages.get(message.id);
            additionalInfo = {
              _responseToCommandId: message.id,
              _responseType: message.error ? 'error' : 'success',
              _originalCommand: 'unknown'
            };
            
            // Если есть информация о запросе в pendingMessages, добавляем её
            if (pendingInfo) {
              additionalInfo._originalCommand = pendingInfo.originalMethod || 'unknown';
              additionalInfo._originalParams = pendingInfo.originalParams || {};
            }
            
            logger.log('📨 Message from extension:', JSON.stringify({
              ...message,
              ...additionalInfo
            }, null, 2));
          } else if ('method' in message) {
            // Это событие от расширения
            additionalInfo = {
              _messageType: 'event',
              _method: message.method
            } as Record<string, any>;
            
            logger.log('📨 Message from extension:', JSON.stringify({
              ...message,
              ...additionalInfo
            }, null, 2));
          } else if ('type' in message && message.type === 'connection_info') {
            // Это информация о соединении
            additionalInfo = {
              _messageType: 'connectionInfo',
              _sessionId: message.sessionId
            } as Record<string, any>;
            
            logger.log('📨 Message from extension:', JSON.stringify({
              ...message,
              ...additionalInfo
            }, null, 2));
          } else {
            // Другой тип сообщения
            logger.log('📨 Message from extension:', JSON.stringify(message, null, 2));
          }
          
          this.handleExtensionMessage(message);
        } catch (error) {
          debugLog('Error parsing message from extension:', error);
          logger.error('❌ Error parsing extension message:', error);
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
  }

  /**
   * Handle Playwright MCP connection
   */
  private _handlePlaywrightConnection(ws: WebSocket): void {
    if (this.playwrightSocket?.readyState === WebSocket.OPEN) {
      debugLog('Closing previous Playwright connection');
      this.playwrightSocket.close(1000, 'New connection established');
    }

    this.playwrightSocket = ws;
    debugLog('Playwright MCP connected');

    ws.on('message', data => {
      try {
        const message = JSON.parse(data.toString());
        this._handlePlaywrightMessage(message);
      } catch (error) {
        debugLog('Error parsing Playwright message:', error);
      }
    });

    ws.on('close', () => {
      if (this.playwrightSocket === ws)
        this.playwrightSocket = null;

      debugLog('Playwright MCP disconnected');
    });

    ws.on('error', error => {
      debugLog('Playwright WebSocket error:', error);
    });
  }

  private handleExtensionMessage(message: CDPMessage | ConnectionInfo) {
    if ('type' in message && message.type === 'connection_info') {
      // Connection info message
      debugLog('Received connection info:', message);
      logger.log('📋 Received connection_info from extension:', JSON.stringify(message, null, 2));
      if (this.activeConnection) {
        this.activeConnection.sessionId = message.sessionId;
        this.activeConnection.targetInfo = message.targetInfo;
        logger.log('✅ Connection info updated, sessionId:', message.sessionId);
      } else {
        logger.warn('⚠️ No active connection to update with connection_info');
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
      
      // Check if this is a navigation response and update targetInfo
      if (cdpMessage.id && pending.sessionId && this.activeConnection && 
          cdpMessage.result && cdpMessage.result.frameId) {
        // This might be a navigation response, let's update the URL and title
        this.updateTargetInfoAfterNavigation().catch(e => 
          debugLog('Error updating target info after navigation:', e));
      }
    } else if (cdpMessage.method) {
      // Forward CDP event to Playwright
      debugLog('Received CDP event:', cdpMessage.method);
      this._sendToPlaywright(cdpMessage);
      
      // If this is a navigation event, update the target info
      if (cdpMessage.method === 'Page.frameNavigated' && this.activeConnection) {
        this.updateTargetInfoAfterNavigation().catch(e => 
          debugLog('Error updating target info after navigation event:', e));
      }
    }
  }

  /**
   * Handle messages from Playwright MCP
   */
  private _handlePlaywrightMessage(message: any): void {
    debugLog('← Playwright:', message.method || `response(${message.id})`);
    
    // Log commands from agents with special emoji markers
    if (message.method) {
      logger.log('💬💬💬 Agent Command:', JSON.stringify(message, null, 2));
      
      // Additional logging for specific command types
      if (message.method.startsWith('Page.')) {
        logger.log('📄 Page Action:', message.method);
      } else if (message.method.startsWith('Input.')) {
        logger.log('⌨️ Input Action:', message.method);
      } else if (message.method.startsWith('Mouse.')) {
        logger.log('🖱️ Mouse Action:', message.method);
      } else if (message.method.startsWith('Network.')) {
        logger.log('🌐 Network Action:', message.method);
      } else if (message.method.startsWith('DOM.')) {
        logger.log('🔍 DOM Action:', message.method);
      }
    } else {
      logger.log('🎭 Response from Playwright:', JSON.stringify(message, null, 2));
    }

    // Handle Browser domain methods locally
    if (message.method?.startsWith('Browser.')) {
      logger.log('🌐 Handling Browser domain method locally');
      this._handleBrowserDomainMethod(message);
      return;
    }

    // Handle Target domain methods
    if (message.method?.startsWith('Target.')) {
      logger.log('🎯 Handling Target domain method');
      this._handleTargetDomainMethod(message);
      return;
    }

    // Forward other commands to extension
    if (message.method) {
      logger.log('📤 Forwarding command to extension');
      this._forwardToExtension(message);
    }
  }

  /**
   * Handle Browser domain methods locally
   */
  private _handleBrowserDomainMethod(message: any): void {
    switch (message.method) {
      case 'Browser.getVersion':
        this._sendToPlaywright({
          id: message.id,
          result: {
            protocolVersion: '1.3',
            product: 'Chrome/Extension-Bridge',
            userAgent: 'CDP-Bridge-Server/1.0.0',
          }
        });
        break;

      case 'Browser.setDownloadBehavior':
        this._sendToPlaywright({
          id: message.id,
          result: {}
        });
        break;

      default:
        // Forward unknown Browser methods to extension
        this._forwardToExtension(message);
    }
  }

  /**
   * Handle Target domain methods
   */
  private _handleTargetDomainMethod(message: any): void {
    switch (message.method) {
      case 'Target.setAutoAttach':
        // Simulate auto-attach behavior with real target info
        if (this.activeConnection && !message.sessionId) {
          debugLog('Simulating auto-attach for target:', JSON.stringify(message));
          this._sendToPlaywright({
            method: 'Target.attachedToTarget',
            params: {
              sessionId: this.activeConnection.sessionId,
              targetInfo: {
                ...this.activeConnection.targetInfo,
                attached: true,
              },
              waitingForDebugger: false
            }
          });
          this._sendToPlaywright({
            id: message.id,
            result: {}
          });
        } else {
          this._forwardToExtension(message);
        }
        break;

      case 'Target.getTargets':
        const targetInfos = [];
        if (this.activeConnection) {
          targetInfos.push({
            ...this.activeConnection.targetInfo,
            attached: true,
          });
        }
        this._sendToPlaywright({
          id: message.id,
          result: { targetInfos }
        });
        break;

      default:
        this._forwardToExtension(message);
    }
  }

  /**
   * Forward message to extension
   */
  private _forwardToExtension(message: any): void {
    if (this.activeConnection?.socket?.readyState === WebSocket.OPEN) {
      debugLog('→ Extension:', message.method || `command(${message.id})`);
      
      // Log detailed command information with emoji
      if (message.method) {
        logger.log(`💬💬💬 Forwarding Agent Command to Extension: ${message.method}`);
        
        // Log command parameters if they exist
        if (message.params) {
          const paramsStr = JSON.stringify(message.params, null, 2);
          logger.log(`📝 Command Parameters: ${paramsStr}`);
        }
        
        // Если есть ID, сохраняем информацию о команде в pendingMessages
        if (message.id) {
          // Проверяем, есть ли уже запись для этого ID
          if (!this.pendingMessages.has(message.id)) {
            this.pendingMessages.set(message.id, {
              resolve: () => {},
              reject: () => {},
              originalMethod: message.method,
              originalParams: message.params
            });
          } else {
            // Если запись уже есть, обновляем информацию о методе и параметрах
            const pending = this.pendingMessages.get(message.id)!;
            pending.originalMethod = message.method;
            pending.originalParams = message.params;
          }
        }
      }
      
      this.activeConnection.socket.send(JSON.stringify(message));
    } else {
      debugLog('Extension not connected, cannot forward message');
      logger.warn('⚠️ Extension not connected, cannot forward command');
      if (message.id) {
        this._sendToPlaywright({
          id: message.id,
          error: { message: 'Extension not connected' }
        });
      }
    }
  }

  /**
   * Forward message to Playwright
   */
  private _sendToPlaywright(message: any): void {
    if (this.playwrightSocket?.readyState === WebSocket.OPEN) {
      debugLog('→ Playwright:', JSON.stringify(message));
      
      // Log responses to agent commands with emoji
      if (message.id && message.result) {
        logger.log(`💬💬💬 Response to Agent Command (ID: ${message.id}):`);
        logger.log(`✅ Result: ${JSON.stringify(message.result, null, 2)}`);
      } 
      // Log events sent to Playwright
      else if (message.method) {
        logger.log(`💬💬💬 Event to Playwright: ${message.method}`);
        if (message.params) {
          logger.log(`📊 Event Parameters: ${JSON.stringify(message.params, null, 2)}`);
        }
      }
      // Log errors
      else if (message.error) {
        logger.log(`💬💬💬 Error Response to Agent Command:`);
        logger.error(`❌ Error: ${JSON.stringify(message.error, null, 2)}`);
      }
      
      this.playwrightSocket.send(JSON.stringify(message));
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
      // Сохраняем информацию о методе и параметрах команды
      this.pendingMessages.set(id, { 
        resolve, 
        reject, 
        sessionId,
        originalMethod: method,
        originalParams: params
      });
      
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
    return this.activeConnection !== null && 
           this.activeConnection.sessionId !== '' &&
           this.activeConnection.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Get the session ID of the connected tab
   */
  getSessionId(): string | undefined {
    return this.activeConnection?.sessionId;
  }
  
  /**
   * Update target info after navigation
   * This method fetches the current URL and title from the page
   * and updates the targetInfo object to keep it in sync with the actual page state
   */
  async updateTargetInfoAfterNavigation(): Promise<void> {
    if (!this.activeConnection || !this.activeConnection.sessionId) {
      return;
    }
    
    try {
      // Get current URL
      const urlResult = await this.sendCommand('Runtime.evaluate', { 
        expression: 'window.location.href' 
      });
      
      // Get current title
      const titleResult = await this.sendCommand('Runtime.evaluate', { 
        expression: 'document.title' 
      });
      
      if (urlResult?.value && this.activeConnection.targetInfo) {
        const oldUrl = this.activeConnection.targetInfo.url;
        const newUrl = urlResult.value;
        const newTitle = titleResult?.value || this.activeConnection.targetInfo.title;
        
        // Only log if URL actually changed
        if (oldUrl !== newUrl) {
          debugLog(`Updating targetInfo after navigation: ${oldUrl} -> ${newUrl}`);
          logger.log(`🔄 Page navigated: ${oldUrl} -> ${newUrl}`);
          
          // Update the targetInfo with new URL and title
          this.activeConnection.targetInfo = {
            ...this.activeConnection.targetInfo,
            url: newUrl,
            title: newTitle
          };
        }
      }
    } catch (error) {
      debugLog('Error updating target info after navigation:', error);
    }
  }

  /**
   * Start the CDP relay server
   */
  async start(): Promise<void> {
    if (!this.ownsServer) {
      // Server is managed externally, we just log that we're ready
      debugLog(`CDP relay WebSocket handlers attached to existing server`);
      return;
    }

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

      if (this.playwrightSocket) {
        this.playwrightSocket.close();
        this.playwrightSocket = null;
      }

      this.wss.close(() => {
        if (this.ownsServer) {
        this.server.close(() => {
          debugLog('CDP relay server stopped');
          resolve();
        });
        } else {
          debugLog('CDP relay WebSocket handlers detached');
          resolve();
        }
      });
    });
  }

  /**
   * Get the server URL for the extension
   */
  getServerUrl(): string {
    return `ws://${this.host}:${this.port}/extension`;
  }

  /**
   * Get the CDP server URL for Playwright MCP
   */
  getCdpUrl(): string {
    return `ws://${this.host}:${this.port}/cdp`;
  }
}