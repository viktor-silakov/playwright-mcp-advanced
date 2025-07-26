/**
 * Comprehensive Shadow Patterns Demo
 * Demonstrates all supported wildcard pattern types
 */

import { createServerBuilder, createTool } from '../src/serverBuilder.js';
import { z } from 'zod';

async function runPatternTest(testName: string, shadowPatterns: string[]) {
  console.log(`\n🧪 ${testName}`);
  console.log('=' .repeat(50));
  console.log(`Shadow patterns: [${shadowPatterns.map(p => `"${p}"`).join(', ')}]`);

  const server = await createServerBuilder({
    config: { capabilities: ['core', 'vision'] },
    shadowItems: { tools: shadowPatterns }
  }).build();

  const mockTransport = {
    start: async () => {},
    close: async () => {},
    send: async (message: any) => {
      if (message.method === 'tools/list') {
        const connection = await server.createEnhancedConnection(
          { createContext: () => ({ newPage: async () => ({ close: async () => {} }) }) } as any,
          mockTransport as any
        );
        const result = await (connection.server as any)._requestHandlers.get('tools/list')(message);
        return { id: message.id, result };
      }
      return { id: message.id, result: {} };
    }
  };

  const connection = await server.createEnhancedConnection(
    { createContext: () => ({ newPage: async () => ({ close: async () => {} }) }) } as any,
    mockTransport as any
  );

  const response = await mockTransport.send({
    id: 1,
    method: 'tools/list',
    params: {}
  });

  const toolNames = response.result.tools.map((tool: any) => tool.name);
  
  console.log(`✅ Available tools: ${toolNames.length}`);
  console.log(`📋 Tools: ${toolNames.slice(0, 8).join(', ')}${toolNames.length > 8 ? '...' : ''}`);

  await connection.close();
  return toolNames;
}

async function comprehensiveDemo() {
  console.log('🎭 Comprehensive Shadow Patterns Demo');
  console.log('Demonstrating all wildcard pattern types\n');

  // Test 1: No patterns (baseline)
  const allTools = await runPatternTest('Baseline - No Shadow Patterns', []);

  // Test 2: Exact match
  await runPatternTest('Exact Match Pattern', ['plugins_manage']);

  // Test 3: Prefix wildcard
  await runPatternTest('Prefix Wildcard Pattern', ['browser_*']);

  // Test 4: Suffix wildcard  
  await runPatternTest('Suffix Wildcard Pattern', ['*_screenshot']);

  // Test 5: Middle wildcard
  await runPatternTest('Middle Wildcard Pattern', ['*tab*']);

  // Test 6: Multiple wildcards
  await runPatternTest('Multiple Wildcard Patterns', ['browser_*', '*_screenshot', 'plugins_*']);

  // Test 7: Complex patterns
  await runPatternTest('Complex Patterns', ['*browser*', '*_*_*']);

  // Test 8: Universal wildcard
  await runPatternTest('Universal Wildcard', ['*']);

  console.log('\n✨ All pattern tests completed successfully!');
  console.log(`📊 Total available tools in baseline: ${allTools.length}`);
}

// Run the comprehensive demo
if (import.meta.url === `file://${process.argv[1]}`) {
  comprehensiveDemo().catch(console.error);
}