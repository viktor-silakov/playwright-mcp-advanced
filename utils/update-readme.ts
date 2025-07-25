#!/usr/bin/env -S npx tsx
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

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { execSync } from 'node:child_process';
import zodToJsonSchema from 'zod-to-json-schema';

import commonTools from '../src/tools/common.js';
import consoleTools from '../src/tools/console.js';
import dialogsTools from '../src/tools/dialogs.js';
import filesTools from '../src/tools/files.js';
import htmlTools from '../src/tools/html.js';
import installTools from '../src/tools/install.js';
import keyboardTools from '../src/tools/keyboard.js';
import navigateTools from '../src/tools/navigate.js';
import networkTools from '../src/tools/network.js';
import pdfTools from '../src/tools/pdf.js';
import snapshotTools from '../src/tools/snapshot.js';
import tabsTools from '../src/tools/tabs.js';
import screenshotTools from '../src/tools/screenshot.js';
import visionTools from '../src/tools/vision.js';
import waitTools from '../src/tools/wait.js';

import type { ToolSchema } from '../src/tools/tool.js';

const categories = {
  'Interactions': [
    ...snapshotTools,
    ...keyboardTools,
    ...waitTools,
    ...filesTools,
    ...dialogsTools,
  ],
  'Navigation': [
    ...navigateTools,
  ],
  'Resources': [
    ...screenshotTools,
    ...pdfTools,
    ...networkTools,
    ...consoleTools,
    ...htmlTools,
  ],
  'Utilities': [
    ...installTools,
    ...commonTools,
  ],
  'Tabs': [
    ...tabsTools,
  ],
  'Vision mode': [
    ...visionTools,
    ...keyboardTools,
    ...waitTools,
    ...filesTools,
    ...dialogsTools,
    ...htmlTools,
  ],
};

// NOTE: Can be removed when we drop Node.js 18 support and changed to import.meta.filename.
const __filename = url.fileURLToPath(import.meta.url);

function formatToolForReadme(tool: ToolSchema<any>): string[] {
  const lines: string[] = [];
  lines.push(`<!-- NOTE: This has been generated via update-readme.ts -->`);
  lines.push(``);

  // Build title with emojis based on metadata
  let titleLine = `- **${tool.name}**`;
  if (tool.advanced?.isNew)
    titleLine += ` 🆕`;
  if (tool.advanced?.isEnhanced)
    titleLine += ` ⭐`;
  lines.push(titleLine);
  
  lines.push(`  - Title: ${tool.title}`);
  lines.push(`  - Description: ${tool.description}`);
  
  // Add enhancement note if present
  if (tool.advanced?.enhancementNote)
    lines.push(`  - **Enhancement**: ${tool.advanced.enhancementNote}`);

  const inputSchema = zodToJsonSchema(tool.inputSchema || {}) as any;
  const requiredParams = inputSchema.required || [];
  if (inputSchema.properties && Object.keys(inputSchema.properties).length) {
    lines.push(`  - Parameters:`);
    Object.entries(inputSchema.properties).forEach(([name, param]: [string, any]) => {
      const optional = !requiredParams.includes(name);
      const meta: string[] = [];
      if (param.type)
        meta.push(param.type);
      if (optional)
        meta.push('optional');
      lines.push(`    - \`${name}\` ${meta.length ? `(${meta.join(', ')})` : ''}: ${param.description}`);
    });
  } else {
    lines.push(`  - Parameters: None`);
  }
  lines.push(`  - Read-only: **${tool.type === 'readOnly'}**`);
  lines.push('');
  return lines;
}

async function updateSection(
  content: string,
  startMarker: string,
  endMarker: string,
  generatedLines: string[]
): Promise<string> {
  const startMarkerIndex = content.indexOf(startMarker);
  const endMarkerIndex = content.indexOf(endMarker);
  if (startMarkerIndex === -1 || endMarkerIndex === -1)
    throw new Error('Markers for generated section not found in README');

  return [
    content.slice(0, startMarkerIndex + startMarker.length),
    '',
    generatedLines.join('\n'),
    '',
    content.slice(endMarkerIndex),
  ].join('\n');
}

async function updateTools(content: string): Promise<string> {
  const generatedLines: string[] = [];
  for (const [category, categoryTools] of Object.entries(categories)) {
    generatedLines.push(`<details>\n<summary><b>${category}</b></summary>`);
    generatedLines.push('');
    for (const tool of categoryTools)
      generatedLines.push(...formatToolForReadme(tool.schema));
    generatedLines.push(`</details>`);
    generatedLines.push('');
  }

  const startMarker = `<!--- Tools generated by update-readme.ts -->`;
  const endMarker = `<!--- End of tools generated section -->`;
  return updateSection(content, startMarker, endMarker, generatedLines);
}

async function updateOptions(content: string): Promise<string> {
  const output = execSync('node dist/cli.js --help');
  const lines = output.toString().split('\n');
  const firstLine = lines.findIndex(line => line.includes('--version'));
  lines.splice(0, firstLine + 1);
  const lastLine = lines.findIndex(line => line.includes('--help'));
  lines.splice(lastLine);
  const startMarker = `<!--- Options generated by update-readme.ts -->`;
  const endMarker = `<!--- End of options generated section -->`;
  return updateSection(content, startMarker, endMarker, [
    '```',
    '> npx playwright-mcp-advanced@latest --help',
    ...lines,
    '```',
  ]);
}

async function updateReadme(): Promise<void> {
  const readmePath = path.join(path.dirname(__filename), '..', 'README.md');
  const readmeContent = await fs.promises.readFile(readmePath, 'utf-8');
  const withTools = await updateTools(readmeContent);
  const withOptions = await updateOptions(withTools);
  await fs.promises.writeFile(readmePath, withOptions, 'utf-8');
}

updateReadme().catch(err => {
  process.exit(1);
}); 