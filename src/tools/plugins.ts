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

const pluginsTool = defineTool({
  capability: 'core',
  
  schema: {
    name: 'plugins_manage',
    title: 'Plugin Management',
    description: 'Manage plugins: list, get info, reload, or show shadow information',
    type: 'readOnly',
    inputSchema: z.object({
      action: z.enum(['list', 'info', 'reload', 'shadow-info']).describe('Action to perform'),
      pluginName: z.string().optional().describe('Plugin name for info/reload actions'),
    }),
  },

  handle: async (context, { action, pluginName }) => {
    if (!context.pluginManager) {
      return {
        code: [`// Plugin system not available`],
        captureSnapshot: false,
        waitForNetwork: false,
        resultOverride: {
          content: [{ type: 'text', text: 'Plugin system not available' }],
        },
      };
    }

    const pluginManager = context.pluginManager;

    switch (action) {
      case 'list': {
        const info = pluginManager.getPluginInfo();
        const plugins = info.plugins.map((p: any) => ({
          name: p.name,
          version: p.version,
          description: p.description,
          enabled: p.enabled,
          error: p.error,
          toolsCount: p.toolsCount,
          promptsCount: p.promptsCount,
          resourcesCount: p.resourcesCount,
          shadowedItems: {
            tools: p.shadowedTools,
            prompts: p.shadowedPrompts,
            resources: p.shadowedResources,
          }
        }));

        return {
          code: [`// Plugin list retrieved`],
          captureSnapshot: false,
          waitForNetwork: false,
          resultOverride: {
            content: [{
              type: 'text',
              text: `Plugin System Status:
- Initialized: ${info.initialized}
- Plugins Path: ${info.pluginsPath}
- Total Plugins: ${info.totalPlugins}
- Enabled Plugins: ${info.enabledPlugins}

Plugins:
${plugins.map((p: any) => `
  ${p.name} v${p.version} [${p.enabled ? 'ENABLED' : 'DISABLED'}]
  ${p.description || 'No description'}
  Tools: ${p.toolsCount}, Prompts: ${p.promptsCount}, Resources: ${p.resourcesCount}
  ${p.error ? `ERROR: ${p.error}` : ''}
  ${p.shadowedItems.tools.length > 0 ? `Shadows tools: ${p.shadowedItems.tools.join(', ')}` : ''}
  ${p.shadowedItems.prompts.length > 0 ? `Shadows prompts: ${p.shadowedItems.prompts.join(', ')}` : ''}
  ${p.shadowedItems.resources.length > 0 ? `Shadows resources: ${p.shadowedItems.resources.join(', ')}` : ''}
`).join('\n')}`,
            }],
          },
        };
      }

      case 'info': {
        if (!pluginName) {
          return {
            code: [`// Plugin name required`],
            captureSnapshot: false,
            waitForNetwork: false,
            resultOverride: {
              content: [{ type: 'text', text: 'Plugin name is required for info action' }],
            },
          };
        }

        const info = pluginManager.getPluginInfo();
        const plugin = info.plugins.find((p: any) => p.name === pluginName);
        
        if (!plugin) {
          return {
            code: [`// Plugin '${pluginName}' not found`],
            captureSnapshot: false,
            waitForNetwork: false,
            resultOverride: {
              content: [{ type: 'text', text: `Plugin '${pluginName}' not found` }],
            },
          };
        }

        return {
          code: [`// Plugin info for ${plugin.name}`],
          captureSnapshot: false,
          waitForNetwork: false,
          resultOverride: {
            content: [{
              type: 'text',
              text: `Plugin Information: ${plugin.name}
Version: ${plugin.version}
Description: ${plugin.description || 'No description'}
Status: ${plugin.enabled ? 'ENABLED' : 'DISABLED'}
Path: ${plugin.path}
${plugin.error ? `Error: ${plugin.error}` : ''}

Resources:
- Tools: ${plugin.toolsCount}
- Prompts: ${plugin.promptsCount}
- Resources: ${plugin.resourcesCount}
- Properties: ${plugin.propertiesCount}

Shadow Items:
- Tools: ${plugin.shadowedTools.join(', ') || 'None'}
- Prompts: ${plugin.shadowedPrompts.join(', ') || 'None'}
- Resources: ${plugin.shadowedResources.join(', ') || 'None'}`,
            }],
          },
        };
      }

      case 'reload': {
        if (!pluginName) {
          return {
            code: [`// Plugin name required`],
            captureSnapshot: false,
            waitForNetwork: false,
            resultOverride: {
              content: [{ type: 'text', text: 'Plugin name is required for reload action' }],
            },
          };
        }

        const success = await pluginManager.reloadPlugin(pluginName);
        
        return {
          code: [`// Plugin '${pluginName}' reload ${success ? 'successful' : 'failed'}`],
          captureSnapshot: false,
          waitForNetwork: false,
          resultOverride: {
            content: [{
              type: 'text',
              text: success 
                ? `Plugin '${pluginName}' reloaded successfully`
                : `Failed to reload plugin '${pluginName}'`,
            }],
          },
        };
      }

      case 'shadow-info': {
        const shadowInfo = pluginManager.getShadowInfo();
        
        return {
          code: [`// Shadow information retrieved`],
          captureSnapshot: false,
          waitForNetwork: false,
          resultOverride: {
            content: [{
              type: 'text',
              text: `Shadow Information:

Shadowed Tools:
${shadowInfo.shadowedTools.length > 0 ? shadowInfo.shadowedTools.map((t: string) => `- ${t}`).join('\n') : '- None'}

Shadowed Prompts:
${shadowInfo.shadowedPrompts.length > 0 ? shadowInfo.shadowedPrompts.map((p: string) => `- ${p}`).join('\n') : '- None'}

Shadowed Resources:
${shadowInfo.shadowedResources.length > 0 ? shadowInfo.shadowedResources.map((r: string) => `- ${r}`).join('\n') : '- None'}`,
            }],
          },
        };
      }

      default:
        return {
          code: [`// Unknown action: ${action}`],
          captureSnapshot: false,
          waitForNetwork: false,
          resultOverride: {
            content: [{ type: 'text', text: 'Unknown action' }],
          },
        };
    }
  },
});

export default [pluginsTool];