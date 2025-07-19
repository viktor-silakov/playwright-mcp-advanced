import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

// Упрощенный E2E тест для демонстрации extension mode
test.describe('Extension Mode Demo', () => {
  test('extension mode server starts and waits for connection', async () => {
    const port = 19700 + Math.floor(Math.random() * 100);
    
    console.log('🚀 Starting MCP server in extension mode...');
    const serverProcess = spawn('node', [
      'cli.js',
      '--extension',
      '--port', port.toString(),
      '--browser', 'chromium'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let serverOutput = '';
    let extensionUrl = '';
    let mcpUrl = '';

    // Ждем готовности сервера и извлекаем URLs
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        serverProcess.kill();
        reject(new Error('Server did not start within timeout'));
      }, 15000);

      const checkReady = (data: Buffer) => {
        const output = data.toString();
        serverOutput += output;
        console.log('📝 Server output:', output);
        
        // Извлекаем URL для расширения
        const extensionMatch = output.match(/Extension URL: (ws:\/\/localhost:\d+\/extension)/);
        if (extensionMatch) {
          extensionUrl = extensionMatch[1];
        }
        
        // Извлекаем MCP URL
        const mcpMatch = output.match(/url.*"(http:\/\/localhost:\d+\/sse)"/);
        if (mcpMatch) {
          mcpUrl = mcpMatch[1];
        }
        
        // Проверяем готовность по наличию всех ключевых сообщений в общем выводе
        if (serverOutput.includes('Listening on http://localhost:') && 
            serverOutput.includes('CDP relay server started')) {
          clearTimeout(timeout);
          resolve();
        }
      };

      serverProcess.stdout?.on('data', checkReady);
      serverProcess.stderr?.on('data', checkReady);
    });

    console.log('✅ MCP server is running successfully!');
    console.log('🔗 Extension URL:', extensionUrl);
    console.log('🔗 MCP URL:', mcpUrl);

    // Проверяем, что нужные URLs присутствуют
    expect(extensionUrl).toMatch(/ws:\/\/localhost:\d+\/extension/);
    expect(mcpUrl).toMatch(/http:\/\/localhost:\d+\/sse/);
    expect(serverOutput).toContain('Connect your Chrome extension to the Extension URL');
    expect(serverOutput).toContain('CDP relay server started');

    console.log('📋 To test manually:');
    console.log('1. Install Chrome extension from ./extension/ folder');
    console.log('2. Open extension popup');
    console.log(`3. Set bridge URL to: ${extensionUrl}`);
    console.log('4. Click Connect');
    console.log(`5. Use MCP client with URL: ${mcpUrl}`);

    // Ждем 3 секунды, чтобы продемонстрировать работу сервера
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Cleanup
    serverProcess.kill();
    
    // Ждем завершения процесса
    await new Promise(resolve => {
      serverProcess.on('exit', resolve);
      setTimeout(resolve, 2000);
    });

    console.log('✅ Extension mode demo completed successfully!');
  });

  test('extension mode validates configuration properly', async () => {
    console.log('🧪 Testing extension mode configuration validation...');
    
    // Тест 1: Расширение требует Chromium браузер
    console.log('Test 1: Extension mode requires Chromium browser');
    const firefoxTest = spawn('node', [
      'cli.js',
      '--extension',
      '--browser', 'firefox',
      '--port', '19800'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    const firefoxError = await new Promise<string>((resolve) => {
      let errorOutput = '';
      firefoxTest.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      firefoxTest.on('exit', () => {
        resolve(errorOutput);
      });
    });

    expect(firefoxError).toContain('Extension mode is only supported for Chromium browsers');
    console.log('✅ Correctly rejects Firefox browser');

    // Тест 2: Расширение не поддерживает эмуляцию устройств
    console.log('Test 2: Extension mode rejects device emulation');
    const deviceTest = spawn('node', [
      'cli.js',
      '--extension',
      '--device', 'iPhone 13',
      '--port', '19801'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    const deviceError = await new Promise<string>((resolve) => {
      let errorOutput = '';
      deviceTest.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      deviceTest.on('exit', () => {
        resolve(errorOutput);
      });
    });

    expect(deviceError).toContain('Device emulation is not supported with extension mode');
    console.log('✅ Correctly rejects device emulation');

    // Тест 3: Расширение требует HTTP порт
    console.log('Test 3: Extension mode requires HTTP server port');
    const noPortTest = spawn('node', [
      'cli.js',
      '--extension'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    const noPortError = await new Promise<string>((resolve) => {
      let errorOutput = '';
      noPortTest.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      noPortTest.on('exit', () => {
        resolve(errorOutput);
      });
    });

    expect(noPortError).toContain('Extension mode requires HTTP server, but no port was specified');
    console.log('✅ Correctly requires HTTP server port');

    console.log('✅ All configuration validation tests passed!');
  });
}); 