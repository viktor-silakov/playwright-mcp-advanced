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

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

import type { Plugin, LoadedPlugin } from './types.js';
import type { FullConfig } from '../config.js';

/**
 * Plugin loader class that discovers and loads plugins from the filesystem.
 */
export class PluginLoader {
  private readonly _config: FullConfig;
  private readonly _pluginsPath: string;
  private _loadedPlugins: LoadedPlugin[] = [];

  constructor(config: FullConfig) {
    this._config = config;
    this._pluginsPath = path.resolve(config.plugins.folder || './plugins');
  }

  /**
   * Get the plugins directory path.
   */
  get pluginsPath(): string {
    return this._pluginsPath;
  }

  /**
   * Get all loaded plugins.
   */
  get loadedPlugins(): LoadedPlugin[] {
    return this._loadedPlugins.slice();
  }

  /**
   * Get only enabled plugins.
   */
  get enabledPlugins(): LoadedPlugin[] {
    return this._loadedPlugins.filter(p => p.enabled);
  }

  /**
   * Discover and load all plugins from the plugins directory.
   */
  async loadPlugins(): Promise<LoadedPlugin[]> {
    this._loadedPlugins = [];

    // Check if plugins directory exists
    if (!fs.existsSync(this._pluginsPath)) {
      console.log(`Plugins directory not found: ${this._pluginsPath}`);
      return this._loadedPlugins;
    }

    const pluginDirs = await this._discoverPluginDirectories();
    
    for (const pluginDir of pluginDirs) {
      const pluginName = path.basename(pluginDir);
      try {
        const plugin = await this._loadPlugin(pluginDir);
        const enabled = this._isPluginEnabled(pluginName);
        
        this._loadedPlugins.push({
          plugin,
          path: pluginDir,
          enabled,
        });

        if (enabled && plugin.initialize) {
          await plugin.initialize();
        }
      } catch (error) {
        console.error(`Failed to load plugin from ${pluginDir}:`, error);
        this._loadedPlugins.push({
          plugin: {
            metadata: {
              name: pluginName,
              version: 'unknown',
              description: 'Failed to load plugin',
            }
          },
          path: pluginDir,
          enabled: false,
          error: String(error),
        });
      }
    }

    return this._loadedPlugins;
  }

  /**
   * Cleanup all loaded plugins.
   */
  async cleanup(): Promise<void> {
    for (const loadedPlugin of this._loadedPlugins) {
      if (loadedPlugin.enabled && loadedPlugin.plugin.cleanup) {
        try {
          await loadedPlugin.plugin.cleanup();
        } catch (error) {
          console.error(`Failed to cleanup plugin ${loadedPlugin.plugin.metadata.name}:`, error);
        }
      }
    }
  }

  /**
   * Reload a specific plugin by name.
   */
  async reloadPlugin(pluginName: string): Promise<LoadedPlugin | null> {
    const existingIndex = this._loadedPlugins.findIndex(p => p.plugin.metadata.name === pluginName);
    if (existingIndex === -1) {
      return null;
    }

    const existingPlugin = this._loadedPlugins[existingIndex];
    
    // Cleanup the existing plugin
    if (existingPlugin.enabled && existingPlugin.plugin.cleanup) {
      try {
        await existingPlugin.plugin.cleanup();
      } catch (error) {
        console.error(`Failed to cleanup plugin ${pluginName} before reload:`, error);
      }
    }

    // Reload the plugin
    try {
      const plugin = await this._loadPlugin(existingPlugin.path);
      const enabled = this._isPluginEnabled(pluginName);
      
      const reloadedPlugin: LoadedPlugin = {
        plugin,
        path: existingPlugin.path,
        enabled,
      };

      if (enabled && plugin.initialize) {
        await plugin.initialize();
      }

      this._loadedPlugins[existingIndex] = reloadedPlugin;
      return reloadedPlugin;
    } catch (error) {
      console.error(`Failed to reload plugin ${pluginName}:`, error);
      this._loadedPlugins[existingIndex] = {
        ...existingPlugin,
        error: String(error),
        enabled: false,
      };
      return this._loadedPlugins[existingIndex];
    }
  }

  /**
   * Discover plugin directories in the plugins folder.
   */
  private async _discoverPluginDirectories(): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(this._pluginsPath, { withFileTypes: true });
      const pluginDirs: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(this._pluginsPath, entry.name);
          const indexJsPath = path.join(pluginPath, 'index.js');
          const indexPath = path.join(pluginPath, 'index.ts');
          
          // Check if index.js or index.ts exists (prioritize .js)
          if (fs.existsSync(indexJsPath) || fs.existsSync(indexPath)) {
            pluginDirs.push(pluginPath);
          }
        }
      }

      return pluginDirs;
    } catch (error) {
      console.error(`Failed to discover plugin directories in ${this._pluginsPath}:`, error);
      return [];
    }
  }

  /**
   * Load a plugin from the given directory.
   */
  private async _loadPlugin(pluginDir: string): Promise<Plugin> {
    const pluginName = path.basename(pluginDir);
    
    // Try to load index.js first, then index.ts (prioritize compiled JS)
    let indexPath = path.join(pluginDir, 'index.js');
    if (!fs.existsSync(indexPath)) {
      indexPath = path.join(pluginDir, 'index.ts');
    }

    if (!fs.existsSync(indexPath)) {
      throw new Error(`Plugin index file not found in ${pluginDir}`);
    }

    // Dynamic import using file URL
    const fileUrl = pathToFileURL(indexPath).href;
    const pluginModule = await import(fileUrl);

    // The plugin should export a default Plugin object or a function that returns one
    let plugin: Plugin;
    if (typeof pluginModule.default === 'function') {
      plugin = await pluginModule.default();
    } else if (typeof pluginModule.default === 'object') {
      plugin = pluginModule.default;
    } else {
      throw new Error(`Plugin ${pluginName} must export a Plugin object or a function that returns one`);
    }

    // Validate plugin structure
    if (!plugin.metadata?.name) {
      throw new Error(`Plugin ${pluginName} must have metadata with a name`);
    }

    if (!plugin.metadata.version) {
      throw new Error(`Plugin ${pluginName} must have metadata with a version`);
    }

    return plugin;
  }

  /**
   * Check if a plugin is enabled based on configuration.
   */
  private _isPluginEnabled(pluginName: string): boolean {
    const { enabled, disabled } = this._config.plugins;

    // If disabled list is specified and includes this plugin, disable it
    if (disabled && disabled.includes(pluginName)) {
      return false;
    }

    // If enabled list is specified, only enable plugins in the list
    if (enabled && enabled.length > 0) {
      return enabled.includes(pluginName);
    }

    // Default: enable all plugins not explicitly disabled
    return true;
  }
}