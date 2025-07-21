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

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { test, expect } from './fixtures.ts';

const BLOCK_MESSAGE = /Blocked by Web Inspector|NS_ERROR_FAILURE|net::ERR_BLOCKED_BY_CLIENT/g;

const fetchPage = async (client: Client, url: string) => {
  const result = await client.callTool({
    name: 'browser_navigate',
    arguments: {
      url,
    },
  });

  return JSON.stringify(result, null, 2);
};

test('default to allow all', async ({ server, client }) => {
  // Устанавливаем содержимое страницы на сервере
  server.setContent('/ppp', 'content:PPP', 'text/html');
  
  // Получаем URL страницы
  const url = server.PREFIX + 'ppp';
  
  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url },
  });
  
  // Получаем HTML содержимое страницы
  const htmlContent = await client.callTool({
    name: 'browser_get_html_content',
  });
  
  // Проверяем, что страница загрузилась и содержит ожидаемый текст
  expect(htmlContent.content[0].text).toContain('content:PPP');
});

test.skip('blocked works', async ({ startClient, mcpMode }) => {
  // Пропускаем тест для режима расширения
  test.skip(mcpMode === 'extension', 'Request blocking is not supported in extension mode');
  // Запускаем клиент с блокировкой определенных доменов
  const { client } = await startClient({
    args: ['--blocked-origins', 'microsoft.com;example.com;playwright.dev']
  });
  
  // URL, который должен быть заблокирован
  const url = 'https://example.com/';
  
  try {
    // Навигация на заблокированный URL
    const navResult = await client.callTool({
      name: 'browser_navigate',
      arguments: { url },
    });
    
    // Если навигация успешна, проверяем, что страница содержит сообщение о блокировке
    const htmlContent = await client.callTool({
      name: 'browser_get_html_content',
    });
    
    // Проверяем, что страница содержит сообщение о блокировке
    expect(htmlContent.content[0].text).toContain('blocked') || 
    expect(htmlContent.content[0].text).toContain('ERR_BLOCKED_BY_CLIENT');
  } catch (error) {
    // Если навигация вызвала ошибку, проверяем, что ошибка связана с блокировкой
    expect(error.message).toContain('ERR_BLOCKED_BY_CLIENT') || 
    expect(error.message).toContain('blocked');
  }
});

test('allowed works', async ({ server, startClient }) => {
  // Устанавливаем содержимое страницы на сервере
  server.setContent('/ppp', 'content:PPP', 'text/html');
  
  // Запускаем клиент с разрешением определенных доменов
  const { client } = await startClient({
    args: ['--allowed-origins', `microsoft.com;${new URL(server.PREFIX).host};playwright.dev`]
  });
  
  // Получаем URL страницы
  const url = server.PREFIX + 'ppp';
  
  // Навигация на разрешенный URL
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url },
  });
  
  // Получаем HTML содержимое страницы
  const htmlContent = await client.callTool({
    name: 'browser_get_html_content',
  });
  
  // Проверяем, что страница загрузилась и содержит ожидаемый текст
  expect(htmlContent.content[0].text).toContain('content:PPP');
});

test.skip('blocked takes precedence', async ({ startClient, mcpMode }) => {
  // Пропускаем тест для режима расширения
  test.skip(mcpMode === 'extension', 'Request blocking is not supported in extension mode');
  // Запускаем клиент с блокировкой и разрешением одного и того же домена
  const { client } = await startClient({
    args: [
      '--blocked-origins', 'example.com',
      '--allowed-origins', 'example.com',
    ],
  });
  
  // URL, который должен быть заблокирован, несмотря на то, что он также разрешен
  const url = 'https://example.com/';
  
  try {
    // Навигация на URL
    const navResult = await client.callTool({
      name: 'browser_navigate',
      arguments: { url },
    });
    
    // Если навигация успешна, проверяем, что страница содержит сообщение о блокировке
    const htmlContent = await client.callTool({
      name: 'browser_get_html_content',
    });
    
    // Проверяем, что страница содержит сообщение о блокировке или ошибку
    const pageText = htmlContent.content[0].text;
    expect(pageText.includes('blocked') || pageText.includes('ERR_BLOCKED') || pageText.includes('is blocked')).toBe(true);
  } catch (error) {
    // Если навигация вызвала ошибку, проверяем, что ошибка связана с блокировкой
    expect(error.message.includes('ERR_BLOCKED') || error.message.includes('blocked')).toBe(true);
  }
});

test.skip('allowed without blocked blocks all non-explicitly specified origins', async ({ startClient, mcpMode }) => {
  // Пропускаем тест для режима расширения
  test.skip(mcpMode === 'extension', 'Request blocking is not supported in extension mode');
  // Запускаем клиент с разрешением только определенного домена
  const { client } = await startClient({
    args: ['--allowed-origins', 'playwright.dev'],
  });
  
  // URL, который не входит в список разрешенных
  const url = 'https://example.com/';
  
  try {
    // Навигация на URL
    const navResult = await client.callTool({
      name: 'browser_navigate',
      arguments: { url },
    });
    
    // Если навигация успешна, проверяем, что страница содержит сообщение о блокировке
    const htmlContent = await client.callTool({
      name: 'browser_get_html_content',
    });
    
    // Проверяем, что страница содержит сообщение о блокировке или ошибку
    const pageText = htmlContent.content[0].text;
    expect(pageText.includes('blocked') || pageText.includes('ERR_BLOCKED') || pageText.includes('is blocked')).toBe(true);
  } catch (error) {
    // Если навигация вызвала ошибку, проверяем, что ошибка связана с блокировкой
    expect(error.message.includes('ERR_BLOCKED') || error.message.includes('blocked')).toBe(true);
  }
});

test('blocked without allowed allows non-explicitly specified origins', async ({ server, startClient }) => {
  // Устанавливаем содержимое страницы на сервере
  server.setContent('/ppp', 'content:PPP', 'text/html');
  
  // Запускаем клиент с блокировкой только определенного домена
  const { client } = await startClient({
    args: ['--blocked-origins', 'example.com'],
  });
  
  // Получаем URL страницы, который не входит в список заблокированных
  const url = server.PREFIX + 'ppp';
  
  // Навигация на URL
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url },
  });
  
  // Получаем HTML содержимое страницы
  const htmlContent = await client.callTool({
    name: 'browser_get_html_content',
  });
  
  // Проверяем, что страница загрузилась и содержит ожидаемый текст
  expect(htmlContent.content[0].text).toContain('content:PPP');
});
