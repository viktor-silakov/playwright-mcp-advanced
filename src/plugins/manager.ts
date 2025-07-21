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

import type { Tool } from '../tools/tool.js';
import type { FullConfig } from '../config.js';
import type { Plugin, LoadedPlugin, ShadowItems } from './types.js';
import type { Prompt } from '@modelcontextprotocol/sdk/types.js';
import { PluginLoader } from './loader.js';

/**
 * Plugin manager that handles loading, enabling/disabling, and integrating plugins
 * with the MCP server functionality.
 */
export class PluginManager {
  private readonly _config: FullConfig;
  private readonly _loader: PluginLoader;
  private _initialized = false;

  constructor(config: FullConfig) {
    this._config = config;
    this._loader = new PluginLoader(config);
  }

  /**
   * Get the plugin loader instance.
   */
  get loader(): PluginLoader {
    return this._loader;
  }

  /**
   * Initialize the plugin manager and load all plugins.
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    await this._loader.loadPlugins();
    this._initialized = true;
  }

  /**
   * Cleanup the plugin manager and all loaded plugins.
   */
  async cleanup(): Promise<void> {
    if (!this._initialized) {
      return;
    }

    await this._loader.cleanup();
    this._initialized = false;
  }

  /**
   * Get all tools from core system and enabled plugins, with shadowing applied.
   */
  getAvailableTools(coreTools: Tool<any>[]): Tool<any>[] {
    if (!this._initialized) {
      return coreTools;
    }

    const shadowedTools = new Set<string>();
    const pluginTools: Tool<any>[] = [];

    // Collect all shadowed tool names and plugin tools
    for (const loadedPlugin of this._loader.enabledPlugins) {
      const { plugin } = loadedPlugin;
      
      // Collect shadowed tool names
      if (plugin.shadowItems?.tools) {
        for (const toolName of plugin.shadowItems.tools) {
          shadowedTools.add(toolName);
        }
      }

      // Collect plugin tools
      if (plugin.tools) {
        pluginTools.push(...plugin.tools);
      }
    }

    // Filter core tools - remove shadowed ones unless they're redefined by plugins
    const pluginToolNames = new Set(pluginTools.map(t => t.schema.name));
    const filteredCoreTools = coreTools.filter(tool => {
      const toolName = tool.schema.name;
      // Include tool if it's not shadowed OR if it's redefined by a plugin
      return !shadowedTools.has(toolName) || pluginToolNames.has(toolName);
    });

    // Combine filtered core tools with plugin tools
    // Plugin tools take precedence over core tools with the same name
    const allTools: Tool<any>[] = [...filteredCoreTools];
    
    for (const pluginTool of pluginTools) {
      const existingIndex = allTools.findIndex(t => t.schema.name === pluginTool.schema.name);
      if (existingIndex >= 0) {
        // Replace existing tool with plugin tool
        allTools[existingIndex] = pluginTool;
      } else {
        // Add new plugin tool
        allTools.push(pluginTool);
      }
    }

    return allTools;
  }

  /**
   * Get all prompts from enabled plugins, with shadowing applied.
   */
  getAvailablePrompts(corePrompts: Prompt[] = []): Prompt[] {
    if (!this._initialized) {
      return corePrompts;
    }

    const shadowedPrompts = new Set<string>();
    const pluginPrompts: Prompt[] = [];

    // Collect all shadowed prompt names and plugin prompts
    for (const loadedPlugin of this._loader.enabledPlugins) {
      const { plugin } = loadedPlugin;
      
      // Collect shadowed prompt names
      if (plugin.shadowItems?.prompts) {
        for (const promptName of plugin.shadowItems.prompts) {
          shadowedPrompts.add(promptName);
        }
      }

      // Collect plugin prompts
      if (plugin.prompts) {
        pluginPrompts.push(...plugin.prompts);
      }
    }

    // Filter core prompts - remove shadowed ones unless they're redefined by plugins
    const pluginPromptNames = new Set(pluginPrompts.map(p => p.name));
    const filteredCorePrompts = corePrompts.filter(prompt => {
      const promptName = prompt.name;
      // Include prompt if it's not shadowed OR if it's redefined by a plugin
      return !shadowedPrompts.has(promptName) || pluginPromptNames.has(promptName);
    });

    // Combine filtered core prompts with plugin prompts
    // Plugin prompts take precedence over core prompts with the same name
    const allPrompts: Prompt[] = [...filteredCorePrompts];
    
    for (const pluginPrompt of pluginPrompts) {
      const existingIndex = allPrompts.findIndex(p => p.name === pluginPrompt.name);
      if (existingIndex >= 0) {
        // Replace existing prompt with plugin prompt
        allPrompts[existingIndex] = pluginPrompt;
      } else {
        // Add new plugin prompt
        allPrompts.push(pluginPrompt);
      }
    }

    return allPrompts;
  }

