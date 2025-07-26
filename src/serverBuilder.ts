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

import { Server } from './server.js';
import { resolveConfig } from './config.js';
import { createEnhancedConnection, createConnectionFromEnhancedServer } from './enhancedConnection.js';
import type { Config } from './types/config.js';
import type { Tool } from './tools/tool.js';
import type { Resource, Prompt } from '@modelcontextprotocol/sdk/types.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { z } from 'zod';
import type { CDPRelay } from './cdp-relay.js';
import type { BrowserContextFactory } from './browserContextFactory.js';
import type { FullConfig } from './config.js';
import type { Connection } from './connection.js';

/**
 * Custom tool definition interface
 */
export interface CustomTool {
  name: string;
  title: string;
  description: string;
  inputSchema: z.Schema;
  capability: string;
  type?: 'readOnly' | 'destructive';
  handler: (params: any) => Promise<{
    content?: Array<{ type: 'text' | 'image'; text?: string; data?: string; mimeType?: string }>;
    isError?: boolean;
  }>;
}

/**
 * Custom resource definition interface
 */
export interface CustomResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: () => Promise<{
    contents: Array<{ uri: string; mimeType?: string; text?: string; blob?: string }>;
  }>;
}

/**
 * Custom prompt definition interface
 */
export interface CustomPrompt {
  name: string;
  description?: string;
  arguments?: Record<string, z.Schema>;
  handler: (args: any) => Promise<{
    messages: Array<{
      role: 'user' | 'assistant';
      content: { type: 'text' | 'image'; text?: string; data?: string; mimeType?: string };
    }>;
  }>;
}

/**
 * Shadow items configuration - hide specific standard tools/prompts/resources
 * Supports wildcard patterns using '*' (e.g., "browser_*", "*_test", "*middle*")
 */
export interface ShadowItems {
  tools?: string[];      // Array of tool names/patterns to hide from standard tools
  prompts?: string[];    // Array of prompt names/patterns to hide from standard prompts  
  resources?: string[];  // Array of resource URIs/patterns to hide from standard resources
}

/**
 * Server builder options
 */
export interface ServerBuilderOptions {
  config?: Config;
  cdpRelay?: CDPRelay;
  shadowItems?: ShadowItems;
}

/**
 * Enhanced server with custom components
 */
export class EnhancedServer extends Server {
  private _customTools: CustomTool[] = [];
  private _customResources: CustomResource[] = [];
  private _customPrompts: CustomPrompt[] = [];
  private _shadowItems: ShadowItems = {};

  constructor(config: FullConfig, options: { cdpRelay?: CDPRelay; shadowItems?: ShadowItems } = {}) {
    super(config, options);
    this._shadowItems = options.shadowItems || {};
  }

  getCustomTools(): CustomTool[] {
    return [...this._customTools];
  }

  getCustomResources(): CustomResource[] {
    return [...this._customResources];
  }

  getCustomPrompts(): CustomPrompt[] {
    return [...this._customPrompts];
  }

  getShadowItems(): ShadowItems {
    return { ...this._shadowItems };
  }

  addCustomTool(tool: CustomTool): void {
    this._customTools.push(tool);
  }

  addCustomResource(resource: CustomResource): void {
    this._customResources.push(resource);
  }

  addCustomPrompt(prompt: CustomPrompt): void {
    this._customPrompts.push(prompt);
  }

  setShadowItems(shadowItems: ShadowItems): void {
    this._shadowItems = { ...shadowItems };
  }

  /**
   * Override createConnection to use enhanced connection
   */
  async createConnection(transport: Transport): Promise<Connection> {
    const connection = await createConnectionFromEnhancedServer(this, this._contextFactory);
    this._connectionList.push(connection as any);
    await connection.server.connect(transport);
    return connection as any;
  }

  /**
   * Create enhanced connection with custom components
   */
  async createEnhancedConnection(browserContextFactory: BrowserContextFactory, transport: Transport) {
    const connection = await createConnectionFromEnhancedServer(this, browserContextFactory);
    await connection.server.connect(transport);
    return connection;
  }
}

