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

import * as playwright from 'playwright';

import { PageSnapshot } from './pageSnapshot.js';
import { callOnPageNoTrace } from './tools/utils.js';

import type { Context } from './context.js';

export class Tab {
  readonly context: Context;
  readonly page: playwright.Page;
  private _consoleMessages: ConsoleMessage[] = [];
  private _requests: Map<playwright.Request, playwright.Response | null> = new Map();
  private _snapshot: PageSnapshot | undefined;
  private _onPageClose: (tab: Tab) => void;
  private _cdpRelay: any; // Store CDP relay if available

  constructor(context: Context, page: playwright.Page, onPageClose: (tab: Tab) => void) {
    this.context = context;
    this.page = page;
    this._onPageClose = onPageClose;
    
    // Try to get CDP relay from page if it exists
    if ((page as any)._browser && (page as any)._browser._cdpRelay) {
      this._cdpRelay = (page as any)._browser._cdpRelay;
      console.log('[Tab] 🔌 Found CDP relay in page');
    } else if ((page as any)._cdpRelay) {
      this._cdpRelay = (page as any)._cdpRelay;
      console.log('[Tab] 🔌 Found CDP relay directly in page');
    }
    
    page.on('console', event => this._consoleMessages.push(messageToConsoleMessage(event)));
    page.on('pageerror', error => this._consoleMessages.push(pageErrorToConsoleMessage(error)));
    page.on('request', request => this._requests.set(request, null));
    page.on('response', response => this._requests.set(response.request(), response));
    page.on('close', () => this._onClose());
    page.on('filechooser', chooser => {
      this.context.setModalState({
        type: 'fileChooser',
        description: 'File chooser',
        fileChooser: chooser,
      }, this);
    });
    page.on('dialog', dialog => this.context.dialogShown(this, dialog));
    page.on('download', download => {
      void this.context.downloadStarted(this, download);
    });
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(5000);
  }

  private _clearCollectedArtifacts() {
    this._consoleMessages.length = 0;
    this._requests.clear();
  }

  private _onClose() {
    this._clearCollectedArtifacts();
    this._onPageClose(this);
  }

  async title(): Promise<string> {
    // console.log('[Tab] 📄 Getting page title...');
    
    // If we have CDP relay, try to get title from target info first
    if (this._cdpRelay && this._cdpRelay.getTargetInfo) {
      const targetInfo = this._cdpRelay.getTargetInfo();
      if (targetInfo?.title) {
        console.log('[Tab] 📄 Using title from CDP relay target info:', targetInfo.title);
        return targetInfo.title;
      }
    }
    
    // Fallback to standard Playwright method
    try {
      const title = await callOnPageNoTrace(this.page, page => page.title());
      console.log('[Tab] 📄 Using title from Playwright:', title);
      return title;
    } catch (error) {
      console.error('[Tab] ❌ Error getting title from Playwright:', error);
      return 'Unknown';
    }
  }
  
  /**
   * Get the current URL of the page, with CDP relay fallback
   */
  getUrl(): string {
    // console.log('[Tab] 🌐 Getting page URL...');
    
    // If we have CDP relay, try to get URL from target info first
    if (this._cdpRelay && this._cdpRelay.getTargetInfo) {
      const targetInfo = this._cdpRelay.getTargetInfo();
      if (targetInfo?.url) {
        // console.log('[Tab] 🌐 Using URL from CDP relay target info:', targetInfo.url);
        return targetInfo.url;
      }
    }
    
    // Fallback to standard Playwright method
    try {
      const url = this.page.url();
      console.log('[Tab] 🌐 Using URL from Playwright:', url);
      return url;
    } catch (error) {
      console.error('[Tab] ❌ Error getting URL from Playwright:', error);
      return 'about:blank';
    }
  }

  async waitForLoadState(state: 'load', options?: { timeout?: number }): Promise<void> {
    await callOnPageNoTrace(this.page, page => page.waitForLoadState(state, options).catch(() => {}));
  }

  async navigate(url: string) {
    this._clearCollectedArtifacts();

    const downloadEvent = callOnPageNoTrace(this.page, page => page.waitForEvent('download').catch(() => {}));
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (_e: unknown) {
      const e = _e as Error;
      const mightBeDownload =
        e.message.includes('net::ERR_ABORTED') // chromium
        || e.message.includes('Download is starting'); // firefox + webkit
      if (!mightBeDownload)
        throw e;
      // on chromium, the download event is fired *after* page.goto rejects, so we wait a lil bit
      const download = await Promise.race([
        downloadEvent,
        new Promise(resolve => setTimeout(resolve, 1000)),
      ]);
      if (!download)
        throw e;
    }

    // Cap load event to 5 seconds, the page is operational at this point.
    await this.waitForLoadState('load', { timeout: 5000 });
    
    // Update target info in CDP relay if available
    if (this._cdpRelay && typeof this._cdpRelay.updateTargetInfoAfterNavigation === 'function') {
      // console.log('[Tab] 🔄 Updating target info after navigation');
      try {
        await this._cdpRelay.updateTargetInfoAfterNavigation();
      } catch (error) {
        console.error('[Tab] ❌ Error updating target info:', error);
      }
    }
  }

  hasSnapshot(): boolean {
    return !!this._snapshot;
  }

  snapshotOrDie(): PageSnapshot {
    if (!this._snapshot)
      throw new Error('No snapshot available');
    return this._snapshot;
  }

  consoleMessages(): ConsoleMessage[] {
    return this._consoleMessages;
  }

  requests(): Map<playwright.Request, playwright.Response | null> {
    return this._requests;
  }

  async captureSnapshot() {
    // console.log('[Tab] 📸 Capturing snapshot...');
    this._snapshot = await PageSnapshot.create(this.page, this._cdpRelay);
  }
}

export type ConsoleMessage = {
  type: ReturnType<playwright.ConsoleMessage['type']> | undefined;
  text: string;
  toString(): string;
};

function messageToConsoleMessage(message: playwright.ConsoleMessage): ConsoleMessage {
  return {
    type: message.type(),
    text: message.text(),
    toString: () => `[${message.type().toUpperCase()}] ${message.text()} @ ${message.location().url}:${message.location().lineNumber}`,
  };
}

function pageErrorToConsoleMessage(errorOrValue: Error | any): ConsoleMessage {
  if (errorOrValue instanceof Error) {
    return {
      type: undefined,
      text: errorOrValue.message,
      toString: () => errorOrValue.stack || errorOrValue.message,
    };
  }
  return {
    type: undefined,
    text: String(errorOrValue),
    toString: () => String(errorOrValue),
  };
}
