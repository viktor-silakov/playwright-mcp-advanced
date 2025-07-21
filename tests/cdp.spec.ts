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

import url from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test, expect } from './fixtures.js';

test('cdp server', async ({ cdpServer, startClient, server }) => {
  // Запускаем CDP сервер
  await cdpServer.start();
  
  // Запускаем клиент с подключением к CDP серверу
  const { client } = await startClient({ args: [`--cdp-endpoint=${cdpServer.endpoint}`] });
  
  // Навигация на страницу
  const navResult = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });
  
  // Проверяем, что навигация выполнена успешно
  expect(navResult).toBeDefined();
  
  // Проверяем только URL страницы
  expect(navResult.content[0].text).toContain(server.HELLO_WORLD);
});

test('cdp server reuse tab', async ({ cdpServer, startClient, server }) => {
  // Запускаем CDP сервер и получаем контекст браузера
  const browserContext = await cdpServer.start();
  
  // Запускаем клиент с подключением к CDP серверу
  const { client } = await startClient({ args: [`--cdp-endpoint=${cdpServer.endpoint}`] });

  // Открываем страницу напрямую через CDP
  const [page] = browserContext.pages();
  await page.goto(server.HELLO_WORLD);

  // Пытаемся кликнуть по элементу без предварительного снимка
  const clickResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Hello, world!',
      ref: 'f0',
    },
  });
  
  // Проверяем, что получили ошибку о необходимости снимка
  expect(clickResult.content[0].text).toContain('No current snapshot available');

  // Делаем снимок страницы
  const snapshot = await client.callTool({
    name: 'browser_snapshot',
  });
  
  // Проверяем, что снимок содержит ожидаемую информацию
  expect(snapshot.content[0].text).toContain('Page URL:');
  expect(snapshot.content[0].text).toContain('Page Title:');
});

test('should throw connection error and allow re-connecting', async ({ cdpServer, startClient, server }) => {
  // Запускаем клиент с подключением к CDP серверу (который еще не запущен)
  const { client } = await startClient({ args: [`--cdp-endpoint=${cdpServer.endpoint}`] });

  // Устанавливаем содержимое страницы на сервере
  server.setContent('/', `
    <title>Title</title>
    <body>Hello, world!</body>
  `, 'text/html');

  // Пытаемся выполнить навигацию без запущенного CDP сервера
  const errorResult = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  
  // Проверяем, что получили ошибку подключения
  expect(errorResult.content[0].text).toContain('Error:');
  
  // Запускаем CDP сервер
  await cdpServer.start();
  
  // Повторно пытаемся выполнить навигацию
  const navResult = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  
  // Проверяем, что навигация выполнена успешно
  expect(navResult).toBeDefined();
  
  // Проверяем URL страницы
  expect(navResult.content[0].text).toContain(server.PREFIX);
});

// NOTE: Can be removed when we drop Node.js 18 support and changed to import.meta.filename.
const __filename = url.fileURLToPath(import.meta.url);

test('does not support --device', async () => {
  const result = spawnSync('node', [
    path.join(__filename, '../../cli.js'), '--device=Pixel 5', '--cdp-endpoint=http://localhost:1234',
  ]);
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stderr.toString()).toContain('Device emulation is not supported with cdpEndpoint.');
});
