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

import { z } from 'zod';

import { defineTool } from './tool.js';
import * as javascript from '../javascript.js';
import { generateLocator } from './utils.js';

import type * as playwright from 'playwright';

const evaluateSchema = z.object({
  function: z.string().describe('() => { /* code */ } or (element) => { /* code */ } when element is provided'),
  element: z.string().optional().describe('Human-readable element description used to obtain permission to interact with the element'),
  ref: z.string().optional().describe('Exact target element reference from the page snapshot'),
});

const evaluate = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_evaluate',
    title: 'Evaluate JavaScript',
    description: 'Evaluate JavaScript expression on page or element',
    inputSchema: evaluateSchema,
    type: 'destructive',
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const code: string[] = [];

    let locator: playwright.Locator | undefined;
    if (params.ref && params.element) {
      const snapshot = tab.snapshotOrDie();
      locator = snapshot.refLocator({ ref: params.ref, element: params.element });
      code.push(`await page.${await generateLocator(locator)}.evaluate(${javascript.quote(params.function)});`);
    } else {
      code.push(`await page.evaluate(${javascript.quote(params.function)});`);
    }

    return {
      code,
      action: async () => {
        // Convert string function to actual function
        const evaluateFunction = new Function('return ' + params.function)();
        let result: any;
        
        if (locator) {
          result = await locator.evaluate(evaluateFunction);
        } else {
          result = await tab.page.evaluate(evaluateFunction);
        }
        
        return {
          content: [{ type: 'text', text: '- Result: ' + (JSON.stringify(result, null, 2) || 'undefined') }],
        };
      },
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

export default [
  evaluate,
];
