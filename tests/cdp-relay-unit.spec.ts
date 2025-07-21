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

import { test, expect } from './fixtures.js';
import { CDPRelay } from '../src/cdp-relay.js';
import { CdpRelayContextFactory } from '../src/browserContextFactory.js';
import { Tab } from '../src/tab.js';
import { Context } from '../src/context.js';
import { PageSnapshot } from '../src/pageSnapshot.js';

// Создаем функцию для создания мока страницы
function createMockPage(options: any = {}) {
  return {
    url: () => options.url || 'about:blank',
    title: () => Promise.resolve(options.title || 'Unknown'),
    _cdpRelay: options.cdpRelay,
    on: () => {}, // Добавляем мок для метода on
    off: () => {},
    once: () => {},
    addListener: () => {},
    removeListener: () => {},
    emit: () => {},
    setDefaultNavigationTimeout: () => {}, // Добавляем мок для метода setDefaultNavigationTimeout
    setDefaultTimeout: () => {}, // Добавляем мок для метода setDefaultTimeout
    _wrapApiCall: (callback) => callback(), // Добавляем мок для _wrapApiCall
    ...options
  } as any;
}

// Мок для CDPRelay
class MockCDPRelay {
  private _targetInfo: any;
  private _connected: boolean = true;
  private _htmlContent: string = '<html><body>Mock content</body></html>';
  private _title: string = 'Mock Title';
  private _throwError: boolean = false;

  constructor(targetInfo?: any, throwError: boolean = false) {
    this._targetInfo = targetInfo || {
      url: 'https://example.com',
      title: 'Example Domain'
    };
    this._throwError = throwError;
  }

  isConnected() {
    return this._connected;
  }

  getTargetInfo() {
    return this._targetInfo;
  }

  setTargetInfo(targetInfo: any) {
    this._targetInfo = targetInfo;
  }

  getCdpUrl() {
    return 'ws://localhost:9222/cdp';
  }

  getServerUrl() {
    return 'ws://localhost:9222/extension';
  }

  async sendCommand(method: string, params?: any, sessionId?: string) {
    if (this._throwError) {
      throw new Error('Test error');
    }
    
    if (method === 'Runtime.evaluate') {
      if (params?.expression === 'document.documentElement.outerHTML') {
        return { result: { value: this._htmlContent } };
      }
      if (params?.expression === 'document.title') {
        return { result: { value: this._title } };
      }
      if (params?.expression.includes('window.innerWidth')) {
        return { result: { value: '{"width":1280,"height":720}' } };
      }
    }
    return { result: {} };
  }

  setHtmlContent(html: string) {
    this._htmlContent = html;
  }

  setTitle(title: string) {
    this._title = title;
  }

  setConnected(connected: boolean) {
    this._connected = connected;
  }
}

