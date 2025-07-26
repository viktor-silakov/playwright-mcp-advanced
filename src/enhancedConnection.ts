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

import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  Tool as McpTool,
  Resource as McpResource,
  Prompt as McpPrompt,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

import { Context } from './context.js';
import { getToolsWithPlugins } from './tools.js';
import { packageJSON } from './package.js';
import { PluginManager } from './plugins/manager.js';
import { isShadowed } from './utils/shadowMatcher.js';
import type { Tool } from './tools/tool.js';
import type { CustomTool, CustomResource, CustomPrompt, EnhancedServer } from './serverBuilder.js';

import { FullConfig } from './config.js';

import type { BrowserContextFactory } from './browserContextFactory.js';

/**
 * Enhanced connection that supports custom tools, resources, and prompts
 */
export class EnhancedConnection {
  readonly server: McpServer;
  readonly context: Context;
  readonly pluginManager: PluginManager;
  private readonly customTools: CustomTool[];
  private readonly customResources: CustomResource[];
  private readonly customPrompts: CustomPrompt[];

  constructor(
    server: McpServer, 
    context: Context, 
    pluginManager: PluginManager,
    customTools: CustomTool[] = [],
    customResources: CustomResource[] = [],
    customPrompts: CustomPrompt[] = []
  ) {
    this.server = server;
    this.context = context;
    this.pluginManager = pluginManager;
    this.customTools = customTools;
    this.customResources = customResources;
    this.customPrompts = customPrompts;
    
    this.server.oninitialized = () => {
      this.context.clientVersion = this.server.getClientVersion();
    };
  }

  async close() {
    await this.server.close();
    await this.context.close();
    await this.pluginManager.cleanup();
  }
}

/**
 * Create an enhanced connection with custom tools, resources, and prompts
 */
