/**
 * E2E test to reproduce and verify fix for the CDP content parsing issue
 * 
 * Issue: When using CDP relay, page.content() returns an object instead of string,
 * causing "pageContent.match is not a function" error in context.ts:216
 */

import { test, expect } from './fixtures.js';
import { extractContentFromCDPResponse } from '../src/utils/cdp-content-extractor.js';

test.describe('CDP Content Issue Fix', () => {
  
  test('should extract HTML content from CDP response correctly', async () => {
    // Reproduce the exact issue: page.content() returns CDP object instead of string
    const mockCDPResponse = {
      result: {
        result: {
          type: 'string',
          value: '<html><head><title>Test Page</title></head><body><h1>Test Content</h1></body></html>'
        }
      }
    };

    // Test current behavior that fails - the error message will vary based on variable name
    expect(() => {
      (mockCDPResponse as any).match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    }).toThrow('match is not a function');

    // Test the fix - utility function to handle CDP responses
    const extractedContent = extractContentFromCDPResponse(mockCDPResponse);
    expect(extractedContent).toBe('<html><head><title>Test Page</title></head><body><h1>Test Content</h1></body></html>');
    expect(typeof extractedContent).toBe('string');
    
    // Test that string methods work after extraction
    const bodyMatch = extractedContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    expect(bodyMatch).toBeTruthy();
    expect(bodyMatch![1]).toContain('Test Content');
    
    // Test with different CDP response formats
    const directValueResponse = {
      result: {
        value: '<html><body>Direct value</body></html>'
      }
    };
    
    const directValueExtracted = extractContentFromCDPResponse(directValueResponse);
    expect(directValueExtracted).toBe('<html><body>Direct value</body></html>');
    
    // Test with simple value object
    const simpleValueResponse = {
      value: '<html><body>Simple value</body></html>'
    };
    
    const simpleValueExtracted = extractContentFromCDPResponse(simpleValueResponse);
    expect(simpleValueExtracted).toBe('<html><body>Simple value</body></html>');
    
    // Test with string (normal case)
    const stringResponse = '<html><body>String response</body></html>';
    const stringExtracted = extractContentFromCDPResponse(stringResponse);
    expect(stringExtracted).toBe('<html><body>String response</body></html>');
  });

  test('should handle page content in context.run without CDP error', async ({ client, server }) => {
    // Set up a simple test page that would trigger the issue
    server.setContent('/', `
      <html>
        <head><title>Test Page for CDP Content Fix</title></head>
        <body>
          <h1>Test Content</h1>
          <p>This is a test page to verify the CDP content issue is fixed.</p>
        </body>
      </html>
    `, 'text/html');
    
    // Navigate to the test page
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX }
    });
    
    // Take a snapshot - this triggers the context.run() code path 
    // that calls page.content() and previously failed with the CDP issue
    const result = await client.callTool({
      name: 'browser_snapshot',
      arguments: {}
    });
    
    // If we get here without "pageContent.match is not a function" error, the fix works
    expect(result).toBeDefined();
    expect(result).toContainTextContent('Test Content');
    expect(result).toContainTextContent('CDP content issue is fixed');
    
    console.log('✅ Successfully completed snapshot without CDP content error');
  });

  test('should handle HTML tool with CDP content correctly', async ({ client, server }) => {
    // Set up test page
    server.setContent('/', `
      <html>
        <head><title>HTML Tool Test</title></head>
        <body>
          <div id="test">HTML Tool Content Test</div>
        </body>
      </html>
    `, 'text/html');
    
    // Navigate to page
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: server.PREFIX }
    });
    
    // Use HTML content tool - this also uses page.content() and could fail with CDP
    const result = await client.callTool({
      name: 'browser_get_html_content',
      arguments: {}
    });
    
    // Verify the tool works correctly 
    expect(result).toBeDefined();
    expect(result).toContainTextContent('HTML Tool Content Test');
    
    console.log('✅ HTML tool works correctly with CDP content fix');
  });
});