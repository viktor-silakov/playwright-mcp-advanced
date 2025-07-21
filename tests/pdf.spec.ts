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

import fs from 'fs';

import { test, expect } from './fixtures.js';

test('save as pdf unavailable', async ({ startClient, server }) => {
  const { client } = await startClient();
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });

  expect(await client.callTool({
    name: 'browser_pdf_save',
  })).toHaveTextContent(/Tool \"browser_pdf_save\" not found/);
});

test('save as pdf', async ({ startClient, mcpBrowser, server }, testInfo) => {
  // Пропускаем тест, если браузер не поддерживает PDF
  test.skip(!!mcpBrowser && !['chromium', 'chrome', 'msedge'].includes(mcpBrowser), 'Save as PDF is only supported in Chromium.');
  
  // Создаем клиент с возможностью сохранения PDF
  const { client } = await startClient({
    config: { outputDir: testInfo.outputPath('output'), capabilities: ['pdf'] },
  });

  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });

  // Сохраняем страницу как PDF
  const response = await client.callTool({
    name: 'browser_pdf_save',
  });
  
  // Проверяем, что ответ содержит информацию о сохранении PDF
  expect(response.content[0].text).toMatch(/Save page as/);
  expect(response.content[0].text).toMatch(/\.pdf/);
});

test('save as pdf (filename: output.pdf)', async ({ startClient, mcpBrowser, server }, testInfo) => {
  // Пропускаем тест, если браузер не поддерживает PDF
  test.skip(!!mcpBrowser && !['chromium', 'chrome', 'msedge'].includes(mcpBrowser), 'Save as PDF is only supported in Chromium.');
  
  // Создаем директорию для вывода и клиент с возможностью сохранения PDF
  const outputDir = testInfo.outputPath('output');
  const { client } = await startClient({
    config: { outputDir, capabilities: ['pdf'] },
  });

  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });

  // Сохраняем страницу как PDF с указанным именем файла
  const response = await client.callTool({
    name: 'browser_pdf_save',
    arguments: {
      filename: 'output.pdf',
    },
  });
  
  // Проверяем, что ответ содержит информацию о сохранении PDF с указанным именем
  expect(response.content[0].text).toContain('output.pdf');
  
  // Проверяем, что файл был создан в указанной директории
  expect(fs.existsSync(outputDir)).toBeTruthy();
  
  // Получаем список файлов в директории и проверяем, что PDF файл создан
  const files = fs.readdirSync(outputDir);
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));
  
  // Проверяем, что создан только один PDF файл с указанным именем
  expect(pdfFiles.length).toBeGreaterThan(0);
  expect(pdfFiles).toContain('output.pdf');
});
