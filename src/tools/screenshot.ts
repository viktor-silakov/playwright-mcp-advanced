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
import { outputFile } from '../config.js';
import { generateLocator } from './utils.js';
import { extractElementsFromCDPResponse, extractBufferFromCDPResponse } from '../utils/cdp-content-extractor.js';

import type * as playwright from 'playwright';

const screenshotSchema = z.object({
  raw: z.boolean().optional().describe('Whether to return without compression (in PNG format). Default is false, which returns a JPEG image.'),
  filename: z.string().optional().describe('File name to save the screenshot to. Defaults to `page-{timestamp}.{png|jpeg}` if not specified.'),
  fullPage: z.boolean().optional().describe('Whether to take a screenshot of the full scrollable page. Cannot be combined with element/ref/locator parameters.'),
  locator: z.string().optional().describe('Playwright locator string to screenshot a specific element (e.g., "#id", ".class", "text=Hello"). Cannot be combined with element/ref/fullPage parameters.'),
  element: z.string().optional().describe('Human-readable element description used to obtain permission to screenshot the element. If not provided, the screenshot will be taken of viewport. If element is provided, ref must be provided too.'),
  ref: z.string().optional().describe('Exact target element reference from the page snapshot. If not provided, the screenshot will be taken of viewport. If ref is provided, element must be provided too.'),
}).refine(data => {
  return !!data.element === !!data.ref;
}, {
  message: 'Both element and ref must be provided or neither.',
  path: ['ref', 'element']
}).refine(data => {
  return !(data.fullPage && (data.element || data.ref || data.locator));
}, {
  message: 'fullPage cannot be combined with element/ref/locator parameters.',
  path: ['fullPage']
}).refine(data => {
  return !(data.locator && (data.element || data.ref || data.fullPage));
}, {
  message: 'locator cannot be combined with element/ref/fullPage parameters.',
  path: ['locator']
});

