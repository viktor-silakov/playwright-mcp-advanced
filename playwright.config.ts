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

import { defineConfig } from '@playwright/test';

import type { TestOptions } from './tests/fixtures.js';

export default defineConfig<TestOptions>({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  projects: [
    { 
      name: 'chrome',
      testIgnore: ['**/extension-e2e*.spec.ts'] // E2E extension тесты запускаются в отдельных проектах
    },
    { 
      name: 'msedge', 
      use: { mcpBrowser: 'msedge' },
      testIgnore: ['**/extension-e2e*.spec.ts']
    },
    { 
      name: 'chromium', 
      use: { mcpBrowser: 'chromium' },
      testIgnore: ['**/extension-e2e*.spec.ts']
    },
    ...process.env.MCP_IN_DOCKER ? [{
      name: 'chromium-docker',
      grep: /browser_navigate|browser_click/,
      testIgnore: ['**/extension-e2e*.spec.ts'],
      use: {
        mcpBrowser: 'chromium',
        mcpMode: 'docker' as const
      }
    }] : [],
    { 
      name: 'firefox', 
      use: { mcpBrowser: 'firefox' },
      testIgnore: ['**/extension-e2e*.spec.ts']
    },
    { 
      name: 'webkit', 
      use: { mcpBrowser: 'webkit' },
      testIgnore: ['**/extension-e2e*.spec.ts']
    },
    // Extension mode tests are handled by specific E2E test projects below
    // The chromium-extension project is disabled to avoid mass test failures without real extension
    { 
      name: 'e2e-extension',
      testMatch: '**/extension-e2e.spec.ts',
      timeout: 60000, // Увеличенный таймаут для E2E тестов
      use: { 
        mcpBrowser: 'chromium',
        headless: false // E2E тесты должны запускаться в visible режиме
      }
    },
    {
      name: 'e2e-demo',
      testMatch: '**/extension-e2e-simple.spec.ts',
      timeout: 30000,
      use: { 
        mcpBrowser: 'chromium' // Только Chromium для демо-тестов
      }
    },
    {
      name: 'e2e-real',
      testMatch: '**/extension-e2e-real.spec.ts',
      timeout: 120000, // Увеличенный таймаут для полного E2E теста
      use: { 
        mcpBrowser: 'chromium',
        headless: false // Обязательно видимый режим для расширений
      }
    },
  ],
});
