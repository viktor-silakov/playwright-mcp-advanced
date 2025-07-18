# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Chrome Extension Mode** - Major new feature allowing connection to existing Chrome tabs
  - CDP Relay Server for bridging Chrome extension and MCP server
  - Chrome extension with manifest v3 for sharing browser tabs
  - Extension popup UI for managing connections
  - Real-time interaction with authenticated sessions
  - Support for working with existing browser state
  - `--extension` command line flag to enable extension mode
  - WebSocket server for Chrome extension communication

- **Vision Tool** - New MCP tool for vision-based browser interactions
  - Support for element interaction through natural language descriptions
  - Screenshot capabilities with full page, locator, and multi-locator support
  - Integration with existing browser automation tools

- **Enhanced Testing Infrastructure**
  - New `etest` npm script for Chrome extension mode testing
  - Extension-specific test suite (`tests/extension.spec.ts`)
  - Enhanced fixtures for extension mode testing
  - Improved test configuration for multiple browser contexts

- **Development Tools**
  - Cursor IDE rules (`.cursorrules`) for development workflow
  - Extension mode documentation (`examples/extension-mode.md`)
  - Enhanced error handling and debugging capabilities

### Changed
- **Browser Context Factory** - Enhanced to support CDP relay connections
  - New `CdpRelayContextFactory` class for extension mode
  - Improved context creation logic with force CDP option
  - Better handling of different connection types

- **Server Architecture**
  - Enhanced server startup with CDP relay support
  - Improved connection handling for extension mode
  - Better error handling and logging

- **Tool System**
  - Enhanced snapshot tool with vision mode compatibility
  - Improved evaluate tool with better error handling
  - Enhanced utility functions for browser operations

- **Documentation**
  - Comprehensive README updates with extension mode setup
  - Added Chrome Extension Mode section with usage examples
  - Enhanced tool documentation with new capabilities
  - Updated command line options documentation

- **Testing**
  - Enhanced test fixtures with extension mode support
  - Improved test reliability and coverage
  - Better error handling in test scenarios
  - Updated test configurations for new features

### Dependencies
- **Added**: `ws@^8.18.1` - WebSocket library for CDP relay server
- **Added**: `@types/ws@^8.18.1` - TypeScript definitions for WebSocket
- **Added**: `@types/chrome@^0.0.315` - TypeScript definitions for Chrome extension APIs

### Technical Improvements
- Enhanced TypeScript configuration for extension development
- Improved error handling throughout the codebase
- Better debugging and logging capabilities
- Enhanced connection management for CDP relay
- Improved browser context lifecycle management

### Files Modified
- `README.md` - Comprehensive documentation updates
- `package.json` & `package-lock.json` - Dependencies and scripts
- `playwright.config.ts` - Test configuration enhancements
- `src/browserContextFactory.ts` - CDP relay support
- `src/config.ts` - Configuration improvements
- `src/connection.ts` - Enhanced connection handling
- `src/program.ts` - Extension mode support
- `src/server.ts` - Server architecture improvements
- `src/tools.ts` - Tool system enhancements
- `src/tools/evaluate.ts` - Improved evaluation capabilities
- `src/tools/snapshot.ts` - Enhanced snapshot functionality
- `src/tools/utils.ts` - Utility improvements
- Multiple test files - Enhanced testing infrastructure
- `utils/update-readme.ts` - Documentation generation improvements

### Files Added
- `src/cdp-relay.ts` - CDP relay server implementation
- `src/tools/vision.ts` - Vision tool for natural language interactions
- `extension/` - Complete Chrome extension for tab sharing
- `tests/extension.spec.ts` - Extension mode tests
- `examples/extension-mode.md` - Extension usage documentation
- `.cursorrules` - Development workflow rules

This release represents a significant enhancement to the Playwright MCP server with the addition of Chrome Extension Mode, enabling seamless integration with existing browser sessions and providing new capabilities for browser automation through MCP protocol.