const screenshot = defineTool({
  capability: 'core',
  schema: {
    name: 'browser_screen_capture',
    title: 'Take a screenshot',
    description: `Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.`,
    inputSchema: screenshotSchema,
    type: 'readOnly',
    advanced: {
      isEnhanced: true,
      enhancementNote: 'Enhanced with fullPage and locator support for flexible screenshot capture'
    },
  },

  handle: async (context, params) => {
    const tab = context.currentTabOrDie();
    const snapshot = tab.snapshotOrDie();
    const fileType = params.raw ? 'png' : 'jpeg';
    const fileName = await outputFile(context.config, params.filename ?? `page-${new Date().toISOString()}.${fileType}`);
    const options: playwright.PageScreenshotOptions = {
      type: fileType,
      quality: fileType === 'png' ? undefined : 50,
      scale: 'css',
      path: fileName,
      fullPage: params.fullPage || false
    };
    const isElementScreenshot = params.element && params.ref;
    const isLocatorScreenshot = params.locator;

    let screenshotType = 'viewport';
    if (isElementScreenshot)
      screenshotType = 'element';
    else if (isLocatorScreenshot)
      screenshotType = 'locator element(s)';
    else if (params.fullPage)
      screenshotType = 'full page';

    const code = [
      `// Screenshot ${isElementScreenshot ? params.element : (isLocatorScreenshot ? `element(s) by locator "${params.locator}"` : screenshotType)} and save it as ${fileName}`,
    ];

    let locator = null;
    if (params.ref)
      locator = snapshot.refLocator({ element: params.element || '', ref: params.ref });
    else if (params.locator)
      locator = tab.page.locator(params.locator);

    if (locator && params.locator) {
      code.push(`const elements = await page.locator('${params.locator}').all();`);
      code.push(`const screenshots = await Promise.all(elements.map(el => el.screenshot(${javascript.formatObject(options)})));`);
    } else if (locator) {
      code.push(`await ${await generateLocator(locator)}.screenshot(${javascript.formatObject(options)});`);
    } else {
      code.push(`await page.screenshot(${javascript.formatObject(options)});`);
    }

    const includeBase64 = context.clientSupportsImages();
    const action = async () => {
      console.log('[DEBUG] Screenshot action called, includeBase64:', includeBase64);
      if (params.locator) {
        console.log('[DEBUG] Using locator:', params.locator);
        const locatorElement = tab.page.locator(params.locator);
        console.log('[DEBUG] Created locator element');
        const rawElements = await locatorElement.all();
        console.log('[DEBUG] Raw elements from locator.all():', typeof rawElements, 'Length:', rawElements?.length);
        const elements = extractElementsFromCDPResponse(rawElements);
        console.log('[DEBUG] Extracted elements count:', elements.length);

        if (elements.length === 0) {
          console.log('[DEBUG] No elements found with locator, taking page screenshot');
          const rawScreenshot = await tab.page.screenshot(options);
          console.log('[DEBUG] Page screenshot raw type:', typeof rawScreenshot, 'Length:', rawScreenshot?.length || 'N/A');
          console.log('[DEBUG] Page screenshot constructor:', rawScreenshot?.constructor?.name || 'N/A');
          const screenshot = extractBufferFromCDPResponse(rawScreenshot);
          console.log('[DEBUG] Page screenshot extracted type:', typeof screenshot, 'Length:', screenshot.length);
          console.log('[DEBUG] Page screenshot is Buffer?', screenshot instanceof Buffer);
          const base64Data = screenshot.toString('base64');
          console.log('[DEBUG] Page screenshot base64 length:', base64Data.length, 'Preview:', base64Data.substring(0, 50) + '...');
          return {
            content: includeBase64 ? [{
              type: 'image' as 'image',
              data: base64Data,
              mimeType: fileType === 'png' ? 'image/png' : 'image/jpeg',
            }] : []
          };
        }

        const rawScreenshots = await Promise.all(
            elements.map(element => element.screenshot(options))
        );
        console.log('[DEBUG] Multiple screenshots count:', rawScreenshots.length);
        const screenshots = rawScreenshots.map((rawScreenshot, index) => {
          console.log(`[DEBUG] Screenshot ${index} raw type:`, typeof rawScreenshot, 'Length:', rawScreenshot?.length || 'N/A');
          const extracted = extractBufferFromCDPResponse(rawScreenshot);
          console.log(`[DEBUG] Screenshot ${index} extracted length:`, extracted.length);
          return extracted;
        });

        return {
          content: includeBase64 ? screenshots.map((screenshot, index) => {
            const base64Data = screenshot.toString('base64');
            console.log(`[DEBUG] Screenshot ${index} base64 length:`, base64Data.length);
            return {
              type: 'image' as 'image',
              data: base64Data,
              mimeType: fileType === 'png' ? 'image/png' : 'image/jpeg',
            };
          }) : []
        };
      } else {
        console.log('[DEBUG] Taking direct screenshot (no locator)');
        const rawScreenshot = locator ? await locator.screenshot(options) : await tab.page.screenshot(options);
        console.log('[DEBUG] Direct screenshot raw type:', typeof rawScreenshot, 'Length:', rawScreenshot?.length || 'N/A');
        console.log('[DEBUG] Direct screenshot constructor:', rawScreenshot?.constructor?.name || 'N/A');
        const screenshot = extractBufferFromCDPResponse(rawScreenshot);
        console.log('[DEBUG] Direct screenshot extracted type:', typeof screenshot, 'Length:', screenshot.length);
        console.log('[DEBUG] Direct screenshot is Buffer?', screenshot instanceof Buffer);
        const base64Data = screenshot.toString('base64');
        console.log('[DEBUG] Direct screenshot base64 length:', base64Data.length, 'Preview:', base64Data.substring(0, 50) + '...');
        console.log('[DEBUG] includeBase64 flag:', includeBase64);
        return {
          content: includeBase64 ? [{
            type: 'image' as 'image',
            data: base64Data,
            mimeType: fileType === 'png' ? 'image/png' : 'image/jpeg',
          }] : []
        };
      }
    };

    return {
      code,
      action,
      captureSnapshot: true,
      waitForNetwork: false,
    };
  }
});

export default [
  screenshot,
];