export async function createEnhancedConnection(
  config: FullConfig, 
  browserContextFactory: BrowserContextFactory,
  enhancedServer?: EnhancedServer
): Promise<EnhancedConnection> {
  // Initialize plugin manager
  const pluginManager = new PluginManager(config);
  await pluginManager.initialize();

  // Get base tools with plugin integration
  const baseTools = getToolsWithPlugins(config, pluginManager);
  
  // Get custom components from enhanced server
  const customTools = enhancedServer?.getCustomTools() || [];
  const customResources = enhancedServer?.getCustomResources() || [];
  const customPrompts = enhancedServer?.getCustomPrompts() || [];
  const shadowItems = enhancedServer?.getShadowItems() || {};

  // Convert custom tools to Tool format
  const convertedCustomTools: Tool[] = customTools.map(customTool => ({
    capability: customTool.capability as any,
    schema: {
      name: customTool.name,
      title: customTool.title,
      description: customTool.description,
      inputSchema: customTool.inputSchema,
      type: customTool.type || 'readOnly',
    },
    handle: async (context: Context, params: any) => {
      const result = await customTool.handler(params);
      
      // Convert custom tool result format to MCP format
      const mcpContent = result.content?.map(item => {
        if (item.type === 'text') {
          return { type: 'text' as const, text: item.text || '' };
        } else {
          return { 
            type: 'image' as const, 
            data: item.data || '', 
            mimeType: item.mimeType || 'image/png' 
          };
        }
      });
      
      return {
        code: [`// Custom tool: ${customTool.name}`],
        captureSnapshot: false,
        waitForNetwork: false,
        resultOverride: result.isError ? {
          content: mcpContent,
          isError: true
        } : {
          content: mcpContent
        },
      };
    },
  }));

  // Keep all tools available for execution (base + custom)
  // This allows shadowed tools to still be called directly if not overridden by custom tools
  const allTools = [...baseTools, ...convertedCustomTools];
  
  // Create visible tools list for ListTools response (exclude shadowed base tools, but keep custom tools)
  // Shadowed tools are hidden from the list but remain callable via direct API calls
  const visibleTools = [
    ...baseTools.filter(tool => !isShadowed(shadowItems.tools, tool.schema.name)),
    ...convertedCustomTools
  ];
  const context = new Context(allTools, config, browserContextFactory, pluginManager);
  
  const server = new McpServer({ name: 'Playwright Enhanced', version: packageJSON.version }, {
    capabilities: {
      tools: {},
      resources: customResources.length > 0 ? {} : undefined,
      prompts: customPrompts.length > 0 ? {} : undefined,
    }
  });

  // Set up tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: visibleTools.map(tool => ({
        name: tool.schema.name,
        description: tool.schema.description,
        inputSchema: zodToJsonSchema(tool.schema.inputSchema),
        annotations: {
          title: tool.schema.title,
          readOnlyHint: tool.schema.type === 'readOnly',
          destructiveHint: tool.schema.type === 'destructive',
          openWorldHint: true,
        },
      })) as McpTool[],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async request => {
    const errorResult = (...messages: string[]) => ({
      content: [{ type: 'text', text: messages.join('\n') }],
      isError: true,
    });
    
    // Find tool with priority: custom tools first, then base tools
    // This allows custom tools to override base tools, even if the base tool is shadowed
    // Shadowed base tools can still be called if no custom tool with the same name exists
    let tool = convertedCustomTools.find(tool => tool.schema.name === request.params.name);
    if (!tool) {
      tool = baseTools.find(tool => tool.schema.name === request.params.name);
    }
    
    if (!tool)
      return errorResult(`Tool "${request.params.name}" not found`);

    const modalStates = context.modalStates().map(state => state.type);
    if (tool.clearsModalState && !modalStates.includes(tool.clearsModalState))
      return errorResult(`The tool "${request.params.name}" can only be used when there is related modal state present.`, ...context.modalStatesMarkdown());
    if (!tool.clearsModalState && modalStates.length)
      return errorResult(`Tool "${request.params.name}" does not handle the modal state.`, ...context.modalStatesMarkdown());

    try {
      return await context.run(tool, request.params.arguments);
    } catch (error) {
      return errorResult(String(error));
    }
  });

  // Set up resource handlers if custom resources exist
  if (customResources.length > 0) {
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: customResources.map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        })) as McpResource[],
      };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async request => {
      const resource = customResources.find(r => r.uri === request.params.uri);
      if (!resource) {
        throw new Error(`Resource not found: ${request.params.uri}`);
      }
      
      try {
        return await resource.handler();
      } catch (error) {
        throw new Error(`Failed to read resource: ${error}`);
      }
    });
  }

  // Set up prompt handlers if custom prompts exist
  if (customPrompts.length > 0) {
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: customPrompts.map(prompt => {
          const mcpPrompt: McpPrompt = {
            name: prompt.name,
            description: prompt.description,
          };
          
          if (prompt.arguments) {
            mcpPrompt.arguments = Object.entries(prompt.arguments).map(([name, schema]) => ({
              name,
              description: (schema as any)._def?.description || `Argument ${name}`,
              required: !(schema as any).isOptional(),
            }));
          }
          
          return mcpPrompt;
        }),
      };
    });

    server.setRequestHandler(GetPromptRequestSchema, async request => {
      const prompt = customPrompts.find(p => p.name === request.params.name);
      if (!prompt) {
        throw new Error(`Prompt not found: ${request.params.name}`);
      }
      
      try {
        // Validate arguments if schema exists
        let validatedArgs = {};
        if (prompt.arguments && request.params.arguments) {
          validatedArgs = {};
          for (const [key, schema] of Object.entries(prompt.arguments)) {
            const value = request.params.arguments[key];
            if (value !== undefined) {
              (validatedArgs as any)[key] = schema.parse(value);
            }
          }
        }
        
        return await prompt.handler(validatedArgs as any);
      } catch (error) {
        throw new Error(`Failed to get prompt: ${error}`);
      }
    });
  }

  return new EnhancedConnection(server, context, pluginManager, customTools, customResources, customPrompts);
}

/**
 * Create connection from EnhancedServer
 */
export async function createConnectionFromEnhancedServer(
  enhancedServer: EnhancedServer,
  browserContextFactory: BrowserContextFactory
): Promise<EnhancedConnection> {
  return await createEnhancedConnection(enhancedServer.config, browserContextFactory, enhancedServer);
}