test.describe('CDP Relay Unit Tests', () => {
  test('Tab should get correct URL from CDP relay', async () => {
    // Создаем мок CDP relay с заданным URL и заголовком
    const mockCdpRelay = new MockCDPRelay({
      url: 'https://example.com/test',
      title: 'Test Page'
    });

    // Создаем мок для страницы
    const mockPage = createMockPage({ cdpRelay: mockCdpRelay });

    // Создаем Tab с моком страницы
    const tab = new Tab({} as Context, mockPage, () => {});

    // Проверяем, что Tab.getUrl() возвращает URL из CDP relay
    const url = tab.getUrl();
    expect(url).toBe('https://example.com/test');
  });

  test('Tab should get correct title from CDP relay', async () => {
    // Создаем мок CDP relay с заданным URL и заголовком
    const mockCdpRelay = new MockCDPRelay({
      url: 'https://example.com/test',
      title: 'Test Page'
    });

    // Создаем мок для страницы
    const mockPage = createMockPage({
      cdpRelay: mockCdpRelay,
      title: () => Promise.resolve('[object Object]')
    });

    // Создаем Tab с моком страницы
    const tab = new Tab({} as Context, mockPage, () => {});

    // Проверяем, что Tab.title() возвращает заголовок из CDP relay
    const title = await tab.title();
    expect(title).toBe('Test Page');
  });

  test('Tab should fallback to page.url() when CDP relay is not available', async () => {
    // Создаем мок для страницы без CDP relay
    const mockPage = createMockPage({ 
      url: () => 'https://example.com/fallback',
      _cdpRelay: undefined
    });

    // Создаем Tab с моком страницы
    const tab = new Tab({} as Context, mockPage, () => {});

    // Проверяем, что Tab.getUrl() возвращает URL из page.url()
    const url = tab.getUrl();
    expect(url).toBe('https://example.com/fallback');
  });

  test('Tab should fallback to page.title() when CDP relay is not available', async () => {
    // Создаем мок для страницы без CDP relay
    const mockPage = createMockPage({ 
      title: () => Promise.resolve('Fallback Title'),
      _cdpRelay: undefined
    });

    // Создаем Tab с моком страницы
    const tab = new Tab({} as Context, mockPage, () => {});

    // Проверяем, что Tab.title() возвращает заголовок из page.title()
    const title = await tab.title();
    expect(title).toBe('Fallback Title');
  });

  test('PageSnapshot should get correct data from CDP relay', async () => {
    // Создаем мок CDP relay с заданным URL и заголовком
    const mockCdpRelay = new MockCDPRelay({
      url: 'https://example.com/snapshot',
      title: 'Snapshot Page'
    });

    // Устанавливаем HTML контент
    mockCdpRelay.setHtmlContent('<html><body><h1>Snapshot Test</h1></body></html>');

    // Создаем мок для страницы
    const mockPage = createMockPage({ cdpRelay: mockCdpRelay });

    // Создаем PageSnapshot с моком страницы и CDP relay
    const snapshot = await PageSnapshot.create(mockPage, mockCdpRelay);

    // Проверяем, что снимок содержит правильный URL и заголовок
    const snapshotText = snapshot.text();
    expect(snapshotText).toContain('url: https://example.com/snapshot');
    expect(snapshotText).toContain('title: Snapshot Page');
  });

  test('PageSnapshot should handle errors gracefully', async () => {
    // Создаем мок CDP relay, который будет выбрасывать ошибку
    const mockCdpRelay = new MockCDPRelay({}, true);

    // Создаем мок для страницы
    const mockPage = createMockPage({
      cdpRelay: mockCdpRelay,
      url: () => { throw new Error('Test error'); }
    });

    // Создаем PageSnapshot с моком страницы и CDP relay
    const snapshot = await PageSnapshot.create(mockPage, mockCdpRelay);

    // Проверяем, что снимок содержит сообщение об ошибке или fallback значения
    const snapshotText = snapshot.text();
    
    // Проверяем, что снимок содержит либо сообщение об ошибке, либо fallback значения
    expect(
      snapshotText.includes('Error: Failed to capture snapshot') || 
      (snapshotText.includes('url: about:blank') && snapshotText.includes('title: Unknown'))
    ).toBe(true);
  });

  test('Tab should handle ya.ru URL and title correctly', async () => {
    // Создаем мок CDP relay с URL и заголовком ya.ru
    const mockCdpRelay = new MockCDPRelay({
      url: 'https://ya.ru/',
      title: 'Яндекс — быстрый поиск в интернете'
    });

    // Создаем мок для страницы
    const mockPage = createMockPage({ cdpRelay: mockCdpRelay });

    // Создаем Tab с моком страницы
    const tab = new Tab({} as Context, mockPage, () => {});

    // Проверяем URL
    const url = tab.getUrl();
    expect(url).toBe('https://ya.ru/');

    // Проверяем заголовок
    const title = await tab.title();
    expect(title).toBe('Яндекс — быстрый поиск в интернете');
  });

  test('Tab should handle github.com URL and title correctly', async () => {
    // Создаем мок CDP relay с URL и заголовком github.com
    const mockCdpRelay = new MockCDPRelay({
      url: 'https://github.com/',
      title: 'GitHub: Let\'s build from here'
    });

    // Создаем мок для страницы
    const mockPage = createMockPage({ cdpRelay: mockCdpRelay });

    // Создаем Tab с моком страницы
    const tab = new Tab({} as Context, mockPage, () => {});

    // Проверяем URL
    const url = tab.getUrl();
    expect(url).toBe('https://github.com/');

    // Проверяем заголовок
    const title = await tab.title();
    expect(title).toBe('GitHub: Let\'s build from here');
  });
});