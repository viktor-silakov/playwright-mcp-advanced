# CDP Relay Redirect Handling

This document describes how the CDP Relay handles redirects and ensures that the targetInfo is always up-to-date with the current URL and title of the page.

## Problem

When a page is redirected (either via HTTP redirect, meta refresh, or JavaScript), the targetInfo in CDP Relay was not being updated to reflect the new URL and title. This caused a mismatch between the actual page being displayed and the information reported by the CDP Relay.

## Solution

We implemented a solution that automatically updates the targetInfo in CDP Relay after redirects. This ensures that the URL and title reported by CDP Relay always match the actual page being displayed.

### Key Components

1. **Detecting Redirects**: We detect redirects through several mechanisms:
   - Monitoring CDP events for `Page.frameNavigated` events
   - Checking navigation responses for frameId
   - Explicit updates after navigation in the Tab class

2. **Updating targetInfo**: When a redirect is detected, we:
   - Fetch the current URL using `Runtime.evaluate` with `window.location.href`
   - Fetch the current title using `Runtime.evaluate` with `document.title`
   - Update the targetInfo in the active connection with the new URL and title

3. **Integration with Tab**: The Tab class now calls `updateTargetInfoAfterNavigation()` after navigation to ensure targetInfo is updated.

## Implementation Details

### CDPRelay Class

The `CDPRelay` class has been enhanced with:

1. **Redirect Detection**: The `handleExtensionMessage` method now checks for navigation responses and `Page.frameNavigated` events to detect redirects.

2. **targetInfo Updates**: The new `updateTargetInfoAfterNavigation` method fetches the current URL and title and updates the targetInfo.

```javascript
async updateTargetInfoAfterNavigation(): Promise<void> {
  if (!this.activeConnection || !this.activeConnection.sessionId) {
    return;
  }
  
  try {
    // Get current URL
    const urlResult = await this.sendCommand('Runtime.evaluate', { 
      expression: 'window.location.href' 
    });
    
    // Get current title
    const titleResult = await this.sendCommand('Runtime.evaluate', { 
      expression: 'document.title' 
    });
    
    if (urlResult?.value && this.activeConnection.targetInfo) {
      const oldUrl = this.activeConnection.targetInfo.url;
      const newUrl = urlResult.value;
      const newTitle = titleResult?.value || this.activeConnection.targetInfo.title;
      
      // Only update if URL actually changed
      if (oldUrl !== newUrl) {
        debugLog(`Updating targetInfo after navigation: ${oldUrl} -> ${newUrl}`);
        logger.log(`🔄 Page navigated: ${oldUrl} -> ${newUrl}`);
        
        // Update the targetInfo with new URL and title
        this.activeConnection.targetInfo = {
          ...this.activeConnection.targetInfo,
          url: newUrl,
          title: newTitle
        };
      }
    }
  } catch (error) {
    debugLog('Error updating target info after navigation:', error);
  }
}
```

### Tab Class

The `Tab` class now calls `updateTargetInfoAfterNavigation()` after navigation:

```javascript
async navigate(url: string) {
  // ... existing navigation code ...
  
  // Update target info in CDP relay if available
  if (this._cdpRelay && typeof this._cdpRelay.updateTargetInfoAfterNavigation === 'function') {
    console.log('[Tab] 🔄 Updating target info after navigation');
    try {
      await this._cdpRelay.updateTargetInfoAfterNavigation();
    } catch (error) {
      console.error('[Tab] ❌ Error updating target info:', error);
    }
  }
}
```

## Testing

We've created several tests to verify that our solution works correctly:

1. **Basic Redirect Tests**: Verify that URL and title are updated after HTTP redirects.
2. **Integration Tests**: Test all aspects of our solution, including different types of redirects.
3. **Error Handling Tests**: Verify that our solution handles errors gracefully.
4. **Performance Tests**: Measure the performance impact of our solution.

To run the tests:

```bash
node run_tests.mjs
```

## Benefits

1. **Consistency**: URL and title in targetInfo always match the actual page.
2. **Transparency**: Redirects are logged, making it easier to debug issues.
3. **Reliability**: The system works correctly even with complex redirect chains.

## Limitations

1. **Timing**: There might be a short delay between a redirect and the targetInfo update.
2. **JavaScript Redirects**: Some JavaScript redirects might be missed if they happen very quickly.

## Future Improvements

1. **Optimizations**: Reduce the delay between redirects and targetInfo updates.
2. **More Events**: Monitor more CDP events to detect all types of redirects.
3. **Caching**: Cache URL and title to reduce the number of CDP commands.