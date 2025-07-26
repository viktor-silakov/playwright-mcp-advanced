---
description: Shadow items functionality with wildcard pattern support for hiding groups of tools
alwaysApply: false
---

Shadow Items now support wildcard patterns for flexible tool hiding:

SUPPORTED PATTERNS:
- exact_name: exact match
- prefix_*: tools starting with prefix  
- *_suffix: tools ending with suffix
- *middle*: tools containing substring
- *: all tools

IMPLEMENTATION FILES:
- src/utils/shadowMatcher.ts: core pattern matching logic
- src/enhancedConnection.ts: updated to use isShadowed() function
- src/serverBuilder.ts: updated ShadowItems interface documentation

USAGE EXAMPLE:
```typescript
const server = await createServerBuilder({
  shadowItems: {
    tools: ['browser_*', '*_screenshot', '*_tab_*', 'exact_tool']
  }
}).build();
```

BEHAVIOR:
- Custom tools override shadowed standard tools
- Shadowed tools remain callable via direct API calls
- Multiple patterns can be combined
- Regex special characters are properly escaped
- Patterns are case-sensitive

TESTING:
- 65 unit tests in tests/shadow-matcher.spec.ts
- 30 integration tests in tests/shadow-items-patterns.spec.ts
- Demo available in examples/shadow-patterns-demo.ts

This enables efficient hiding of tool groups (e.g., all browser tools, all screenshot tools) while maintaining flexibility for custom tool implementations.