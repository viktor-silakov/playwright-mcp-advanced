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

import { test, expect } from '@playwright/test';
import { contextFactory } from '../src/browserContextFactory.js';
import type { FullConfig } from '../src/config.js';
import * as playwright from 'playwright';

test.describe('Electron Mode Integration', () => {
  test('should select ElectronContextFactory when electron=true and cdpEndpoint is set', async () => {
    const browserConfig: FullConfig['browser'] = {
      browserName: 'chromium',
      electron: true,
      cdpEndpoint: 'http://localhost:9222',
      launchOptions: {},
      contextOptions: {},
    };

    const factory = contextFactory(browserConfig);
    expect(factory.constructor.name).toBe('ElectronContextFactory');
  });

  test('should not select ElectronContextFactory when electron=false', async () => {
    const browserConfig: FullConfig['browser'] = {
      browserName: 'chromium',
      electron: false,
      cdpEndpoint: 'http://localhost:9222',
      launchOptions: {},
      contextOptions: {},
    };

    const factory = contextFactory(browserConfig);
    expect(factory.constructor.name).toBe('CdpContextFactory');
  });

  test('should not select ElectronContextFactory when cdpEndpoint is missing', async () => {
    const browserConfig: FullConfig['browser'] = {
      browserName: 'chromium',
      electron: true,
      launchOptions: {},
      contextOptions: {},
    };

    const factory = contextFactory(browserConfig);
    expect(factory.constructor.name).toBe('PersistentContextFactory');
  });

  test('should create context that gets existing browser contexts', async () => {
    // Mock playwright.chromium.connectOverCDP
    const mockPage = {
      url: () => 'file:///electron-app/index.html',
      title: () => 'Electron App',
      on: () => {},
    };

    const mockContext = {
      pages: () => [mockPage],
      close: () => Promise.resolve(),
      on: () => {},
    };

    const mockBrowser = {
      contexts: () => [mockContext],
      close: () => Promise.resolve(),
      on: () => {},
    };

    const originalConnectOverCDP = playwright.chromium.connectOverCDP;
    playwright.chromium.connectOverCDP = async (endpoint: string) => {
      expect(endpoint).toBe('http://localhost:9222');
      return mockBrowser as any;
    };

    try {
      const browserConfig: FullConfig['browser'] = {
        browserName: 'chromium',
        electron: true,
        cdpEndpoint: 'http://localhost:9222',
        launchOptions: {},
        contextOptions: {},
      };

      const factory = contextFactory(browserConfig);
      const { browserContext, close } = await factory.createContext();
      
      expect(browserContext).toBe(mockContext);
      expect(browserContext.pages().length).toBe(1);
      expect(browserContext.pages()[0].url()).toBe('file:///electron-app/index.html');
      
      await close();
      
    } finally {
      playwright.chromium.connectOverCDP = originalConnectOverCDP;
    }
  });

  test('should fail when no contexts exist in electron app', async () => {
    const mockBrowser = {
      contexts: () => [], // No contexts
      close: () => Promise.resolve(),
      on: () => {},
    };

    const originalConnectOverCDP = playwright.chromium.connectOverCDP;
    playwright.chromium.connectOverCDP = async () => mockBrowser as any;

    try {
      const browserConfig: FullConfig['browser'] = {
        browserName: 'chromium',
        electron: true,
        cdpEndpoint: 'http://localhost:9222',
        launchOptions: {},
        contextOptions: {},
      };

      const factory = contextFactory(browserConfig);
      
      await expect(factory.createContext())
        .rejects.toThrow('No browser contexts found in Electron application');
      
    } finally {
      playwright.chromium.connectOverCDP = originalConnectOverCDP;
    }
  });
});

test.describe('Electron Mode CLI Validation', () => {
  test('should require --cdp-endpoint with --electron', async () => {
    const { resolveCLIConfig } = await import('../src/config.js');
    
    await expect(resolveCLIConfig({
      electron: true,
      sandbox: true,
    })).rejects.toThrow('Electron mode requires --cdp-endpoint option to be specified.');
  });

  test('should require Chromium browser with --electron', async () => {
    const { resolveCLIConfig } = await import('../src/config.js');
    
    await expect(resolveCLIConfig({
      electron: true,
      browser: 'firefox',
      cdpEndpoint: 'http://localhost:9222',
      sandbox: true,
    })).rejects.toThrow('Electron mode is only supported for Chromium browsers.');
  });

  test('should pass validation with correct options', async () => {
    const { resolveCLIConfig } = await import('../src/config.js');
    
    const config = await resolveCLIConfig({
      electron: true,
      browser: 'chrome',
      cdpEndpoint: 'http://localhost:9222',
      sandbox: true,
    });
    
    expect(config.browser.electron).toBe(true);
    expect(config.browser.cdpEndpoint).toBe('http://localhost:9222');
    expect(config.browser.browserName).toBe('chromium');
  });
});