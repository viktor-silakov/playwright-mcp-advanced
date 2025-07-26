#!/usr/bin/env node
/**
 * MCP Tools Lister Utility
 * 
 * Lists available tools from an MCP server over HTTP
 * 
 * Usage:
 * mcp-list-tools [url] [options]
 * 
 * Examples:
 * mcp-list-tools http://localhost:3232/mcp
 * mcp-list-tools http://localhost:3232/mcp --format=json
 * mcp-list-tools http://localhost:3232/mcp --detailed
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get package.json version dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getPackageVersion(): string {
  try {
    // Try to read package.json from different possible locations
    const possiblePaths = [
      join(__dirname, '../../package.json'),  // During development
      join(__dirname, '../../../package.json'), // After npm link
      join(__dirname, '../../../../package.json'), // Other possible structure
    ];
    
    for (const path of possiblePaths) {
      try {
        const packageJson = JSON.parse(readFileSync(path, 'utf8'));
        return packageJson.version;
      } catch {
        continue;
      }
    }
    return '0.0.34'; // Fallback version
  } catch {
    return '0.0.34'; // Fallback version
  }
}

const packageVersion = getPackageVersion();

interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    openWorldHint?: boolean;
  };
}

interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

class McpClient {
  private baseUrl: string;
  private sessionId?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private async makeRequest(method: string, params?: any, id: number = 1) {
    const body = {
      jsonrpc: '2.0',
      method,
      id,
      ...(params && { params })
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };

    if (this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle SSE response for session creation
    if (!this.sessionId && response.headers.get('mcp-session-id')) {
      this.sessionId = response.headers.get('mcp-session-id')!;
    }

    const text = await response.text();
    
    // Parse SSE format if needed
    if (text.startsWith('event:')) {
      const lines = text.split('\n');
      const dataLine = lines.find(line => line.startsWith('data:'));
      if (dataLine) {
        const jsonStr = dataLine.substring(5).trim();
        return JSON.parse(jsonStr);
      }
    }
    
    // Parse regular JSON
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse response: ${text}`);
    }
  }

  async initialize() {
    const response = await this.makeRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'mcp-list-tools',
        version: packageVersion
      }
    });

    if (response.error) {
      throw new Error(`Initialize failed: ${response.error.message}`);
    }

    // Send initialized notification
    await this.makeRequest('initialized');
    
    return response.result;
  }

  async listTools(): Promise<McpTool[]> {
    const response = await this.makeRequest('tools/list', undefined, 2);
    
    if (response.error) {
      throw new Error(`List tools failed: ${response.error.message}`);
    }

    return response.result?.tools || [];
  }

  async listResources(): Promise<McpResource[]> {
    try {
      const response = await this.makeRequest('resources/list', undefined, 3);
      
      if (response.error) {
        if (response.error.code === -32601) {
          // Method not found - resources not supported
          return [];
        }
        throw new Error(`List resources failed: ${response.error.message}`);
      }

      return response.result?.resources || [];
    } catch (error) {
      // Silently fail if resources are not supported
      return [];
    }
  }

  async listPrompts(): Promise<McpPrompt[]> {
    try {
      const response = await this.makeRequest('prompts/list', undefined, 4);
      
      if (response.error) {
        if (response.error.code === -32601) {
          // Method not found - prompts not supported
          return [];
        }
        throw new Error(`List prompts failed: ${response.error.message}`);
      }

      return response.result?.prompts || [];
    } catch (error) {
      // Silently fail if prompts are not supported
      return [];
    }
  }
}

function formatTools(tools: McpTool[], format: string, detailed: boolean) {
  if (format === 'json') {
    return JSON.stringify(tools, null, 2);
  }

  if (tools.length === 0) {
    return '📭 No tools available';
  }

  let output = `🛠️  Available Tools (${tools.length}):\n\n`;
  
  for (const tool of tools) {
    const readOnly = tool.annotations?.readOnlyHint ? '🔒' : '';
    const destructive = tool.annotations?.destructiveHint ? '⚠️ ' : '';
    const title = tool.annotations?.title || tool.name;
    
    output += `${destructive}${readOnly} ${tool.name}\n`;
    output += `   Title: ${title}\n`;
    output += `   Description: ${tool.description}\n`;
    
    if (detailed && tool.inputSchema) {
      output += `   Input Schema:\n`;
      if (tool.inputSchema.properties) {
        for (const [propName, propDef] of Object.entries(tool.inputSchema.properties as any)) {
          const required = tool.inputSchema.required?.includes(propName) ? '*' : '';
          const description = (propDef as any).description || '';
          output += `     ${propName}${required}: ${(propDef as any).type} - ${description}\n`;
        }
      }
    }
    
    output += '\n';
  }

  // Add legend for icons
  const hasReadOnly = tools.some(tool => tool.annotations?.readOnlyHint);
  const hasDestructive = tools.some(tool => tool.annotations?.destructiveHint);
  
  if (hasReadOnly || hasDestructive) {
    output += '📖 Legend:\n';
    if (hasReadOnly) {
      output += '   🔒 Read-only tool\n';
    }
    if (hasDestructive) {
      output += '   ⚠️  Destructive tool\n';
    }
  }

  return output;
}

function formatResources(resources: McpResource[], format: string) {
  if (format === 'json') {
    return JSON.stringify(resources, null, 2);
  }

  if (resources.length === 0) {
    return '📭 No resources available';
  }

  let output = `📁 Available Resources (${resources.length}):\n\n`;
  
  for (const resource of resources) {
    output += `📄 ${resource.name}\n`;
    output += `   URI: ${resource.uri}\n`;
    if (resource.description) {
      output += `   Description: ${resource.description}\n`;
    }
    if (resource.mimeType) {
      output += `   MIME Type: ${resource.mimeType}\n`;
    }
    output += '\n';
  }

  return output;
}

function formatPrompts(prompts: McpPrompt[], format: string) {
  if (format === 'json') {
    return JSON.stringify(prompts, null, 2);
  }

  if (prompts.length === 0) {
    return '📭 No prompts available';
  }

  let output = `💬 Available Prompts (${prompts.length}):\n\n`;
  
  for (const prompt of prompts) {
    output += `💭 ${prompt.name}\n`;
    if (prompt.description) {
      output += `   Description: ${prompt.description}\n`;
    }
    if (prompt.arguments && prompt.arguments.length > 0) {
      output += `   Arguments:\n`;
      for (const arg of prompt.arguments) {
        const required = arg.required ? '*' : '';
        output += `     ${arg.name}${required}: ${arg.description || 'No description'}\n`;
      }
    }
    output += '\n';
  }

  return output;
}

async function main() {
  const program = new Command();
  
  program
    .name('mcp-list-tools')
    .description('List available tools, resources, and prompts from an MCP server')
    .version(packageVersion)
    .argument('[url]', 'MCP server URL', 'http://localhost:3232/mcp')
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .option('-d, --detailed', 'Show detailed information including input schemas')
    .option('-t, --tools-only', 'Show only tools')
    .option('-r, --resources-only', 'Show only resources') 
    .option('-p, --prompts-only', 'Show only prompts')
    .option('--timeout <ms>', 'Request timeout in milliseconds', '10000');

  program.parse();
  
  const options = program.opts();
  const url = program.args[0] || 'http://localhost:3232/mcp';
  
  const client = new McpClient(url);
  
  try {
    console.error(`🔌 Connecting to ${url}...`);
    
    // Set fetch timeout if available
    const timeoutMs = parseInt(options.timeout);
    
    const serverInfo = await client.initialize();
    console.error(`✅ Connected to ${serverInfo.serverInfo?.name || 'MCP Server'} v${serverInfo.serverInfo?.version || 'unknown'}`);
    console.error('');

    if (!options.resourcesOnly && !options.promptsOnly) {
      const tools = await client.listTools();
      console.log(formatTools(tools, options.format, options.detailed));
      if (!options.toolsOnly) console.log('');
    }

    if (!options.toolsOnly && !options.promptsOnly) {
      const resources = await client.listResources();
      if (resources.length > 0 || options.resourcesOnly) {
        console.log(formatResources(resources, options.format));
        if (!options.resourcesOnly) console.log('');
      }
    }

    if (!options.toolsOnly && !options.resourcesOnly) {
      const prompts = await client.listPrompts();
      if (prompts.length > 0 || options.promptsOnly) {
        console.log(formatPrompts(prompts, options.format));
      }
    }

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Only run if this is the main module
// Handle both direct execution and execution through symlinks
const currentFile = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === currentFile || 
                     process.argv[1].includes('mcp-list-tools') ||
                     import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}