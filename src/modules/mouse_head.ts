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
import { defineTool } from '../tools/tool.js';
import type { Context } from '../context.js';

const elementSchema = z.object({
  element: z.string().describe('Human-readable element description used to obtain permission to interact with the element'),
});

const mouseMove = defineTool({
  capability: 'vision',
  schema: {
    name: 'browser_mouse_move_xy',
    title: 'Move mouse',
    description: 'Move mouse to a given position',
    inputSchema: elementSchema.extend({
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
    }),
    type: 'readOnly',
  },

  handle: async (context: Context, params: z.infer<typeof elementSchema> & { x: number; y: number }) => {
    const tab = context.currentTabOrDie();
    const code = [
      `// Move mouse to (${params.x}, ${params.y})`,
      `await page.mouse.move(${params.x}, ${params.y});`,
    ];
    const action = () => tab.page.mouse.move(params.x, params.y);
    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: false
    };
  },
});

const mouseClick = defineTool({
  capability: 'vision',
  schema: {
    name: 'browser_mouse_click_xy',
    title: 'Click',
    description: 'Click left mouse button at a given position',
    inputSchema: elementSchema.extend({
      x: z.number().describe('X coordinate'),
      y: z.number().describe('Y coordinate'),
    }),
    type: 'destructive',
  },

  handle: async (context: Context, params: z.infer<typeof elementSchema> & { x: number; y: number }) => {
    const tab = context.currentTabOrDie();
    const code = [
      `// Click mouse at coordinates (${params.x}, ${params.y})`,
      `await page.mouse.move(${params.x}, ${params.y});`,
      `await page.mouse.down();`,
      `await page.mouse.up();`,
    ];
    const action = async () => {
      await tab.page.mouse.move(params.x, params.y);
      await tab.page.mouse.down();
      await tab.page.mouse.up();
    };
    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: true,
    };
  },
});

const mouseDrag = defineTool({
  capability: 'vision',
  schema: {
    name: 'browser_mouse_drag_xy',
    title: 'Drag mouse',
    description: 'Drag left mouse button to a given position',
    inputSchema: elementSchema.extend({
      startX: z.number().describe('Start X coordinate'),
      startY: z.number().describe('Start Y coordinate'),
      endX: z.number().describe('End X coordinate'),
      endY: z.number().describe('End Y coordinate'),
    }),
    type: 'destructive',
  },

  handle: async (context: Context, params: z.infer<typeof elementSchema> & { startX: number; startY: number; endX: number; endY: number }) => {
    const tab = context.currentTabOrDie();

    const code = [
      `// Drag mouse from (${params.startX}, ${params.startY}) to (${params.endX}, ${params.endY})`,
      `await page.mouse.move(${params.startX}, ${params.startY});`,
      `await page.mouse.down();`,
      `await page.mouse.move(${params.endX}, ${params.endY});`,
      `await page.mouse.up();`,
    ];

    const action = async () => {
      await tab.page.mouse.move(params.startX, params.startY);
      await tab.page.mouse.down();
      await tab.page.mouse.move(params.endX, params.endY);
      await tab.page.mouse.up();
    };

    return {
      code,
      action,
      captureSnapshot: false,
      waitForNetwork: true,
    };
  },
});

export default [
  mouseMove,
  mouseClick,
  mouseDrag,
];
