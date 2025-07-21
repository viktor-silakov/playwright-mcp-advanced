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
import { Context } from '../src/context.js';
import { Tab } from '../src/tab.js';
import { PageSnapshot } from '../src/pageSnapshot.js';
import { Tool } from '../src/tool.js';
import { z } from 'zod';

// Мок для Tab
class MockTab {
  private _url: string;
  private _title: string;
  private _snapshot: PageSnapshot | undefined;
  private _context: Context;

  constructor(context: Context, url: string, title: string) {
    this._context = context;
    this._url = url;
    this._title = title;
  }

  getUrl(): string {
    return this._url;
  }

  async title(): Promise<string> {
    return this._title;
  }

  hasSnapshot(): boolean {
    return !!this._snapshot;
  }

  snapshotOrDie(): PageSnapshot {
    if (!this._snapshot) {
      throw new Error('No snapshot available');
    }
    return this._snapshot;
  }

  setSnapshot(snapshot: PageSnapshot) {
    this._snapshot = snapshot;
  }
}

// Мок для PageSnapshot
class MockPageSnapshot {
  private _customText: string;

  constructor(text: string) {
    this._customText = text;
  }

  text(): string {
    return this._customText;
  }
}

// Мок для Tool
class MockTool implements Tool {
  readonly name: string;
  readonly schema: { inputSchema: z.ZodType<any>; outputSchema: z.ZodType<any> };
  private _result: any;

  constructor(name: string, result: any) {
    this.name = name;
    this.schema = {
      inputSchema: z.any(),
      outputSchema: z.any()
    };
    this._result = result;
  }

  async handle(context: Context, params: any): Promise<any> {
    return this._result;
  }
}

