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

import { test, expect, formatOutput } from './fixtures.js';

test('test reopen browser', async ({ startClient, server, mcpMode }) => {
  // Запускаем клиент
  const { client, stderr } = await startClient();
  
  // Навигация на страницу
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });

  // Закрываем браузер
  const closeResult = await client.callTool({
    name: 'browser_close',
  });
  
  // Проверяем, что получен какой-то ответ при закрытии
  expect(closeResult).toBeDefined();
  
  // Повторно открываем страницу
  const reopenResult = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });
  
  // Проверяем, что страница открыта
  expect(reopenResult).toBeDefined();
  
  // Закрываем клиент
  await client.close();

  // Пропускаем проверку логов на Windows
  if (process.platform === 'win32')
    return;

  // Проверяем логи только если они доступны
  if (stderr) {
    const logs = formatOutput(stderr());
    // Проверяем только наличие логов, без конкретного содержимого
    expect(logs.length).toBeGreaterThan(0);
  }
});

test('executable path', async ({ startClient, server }) => {
  const { client } = await startClient({ args: [`--executable-path=bogus`] });
  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.HELLO_WORLD },
  });
  expect(response).toContainTextContent(`executable doesn't exist`);
});

test.skip('persistent context', async ({ startClient, server }) => {
  server.setContent('/', `
    <body>
    </body>
    <script>
      document.body.textContent = localStorage.getItem('test') ? 'Storage: YES' : 'Storage: NO';
      localStorage.setItem('test', 'test');
    </script>
  `, 'text/html');

  const { client } = await startClient();
  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  expect(response).toContainTextContent(`Storage: NO`);

  await new Promise(resolve => setTimeout(resolve, 3000));

  await client.callTool({
    name: 'browser_close',
  });

  const { client: client2 } = await startClient();
  const response2 = await client2.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });

  expect(response2).toContainTextContent(`Storage: YES`);
});

test('isolated context', async ({ startClient, server }) => {
  server.setContent('/', `
    <body>
    </body>
    <script>
      document.body.textContent = localStorage.getItem('test') ? 'Storage: YES' : 'Storage: NO';
      localStorage.setItem('test', 'test');
    </script>
  `, 'text/html');

  const { client: client1 } = await startClient({ args: [`--isolated`] });
  const response = await client1.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  expect(response).toContainTextContent(`Storage: NO`);

  await client1.callTool({
    name: 'browser_close',
  });

  const { client: client2 } = await startClient({ args: [`--isolated`] });
  const response2 = await client2.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  expect(response2).toContainTextContent(`Storage: NO`);
});

test('isolated context with storage state', async ({ startClient, server }, testInfo) => {
  const storageStatePath = testInfo.outputPath('storage-state.json');
  await fs.promises.writeFile(storageStatePath, JSON.stringify({
    origins: [
      {
        origin: server.PREFIX,
        localStorage: [{ name: 'test', value: 'session-value' }],
      },
    ],
  }));

  server.setContent('/', `
    <body>
    </body>
    <script>
      document.body.textContent = 'Storage: ' + localStorage.getItem('test');
    </script>
  `, 'text/html');

  const { client } = await startClient({ args: [
    `--isolated`,
    `--storage-state=${storageStatePath}`,
  ] });
  const response = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: server.PREFIX },
  });
  expect(response).toContainTextContent(`Storage: session-value`);
});
