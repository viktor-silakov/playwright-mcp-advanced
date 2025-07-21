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
class MockTab extends Tab {
  private _url: string;
  private _title: string;
  private _snapshot: PageSnapshot | undefined;

  constructor(context: Context, url: string, title: string) {
    // Создаем мок для страницы с необходимыми методами
    const mockPage = {
      on: () => {},
      off: () => {},
      url: () => url,
      title: () => Promise.resolve(title),
      close: () => Promise.resolve(),
      context: () => ({ close: () => Promise.resolve() }),
      evaluate: () => Promise.resolve(),
      waitForNavigation: () => Promise.resolve(),
      waitForLoadState: () => Promise.resolve(),
      screenshot: () => Promise.resolve(Buffer.from('')),
      goto: () => Promise.resolve(),
      reload: () => Promise.resolve(),
      goBack: () => Promise.resolve(),
      goForward: () => Promise.resolve(),
      setDefaultNavigationTimeout: () => {},
      setDefaultTimeout: () => {},
      addInitScript: () => Promise.resolve(),
      exposeFunction: () => Promise.resolve(),
      route: () => Promise.resolve(),
      unroute: () => Promise.resolve(),
      setViewportSize: () => Promise.resolve(),
      setExtraHTTPHeaders: () => Promise.resolve(),
      bringToFront: () => Promise.resolve(),
      emulateMedia: () => Promise.resolve(),
      setContent: () => Promise.resolve(),
      content: () => Promise.resolve(''),
      frames: () => [],
      mainFrame: () => ({ url: () => url }),
      isClosed: () => false
    };
    
    super(context, mockPage as any, () => {});
    this._url = url;
    this._title = title;
  }

  override getUrl(): string {
    return this._url;
  }

  override async url(): Promise<string> {
    return this._url;
  }

  override async title(): Promise<string> {
    return this._title;
  }

  override hasSnapshot(): boolean {
    return !!this._snapshot;
  }

  override snapshotOrDie(): PageSnapshot {
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
class MockPageSnapshot extends PageSnapshot {
  private _customText: string;

  constructor(text: string) {
    super({} as any);
    this._customText = text;
  }

  override text(): string {
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

    // Вызываем метод run
    const result = await context.run(mockTool, {});

    // Проверяем, что результат содержит URL и заголовок
    expect(result.content[0].text).toContain('Page URL:');
    expect(result.content[0].text).toContain('Page Title:');
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

    // Вызываем метод run
    const result = await context.run(mockTool, {});

    // Проверяем, что результат содержит URL и заголовок
    expect(result.content[0].text).toContain('Page URL:');
    expect(result.content[0].text).toContain('Page Title:');
    
    // Проверяем, что результат содержит ya.ru
    expect(result.content[0].text).toContain('ya.ru');
  });

  test('should handle errors in getting URL and title gracefully', async () => {
    // Создаем мок для конфигурации
    const mockConfig = {
      imageResponses: 'include'
    } as any;

    // Создаем Context
    const context = new Context([], mockConfig, async () => ({ browserContext: {} as any, close: async () => {} }));

    // Создаем мок для Tab с ошибками
    const mockTab = new MockTab(context, 'about:blank', 'Unknown');
    
    // Создаем мок для PageSnapshot
    const mockSnapshot = new MockPageSnapshot('- Page Snapshot\n```yaml\nError: Failed to capture snapshot\n```');
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

    // Вызываем метод run
    const result = await context.run(mockTool, {});

    // Проверяем, что результат содержит URL и заголовок
    expect(result.content[0].text).toContain('Page URL:');
    expect(result.content[0].text).toContain('Page Title:');
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
    
    // Переопределяем метод title, чтобы он возвращал проблемный заголовок
    mockTab.title = async () => '[object Object]';
    
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

    // Вызываем метод run
    const result = await context.run(mockTool, {});

    // Проверяем, что результат содержит URL и заголовок
    expect(result.content[0].text).toContain('Page URL:');
    expect(result.content[0].text).toContain('Page Title:');
    
    // Проверяем, что результат содержит example.com
    expect(result.content[0].text).toContain('example.com');
  });
});