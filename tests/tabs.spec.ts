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

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function createTab(client: Client, title: string, body: string) {
  return await client.callTool({
    name: 'browser_tab_new',
    arguments: {
      url: `data:text/html,<title>${title}</title><body>${body}</body>`,
    },
  });
}

test('list initial tabs', async ({ client }) => {
  expect(await client.callTool({
    name: 'browser_tab_list',
  })).toHaveTextContent(`### Open tabs
- 0: (current) [] (about:blank)`);
});

test('list first tab', async ({ client }) => {
  await createTab(client, 'Tab one', 'Body one');
  expect(await client.callTool({
    name: 'browser_tab_list',
  })).toHaveTextContent(`### Open tabs
- 0: [] (about:blank)
- 1: (current) [Tab one] (data:text/html,<title>Tab one</title><body>Body one</body>)`);
});

test('create new tab', async ({ client }) => {
  // Создаем первую вкладку
  const tabOneResult = await createTab(client, 'Tab one', 'Body one');
  
  // Проверяем основные элементы ответа
  expect(tabOneResult).toContainTextContent('// <internal code to open a new tab>');
  expect(tabOneResult).toContainTextContent('### Open tabs');
  expect(tabOneResult).toContainTextContent('### Current tab');
  expect(tabOneResult).toContainTextContent('Page Title: Tab one');
  
  // Проверяем, что вкладка создана и активна
  const tabList1 = await client.callTool({ name: 'browser_tab_list' });
  expect(tabList1).toContainTextContent('- 1: (current)');
  expect(tabList1).toContainTextContent('[Tab one]');
  
  // Создаем вторую вкладку
  const tabTwoResult = await createTab(client, 'Tab two', 'Body two');
  
  // Проверяем основные элементы ответа
  expect(tabTwoResult).toContainTextContent('// <internal code to open a new tab>');
  expect(tabTwoResult).toContainTextContent('### Open tabs');
  expect(tabTwoResult).toContainTextContent('### Current tab');
  expect(tabTwoResult).toContainTextContent('Page Title: Tab two');
  
  // Проверяем, что вторая вкладка создана и активна
  const tabList2 = await client.callTool({ name: 'browser_tab_list' });
  expect(tabList2).toContainTextContent('- 2: (current)');
  expect(tabList2).toContainTextContent('[Tab two]');
});

test('select tab', async ({ client }) => {
  // Создаем две вкладки
  await createTab(client, 'Tab one', 'Body one');
  await createTab(client, 'Tab two', 'Body two');
  
  // Проверяем, что вторая вкладка активна
  let tabList = await client.callTool({ name: 'browser_tab_list' });
  expect(tabList).toContainTextContent('- 2: (current)');
  
  // Выбираем первую вкладку
  const selectResult = await client.callTool({
    name: 'browser_tab_select',
    arguments: {
      index: 1,
    },
  });
  
  // Проверяем основные элементы ответа
  expect(selectResult).toContainTextContent('// <internal code to select tab 1>');
  expect(selectResult).toContainTextContent('### Open tabs');
  expect(selectResult).toContainTextContent('### Current tab');
  
  // Проверяем, что первая вкладка стала активной
  tabList = await client.callTool({ name: 'browser_tab_list' });
  expect(tabList).toContainTextContent('- 1: (current)');
  expect(tabList).toContainTextContent('[Tab one]');
  
  // Проверяем, что содержимое соответствует первой вкладке
  const snapshot = await client.callTool({ name: 'browser_snapshot' });
  expect(snapshot).toContainTextContent('Page Title: Tab one');
});

test('close tab', async ({ client }) => {
  // Создаем две вкладки
  await createTab(client, 'Tab one', 'Body one');
  await createTab(client, 'Tab two', 'Body two');
  
  // Проверяем, что у нас есть две вкладки (плюс начальная)
  let tabList = await client.callTool({ name: 'browser_tab_list' });
  expect(tabList).toContainTextContent('- 0:');
  expect(tabList).toContainTextContent('- 1:');
  expect(tabList).toContainTextContent('- 2: (current)');
  
  // Закрываем вторую вкладку
  const closeResult = await client.callTool({
    name: 'browser_tab_close',
    arguments: {
      index: 2,
    },
  });
  
  // Проверяем основные элементы ответа
  expect(closeResult).toContainTextContent('// <internal code to close tab 2>');
  expect(closeResult).toContainTextContent('### Open tabs');
  
  // Проверяем, что вторая вкладка закрыта и первая стала активной
  tabList = await client.callTool({ name: 'browser_tab_list' });
  expect(tabList).not.toContainTextContent('- 2:');
  expect(tabList).toContainTextContent('- 1: (current)');
  
  // Проверяем, что содержимое соответствует первой вкладке
  const snapshot = await client.callTool({ name: 'browser_snapshot' });
  expect(snapshot).toContainTextContent('Page Title: Tab one');
});

test.skip('reuse first tab when navigating', async ({ startClient, cdpServer, server }) => {
  const browserContext = await cdpServer.start();
  const pages = browserContext.pages();

  const { client } = await startClient({ args: [`--cdp-endpoint=${cdpServer.endpoint}`] });
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });

  expect(pages.length).toBe(1);
  expect(await pages[0].title()).toBe('Title');
});
