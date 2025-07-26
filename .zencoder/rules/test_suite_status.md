---
description: Current status and common issues in the playwright-mcp-advanced test suite
alwaysApply: false
---

Playwright MCP Advanced test suite contains 1070 tests across 46 files. Main issues identified:

1. **MCP Connection Timeouts**: Several tests fail with "Connection closed" errors at 5000ms timeout:
   - tests/core.spec.ts:262:1 › old locator error message
   - tests/launch.spec.ts:104:1 › isolated context  
   - tests/tabs.spec.ts:46:1 › create new tab
   
2. **PageSnapshot API Compatibility**: Multiple warnings about missing browser APIs:
   - _snapshotForAI method not available
   - viewportSize method not available
   - Falls back to default implementations

3. **Success Rate**: ~82-85% pass rate across Chrome/Chromium projects
   - Chrome: 192/233 passed, 1 failed, 40 skipped
   - Chromium: 188/233 passed, 3 failed, 3 interrupted, 39 skipped

4. **Stable Areas**: Core browser functionality, CDP relay navigation, vision tools, screenshot capture work reliably

Common test commands:
- npm run test (all tests)
- npm run ctest (chrome only) 
- npm run etest (chromium-extension)
- npx playwright test --project=chrome --max-failures=5 --timeout=5000