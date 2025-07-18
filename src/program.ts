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

import { program, Option } from 'commander';
// @ts-ignore
import { startTraceViewerServer } from 'playwright-core/lib/server';

import { startHttpServer, startHttpTransport, startStdioTransport } from './transport.js';
import { resolveCLIConfig } from './config.js';
import { Server } from './server.js';
import { packageJSON } from './package.js';
import { CDPRelay } from './cdp-relay.js';

program
    .version('Version ' + packageJSON.version)
    .name(packageJSON.name)
    .option('--allowed-origins <origins>', 'semicolon-separated list of origins to allow the browser to request. Default is to allow all.', semicolonSeparatedList)
    .option('--blocked-origins <origins>', 'semicolon-separated list of origins to block the browser from requesting. Blocklist is evaluated before allowlist. If used without the allowlist, requests not matching the blocklist are still allowed.', semicolonSeparatedList)
    .option('--block-service-workers', 'block service workers')
    .option('--browser <browser>', 'browser or chrome channel to use, possible values: chrome, firefox, webkit, msedge.')
    .option('--caps <caps>', 'comma-separated list of additional capabilities to enable, possible values: vision, pdf.')
    .option('--cdp-endpoint <endpoint>', 'CDP endpoint to connect to.')
    .option('--config <path>', 'path to the configuration file.')
    .option('--device <device>', 'device to emulate, for example: "iPhone 15"')
    .option('--extension', 'run in extension mode, starts CDP relay server for Chrome extension')
    .option('--executable-path <path>', 'path to the browser executable.')
    .option('--headless', 'run browser in headless mode, headed by default')
    .option('--host <host>', 'host to bind server to. Default is localhost. Use 0.0.0.0 to bind to all interfaces.')
    .option('--ignore-https-errors', 'ignore https errors')
    .option('--isolated', 'keep the browser profile in memory, do not save it to disk.')
    .option('--image-responses <mode>', 'whether to send image responses to the client. Can be "allow" or "omit", Defaults to "allow".')
    .option('--no-sandbox', 'disable the sandbox for all process types that are normally sandboxed.')
    .option('--output-dir <path>', 'path to the directory for output files.')
    .option('--port <port>', 'port to listen on for SSE transport.')
    .option('--proxy-bypass <bypass>', 'comma-separated domains to bypass proxy, for example ".com,chromium.org,.domain.com"')
    .option('--proxy-server <proxy>', 'specify proxy server, for example "http://myproxy:3128" or "socks5://myproxy:8080"')
    .option('--save-trace', 'Whether to save the Playwright Trace of the session into the output directory.')
    .option('--storage-state <path>', 'path to the storage state file for isolated sessions.')
    .option('--user-agent <ua string>', 'specify user agent string')
    .option('--user-data-dir <path>', 'path to the user data directory. If not specified, a temporary directory will be created.')
    .option('--viewport-size <size>', 'specify browser viewport size in pixels, for example "1280, 720"')
    .addOption(new Option('--vision', 'Legacy option, use --caps=vision instead').hideHelp())
    .action(async options => {
      if (options.vision) {
        // eslint-disable-next-line no-console
        console.error('The --vision option is deprecated, use --caps=vision instead');
        options.caps = 'vision';
      }
      const config = await resolveCLIConfig(options);
      
      // Handle extension mode
      let cdpRelay: CDPRelay | undefined;
      if (options.extension) {
        // Use a different port for CDP relay than the HTTP server
        const cdpPort = config.server.port ? Number(config.server.port) + 1 : 9224;
        cdpRelay = new CDPRelay({ 
          port: cdpPort, 
          host: config.server.host || 'localhost' 
        });
        await cdpRelay.start();
        // eslint-disable-next-line no-console
        console.error(`\nCDP relay server started. Extension URL: ${cdpRelay.getServerUrl()}`);
        // eslint-disable-next-line no-console
        console.error('Connect your Chrome extension to this URL to start sharing tabs.');
      }

      // In extension mode, we need HTTP server for MCP transport
      const httpServer = (config.server.port !== undefined || options.extension) ? 
        await startHttpServer(config.server) : undefined;

      const server = new Server(config, { cdpRelay });
      server.setupExitWatchdog();

      if (httpServer)
        startHttpTransport(httpServer, server);
      else
        await startStdioTransport(server);

      if (config.saveTrace) {
        const server = await startTraceViewerServer();
        const urlPrefix = server.urlPrefix('human-readable');
        const url = urlPrefix + '/trace/index.html?trace=' + config.browser.launchOptions.tracesDir + '/trace.json';
        // eslint-disable-next-line no-console
        console.error('\nTrace viewer listening on ' + url);
      }
    });

function semicolonSeparatedList(value: string): string[] {
  return value.split(';').map(v => v.trim());
}

void program.parseAsync(process.argv);
