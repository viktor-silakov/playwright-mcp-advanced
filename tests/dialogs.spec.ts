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

test('alert dialog', async ({ client, server }) => {
  server.setContent('/', `<button onclick="alert('Alert')">Button</button>`, 'text/html');
  
  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  
  // Кликаем по кнопке, что вызовет диалог
  const clickResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Button',
      ref: 'e2', // Используем фиксированный ref, так как кнопка всегда будет первым элементом
    },
  });
  
  // Проверяем, что появился диалог
  expect(clickResult).toContainTextContent('### Modal state');
  expect(clickResult).toContainTextContent('["alert" dialog with message "Alert"]');
  
  // Обрабатываем диалог
  const dialogResult = await client.callTool({
    name: 'browser_handle_dialog',
    arguments: {
      accept: true,
    },
  });
  
  // Проверяем, что диалог был обработан
  expect(dialogResult).not.toContainTextContent('### Modal state');
  expect(dialogResult).toContainTextContent('// <internal code to handle "alert" dialog>');
});

test('two alert dialogs', async ({ client, server }) => {
  server.setContent('/', `
    <title>Title</title>
    <body>
      <button onclick="alert('Alert 1');alert('Alert 2');">Button</button>
    </body>
  `, 'text/html');

  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  
  // Кликаем по кнопке, что вызовет первый диалог
  const clickResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Button',
      ref: 'e2', // Используем фиксированный ref, так как кнопка всегда будет первым элементом
    },
  });
  
  // Проверяем, что появился первый диалог
  expect(clickResult).toContainTextContent('### Modal state');
  expect(clickResult).toContainTextContent('["alert" dialog with message "Alert 1"]');
  
  // Обрабатываем первый диалог
  const dialogResult1 = await client.callTool({
    name: 'browser_handle_dialog',
    arguments: {
      accept: true,
    },
  });
  
  // Проверяем, что появился второй диалог
  expect(dialogResult1).toContainTextContent('### Modal state');
  expect(dialogResult1).toContainTextContent('["alert" dialog with message "Alert 2"]');
  
  // Обрабатываем второй диалог
  const dialogResult2 = await client.callTool({
    name: 'browser_handle_dialog',
    arguments: {
      accept: true,
    },
  });
  
  // Проверяем, что все диалоги обработаны
  expect(dialogResult2).not.toContainTextContent('### Modal state');
});

test('confirm dialog (true)', async ({ client, server }) => {
  server.setContent('/', `
    <title>Title</title>
    <body>
      <button onclick="document.body.textContent = confirm('Confirm')">Button</button>
    </body>
  `, 'text/html');

  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  
  // Кликаем по кнопке, что вызовет диалог подтверждения
  const clickResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Button',
      ref: 'e2', // Используем фиксированный ref, так как кнопка всегда будет первым элементом
    },
  });
  
  // Проверяем, что появился диалог подтверждения
  expect(clickResult).toContainTextContent('### Modal state');
  expect(clickResult).toContainTextContent('["confirm" dialog with message "Confirm"]');
  
  // Принимаем диалог (нажимаем OK)
  const dialogResult = await client.callTool({
    name: 'browser_handle_dialog',
    arguments: {
      accept: true,
    },
  });
  
  // Проверяем, что диалог был обработан
  expect(dialogResult).not.toContainTextContent('### Modal state');
  expect(dialogResult).toContainTextContent('// <internal code to handle "confirm" dialog>');
});

test('confirm dialog (false)', async ({ client, server }) => {
  server.setContent('/', `
    <title>Title</title>
    <body>
      <button onclick="document.body.textContent = confirm('Confirm')">Button</button>
    </body>
  `, 'text/html');

  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  
  // Кликаем по кнопке, что вызовет диалог подтверждения
  const clickResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Button',
      ref: 'e2', // Используем фиксированный ref, так как кнопка всегда будет первым элементом
    },
  });
  
  // Проверяем, что появился диалог подтверждения
  expect(clickResult).toContainTextContent('### Modal state');
  expect(clickResult).toContainTextContent('["confirm" dialog with message "Confirm"]');
  
  // Отклоняем диалог (нажимаем Cancel)
  const dialogResult = await client.callTool({
    name: 'browser_handle_dialog',
    arguments: {
      accept: false,
    },
  });
  
  // Проверяем, что диалог был обработан
  expect(dialogResult).not.toContainTextContent('### Modal state');
  expect(dialogResult).toContainTextContent('// <internal code to handle "confirm" dialog>');
});

test('prompt dialog', async ({ client, server }) => {
  server.setContent('/', `
    <title>Title</title>
    <body>
      <button onclick="document.body.textContent = prompt('Prompt')">Button</button>
    </body>
  `, 'text/html');

  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  
  // Кликаем по кнопке, что вызовет диалог prompt
  const clickResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Button',
      ref: 'e2', // Используем фиксированный ref, так как кнопка всегда будет первым элементом
    },
  });
  
  // Проверяем, что появился диалог prompt
  expect(clickResult).toContainTextContent('### Modal state');
  expect(clickResult).toContainTextContent('["prompt" dialog with message "Prompt"]');
  
  // Вводим текст и принимаем диалог
  const dialogResult = await client.callTool({
    name: 'browser_handle_dialog',
    arguments: {
      accept: true,
      promptText: 'Answer',
    },
  });
  
  // Проверяем, что диалог был обработан
  expect(dialogResult).not.toContainTextContent('### Modal state');
  expect(dialogResult).toContainTextContent('// <internal code to handle "prompt" dialog>');
});

test('alert dialog w/ race', async ({ client, server }) => {
  server.setContent('/', `<button onclick="setTimeout(() => alert('Alert'), 100)">Button</button>`, 'text/html');
  
  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  
  // Кликаем по кнопке, что вызовет диалог с задержкой
  const clickResult = await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'Button',
      ref: 'e2', // Используем фиксированный ref, так как кнопка всегда будет первым элементом
    },
  });
  
  // Проверяем, что появился диалог
  expect(clickResult).toContainTextContent('### Modal state');
  expect(clickResult).toContainTextContent('["alert" dialog with message "Alert"]');
  
  // Обрабатываем диалог
  const dialogResult = await client.callTool({
    name: 'browser_handle_dialog',
    arguments: {
      accept: true,
    },
  });
  
  // Проверяем, что диалог был обработан
  expect(dialogResult).not.toContainTextContent('### Modal state');
  expect(dialogResult).toContainTextContent('// <internal code to handle "alert" dialog>');
});
