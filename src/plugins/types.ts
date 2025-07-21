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
import type { Prompt } from '@modelcontextprotocol/sdk/types.js';

/**
 * Shadow items that this plugin hides from the MCP Tool listing.
 * These items will not be shown unless they are redefined in the same plugin.
 */
export interface ShadowItems {
  /**
   * List of tool names to shadow (hide).
   */
  tools?: string[];

  /**
   * List of prompt names to shadow (hide).
   */
  prompts?: string[];

  /**
   * List of resource names to shadow (hide).
   */
  resources?: string[];
}

/**
 * Plugin metadata and information.
 */
export interface PluginMetadata {
  /**
   * Plugin name.
   */
  name: string;

  /**
   * Plugin version.
   */
  version: string;

  /**
   * Plugin description.
   */
  description?: string;

  /**
   * Plugin author.
   */
  author?: string;

  /**
   * Plugin dependencies (other plugins this plugin requires).
   */
  dependencies?: string[];

  /**
   * Minimum MCP server version required.
   */
  minServerVersion?: string;
}

/**
 * MCP Resource definition for plugins.
 */
export interface PluginResource {
  /**
   * Resource name/identifier.
   */
  name: string;

  /**
   * Resource description.
   */
  description?: string;

  /**
   * Resource URI template.
   */
  uri: string;

  /**
   * MIME type of the resource.
   */
  mimeType?: string;

  /**
   * Function to get the resource content.
   */
  handler: (uri: string) => Promise<{ content: string; mimeType?: string; }>;
}

/**
 * Plugin property definition.
 */
export interface PluginProperty {
  /**
   * Property name.
   */
  name: string;

  /**
   * Property description.
   */
  description?: string;

  /**
   * Property value getter function.
   */
  getter: () => Promise<any> | any;

  /**
   * Property value setter function (optional for read-only properties).
   */
  setter?: (value: any) => Promise<void> | void;

  /**
   * Whether this property is read-only.
   */
  readOnly?: boolean;
}

/**
 * Main plugin definition interface.
 */
export interface Plugin {
  /**
   * Plugin metadata.
   */
  metadata: PluginMetadata;

  /**
   * MCP Tools provided by this plugin.
   */
  tools?: Tool<any>[];

  /**
   * MCP Prompts provided by this plugin.
   */
  prompts?: Prompt[];

  /**
   * MCP Resources provided by this plugin.
   */
  resources?: PluginResource[];

  /**
   * Properties provided by this plugin.
   */
  properties?: PluginProperty[];

  /**
   * Shadow items - tools/prompts/resources this plugin hides.
   */
  shadowItems?: ShadowItems;

  /**
   * Plugin initialization function (optional).
   */
  initialize?: () => Promise<void> | void;

  /**
   * Plugin cleanup function (optional).
   */
  cleanup?: () => Promise<void> | void;
}

/**
 * Plugin loader result.
 */
export interface LoadedPlugin {
  /**
   * Plugin instance.
   */
  plugin: Plugin;

  /**
   * Plugin directory path.
   */
  path: string;

  /**
   * Whether the plugin is enabled.
   */
  enabled: boolean;

  /**
   * Load error if any.
   */
  error?: string;
}