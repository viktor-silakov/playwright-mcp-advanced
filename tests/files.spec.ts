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
import fs from 'fs/promises';

test.skip('browser_file_upload', async ({ client, server }, testInfo) => {
  server.setContent('/', `
    <input type="file" />
    <button>Button</button>
  `, 'text/html');

  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  // Проверяем, что без модального состояния загрузка файла не работает
  const uploadWithoutModal = await client.callTool({
    name: 'browser_file_upload',
    arguments: { paths: [] },
  });
  
  expect(uploadWithoutModal).toContainTextContent('The tool "browser_file_upload" can only be used when there is related modal state present');

  // Кликаем по элементу выбора файла, чтобы открыть диалог выбора файла
  const clickResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Choose File',
      ref: 'e2', // Используем фиксированный ref для элемента выбора файла
    },
  });
  
  // Проверяем, что появился диалог выбора файла
  expect(clickResult).toContainTextContent('### Modal state');
  expect(clickResult).toContainTextContent('[File chooser]');

  // Создаем тестовый файл
  const filePath = testInfo.outputPath('test.txt');
  await fs.writeFile(filePath, 'Hello, world!');

  // Загружаем файл
  const uploadResult = await client.callTool({
    name: 'browser_file_upload',
    arguments: {
      paths: [filePath],
    },
  });

  // Проверяем, что диалог выбора файла был обработан
  expect(uploadResult).not.toContainTextContent('### Modal state');

  // Снова кликаем по элементу выбора файла
  const clickAgainResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Choose File',
      ref: 'e2',
    },
  });

  // Проверяем, что снова появился диалог выбора файла
  expect(clickAgainResult).toContainTextContent('[File chooser]');

  // Пытаемся кликнуть по другой кнопке, когда открыт диалог выбора файла
  const clickButtonResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Button',
      ref: 'e3',
    },
  });

  // Проверяем, что клик не выполнен из-за открытого диалога
  expect(clickButtonResult).toContainTextContent('Tool "browser_click" does not handle the modal state');
});

test.skip('clicking on download link emits download', async ({ startClient, server, mcpMode }, testInfo) => {
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output') },
  });

  server.setContent('/', `<a href="/download" download="test.txt">Download</a>`, 'text/html');
  server.setContent('/download', 'Data', 'text/plain');

  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  
  // Кликаем по ссылке для скачивания
  await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Download',
      ref: 'e2', // Используем фиксированный ref для ссылки
    },
  });
  
  // Проверяем, что файл был скачан
  // Используем poll для ожидания завершения скачивания
  await expect.poll(() => client.callTool({ name: 'browser_snapshot' }))
    .toContainTextContent('### Downloads');
});

test.skip('navigating to download link emits download', async ({ startClient, server, mcpBrowser, mcpMode }, testInfo) => {
  // Пропускаем тест для WebKit на Linux из-за известной проблемы
  test.skip(mcpBrowser === 'webkit' && process.platform === 'linux', 'https://github.com/microsoft/playwright/blob/8e08fdb52c27bb75de9bf87627bf740fadab2122/tests/library/download.spec.ts#L436');
  
  // Пропускаем тест для режима расширения
  test.skip(mcpMode === 'extension', 'Downloads are not supported in extension mode');
  
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output') },
  });
  
  // Настраиваем маршрут для скачивания файла
  server.route('/download', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename=test.txt',
    });
    res.end('Hello world!');
  });

  // Навигация на страницу скачивания
  const navResult = await client.callTool({
    name: 'browser_navigate',
    arguments: {
      url: server.PREFIX + 'download',
    },
  });
  
  // Проверяем, что файл был скачан
  expect(navResult).toContainTextContent('### Downloads');
});