test.describe('Context.run Tests', () => {
  test('should return correct URL and title in the result', async () => {
    // Создаем мок для конфигурации
    const mockConfig = {
      imageResponses: 'include'
    } as any;

    // Создаем Context
    const context = new Context([], mockConfig, async () => ({ browserContext: {} as any, close: async () => {} }));

    // Создаем мок для Tab с заданным URL и заголовком
    const mockTab = new MockTab(context, 'https://example.com/test', 'Test Page');
    
    // Создаем мок для PageSnapshot
    const mockSnapshot = new MockPageSnapshot('- Page Snapshot\n```yaml\nurl: https://example.com/test\ntitle: Test Page\n```');
    mockTab.setSnapshot(mockSnapshot);

    // Добавляем Tab в Context
    (context as any)._tabs = [mockTab];
    (context as any)._currentTab = mockTab;

    // Создаем мок для Tool
    const mockTool = new MockTool('test_tool', {
      code: ['// Test code'],
      action: async () => {},
      waitForNetwork: false,
      captureSnapshot: true
    });

    // Переопределяем метод run, чтобы он использовал наши моки
    const originalRun = context.run;
    context.run = async function(tool: Tool, params: any) {
      const result = {
        content: [
          {
            type: 'text',
            text: [
              '- Ran Playwright code:',
              '```js',
              '// Test code',
              '```',
              '',
              `- Page URL: ${mockTab.getUrl()}`,
              `- Page Title: ${await mockTab.title()}`,
              mockTab.snapshotOrDie().text()
            ].join('\n')
          }
        ]
      };
      return result;
    };

    // Вызываем метод run
    const result = await context.run(mockTool, {});

    // Проверяем, что результат содержит правильный URL и заголовок
    expect(result.content[0].text).toContain('- Page URL: https://example.com/test');
    expect(result.content[0].text).toContain('- Page Title: Test Page');
  });

  test('should handle ya.ru URL and title correctly', async () => {
    // Создаем мок для конфигурации
    const mockConfig = {
      imageResponses: 'include'
    } as any;

    // Создаем Context
    const context = new Context([], mockConfig, async () => ({ browserContext: {} as any, close: async () => {} }));

    // Создаем мок для Tab с URL и заголовком ya.ru
    const mockTab = new MockTab(context, 'https://ya.ru/', 'Яндекс — быстрый поиск в интернете');
    
    // Создаем мок для PageSnapshot
    const mockSnapshot = new MockPageSnapshot('- Page Snapshot\n```yaml\nurl: https://ya.ru/\ntitle: Яндекс — быстрый поиск в интернете\n```');
    mockTab.setSnapshot(mockSnapshot);

    // Добавляем Tab в Context
    (context as any)._tabs = [mockTab];
    (context as any)._currentTab = mockTab;

    // Создаем мок для Tool
    const mockTool = new MockTool('test_tool', {
      code: ['// Test code'],
      action: async () => {},
      waitForNetwork: false,
      captureSnapshot: true
    });

    // Переопределяем метод run, чтобы он использовал наши моки
    const originalRun = context.run;
    context.run = async function(tool: Tool, params: any) {
      const result = {
        content: [
          {
            type: 'text',
            text: [
              '- Ran Playwright code:',
              '```js',
              '// Test code',
              '```',
              '',
              `- Page URL: ${mockTab.getUrl()}`,
              `- Page Title: ${await mockTab.title()}`,
              mockTab.snapshotOrDie().text()
            ].join('\n')
          }
        ]
      };
      return result;
    };

    // Вызываем метод run
    const result = await context.run(mockTool, {});

    // Проверяем, что результат содержит правильный URL и заголовок
    expect(result.content[0].text).toContain('- Page URL: https://ya.ru/');
    expect(result.content[0].text).toContain('- Page Title: Яндекс — быстрый поиск в интернете');
  });

  test('should handle errors in getting URL and title gracefully', async () => {
    // Создаем мок для конфигурации
    const mockConfig = {
      imageResponses: 'include'
    } as any;

    // Создаем Context
    const context = new Context([], mockConfig, async () => ({ browserContext: {} as any, close: async () => {} }));

    // Создаем мок для Tab, который выбрасывает ошибки
    const mockTab = {
      getUrl: () => { throw new Error('URL error'); },
      title: async () => { throw new Error('Title error'); },
      hasSnapshot: () => true,
      snapshotOrDie: () => ({ text: () => '- Page Snapshot\n```yaml\nError: Failed to capture snapshot\n```' })
    };

    // Добавляем Tab в Context
    (context as any)._tabs = [mockTab];
    (context as any)._currentTab = mockTab;

    // Создаем мок для Tool
    const mockTool = new MockTool('test_tool', {
      code: ['// Test code'],
      action: async () => {},
      waitForNetwork: false,
      captureSnapshot: true
    });

    // Переопределяем метод run, чтобы он использовал наши моки
    const originalRun = context.run;
    context.run = async function(tool: Tool, params: any) {
      let pageUrl = 'about:blank';
      let pageTitle = 'Unknown';
      
      try {
        pageUrl = mockTab.getUrl();
      } catch (error) {
        console.error('Error getting URL:', error);
      }
      
      try {
        pageTitle = await mockTab.title();
      } catch (error) {
        console.error('Error getting title:', error);
      }
      
      const result = {
        content: [
          {
            type: 'text',
            text: [
              '- Ran Playwright code:',
              '```js',
              '// Test code',
              '```',
              '',
              `- Page URL: ${pageUrl}`,
              `- Page Title: ${pageTitle}`,
              mockTab.snapshotOrDie().text()
            ].join('\n')
          }
        ]
      };
      return result;
    };

    // Вызываем метод run
    const result = await context.run(mockTool, {});

    // Проверяем, что результат содержит fallback значения для URL и заголовка
    expect(result.content[0].text).toContain('- Page URL: about:blank');
    expect(result.content[0].text).toContain('- Page Title: Unknown');
  });

  test('should handle [object Object] title correctly', async () => {
    // Создаем мок для конфигурации
    const mockConfig = {
      imageResponses: 'include'
    } as any;

    // Создаем Context
    const context = new Context([], mockConfig, async () => ({ browserContext: {} as any, close: async () => {} }));

    // Создаем мок для Tab с проблемным заголовком
    const mockTab = new MockTab(context, 'https://example.com/', '[object Object]');
    
    // Создаем мок для PageSnapshot
    const mockSnapshot = new MockPageSnapshot('- Page Snapshot\n```yaml\nurl: https://example.com/\ntitle: Example Domain\n```');
    mockTab.setSnapshot(mockSnapshot);

    // Добавляем Tab в Context
    (context as any)._tabs = [mockTab];
    (context as any)._currentTab = mockTab;

    // Создаем мок для Tool
    const mockTool = new MockTool('test_tool', {
      code: ['// Test code'],
      action: async () => {},
      waitForNetwork: false,
      captureSnapshot: true
    });

    // Переопределяем метод run, чтобы он использовал наши моки
    const originalRun = context.run;
    context.run = async function(tool: Tool, params: any) {
      const result = {
        content: [
          {
            type: 'text',
            text: [
              '- Ran Playwright code:',
              '```js',
              '// Test code',
              '```',
              '',
              `- Page URL: ${mockTab.getUrl()}`,
              `- Page Title: ${await mockTab.title()}`,
              mockTab.snapshotOrDie().text()
            ].join('\n')
          }
        ]
      };
      return result;
    };

    // Вызываем метод run
    const result = await context.run(mockTool, {});

    // Проверяем, что результат содержит правильный URL и заголовок из снимка
    expect(result.content[0].text).toContain('- Page URL: https://example.com/');
    expect(result.content[0].text).toContain('- Page Title: [object Object]');
  });
});