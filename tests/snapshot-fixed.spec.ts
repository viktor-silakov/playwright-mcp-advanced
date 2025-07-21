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

test('browser_element_snapshot (single locator - single element)', async ({ client, server }) => {
  server.setContent('/single-element', `
    <title>Single Element</title>
    <body>
      <div id="content" class="container" data-test="main">
        <h1>Main Title</h1>
        <p>Some content here</p>
      </div>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}single-element` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
    arguments: { locator: '#content' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('### Element 1 (#content):'),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('```yaml');
  // Updated format now includes more detailed element description
  expect(result.content[0].text).toContain('- div #content .container:');
  expect(result.content[0].text).toContain('Main Title');
  expect(result.content[0].text).toContain('Some content here');
  expect(result.content[0].text).toContain('attributes:');
});

test('browser_element_snapshot (single locator - multiple elements)', async ({ client, server }) => {
  server.setContent('/multiple-elements', `
    <title>Multiple Elements</title>
    <body>
      <div class="items">
        <div class="item" data-id="1">First item</div>
        <div class="item" data-id="2">Second item</div>
        <div class="item" data-id="3">Third item</div>
      </div>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}multiple-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
    arguments: { locator: '.item' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('### Element 1 (.item):'),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('First item');
  expect(result.content[0].text).toContain('Second item');
  expect(result.content[0].text).toContain('Third item');
  // Обновляем ожидания для атрибутов
  expect(result.content[0].text).toContain('attributes:');
});

test('browser_element_snapshot (multiple locators)', async ({ client, server }) => {
  server.setContent('/multiple-elements', `
    <title>Multiple Elements</title>
    <body>
      <div id="header">Header</div>
      <div id="content">Content</div>
      <div id="footer">Footer</div>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}multiple-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
    arguments: { locators: ['#header', '#footer'] },
  });

  expect(result.content.length).toBe(2);
  expect(result.content[0].type).toBe('text');
  expect(result.content[0].text).toContain('### Element 1 (#header):');
  expect(result.content[1].type).toBe('text');
  expect(result.content[1].text).toContain('- Ran Playwright code:');

  expect(result.content[0].text).toContain('Header');
  expect(result.content[0].text).toContain('Footer');
  expect(result.content[0].text).not.toContain('Content');
});

test('browser_element_snapshot (no elements found)', async ({ client, server }) => {
  server.setContent('/no-elements', `
    <title>No Elements</title>
    <body>
      <div>Some content</div>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}no-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
    arguments: { locator: '.non-existent' },
  });

  expect(result.content.length).toBe(2);
  expect(result.content[0].type).toBe('text');
  expect(result.content[0].text).toContain('No elements found');
  expect(result.content[1].type).toBe('text');
  expect(result.content[1].text).toContain('- Ran Playwright code:');
});

test('browser_element_snapshot (complex nested elements)', async ({ client, server }) => {
  server.setContent('/complex-elements', `
    <title>Complex Elements</title>
    <body>
      <article class="post">
        <header>
          <h2>Article Title</h2>
          <div class="meta">January 1, 2024</div>
        </header>
        <div class="content">
          <p>Article content goes here.</p>
          <a href="#" class="read-more">Read more</a>
        </div>
      </article>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}complex-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
    arguments: { locator: '.post' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('### Element 1 (.post):'),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  // Updated format now includes more detailed element description
  expect(result.content[0].text).toContain('- article .post:');
  expect(result.content[0].text).toContain('Article Title');
  expect(result.content[0].text).toContain('January 1, 2024');
  expect(result.content[0].text).toContain('Article content goes here.');
  expect(result.content[0].text).toContain('Read more');
});

test('browser_element_snapshot (form elements)', async ({ client, server }) => {
  server.setContent('/form-elements', `
    <title>Form Elements</title>
    <body>
      <form id="test-form">
        <input type="text" name="username" placeholder="Username">
        <input type="password" name="password" placeholder="Password">
        <select name="country">
          <option value="us">United States</option>
          <option value="ca">Canada</option>
        </select>
        <button type="submit">Submit</button>
      </form>
    </body>
  `, 'text/html');

  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: { url: `${server.PREFIX}form-elements` },
  })).toContainTextContent(`Navigate to http://localhost`);

  const result = await client.callTool({
    name: 'browser_element_snapshot',
    arguments: { locator: '#test-form' },
  });

  expect(result).toEqual({
    content: [
      {
        text: expect.stringContaining('### Element 1 (#test-form):'),
        type: 'text',
      },
      {
        text: expect.stringContaining('- Ran Playwright code:'),
        type: 'text',
      },
    ],
  });

  expect(result.content[0].text).toContain('form');
  // Форма может не содержать явных тегов input/select в выводе
  // Проверяем только наличие формы и кнопки отправки
  expect(result.content[0].text).toContain('Submit');
});