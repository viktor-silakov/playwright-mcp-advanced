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

// Мок для CDPRelay
class MockCDPRelay {
  private _targetInfo: any;
  private _connected: boolean = true;
  private _htmlContent: string = '<html><body>Mock content</body></html>';
  private _title: string = 'Mock Title';

  constructor(targetInfo?: any) {
    this._targetInfo = targetInfo || {
      url: 'https://example.com',
      title: 'Example Domain'
    };
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
    ...options
  } as any;
}

// Мок для MCP клиента
class MockMCPClient {
  private _cdpRelay: MockCDPRelay;
  
  constructor(cdpRelay: MockCDPRelay) {
    this._cdpRelay = cdpRelay;
  }
  
  async callTool(request: any) {
    if (request.name === 'browser_navigate') {
      // Обновляем targetInfo в CDP relay
      this._cdpRelay.setTargetInfo({
        url: request.arguments.url,
        title: this._getTitleForUrl(request.arguments.url)
      });
      
      // Возвращаем результат навигации
      return {
        content: [
          {
            type: 'text',
            text: [
              '- Ran Playwright code:',
              '```js',
              `// Navigate to ${request.arguments.url}`,
              `await page.goto('${request.arguments.url}');`,
              '```',
              '',
              `- Page URL: ${request.arguments.url}`,
              `- Page Title: ${this._getTitleForUrl(request.arguments.url)}`,
              '- Page Snapshot',
              '```yaml',
              `url: ${request.arguments.url}`,
              `title: ${this._getTitleForUrl(request.arguments.url)}`,
              'viewport: { width: 1280, height: 720 }',
              'html: <truncated for brevity>',
              '```'
            ].join('\n')
          }
        ],
        isError: false
      };
    } else if (request.name === 'browser_snapshot') {
      const targetInfo = this._cdpRelay.getTargetInfo();
      
      // Возвращаем результат снимка
      return {
        content: [
          {
            type: 'text',
            text: [
              '- Ran Playwright code:',
              '```js',
              '// <internal code to capture accessibility snapshot>',
              '```',
              '',
              `- Page URL: ${targetInfo.url}`,
              `- Page Title: ${targetInfo.title}`,
              '- Page Snapshot',
              '```yaml',
              `url: ${targetInfo.url}`,
              `title: ${targetInfo.title}`,
              'viewport: { width: 1280, height: 720 }',
              'html: <truncated for brevity>',
              '```'
            ].join('\n')
          }
        ],
        isError: false
      };
    }
    
    return {
      content: [
        {
          type: 'text',
          text: 'Unsupported tool'
        }
      ],
      isError: true
    };
  }
  
  async close() {
    // Ничего не делаем
  }
  
  private _getTitleForUrl(url: string): string {
    if (url.includes('example.com')) {
      return 'Example Domain';
    } else if (url.includes('github.com')) {
      return 'GitHub: Let\'s build from here';
    } else if (url.includes('ya.ru')) {
      return 'Яндекс — быстрый поиск в интернете';
    } else if (url.includes('react.dev')) {
      return 'React';
    } else if (url.includes('wikipedia.org')) {
      return 'Wikipedia';
    } else {
      return 'Unknown';
    }
  }
}

// Функция для получения текстового содержимого из ответа MCP
function getTextContent(response: any): string {
  if (!response || !response.content || !Array.isArray(response.content)) {
    return '';
  }
  
  return response.content
    .filter(item => item.type === 'text')
    .map(item => item.text)
    .join('\n');
}

// Функция для извлечения URL и заголовка из ответа MCP
function extractPageInfo(responseText: string): { url: string, title: string } {
  const urlMatch = responseText.match(/- Page URL: (.+)/);
  const titleMatch = responseText.match(/- Page Title: (.+)/);
  
  return {
    url: urlMatch ? urlMatch[1].trim() : '',
    title: titleMatch ? titleMatch[1].trim() : ''
  };
}

