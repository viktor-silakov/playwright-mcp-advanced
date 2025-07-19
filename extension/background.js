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

/**
 * Simple Chrome Extension that pumps CDP messages between chrome.debugger and WebSocket
 */

// @ts-check

/**
 * Simple logger for Chrome Extension that logs to both console and chrome.storage
 */
class ExtensionLogger {
  constructor(options = {}) {
    this.logToConsole = options.logToConsole ?? true;
    this.logToStorage = options.logToStorage ?? true;
    this.prefix = options.prefix ?? 'EXTENSION';
    this.maxStorageItems = options.maxStorageItems ?? 1000;
    this.storageKey = 'playwright_mcp_logs';
  }

  formatMessage(level, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    
    // Convert args to strings and truncate individual long arguments
    const processedArgs = args.map(arg => {
      let argStr = typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
      
      // Truncate long arguments (but not the entire message)
      const MAX = 1000;
      if (argStr.length > MAX) {
        const head = argStr.slice(0, 200);
        const tail = argStr.slice(-100);
        const omitted = argStr.length - 300;

        // 👇 visually-distinct gap
        const gap = `\n--- ${omitted} chars omitted ---\n`;

        argStr = `${head}${gap}${tail}`;
      }
      
      return argStr;
    });
    
    const argsStr = processedArgs.join(' ');
    return `[${timestamp}] ${level} ${prefix}${argsStr}`;
  }

  async writeToStorage(message) {
    if (!this.logToStorage) return;

    try {
      // Get existing logs
      const result = await chrome.storage.local.get([this.storageKey]);
      let logs = result[this.storageKey] || [];

      // Add new log entry
      logs.push({
        timestamp: new Date().toISOString(),
        message: message
      });

      // Keep only recent logs to avoid storage quota issues
      if (logs.length > this.maxStorageItems) {
        logs = logs.slice(-this.maxStorageItems);
      }

      // Save back to storage
      await chrome.storage.local.set({ [this.storageKey]: logs });
    } catch (error) {
      // Fallback to console if storage fails
      console.error('Failed to write to chrome.storage:', error);
    }
  }

  log(...args) {
    const message = this.formatMessage('INFO', ...args);
    
    if (this.logToConsole) {
      console.log(message);
    }
    
    this.writeToStorage(message);
  }

  error(...args) {
    const message = this.formatMessage('ERROR', ...args);
    
    if (this.logToConsole) {
      console.error(message);
    }
    
    this.writeToStorage(message);
  }

  warn(...args) {
    const message = this.formatMessage('WARN', ...args);
    
    if (this.logToConsole) {
      console.warn(message);
    }
    
    this.writeToStorage(message);
  }

  debug(...args) {
    const message = this.formatMessage('DEBUG', ...args);
    
    if (this.logToConsole) {
      console.log(message);
    }
    
    this.writeToStorage(message);
  }
}

// Default logger instance
const logger = new ExtensionLogger({
  prefix: 'BACKGROUND',
  logToConsole: true,
  logToStorage: true
});

// Legacy debugLog function for backward compatibility
function debugLog(...args) {
  logger.log(...args);
}

class TabShareExtension {
  constructor() {
    this.activeConnections = new Map(); // tabId -> connection info

    // Remove page action click handler since we now use popup
    chrome.tabs.onRemoved.addListener(this.onTabRemoved.bind(this));

    // Handle messages from popup
    chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
  }

  /**
   * Handle messages from popup
   * @param {any} message
   * @param {chrome.runtime.MessageSender} sender
   * @param {Function} sendResponse
   */
  onMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'getStatus':
        this.getStatus(message.tabId, sendResponse);
        return true; // Will respond asynchronously

      case 'connect':
        this.connectTab(message.tabId, message.bridgeUrl).then(
          () => sendResponse({ success: true }),
          (error) => sendResponse({ success: false, error: error.message })
        );
        return true; // Will respond asynchronously

