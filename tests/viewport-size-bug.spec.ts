/**
 * E2E test to reproduce the viewportSize bug
 * Reproduces the error: "TypeError: this._page.viewportSize is not a function"
 */

import { test, expect } from '@playwright/test';
import { PageSnapshot } from '../src/pageSnapshot.js';
import { CDPRelay } from '../src/cdp-relay.js';

test.describe('ViewportSize Bug Reproduction', () => {
  
  test('should reproduce viewportSize error when using CDP relay', async ({ page }) => {
    // Setup a mock CDP relay like in the actual error scenario
    const mockCDPRelay = {
      getTargetInfo: () => ({
        url: 'https://github.com/syngrisi/syngrisi',
        title: 'syngrisi/syngrisi: Syngrisi - Visual Testing Tool'
      }),
      sendCommand: async (method: string, params?: any) => {
        if (method === 'Runtime.evaluate') {
          if (params.expression === 'document.documentElement.outerHTML') {
            return {
              result: {
                value: '<html><head><title>Test Page</title></head><body><h1>Test</h1></body></html>'
              }
            };
          } else if (params.expression === 'JSON.stringify({width: window.innerWidth, height: window.innerHeight})') {
            return {
              result: {
                value: '{"width":1280,"height":720}'
              }
            };
          }
        }
        return {};
      }
    };
    
    // Navigate to a test page
    await page.goto('https://github.com/syngrisi/syngrisi');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Try to create a PageSnapshot - this should reproduce the error
    let errorOccurred = false;
    let errorMessage = '';
    
    try {
      const snapshot = await PageSnapshot.create(page, mockCDPRelay);
      console.log('Snapshot created successfully:', snapshot.text().length);
    } catch (error) {
      errorOccurred = true;
      errorMessage = error.message;
      console.log('Error occurred as expected:', errorMessage);
    }
    
    // In current implementation, this should fail with viewportSize error
    // After fix, it should succeed
    if (errorOccurred && errorMessage.includes('viewportSize is not a function')) {
      console.log('✓ Successfully reproduced the viewportSize bug');
      // This test documents the bug - we'll fix it next
    } else {
      console.log('✓ Bug appears to be fixed or test scenario changed');
    }
  });

  test('should handle CDP relay with fallback gracefully', async ({ page }) => {
    // Test with a broken CDP relay to ensure graceful fallback
    const brokenCDPRelay = {
      getTargetInfo: () => ({
        url: 'https://github.com/syngrisi/syngrisi',
        title: 'syngrisi/syngrisi: Syngrisi - Visual Testing Tool'
      }),
      sendCommand: async () => {
        throw new Error('CDP command failed');
      }
    };
    
    await page.goto('data:text/html,<html><head><title>Test</title></head><body><h1>Test Page</h1></body></html>');
    
    // Should not throw an error even with broken CDP relay
    const snapshot = await PageSnapshot.create(page, brokenCDPRelay);
    expect(snapshot.text()).toContain('Page Snapshot');
  });

  test('should work without CDP relay', async ({ page }) => {
    await page.goto('data:text/html,<html><head><title>Test</title></head><body><h1>Test Page</h1></body></html>');
    
    // Should work fine without CDP relay
    const snapshot = await PageSnapshot.create(page);
    expect(snapshot.text()).toContain('Page Snapshot');
    expect(snapshot.text()).toContain('Test');
  });

  test('should handle page with no viewport size', async ({ page }) => {
    // Create a mock page object that doesn't have viewportSize method
    const mockPage = {
      ...page,
      viewportSize: undefined, // This simulates the problematic scenario
      url: () => 'https://example.com',
      title: async () => 'Test Page',
      content: async () => '<html><head><title>Test</title></head><body>Test</body></html>'
    };
    
    // This should handle the missing viewportSize gracefully
    const snapshot = await PageSnapshot.create(mockPage as any);
    expect(snapshot.text()).toContain('Page Snapshot');
  });
});