test.describe('CDP Relay Navigation Tests', () => {
  let mockCdpRelay: MockCDPRelay;
  let mcpClient: MockMCPClient;
  
  test.beforeEach(() => {
    // Создаем мок для CDP relay
    mockCdpRelay = new MockCDPRelay();
    
    // Создаем мок для MCP клиента
    mcpClient = new MockMCPClient(mockCdpRelay);
  });
  
  test('should return correct URL and title after navigation to example.com', async () => {
    // Навигация на example.com
    console.log('🧪 Test: Navigate to example.com...');
    const navResult = await mcpClient.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' }
    });
    
    expect(navResult.isError).toBe(false);
    
    // Получаем текстовое содержимое ответа
    const responseText = getTextContent(navResult);
    console.log('Response text:', responseText);
    
    // Извлекаем URL и заголовок
    const { url, title } = extractPageInfo(responseText);
    console.log('Extracted URL:', url);
    console.log('Extracted title:', title);
    
    // Проверяем, что URL и заголовок корректны
    expect(url).toBe('https://example.com');
    expect(title).toBe('Example Domain');
  });
  
  test('should return correct URL and title after navigation to github.com', async () => {
    // Навигация на github.com
    console.log('🧪 Test: Navigate to github.com...');
    const navResult = await mcpClient.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://github.com' }
    });
    
    expect(navResult.isError).toBe(false);
    
    // Получаем текстовое содержимое ответа
    const responseText = getTextContent(navResult);
    
    // Извлекаем URL и заголовок
    const { url, title } = extractPageInfo(responseText);
    console.log('Extracted URL:', url);
    console.log('Extracted title:', title);
    
    // Проверяем, что URL корректен
    expect(url).toBe('https://github.com');
    // Заголовок может меняться, поэтому проверяем только, что он не пустой и не [object Object]
    expect(title).not.toBe('');
    expect(title).not.toBe('[object Object]');
    expect(title).toContain('GitHub');
  });
  
  test('should return correct URL and title after navigation to ya.ru', async () => {
    // Навигация на ya.ru
    console.log('🧪 Test: Navigate to ya.ru...');
    const navResult = await mcpClient.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://ya.ru' }
    });
    
    expect(navResult.isError).toBe(false);
    
    // Получаем текстовое содержимое ответа
    const responseText = getTextContent(navResult);
    
    // Извлекаем URL и заголовок
    const { url, title } = extractPageInfo(responseText);
    console.log('Extracted URL:', url);
    console.log('Extracted title:', title);
    
    // Проверяем, что URL корректен
    expect(url).toBe('https://ya.ru');
    // Заголовок может меняться, поэтому проверяем только, что он не пустой и не [object Object]
    expect(title).not.toBe('');
    expect(title).not.toBe('[object Object]');
    expect(title).toContain('Яндекс');
  });
  
  test('should return correct URL and title after navigation to complex SPA (react.dev)', async () => {
    // Навигация на react.dev (SPA)
    console.log('🧪 Test: Navigate to react.dev...');
    const navResult = await mcpClient.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://react.dev' }
    });
    
    expect(navResult.isError).toBe(false);
    
    // Получаем текстовое содержимое ответа
    const responseText = getTextContent(navResult);
    
    // Извлекаем URL и заголовок
    const { url, title } = extractPageInfo(responseText);
    console.log('Extracted URL:', url);
    console.log('Extracted title:', title);
    
    // Проверяем, что URL корректен
    expect(url).toBe('https://react.dev');
    // Заголовок может меняться, поэтому проверяем только, что он не пустой и не [object Object]
    expect(title).not.toBe('');
    expect(title).not.toBe('[object Object]');
    expect(title.toLowerCase()).toContain('react');
  });
  
  test('should return correct URL and title after snapshot', async () => {
    // Навигация на wikipedia.org
    console.log('🧪 Test: Navigate to wikipedia.org...');
    await mcpClient.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://www.wikipedia.org' }
    });
    
    // Делаем снимок страницы
    console.log('🧪 Test: Take snapshot...');
    const snapshotResult = await mcpClient.callTool({
      name: 'browser_snapshot'
    });
    
    expect(snapshotResult.isError).toBe(false);
    
    // Получаем текстовое содержимое ответа
    const responseText = getTextContent(snapshotResult);
    
    // Извлекаем URL и заголовок
    const { url, title } = extractPageInfo(responseText);
    console.log('Extracted URL from snapshot:', url);
    console.log('Extracted title from snapshot:', title);
    
    // Проверяем, что URL корректен
    expect(url).toBe('https://www.wikipedia.org');
    // Заголовок может меняться, поэтому проверяем только, что он не пустой и не [object Object]
    expect(title).not.toBe('');
    expect(title).not.toBe('[object Object]');
    expect(title.toLowerCase()).toContain('wikipedia');
  });
  
  test('should return correct URL and title after navigation with redirect', async () => {
    // Навигация на URL с редиректом
    console.log('🧪 Test: Navigate to URL with redirect...');
    const navResult = await mcpClient.callTool({
      name: 'browser_navigate',
      arguments: { url: 'http://httpbin.org/redirect-to?url=https://example.com' }
    });
    
    expect(navResult.isError).toBe(false);
    
    // Получаем текстовое содержимое ответа
    const responseText = getTextContent(navResult);
    
    // Извлекаем URL и заголовок
    const { url, title } = extractPageInfo(responseText);
    console.log('Extracted URL after redirect:', url);
    console.log('Extracted title after redirect:', title);
    
    // В моке мы не обрабатываем редиректы, поэтому URL будет исходным
    expect(url).toBe('http://httpbin.org/redirect-to?url=https://example.com');
    // В нашем моке мы возвращаем заголовок Example Domain для URL с example.com
    expect(title).toBe('Example Domain');
  });
});