  /**
   * Get all resources from enabled plugins.
   */
  getAvailableResources() {
    if (!this._initialized) {
      return [];
    }

    const resources: any[] = [];
    
    for (const loadedPlugin of this._loader.enabledPlugins) {
      const { plugin } = loadedPlugin;
      if (plugin.resources) {
        resources.push(...plugin.resources);
      }
    }

    return resources;
  }

  /**
   * Get all properties from enabled plugins.
   */
  getAvailableProperties() {
    if (!this._initialized) {
      return [];
    }

    const properties: any[] = [];
    
    for (const loadedPlugin of this._loader.enabledPlugins) {
      const { plugin } = loadedPlugin;
      if (plugin.properties) {
        properties.push(...plugin.properties);
      }
    }

    return properties;
  }

  /**
   * Get plugin information for debugging/status purposes.
   */
  getPluginInfo() {
    return {
      initialized: this._initialized,
      pluginsPath: this._loader.pluginsPath,
      totalPlugins: this._loader.loadedPlugins.length,
      enabledPlugins: this._loader.enabledPlugins.length,
      plugins: this._loader.loadedPlugins.map(p => ({
        name: p.plugin.metadata.name,
        version: p.plugin.metadata.version,
        description: p.plugin.metadata.description,
        enabled: p.enabled,
        error: p.error,
        path: p.path,
        toolsCount: p.plugin.tools?.length ?? 0,
        promptsCount: p.plugin.prompts?.length ?? 0,
        resourcesCount: p.plugin.resources?.length ?? 0,
        propertiesCount: p.plugin.properties?.length ?? 0,
        shadowedTools: p.plugin.shadowItems?.tools ?? [],
        shadowedPrompts: p.plugin.shadowItems?.prompts ?? [],
        shadowedResources: p.plugin.shadowItems?.resources ?? [],
      }))
    };
  }

  /**
   * Reload a specific plugin by name.
   */
  async reloadPlugin(pluginName: string): Promise<boolean> {
    if (!this._initialized) {
      return false;
    }

    const result = await this._loader.reloadPlugin(pluginName);
    return result !== null && !result.error;
  }

  /**
   * Get detailed shadow information for debugging.
   */
  getShadowInfo() {
    if (!this._initialized) {
      return { shadowedTools: [], shadowedPrompts: [], shadowedResources: [] };
    }

    const shadowedTools: string[] = [];
    const shadowedPrompts: string[] = [];
    const shadowedResources: string[] = [];

    for (const loadedPlugin of this._loader.enabledPlugins) {
      const { plugin } = loadedPlugin;
      
      if (plugin.shadowItems?.tools) {
        shadowedTools.push(...plugin.shadowItems.tools.map(name => `${name} (by ${plugin.metadata.name})`));
      }
      
      if (plugin.shadowItems?.prompts) {
        shadowedPrompts.push(...plugin.shadowItems.prompts.map(name => `${name} (by ${plugin.metadata.name})`));
      }
      
      if (plugin.shadowItems?.resources) {
        shadowedResources.push(...plugin.shadowItems.resources.map(name => `${name} (by ${plugin.metadata.name})`));
      }
    }

    return {
      shadowedTools,
      shadowedPrompts,
      shadowedResources,
    };
  }
}