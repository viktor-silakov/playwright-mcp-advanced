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
import { callOnPageNoTrace } from './tools/utils.js';
import { extractContentFromCDPResponse, extractStringFromCDPResponse } from './utils/cdp-content-extractor.js';

type PageEx = playwright.Page & {
  _snapshotForAI: () => Promise<string>;
};

export class PageSnapshot {
  private _page: playwright.Page;
  private _text!: string;
  private _cdpRelay: any;

  constructor(page: playwright.Page, cdpRelay?: any) {
    this._page = page;
    this._cdpRelay = cdpRelay;
  }

  static async create(page: playwright.Page, cdpRelay?: any): Promise<PageSnapshot> {
    const snapshot = new PageSnapshot(page, cdpRelay);
    await snapshot._build();
    return snapshot;
  }

  text(): string {
    return this._text;
  }

  private async _build() {
    // console.log('[PageSnapshot] 🔄 Building snapshot...');
    try {
      // Try to get data from CDP relay first if available
      let url = 'about:blank';
      let title = 'Unknown';
      let viewport = { width: 1280, height: 720 };
      let html = '<html><body>No content available</body></html>';
      
      // First try to get URL and title directly from the page
      try {
        // Safely get URL if method exists
        if (this._page.url && typeof this._page.url === 'function') {
          url = this._page.url();
        }
        
        // Safely get title if method exists
        if (this._page.title && typeof this._page.title === 'function') {
          title = await this._page.title();
        }
        
        // console.log('[PageSnapshot] 📊 Page info from Playwright:', { url, title });
      } catch (e) {
        console.error('[PageSnapshot] ❌ Error getting page info from Playwright:', e);
      }
      
      // Try to get HTML content and viewport directly from page
      try {
        // Safely get HTML content if method exists
        if (this._page.content && typeof this._page.content === 'function') {
          const rawHtml = await this._page.content();
          html = extractStringFromCDPResponse(rawHtml);
          // console.log('[PageSnapshot] 📄 Got HTML content from Playwright, length:', html.length);
        } else {
          console.log('[PageSnapshot] ⚠️ content method not available, using default HTML');
        }
        
        // Safely check if viewportSize method exists and is a function
        if (this._page.viewportSize && typeof this._page.viewportSize === 'function') {
          const viewportSize = this._page.viewportSize();
          if (viewportSize) {
            viewport = viewportSize;
            console.log('[PageSnapshot] 📏 Got viewport from Playwright:', viewport);
          }
        } else {
          console.log('[PageSnapshot] ⚠️ viewportSize method not available, using default viewport');
        }
      } catch (e) {
        console.error('[PageSnapshot] ❌ Error getting page content from Playwright:', e);
      }
      
      // If CDP relay is available, try to get data from it as well
      if (this._cdpRelay && this._cdpRelay.getTargetInfo) {
        console.log('[PageSnapshot] 🔌 Using CDP relay for snapshot data');
        
        // Get target info for URL and title
        const targetInfo = this._cdpRelay.getTargetInfo();
        if (targetInfo) {
          // Only override if we have values and they're not about:blank
          if (targetInfo.url && targetInfo.url !== 'about:blank') {
            url = targetInfo.url;
          }
          if (targetInfo.title) {
            title = targetInfo.title;
          }
          console.log('[PageSnapshot] 📊 Target info from CDP relay:', { url, title });
        }
        
        // Try to get HTML content
        try {
          const htmlResult = await this._cdpRelay.sendCommand('Runtime.evaluate', { 
            expression: 'document.documentElement.outerHTML' 
          });
          if (htmlResult?.result?.value) {
            html = htmlResult.result.value;
            console.log('[PageSnapshot] 📄 Got HTML content from CDP relay, length:', html.length);
          }
        } catch (e) {
          console.error('[PageSnapshot] ❌ Error getting HTML from CDP relay:', e);
        }
        
        // Try to get viewport size
        try {
          const viewportResult = await this._cdpRelay.sendCommand('Runtime.evaluate', { 
            expression: 'JSON.stringify({width: window.innerWidth, height: window.innerHeight})' 
          });
          if (viewportResult?.result?.value) {
            viewport = JSON.parse(viewportResult.result.value);
            // console.log('[PageSnapshot] 📏 Got viewport from CDP relay:', viewport);
          }
        } catch (e) {
          console.error('[PageSnapshot] ❌ Error getting viewport from CDP relay:', e);
        }
      } else {
        // Fallback to Playwright's _snapshotForAI if direct methods failed (Chrome/Chromium only)
        console.log('[PageSnapshot] 🎭 Using Playwright _snapshotForAI as fallback');
        try {
          const snapshotData = await callOnPageNoTrace(this._page, page => {
            if (typeof (page as PageEx)._snapshotForAI === 'function') {
              return (page as PageEx)._snapshotForAI();
            }
            throw new Error('_snapshotForAI method not available in this browser');
          });
          console.log('[PageSnapshot] 📊 Snapshot data type:', typeof snapshotData);
          
          if (typeof snapshotData === 'object' && snapshotData !== null) {
            const snapshotObj = snapshotData as any;
            // Only override if we have values and current values are defaults
            if (snapshotObj.url && (url === 'about:blank')) {
              url = snapshotObj.url;
            }
            if (snapshotObj.title && (title === 'Unknown')) {
              title = snapshotObj.title;
            }
            if (snapshotObj.viewport) {
              viewport = snapshotObj.viewport;
            }
            if (snapshotObj.html && html === '<html><body>No content available</body></html>') {
              html = snapshotObj.html;
            }
            console.log('[PageSnapshot] 📝 Snapshot properties from _snapshotForAI:', { 
              url, 
              title, 
              viewport: viewport ? `${viewport.width}x${viewport.height}` : 'unknown',
              htmlLength: html.length
            });
          } else {
            console.log('[PageSnapshot] ⚠️ Snapshot is not an object:', snapshotData);
          }
        } catch (e) {
          console.error('[PageSnapshot] ❌ Error getting snapshot from _snapshotForAI:', e);
        }
      }
      
      // Format the snapshot data
      let accessibilityData = '';
      
      // Try to get accessibility data from _snapshotForAI (Chrome/Chromium only)
      try {
        const snapshotData = await callOnPageNoTrace(this._page, page => {
          if (typeof (page as PageEx)._snapshotForAI === 'function') {
            return (page as PageEx)._snapshotForAI();
          }
          throw new Error('_snapshotForAI method not available in this browser');
        });
        if (typeof snapshotData === 'object' && snapshotData !== null && (snapshotData as any).accessibility) {
          accessibilityData = (snapshotData as any).accessibility;
          console.log('[PageSnapshot] 📊 Got accessibility data from _snapshotForAI');
        }
      } catch (e) {
        console.error('[PageSnapshot] ❌ Error getting accessibility data:', e);
      }
      
      const snapshotText = [
        `url: ${url}`,
        `title: ${title}`,
        viewport ? `viewport: { width: ${viewport.width}, height: ${viewport.height} }` : '',
        `html: <truncated for brevity, length: ${html.length}>`
      ].filter(Boolean).join('\n');
      
      this._text = [
        `- Page Snapshot`,
        '```yaml',
        accessibilityData || snapshotText,
        '```',
      ].join('\n');
      
      // console.log('[PageSnapshot] ✅ Snapshot built successfully');
    } catch (error) {
      console.error('[PageSnapshot] ❌ Error building snapshot:', error);
      this._text = [
        `- Page Snapshot`,
        '```yaml',
        'Error: Failed to capture snapshot',
        '```',
      ].join('\n');
    }
  }

  refLocator(params: { element: string, ref: string }): playwright.Locator {
    return this._page.locator(`aria-ref=${params.ref}`).describe(params.element);
  }
}


