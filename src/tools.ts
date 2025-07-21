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

import common from './tools/common.js';
import console from './tools/console.js';
import dialogs from './tools/dialogs.js';
import evaluate from './tools/evaluate.js';
import files from './tools/files.js';
import html from './tools/html.js';
import install from './tools/install.js';
import keyboard from './tools/keyboard.js';
import mouse from './tools/mouse.js';
import navigate from './tools/navigate.js';
import network from './tools/network.js';
import pdf from './tools/pdf.js';
import plugins from './tools/plugins.js';
import snapshot from './tools/snapshot.js';
import tabs from './tools/tabs.js';
import screenshot from './tools/screenshot.js';
import vision from './tools/vision.js';
import wait from './tools/wait.js';

import type { Tool } from './tools/tool.js';
import type { PluginManager } from './plugins/manager.js';

export const snapshotTools: Tool<any>[] = [
  ...common,
  ...console,
  ...dialogs,
  ...evaluate,
  ...files,
  ...html,
  ...install,
  ...keyboard,
  ...mouse,
  ...navigate,
  ...network,
  ...pdf,
  ...plugins,
  ...screenshot,
  ...snapshot,
  ...tabs,
  ...wait,
];

export const visionTools: Tool<any>[] = [
  ...common,
  ...console,
  ...dialogs,
  ...evaluate,
  ...files,
  ...html,
  ...install,
  ...keyboard,
  ...mouse,
  ...navigate,
  ...network,
  ...pdf,
  ...plugins,
  ...snapshot,
  ...tabs,
  ...vision,
  ...wait,
];

export const allTools: Tool<any>[] = [
  ...snapshotTools,
];

/**
 * Get tools with plugin integration and capability filtering.
 */
export function getToolsWithPlugins(
  config: { capabilities?: string[] },
  pluginManager?: PluginManager
): Tool<any>[] {
  // Select the appropriate tool set based on capabilities
  let baseTools = snapshotTools;
  if (config.capabilities?.includes('vision')) {
    baseTools = visionTools;
  }
  
  // Filter tools by capabilities
  const filteredTools = baseTools.filter(tool => 
    tool.capability.startsWith('core') || config.capabilities?.includes(tool.capability)
  );

  // Apply plugin integration if plugin manager is available
  if (pluginManager) {
    return pluginManager.getAvailableTools(filteredTools);
  }

  return filteredTools;
}