      case 'disconnect':
        this.disconnectTab(message.tabId).then(
          () => sendResponse({ success: true }),
          (error) => sendResponse({ success: false, error: error.message })
        );
        return true; // Will respond asynchronously
    }
    return false;
  }

  /**
   * Get connection status for popup
   * @param {number} requestedTabId
   * @param {Function} sendResponse
   */
  getStatus(requestedTabId, sendResponse) {
    const isConnected = this.activeConnections.size > 0;
    let activeTabId = null;
    let activeTabInfo = null;

    if (isConnected) {
      const [tabId, connection] = this.activeConnections.entries().next().value;
      activeTabId = tabId;

      // Get tab info
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            isConnected: false,
            error: 'Active tab not found'
          });
        } else {
          sendResponse({
            isConnected: true,
            activeTabId,
            activeTabInfo: {
              title: tab.title,
              url: tab.url
            }
          });
        }
      });
    } else {
      sendResponse({
        isConnected: false,
        activeTabId: null,
        activeTabInfo: null
      });
    }
  }

  /**
   * Connect a tab to the bridge server
   * @param {number} tabId
   * @param {string} bridgeUrl
   */
  async connectTab(tabId, bridgeUrl) {
    try {
      logger.log(`🔌 Connecting tab ${tabId} to bridge at ${bridgeUrl}`);

      // Attach chrome debugger
      logger.log(`🔧 Attaching Chrome debugger to tab ${tabId}...`);
      const debuggee = { tabId };
      await chrome.debugger.attach(debuggee, '1.3');

      if (chrome.runtime.lastError) {
        logger.error(`❌ Chrome debugger error:`, chrome.runtime.lastError.message);
        throw new Error(chrome.runtime.lastError.message);
      }
      logger.log(`✅ Chrome debugger attached to tab ${tabId}`);

      const targetInfo = /** @type {any} */ (await chrome.debugger.sendCommand(debuggee, 'Target.getTargetInfo'));
      logger.log(`📋 Target info for tab ${tabId}:`, targetInfo);

      // Connect to bridge server
      logger.log(`🌐 Creating WebSocket connection to ${bridgeUrl}...`);
      const socket = new WebSocket(bridgeUrl);

      const connection = {
        debuggee,
        socket,
        tabId,
        sessionId: `pw-tab-${tabId}`
      };
      logger.log(`🆔 Created connection with sessionId: ${connection.sessionId}`);

      await new Promise((resolve, reject) => {
        socket.onopen = () => {
          logger.log(`✅ WebSocket connected for tab ${tabId}`);
          
          const connectionInfo = {
            type: 'connection_info',
            sessionId: connection.sessionId,
            targetInfo: targetInfo?.targetInfo
          };
          logger.log(`📤 Sending connection info:`, connectionInfo);
          
          // Send initial connection info to bridge
          socket.send(JSON.stringify(connectionInfo));
          resolve(undefined);
        };
        
        socket.onerror = (error) => {
          logger.error(`❌ WebSocket error for tab ${tabId}:`, error);
          reject(error);
        };
        
        socket.onclose = (event) => {
          logger.log(`🔌 WebSocket closed for tab ${tabId}:`, event.code, event.reason);
        };
        
        setTimeout(() => {
          logger.error(`⏰ Connection timeout for tab ${tabId}`);
          reject(new Error('Connection timeout'));
        }, 5000);
      });

      // Set up message handling
      this.setupMessageHandling(connection);

      // Store connection
      this.activeConnections.set(tabId, connection);

      // Update UI
      chrome.action.setBadgeText({ tabId, text: '●' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#4CAF50' });
      chrome.action.setTitle({ tabId, title: 'Disconnect from Playwright MCP' });

      debugLog(`Tab ${tabId} connected successfully`);

    } catch (error) {
      debugLog(`Failed to connect tab ${tabId}:`, error.message);
      await this.cleanupConnection(tabId);

      // Show error to user
      chrome.action.setBadgeText({ tabId, text: '!' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#F44336' });
      chrome.action.setTitle({ tabId, title: `Connection failed: ${error.message}` });

      throw error; // Re-throw for popup to handle
    }
  }

  /**
   * Set up bidirectional message handling between debugger and WebSocket
   * @param {Object} connection
   */
  setupMessageHandling(connection) {
    const { debuggee, socket, tabId, sessionId: rootSessionId } = connection;
    logger.log(`🔧 Setting up message handling for tab ${tabId}, rootSessionId: ${rootSessionId}`);

    // WebSocket -> chrome.debugger
    socket.onmessage = async (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
        logger.log(`📨 Received from bridge (tab ${tabId}):`, message);
      } catch (error) {
        logger.error(`❌ Error parsing message for tab ${tabId}:`, error);
        socket.send(JSON.stringify({
          error: {
            code: -32700,
            message: `Error parsing message: ${error.message}`
          }
        }));
        return;
      }

      try {
        const debuggerSession = { ...debuggee };
        const sessionId = message.sessionId;
        
        logger.log(`🔀 Processing message - sessionId: ${sessionId}, rootSessionId: ${rootSessionId}`);
        
        // Pass session id, unless it's the root session.
        if (sessionId && sessionId !== rootSessionId) {
          debuggerSession.sessionId = sessionId;
          logger.log(`🆔 Using custom sessionId: ${sessionId}`);
        } else {
          logger.log(`🆔 Using root session`);
        }

        logger.log(`📤 Sending CDP command - method: ${message.method}, params:`, message.params);
        
        // Forward CDP command to chrome.debugger
        const result = await chrome.debugger.sendCommand(
          debuggerSession,
          message.method,
          message.params || {}
        );
        
        logger.log(`📨 CDP command result:`, result);

        // Send response back to bridge
        const response = {
          id: message.id,
          sessionId,
          result
        };

        if (chrome.runtime.lastError) {
          response.error = {
            code: -32000,
            message: chrome.runtime.lastError.message,
          };
        }

        socket.send(JSON.stringify(response));
      } catch (error) {
        debugLog('Error processing WebSocket message:', error);
        const response = {
          id: message.id,
          sessionId: message.sessionId,
          error: {
            code: -32000,
            message: error.message,
          },
        };
        socket.send(JSON.stringify(response));
      }
    };

    // chrome.debugger events -> WebSocket
    const eventListener = (source, method, params) => {
      if (source.tabId === tabId && socket.readyState === WebSocket.OPEN) {
        // If the sessionId is not provided, use the root sessionId.
        const event = {
          sessionId: source.sessionId || rootSessionId,
          method,
          params,
        };
        debugLog('Forwarding CDP event:', event);
        socket.send(JSON.stringify(event));
      }
    };

    const detachListener = (source, reason) => {
      if (source.tabId === tabId) {
        debugLog(`Debugger detached from tab ${tabId}, reason: ${reason}`);
        this.disconnectTab(tabId);
      }
    };

    // Store listeners for cleanup
    connection.eventListener = eventListener;
    connection.detachListener = detachListener;

    chrome.debugger.onEvent.addListener(eventListener);
    chrome.debugger.onDetach.addListener(detachListener);

    // Handle WebSocket close
    socket.onclose = () => {
      debugLog(`WebSocket closed for tab ${tabId}`);
      this.disconnectTab(tabId);
    };

    socket.onerror = (error) => {
      debugLog(`WebSocket error for tab ${tabId}:`, error);
      this.disconnectTab(tabId);
    };
  }

  /**
   * Disconnect a tab from the bridge
   * @param {number} tabId
   */
  async disconnectTab(tabId) {
    await this.cleanupConnection(tabId);

    // Update UI
    chrome.action.setBadgeText({ tabId, text: '' });
    chrome.action.setTitle({ tabId, title: 'Share tab with Playwright MCP' });

    debugLog(`Tab ${tabId} disconnected`);
  }

  /**
   * Clean up connection resources
   * @param {number} tabId
   */
  async cleanupConnection(tabId) {
    const connection = this.activeConnections.get(tabId);
    if (!connection) return;

    // Remove listeners
    if (connection.eventListener) {
      chrome.debugger.onEvent.removeListener(connection.eventListener);
    }
    if (connection.detachListener) {
      chrome.debugger.onDetach.removeListener(connection.detachListener);
    }

    // Close WebSocket
    if (connection.socket && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.close();
    }

    // Detach debugger
    try {
      await chrome.debugger.detach(connection.debuggee);
    } catch (error) {
      // Ignore detach errors - might already be detached
    }

    this.activeConnections.delete(tabId);
  }

  /**
   * Handle tab removal
   * @param {number} tabId
   */
  async onTabRemoved(tabId) {
    if (this.activeConnections.has(tabId)) {
      await this.cleanupConnection(tabId);
    }
  }
}

new TabShareExtension();