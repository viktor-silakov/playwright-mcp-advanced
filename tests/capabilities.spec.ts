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

test('test snapshot tool list', async ({ client }) => {
  const { tools } = await client.listTools();
  expect(new Set(tools.map(t => t.name))).toEqual(new Set([
    'browser_click',
    'browser_close',
    'browser_console_messages',
    'browser_drag',
    'browser_element_snapshot',
    'browser_evaluate',
    'browser_file_upload',
    'browser_get_html_content',
    'browser_get_outer_html',
    'browser_handle_dialog',
    'browser_hover',
    'browser_install',
    'browser_navigate',
    'browser_navigate_back',
    'browser_navigate_forward',
    'browser_network_requests',
    'browser_press_key',
    'browser_resize',
    'browser_select_option',
    'browser_snapshot',
    'browser_tab_close',
    'browser_tab_list',
    'browser_tab_new',
    'browser_tab_select',
    'browser_take_screenshot',
    'browser_type',
    'browser_wait_for',
  ]));
});

test('test vision tool list', async ({ visionClient }) => {
  const { tools: visionTools } = await visionClient.listTools();
  expect(new Set(visionTools.map(t => t.name))).toEqual(new Set([
    'browser_click',
    'browser_close',
    'browser_console_messages',
    'browser_drag',
    'browser_element_snapshot',
    'browser_evaluate',
    'browser_file_upload',
    'browser_get_html_content',
    'browser_get_outer_html',
    'browser_handle_dialog',
    'browser_hover',
    'browser_install',
    'browser_mouse_click_xy',
    'browser_mouse_drag_xy',
    'browser_mouse_move_xy',
    'browser_navigate',
    'browser_navigate_back',
    'browser_navigate_forward',
    'browser_network_requests',
    'browser_press_key',
    'browser_resize',
    'browser_screen_capture',
    'browser_select_option',
    'browser_snapshot',
    'browser_tab_close',
    'browser_tab_list',
    'browser_tab_new',
    'browser_tab_select',
    'browser_type',
    'browser_wait_for',
  ]));
});

test('test capabilities', async ({ startClient }) => {
  const { client } = await startClient({
    args: ['--caps="core"'],
  });
  const { tools } = await client.listTools();
  const toolNames = tools.map(t => t.name);
  // In core mode, we should NOT have vision-specific tools
  expect(toolNames).not.toContain('browser_mouse_click_xy');
  expect(toolNames).not.toContain('browser_mouse_drag_xy');
  expect(toolNames).not.toContain('browser_mouse_move_xy');
  
  // But we should have all core tools available
  expect(toolNames).toContain('browser_navigate');
  expect(toolNames).toContain('browser_click');
  expect(toolNames).toContain('browser_take_screenshot');
  expect(toolNames).toContain('browser_evaluate');
});
