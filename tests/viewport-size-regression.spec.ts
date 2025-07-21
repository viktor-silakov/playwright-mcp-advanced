/**
 * Regression test for viewportSize bug fix
 * Ensures that PageSnapshot handles missing methods gracefully
 */

import { test, expect } from '@playwright/test';
import { PageSnapshot } from '../src/pageSnapshot.js';

test.describe('ViewportSize Regression Test', () => {
  
  test('should handle mock page object without viewportSize method', async ({ page }) => {
    // Create a mock page that mimics the problematic scenario
    const mockPage = {
      url: () => 'https://example.com',
      title: async () => 'Test Page', 
      content: async () => '<html><head><title>Test</title></head><body>Test Content</body></html>',
      // viewportSize is intentionally missing to test the fix
    };
    
    // This should not throw an error anymore
    let snapshot: PageSnapshot | null = null;
    let errorThrown = false;
    
    try {
      snapshot = await PageSnapshot.create(mockPage as any);
    } catch (error) {
      errorThrown = true;
      console.error('Unexpected error:', error);
    }
    
    // The snapshot should be created successfully
    expect(errorThrown).toBe(false);
    expect(snapshot).toBeTruthy();
    expect(snapshot?.text()).toContain('Page Snapshot');
  });

  test('should handle page with undefined methods gracefully', async ({ page }) => {
    // Create a more minimal mock that might occur in certain edge cases
    const minimalMockPage = {
      url: undefined,
      title: undefined,
      content: undefined,
      viewportSize: undefined,
    };
    
    // Should handle this gracefully with fallback values
    let snapshot: PageSnapshot | null = null;
    let errorThrown = false;
    
    try {
      snapshot = await PageSnapshot.create(minimalMockPage as any);
    } catch (error) {
      errorThrown = true;
      console.error('Unexpected error:', error);
    }
    
    expect(errorThrown).toBe(false);
    expect(snapshot).toBeTruthy();
    expect(snapshot?.text()).toContain('Page Snapshot');
  });

  test('should work with real page object', async ({ page }) => {
    // Ensure normal functionality still works
    await page.goto('data:text/html,<html><head><title>Real Test</title></head><body><h1>Real Content</h1></body></html>');
    
    const snapshot = await PageSnapshot.create(page);
    
    expect(snapshot).toBeTruthy();
    expect(snapshot.text()).toContain('Page Snapshot');
    expect(snapshot.text()).toContain('Real Test');
  });
});