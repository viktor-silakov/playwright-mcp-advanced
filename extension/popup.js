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

// @ts-check

/**
 * Popup script for Playwright MCP Bridge extension
 */

class PopupController {
  constructor() {
    this.currentTab = null;
    this.bridgeUrlInput = /** @type {HTMLInputElement} */ (document.getElementById('bridge-url'));
    this.connectBtn = /** @type {HTMLButtonElement} */ (document.getElementById('connect-btn'));
    this.statusContainer = /** @type {HTMLElement} */ (document.getElementById('status-container'));
    this.actionContainer = /** @type {HTMLElement} */ (document.getElementById('action-container'));

    this.init();
  }

  async init() {
    console.log('[POPUP] 🚀 Popup controller initializing...');
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
    console.log('[POPUP] 📋 Current tab:', tab?.url, 'ID:', tab?.id);

    // Load saved bridge URL
    const result = await chrome.storage.sync.get(['bridgeUrl']);
    const savedUrl = result.bridgeUrl || 'ws://localhost:3000/extension';
    this.bridgeUrlInput.value = savedUrl;
    this.bridgeUrlInput.disabled = false;
    console.log('[POPUP] 🔗 Loaded bridge URL:', savedUrl);

    // Set up event listeners
    this.bridgeUrlInput.addEventListener('input', this.onUrlChange.bind(this));
    this.connectBtn.addEventListener('click', this.onConnectClick.bind(this));

    // Update UI based on current state
    console.log('[POPUP] 🔄 Updating UI...');
    await this.updateUI();
  }

  async updateUI() {
    if (!this.currentTab?.id) return;

    // Get connection status from background script
    const response = await chrome.runtime.sendMessage({
      type: 'getStatus',
      tabId: this.currentTab.id
    });

    const { isConnected, activeTabId, activeTabInfo, error } = response;

    if (!this.statusContainer || !this.actionContainer) return;

    this.statusContainer.innerHTML = '';
    this.actionContainer.innerHTML = '';

    if (error) {
      this.showStatus('error', `Error: ${error}`);
      this.showConnectButton();
    } else if (isConnected && activeTabId === this.currentTab.id) {
      // Current tab is connected
      this.showStatus('connected', 'This tab is currently shared with MCP server');
      this.showDisconnectButton();
    } else if (isConnected && activeTabId !== this.currentTab.id) {
      // Another tab is connected
      this.showStatus('warning', 'Another tab is already sharing the CDP session');
      this.showActiveTabInfo(activeTabInfo);
      this.showFocusButton(activeTabId);
    } else {
      // No connection
      this.showConnectButton();
    }
  }

  showStatus(type, message) {
    const statusDiv = document.createElement('div');
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    this.statusContainer.appendChild(statusDiv);
  }

  showConnectButton() {
    if (!this.actionContainer) return;

    this.actionContainer.innerHTML = `
      <button id="connect-btn" class="button">Share This Tab</button>
    `;

    const connectBtn = /** @type {HTMLButtonElement} */ (document.getElementById('connect-btn'));
    if (connectBtn) {
      connectBtn.addEventListener('click', this.onConnectClick.bind(this));

      // Disable if URL is invalid
      const isValidUrl = this.bridgeUrlInput ? this.isValidWebSocketUrl(this.bridgeUrlInput.value) : false;
      connectBtn.disabled = !isValidUrl;
    }
  }

  showDisconnectButton() {
    if (!this.actionContainer) return;

    this.actionContainer.innerHTML = `
      <button id="disconnect-btn" class="button disconnect">Stop Sharing</button>
    `;

    const disconnectBtn = /** @type {HTMLButtonElement} */ (document.getElementById('disconnect-btn'));
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', this.onDisconnectClick.bind(this));
    }
  }

  showActiveTabInfo(tabInfo) {
    if (!tabInfo) return;

    const tabDiv = document.createElement('div');
    tabDiv.className = 'tab-info';
    tabDiv.innerHTML = `
      <div class="tab-title">${tabInfo.title || 'Unknown Tab'}</div>
      <div class="tab-url">${tabInfo.url || ''}</div>
    `;
    this.statusContainer.appendChild(tabDiv);
  }

  showFocusButton(activeTabId) {
    if (!this.actionContainer) return;

    this.actionContainer.innerHTML = `
      <button id="focus-btn" class="button focus-button">Switch to Shared Tab</button>
    `;

    const focusBtn = /** @type {HTMLButtonElement} */ (document.getElementById('focus-btn'));
    if (focusBtn) {
      focusBtn.addEventListener('click', () => this.onFocusClick(activeTabId));
    }
  }

  onUrlChange() {
    if (!this.bridgeUrlInput) return;

    const isValid = this.isValidWebSocketUrl(this.bridgeUrlInput.value);
    const connectBtn = /** @type {HTMLButtonElement} */ (document.getElementById('connect-btn'));
    if (connectBtn) {
      connectBtn.disabled = !isValid;
    }

    // Save URL to storage
    if (isValid) {
      chrome.storage.sync.set({ bridgeUrl: this.bridgeUrlInput.value });
    }
  }

  async onConnectClick() {
    console.log('[POPUP] 🔌 Connect button clicked!');
    
    if (!this.bridgeUrlInput || !this.currentTab?.id) {
      console.error('[POPUP] ❌ Missing bridge URL input or current tab ID');
      return;
    }

    const url = this.bridgeUrlInput.value.trim();
    console.log('[POPUP] 🔗 Attempting to connect to:', url);
    console.log('[POPUP] 📋 Current tab ID:', this.currentTab.id);
    
    if (!this.isValidWebSocketUrl(url)) {
      console.error('[POPUP] ❌ Invalid WebSocket URL:', url);
      this.showStatus('error', 'Please enter a valid WebSocket URL');
      return;
    }

    // Save URL to storage
    console.log('[POPUP] 💾 Saving URL to storage...');
    await chrome.storage.sync.set({ bridgeUrl: url });

    // Send connect message to background script
    console.log('[POPUP] 📤 Sending connect message to background script...');
    const response = await chrome.runtime.sendMessage({
      type: 'connect',
      tabId: this.currentTab.id,
      bridgeUrl: url
    });

    console.log('[POPUP] 📨 Response from background script:', response);

    if (response.success) {
      console.log('[POPUP] ✅ Connection successful, updating UI...');
      await this.updateUI();
    } else {
      console.error('[POPUP] ❌ Connection failed:', response.error);
      this.showStatus('error', response.error || 'Failed to connect');
    }
  }

  async onDisconnectClick() {
    if (!this.currentTab?.id) return;

    const response = await chrome.runtime.sendMessage({
      type: 'disconnect',
      tabId: this.currentTab.id
    });

    if (response.success) {
      await this.updateUI();
    } else {
      this.showStatus('error', response.error || 'Failed to disconnect');
    }
  }

  async onFocusClick(activeTabId) {
    try {
      await chrome.tabs.update(activeTabId, { active: true });
      window.close(); // Close popup after switching
    } catch (error) {
      this.showStatus('error', 'Failed to switch to tab');
    }
  }

  isValidWebSocketUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
    } catch {
      return false;
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});