/**
 * Server builder for creating servers with custom tools, resources, and prompts
 */
export class ServerBuilder {
  private _config: Config = {};
  private _customTools: CustomTool[] = [];
  private _customResources: CustomResource[] = [];
  private _customPrompts: CustomPrompt[] = [];
  private _shadowItems: ShadowItems = {};
  private _cdpRelay?: CDPRelay;

  /**
   * Set server configuration
   */
  config(config: Config): ServerBuilder {
    this._config = { ...this._config, ...config };
    return this;
  }

  /**
   * Set CDP relay
   */
  cdpRelay(cdpRelay: CDPRelay): ServerBuilder {
    this._cdpRelay = cdpRelay;
    return this;
  }

  /**
   * Set shadow items to hide standard tools/prompts/resources
   */
  shadowItems(shadowItems: ShadowItems): ServerBuilder {
    this._shadowItems = { ...shadowItems };
    return this;
  }

  /**
   * Add a custom tool
   */
  addTool(tool: CustomTool): ServerBuilder {
    this._customTools.push(tool);
    return this;
  }

  /**
   * Add multiple custom tools
   */
  addTools(tools: CustomTool[]): ServerBuilder {
    this._customTools.push(...tools);
    return this;
  }

  /**
   * Add a custom resource
   */
  addResource(resource: CustomResource): ServerBuilder {
    this._customResources.push(resource);
    return this;
  }

  /**
   * Add multiple custom resources
   */
  addResources(resources: CustomResource[]): ServerBuilder {
    this._customResources.push(...resources);
    return this;
  }

  /**
   * Add a custom prompt
   */
  addPrompt(prompt: CustomPrompt): ServerBuilder {
    this._customPrompts.push(prompt);
    return this;
  }

  /**
   * Add multiple custom prompts
   */
  addPrompts(prompts: CustomPrompt[]): ServerBuilder {
    this._customPrompts.push(...prompts);
    return this;
  }

  /**
   * Build the enhanced server
   */
  async build(): Promise<EnhancedServer> {
    const resolvedConfig = await resolveConfig(this._config);
    const server = new EnhancedServer(resolvedConfig, { 
      cdpRelay: this._cdpRelay,
      shadowItems: this._shadowItems 
    });

    // Add custom components to the server
    this._customTools.forEach(tool => server.addCustomTool(tool));
    this._customResources.forEach(resource => server.addCustomResource(resource));
    this._customPrompts.forEach(prompt => server.addCustomPrompt(prompt));

    return server;
  }
}

/**
 * Create a new server builder
 */
export function createServerBuilder(options: ServerBuilderOptions = {}): ServerBuilder {
  const builder = new ServerBuilder();
  
  if (options.config) {
    builder.config(options.config);
  }
  
  if (options.cdpRelay) {
    builder.cdpRelay(options.cdpRelay);
  }
  
  if (options.shadowItems) {
    builder.shadowItems(options.shadowItems);
  }
  
  return builder;
}

/**
 * Utility function to create a simple tool
 */
export function createTool(
  name: string,
  description: string,
  inputSchema: z.Schema,
  handler: CustomTool['handler'],
  options: {
    title?: string;
    capability?: string;
    type?: 'readOnly' | 'destructive';
  } = {}
): CustomTool {
  return {
    name,
    title: options.title || name,
    description,
    inputSchema,
    capability: options.capability || 'custom',
    type: options.type || 'readOnly',
    handler,
  };
}

/**
 * Utility function to create a simple resource
 */
export function createResource(
  uri: string,
  name: string,
  handler: CustomResource['handler'],
  options: {
    description?: string;
    mimeType?: string;
  } = {}
): CustomResource {
  return {
    uri,
    name,
    description: options.description,
    mimeType: options.mimeType,
    handler,
  };
}

/**
 * Utility function to create a simple prompt
 */
export function createPrompt(
  name: string,
  handler: CustomPrompt['handler'],
  options: {
    description?: string;
    arguments?: Record<string, z.Schema>;
  } = {}
): CustomPrompt {
  return {
    name,
    description: options.description,
    arguments: options.arguments,
    handler,
  };
}