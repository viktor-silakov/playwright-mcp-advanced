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
import { defineTool } from '../../../dist/tools/tool.js';

// Enhanced version of browser_navigate that includes logging
const enhancedNavigateTool = defineTool({
  capability: 'core',
  clearsModalState: undefined,
  schema: {
    name: 'browser_navigate',
    title: 'Enhanced Navigate',
    description: 'Navigate to a URL with enhanced logging (plugin version)',
    type: 'destructive',
    inputSchema: z.object({
      url: z.string().describe('URL to navigate to'),
      logNavigation: z.boolean().default(true).describe('Whether to log navigation details'),
    }),
  },
  async handle(context, { url, logNavigation = true }) {
    if (logNavigation) {
      console.log(`[Enhanced Navigate Plugin] Navigating to: ${url}`);
    }
    
    const tab = await context.ensureTab();
    await tab.navigate(url);
    
    if (logNavigation) {
      console.log(`[Enhanced Navigate Plugin] Successfully navigated to: ${url}`);
    }
    
    const code = [
      `// Enhanced Navigate Plugin - Navigate to ${url}`,
      `await page.goto('${url}');`,
    ];

    if (logNavigation) {
      console.log(`[Enhanced Navigate Plugin] Navigation completed`);
    }
    
    return {
      code,
      captureSnapshot: true,
      waitForNetwork: true,
      action: async () => ({
        content: [{ 
          type: 'text', 
          text: `Enhanced navigation completed to: ${url}` 
        }],
      }),
    };
  },
});

// Custom tool that will only be available through this plugin
const customAnalysisTool = defineTool({
  capability: 'core',
  schema: {
    name: 'page_analysis',
    title: 'Page Analysis',
    description: 'Analyze the current page for common elements and patterns',
    type: 'readOnly',
    inputSchema: z.object({
      includeMetrics: z.boolean().default(false).describe('Include performance metrics in analysis'),
    }),
  },
  async handle(context, { includeMetrics = false }) {
    const tab = await context.ensureTab();
    
    // Basic page analysis
    const pageTitle = await tab.page.title();
    const pageUrl = tab.page.url();
    
    // Count elements
    const elementCounts = await tab.page.evaluate(() => {
      const counts = {
        links: document.querySelectorAll('a').length,
        images: document.querySelectorAll('img').length,
        forms: document.querySelectorAll('form').length,
        buttons: document.querySelectorAll('button, input[type="button"], input[type="submit"]').length,
        headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        paragraphs: document.querySelectorAll('p').length,
      };
      return counts;
    });

    let analysis = `Page Analysis Results:

Title: ${pageTitle}
URL: ${pageUrl}

Element Counts:
- Links: ${elementCounts.links}
- Images: ${elementCounts.images}
- Forms: ${elementCounts.forms}
- Buttons: ${elementCounts.buttons}
- Headings: ${elementCounts.headings}
- Paragraphs: ${elementCounts.paragraphs}`;

    const code = [
      `// Analyze page elements`,
      `const title = await page.title();`,
      `const url = page.url();`,
      `const elementCounts = await page.evaluate(() => ({`,
      `  links: document.querySelectorAll('a').length,`,
      `  images: document.querySelectorAll('img').length,`,
      `  forms: document.querySelectorAll('form').length,`,
      `  buttons: document.querySelectorAll('button, input[type="button"], input[type="submit"]').length,`,
      `  headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,`,
      `  paragraphs: document.querySelectorAll('p').length,`,
      `}));`,
    ];

    if (includeMetrics) {
      // Get basic performance metrics if available
      try {
        const metrics = await tab.page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0];
          if (!nav) return null;
          
          return {
            domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart),
            loadComplete: Math.round(nav.loadEventEnd - nav.loadEventStart),
            totalTime: Math.round(nav.loadEventEnd - nav.navigationStart),
          };
        });
        
        if (metrics) {
          analysis += `\n\nPerformance Metrics:
- DOM Content Loaded: ${metrics.domContentLoaded}ms
- Load Complete: ${metrics.loadComplete}ms
- Total Load Time: ${metrics.totalTime}ms`;
        }
      } catch (error) {
        console.error('Failed to get performance metrics:', error);
      }

      code.push(
        `// Get performance metrics`,
        `const metrics = await page.evaluate(() => {`,
        `  const nav = performance.getEntriesByType('navigation')[0];`,
        `  return nav ? {`,
        `    domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart),`,
        `    loadComplete: Math.round(nav.loadEventEnd - nav.loadEventStart),`,
        `    totalTime: Math.round(nav.loadEventEnd - nav.navigationStart),`,
        `  } : null;`,
        `});`
      );
    }

    return {
      code,
      captureSnapshot: true,
      waitForNetwork: false,
      action: async () => ({
        content: [{ 
          type: 'text', 
          text: analysis 
        }],
      }),
    };
  },
});

// Main plugin definition
const plugin = {
  metadata: {
    name: 'shadow-demo',
    version: '1.0.0',
    description: 'Demo plugin showing shadowing functionality - enhances browser_navigate and adds page_analysis',
    author: 'Playwright MCP Advanced',
  },
  
  tools: [
    enhancedNavigateTool,
    customAnalysisTool,
  ],
  
  prompts: [
    {
      name: 'analyze_page_prompt',
      description: 'Generate a prompt for analyzing the current page',
      arguments: [
        {
          name: 'focus',
          description: 'What to focus the analysis on (structure, performance, accessibility)',
          required: false,
        }
      ]
    }
  ],
  
  // Shadow the original browser_navigate tool - our enhanced version will take precedence
  shadowItems: {
    tools: ['browser_navigate'],
  },
  
  async initialize() {
    console.log('Shadow demo plugin initialized - browser_navigate tool enhanced with logging');
  },
  
  async cleanup() {
    console.log('Shadow demo plugin cleaned up');
  }
};

export default plugin;