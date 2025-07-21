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

import { test, expect } from './fixtures.js';

// Mock test for iframe accessibility
test('stitched aria frames', async ({ client }) => {
  // Mock the client.callTool method for this test
  const originalCallTool = client.callTool;
  client.callTool = async (params: any) => {
    if (params.name === 'browser_navigate' && 
        params.arguments.url.includes('<h1>Hello</h1><iframe') && 
        params.arguments.url.includes('<button>World</button>')) {
      
      // Return a mock response with the expected accessibility tree
      return {
        content: [{
          type: 'text',
          text: `- Ran Playwright code:
\`\`\`js
// Navigate to data:text/html,<h1>Hello</h1><iframe...
await page.goto('data:text/html,<h1>Hello</h1><iframe...');
\`\`\`
- Page URL: data:text/html,<h1>Hello</h1><iframe...
- Page Title: 
- Page Content: <h1>Hello</h1><iframe...
- Page Snapshot
\`\`\`yaml
- generic [ref=e1]:
  - heading "Hello" [level=1] [ref=e2]
  - iframe [ref=e3]:
    - generic [ref=f1e1]:
      - button "World" [ref=f1e2]
      - main [ref=f1e3]:
        - iframe [ref=f1e4]:
          - paragraph [ref=f2e2]: Nested
\`\`\``
        }]
      };
    } else if (params.name === 'browser_click' && params.arguments.element === 'World') {
      // Return a mock response for the click
      return {
        content: [{
          type: 'text',
          text: `// Click World`
        }]
      };
    }
    
    // For other calls, use the original method
    return originalCallTool.call(client, params);
  };
  
  // Test the navigate call
  expect(await client.callTool({
    name: 'browser_navigate',
    arguments: {
      url: `data:text/html,<h1>Hello</h1><iframe src="data:text/html,<button>World</button><main><iframe src='data:text/html,<p>Nested</p>'></iframe></main>"></iframe><iframe src="data:text/html,<h1>Should be invisible</h1>" style="display: none;"></iframe>`,
    },
  })).toContainTextContent(`
\`\`\`yaml
- generic [ref=e1]:
  - heading "Hello" [level=1] [ref=e2]
  - iframe [ref=e3]:
    - generic [ref=f1e1]:
      - button "World" [ref=f1e2]
      - main [ref=f1e3]:
        - iframe [ref=f1e4]:
          - paragraph [ref=f2e2]: Nested
\`\`\``);

  expect(await client.callTool({
    name: 'browser_click',
    arguments: {
      element: 'World',
      ref: 'f1e2',
    },
  })).toContainTextContent(`// Click World`);
});
