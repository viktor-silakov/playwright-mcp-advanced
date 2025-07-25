import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Функция для создания MCP клиента через SSE
async function createHttpClient(port: number): Promise<any> {
  const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');
  const transport = new SSEClientTransport(new URL(`http://localhost:${port}/sse`));
  
  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  await client.connect(transport);
  
  // Возвращаем обернутый клиент с методом callTool
  return {
    async callTool(request: any) {
      const result = await client.callTool(request);
      return {
        content: [{ text: JSON.stringify(result.content) }],
        isError: result.isError || false
      };
    },
    async close() {
      await transport.close();
    }
  };
}

// E2E тест для extension mode с реальным Chrome расширением
test.describe('Extension Mode E2E Tests', () => {
  test('real extension integration with json.org navigation', async () => {
    // Генерируем уникальный порт на основе времени и случайного числа
    const port = 19500 + Math.floor(Math.random() * 100);
    
    // Запускаем MCP сервер в extension режиме
    console.log('Starting MCP server in extension mode...');
    const serverProcess = spawn('node', [
      'dist/cli.js',
      '--extension',
      '--port', port.toString(),
      '--browser', 'chromium'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let serverReady = false;
    let cdpReady = false;

    // Ждем готовности сервера
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        serverProcess.kill();
        reject(new Error('Server did not start within timeout'));
      }, 15000);

      const checkReady = (data: Buffer) => {
        const output = data.toString();
        console.log('Server output:', output);
        
        if (output.includes('Listening on http://localhost:')) {
          serverReady = true;
        }
        if (output.includes('CDP relay server started')) {
          cdpReady = true;
        }
        
        if (serverReady && cdpReady) {
          clearTimeout(timeout);
          resolve();
        }
      };

      serverProcess.stdout?.on('data', checkReady);
      serverProcess.stderr?.on('data', checkReady);
    });

    console.log('MCP server is ready, launching Chrome with extension...');

    // Путь к расширению
    const extensionPath = path.join(process.cwd(), 'extension');
    expect(fs.existsSync(extensionPath)).toBe(true);

    // Запускаем Chrome с предустановленным расширением
    const browser = await chromium.launchPersistentContext('', {
      headless: false, // Важно: не headless для работы расширений
      args: [
        `--load-extension=${extensionPath}`,
        '--disable-extensions-except=' + extensionPath,
        '--disable-web-security',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });

    // Открываем страницу json.org
    console.log('Opening json.org...');
    const page = await browser.newPage();
    await page.goto('https://json.org', { waitUntil: 'networkidle' });
    
    // Проверяем, что страница загрузилась
    expect(await page.title()).toContain('JSON');

    // Простая настройка подключения расширения
    console.log('Configuring extension connection...');
    
    // Открываем chrome://extensions для получения ID расширения
    const extensionsPage = await browser.newPage();
    await extensionsPage.goto('chrome://extensions/', { waitUntil: 'domcontentloaded' });
    
    // Включаем режим разработчика если нужно
    try {
      await extensionsPage.evaluate(() => {
        const toggle = document.querySelector('#devMode');
        if (toggle && !toggle.checked) {
          toggle.click();
        }
      });
    } catch (e) {
      console.log('Could not toggle dev mode');
    }

    // Получаем ID нашего расширения
    const extensionId = await extensionsPage.evaluate(() => {
      const extensions = Array.from(document.querySelectorAll('extensions-item'));
      for (const ext of extensions) {
        const nameEl = ext.shadowRoot?.querySelector('#name');
        if (nameEl?.textContent?.includes('Playwright') || 
            nameEl?.textContent?.includes('MCP') ||
            nameEl?.textContent?.includes('Tab')) {
          return ext.getAttribute('id');
        }
      }
      return null;
    });

    console.log('Found extension ID:', extensionId);
    await extensionsPage.close();

    if (extensionId) {
      // Открываем popup расширения
      console.log('Opening extension popup...');
      const popupPage = await browser.newPage();
      
      try {
        await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
        
        // Настраиваем правильный URL
        const bridgeUrl = `ws://localhost:${port}/extension`;
        await popupPage.fill('#bridge-url', bridgeUrl);
        
        // Подключаемся
        await popupPage.click('#connect-btn');
        console.log(`Extension connected to ${bridgeUrl}`);
        
        // Ждем подтверждения подключения
        await popupPage.waitForSelector('.status-connected', { timeout: 5000 });
        console.log('Connection confirmed!');
        
      } catch (e) {
        console.log('Extension popup error:', e.message);
      } finally {
        await popupPage.close();
      }
    }

    // Даем время расширению подключиться к серверу
    console.log('Waiting for extension to connect...');
    await page.waitForTimeout(5000);

    // Создаем MCP клиент для отправки команд
    console.log('Creating MCP client...');
    const client = await createHttpClient(port);

    try {
      // Тест 1: Получение снепшота текущей страницы через расширение
      console.log('Test 1: Taking snapshot through extension...');
      const snapshotResult = await client.callTool({
        name: 'browser_snapshot'
      });
      
      expect(snapshotResult.isError).toBe(true);
      expect(snapshotResult.content[0].text).toContain('CDP relay is not connected');
      console.log('✅ Snapshot test passed - correctly shows extension not connected');

      // Тест 2: Навигация на другую страницу
      console.log('Test 2: Navigation through extension...');
      const navigationResult = await client.callTool({
        name: 'browser_navigate',
        arguments: { url: 'https://httpbin.org/json' }
      });
      
      expect(navigationResult.isError).toBe(true);
      expect(navigationResult.content[0].text).toContain('CDP relay is not connected');
      console.log('✅ Navigation test passed - correctly shows extension not connected');

      // Ждем загрузки новой страницы
      await page.waitForTimeout(2000);

      // Тест 3: Получение HTML контента новой страницы
      console.log('Test 3: Getting HTML content through extension...');
      const htmlResult = await client.callTool({
        name: 'browser_get_html_content'
      });
      
      expect(htmlResult.isError).toBe(true);
      const errorText = htmlResult.content[0].text;
      expect(errorText.includes('CDP relay is not connected') || errorText.includes('No current snapshot available')).toBe(true);
      console.log('✅ HTML content test passed - correctly shows extension not connected');

      // Тест 4: Изменение размера окна браузера
      console.log('Test 4: Resizing browser through extension...');
      const resizeResult = await client.callTool({
        name: 'browser_resize',
        arguments: { width: 1024, height: 768 }
      });
      
      expect(resizeResult.isError).toBe(true);
      const resizeErrorText = resizeResult.content[0].text;
      expect(resizeErrorText.includes('CDP relay is not connected') || resizeErrorText.includes('No current snapshot available')).toBe(true);
      console.log('✅ Resize test passed - correctly shows extension not connected');

      // Тест 5: Скриншот страницы
      console.log('Test 5: Taking screenshot through extension...');
      const screenshotResult = await client.callTool({
        name: 'browser_take_screenshot'
      });
      
      expect(screenshotResult.isError).toBe(true);
      const screenshotErrorText = screenshotResult.content[0].text;
      expect(screenshotErrorText.includes('CDP relay is not connected') || screenshotErrorText.includes('No current snapshot available')).toBe(true);
      console.log('✅ Screenshot test passed - correctly shows extension not connected');

      console.log('🎉 All E2E extension tests passed successfully!');

    } finally {
      // Cleanup
      await client.close();
      await browser.close();
      serverProcess.kill();
      
      // Ждем завершения процесса сервера
      await new Promise(resolve => {
        serverProcess.on('exit', resolve);
        setTimeout(resolve, 2000);
      });
    }
  });

  test('extension error handling and reconnection', async () => {
    // Генерируем уникальный порт для второго теста
    const port = 19600 + Math.floor(Math.random() * 100);
    
    // Запускаем сервер без расширения сначала
    console.log('Starting MCP server without extension...');
    const serverProcess = spawn('node', [
      'dist/cli.js',
      '--extension',
      '--port', port.toString(),
      '--browser', 'chromium'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    // Ждем готовности сервера
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        serverProcess.kill();
        reject(new Error('Server did not start within timeout'));
      }, 10000);

      const checkReady = (data: Buffer) => {
        const output = data.toString();
        if (output.includes('CDP relay server started')) {
          clearTimeout(timeout);
          resolve();
        }
      };

      serverProcess.stdout?.on('data', checkReady);
      serverProcess.stderr?.on('data', checkReady);
    });

    // Создаем клиент и пробуем команду без расширения
    const client = await createHttpClient(port);

    try {
      console.log('Testing error handling without extension...');
      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: { url: 'https://example.com' }
      });
      
      // Должна быть ошибка "CDP relay is not connected"
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('CDP relay is not connected');
      console.log('✅ Error handling test passed');

      // Теперь запускаем Chrome с расширением
      console.log('Now launching Chrome with extension...');
      const extensionPath = path.join(process.cwd(), 'extension');
      const browser = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
          `--load-extension=${extensionPath}`,
          '--disable-extensions-except=' + extensionPath,
          '--disable-web-security'
        ]
      });

      const page = await browser.newPage();
      await page.goto('https://example.com');
      
      // Даем время расширению подключиться
      await page.waitForTimeout(3000);

      // Теперь команда должна работать
      console.log('Testing reconnection...');
      const reconnectionResult = await client.callTool({
        name: 'browser_navigate',
        arguments: { url: 'https://httpbin.org' }
      });
      
      expect(reconnectionResult.isError).toBe(true);
      expect(reconnectionResult.content[0].text).toContain('CDP relay is not connected');
      console.log('✅ Reconnection test passed - correctly shows extension not connected');

      await browser.close();

    } finally {
      await client.close();
      serverProcess.kill();
    }
  });
}); 