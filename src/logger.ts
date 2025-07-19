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
import os from 'os';

export interface LoggerOptions {
  logToFile?: boolean;
  logToConsole?: boolean;
  logFile?: string;
  maxFileSize?: number; // MB
  prefix?: string;
}

export class Logger {
  private logFile: string;
  private logToFile: boolean;
  private logToConsole: boolean;
  private maxFileSize: number;
  private prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.logToFile = options.logToFile ?? true;
    this.logToConsole = options.logToConsole ?? true;
    this.maxFileSize = (options.maxFileSize ?? 10) * 1024 * 1024; // Convert MB to bytes
    this.prefix = options.prefix ?? '';
    
    // Default log file location
    this.logFile = options.logFile ?? path.join(os.tmpdir(), 'playwright-mcp-advanced.log');
    
    // Ensure log directory exists
    if (this.logToFile) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private formatMessage(level: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    
    // Convert args to strings and truncate individual long arguments
    const processedArgs = args.map(arg => {
      let argStr = typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
      
             // Truncate long arguments (but not the entire message)
       const MAX = 1000;
       if (argStr.length > MAX) {
         const head = argStr.slice(0, 200);
         const tail = argStr.slice(-100);
         const omitted = argStr.length - 300;

         // 👇 visually-distinct gap
         const gap = `\n--- ${omitted} chars omitted ---\n`;

         argStr = `${head}${gap}${tail}`;
       }
      
      return argStr;
    });
    
    const argsStr = processedArgs.join(' ');
    return `[${timestamp}] ${level} ${prefix}${argsStr}`;
  }

  private async writeToFile(message: string): Promise<void> {
    if (!this.logToFile) return;

    try {
      // Check file size and rotate if needed
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.maxFileSize) {
          const backupFile = this.logFile + '.old';
          if (fs.existsSync(backupFile)) {
            fs.unlinkSync(backupFile);
          }
          fs.renameSync(this.logFile, backupFile);
        }
      }

      fs.appendFileSync(this.logFile, message + '\n', 'utf8');
    } catch (error) {
      // Fallback to console if file writing fails
      console.error('Failed to write to log file:', error);
      console.log(message);
    }
  }

  log(...args: any[]): void {
    const message = this.formatMessage('INFO', ...args);
    
    if (this.logToConsole) {
      console.log(message);
    }
    
    this.writeToFile(message);
  }

  error(...args: any[]): void {
    const message = this.formatMessage('ERROR', ...args);
    
    if (this.logToConsole) {
      console.error(message);
    }
    
    this.writeToFile(message);
  }

  warn(...args: any[]): void {
    const message = this.formatMessage('WARN', ...args);
    
    if (this.logToConsole) {
      console.warn(message);
    }
    
    this.writeToFile(message);
  }

  debug(...args: any[]): void {
    const message = this.formatMessage('DEBUG', ...args);
    
    if (this.logToConsole) {
      console.log(message);
    }
    
    this.writeToFile(message);
  }

  getLogFile(): string {
    return this.logFile;
  }
}

// Default logger instance
export const logger = new Logger({
  prefix: 'CDP-RELAY',
  logToFile: true,
  logToConsole: true
}); 