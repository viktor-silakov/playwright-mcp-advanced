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

import { test, expect } from '@playwright/test';
import { matchesPattern, isShadowed } from '../src/utils/shadowMatcher.js';

test.describe('shadowMatcher', () => {
  test.describe('matchesPattern', () => {
    test('should match exact strings without wildcards', () => {
      expect(matchesPattern('browser_navigate', 'browser_navigate')).toBe(true);
      expect(matchesPattern('browser_navigate', 'browser_screenshot')).toBe(false);
      expect(matchesPattern('exact_match', 'exact_match')).toBe(true);
      expect(matchesPattern('exact_match', 'different')).toBe(false);
    });

    test('should match patterns with wildcard at the end', () => {
      expect(matchesPattern('browser_*', 'browser_navigate')).toBe(true);
      expect(matchesPattern('browser_*', 'browser_screenshot')).toBe(true);
      expect(matchesPattern('browser_*', 'browser_tab_list')).toBe(true);
      expect(matchesPattern('browser_*', 'browser_')).toBe(true);
      expect(matchesPattern('browser_*', 'tab_navigate')).toBe(false);
      expect(matchesPattern('browser_*', 'browser')).toBe(false);
    });

    test('should match patterns with wildcard at the beginning', () => {
      expect(matchesPattern('*_test', 'unit_test')).toBe(true);
      expect(matchesPattern('*_test', 'integration_test')).toBe(true);
      expect(matchesPattern('*_test', 'browser_test')).toBe(true);
      expect(matchesPattern('*_test', '_test')).toBe(true);
      expect(matchesPattern('*_test', 'test')).toBe(false);
      expect(matchesPattern('*_test', 'test_unit')).toBe(false);
    });

    test('should match patterns with wildcard in the middle', () => {
      expect(matchesPattern('browser_*_list', 'browser_tab_list')).toBe(true);
      expect(matchesPattern('browser_*_list', 'browser_window_list')).toBe(true);
      expect(matchesPattern('browser_*_list', 'browser__list')).toBe(true);
      expect(matchesPattern('browser_*_list', 'browser_list')).toBe(false);
      expect(matchesPattern('browser_*_list', 'tab_browser_list')).toBe(false);
    });

    test('should match patterns with multiple wildcards', () => {
      expect(matchesPattern('*browser*', 'my_browser_tool')).toBe(true);
      expect(matchesPattern('*browser*', 'browser_navigate')).toBe(true);
      expect(matchesPattern('*browser*', 'navigate_browser')).toBe(true);
      expect(matchesPattern('*browser*', 'browser')).toBe(true);
      expect(matchesPattern('*browser*', 'navigate_tab')).toBe(false);
      
      expect(matchesPattern('*_*_*', 'one_two_three')).toBe(true);
      expect(matchesPattern('*_*_*', 'a_b_c_d')).toBe(true);
      expect(matchesPattern('*_*_*', 'one_two')).toBe(false);
    });

    test('should match wildcard-only pattern', () => {
      expect(matchesPattern('*', 'anything')).toBe(true);
      expect(matchesPattern('*', '')).toBe(true);
      expect(matchesPattern('*', 'browser_navigate')).toBe(true);
      expect(matchesPattern('*', '123')).toBe(true);
    });

    test('should handle regex special characters in pattern', () => {
      expect(matchesPattern('test.regex', 'test.regex')).toBe(true);
      expect(matchesPattern('test.regex', 'testaregex')).toBe(false);
      expect(matchesPattern('test+pattern', 'test+pattern')).toBe(true);
      expect(matchesPattern('test+pattern', 'testpattern')).toBe(false);
      expect(matchesPattern('[test]', '[test]')).toBe(true);
      expect(matchesPattern('[test]', 'test')).toBe(false);
    });

    test('should handle regex special characters with wildcards', () => {
      expect(matchesPattern('test.*', 'test.navigate')).toBe(true);
      expect(matchesPattern('test.*', 'testXnavigate')).toBe(false); // Dot is literal, not a wildcard
      expect(matchesPattern('test[*]pattern', 'test[anything]pattern')).toBe(true);
      expect(matchesPattern('test[*]pattern', 'test[]pattern')).toBe(true);
    });
  });

  test.describe('isShadowed', () => {
    test('should return false for undefined or empty patterns', () => {
      expect(isShadowed(undefined, 'browser_navigate')).toBe(false);
      expect(isShadowed([], 'browser_navigate')).toBe(false);
    });

    test('should match exact patterns', () => {
      const patterns = ['browser_navigate', 'tab_close'];
      expect(isShadowed(patterns, 'browser_navigate')).toBe(true);
      expect(isShadowed(patterns, 'tab_close')).toBe(true);
      expect(isShadowed(patterns, 'browser_screenshot')).toBe(false);
    });

    test('should match wildcard patterns', () => {
      const patterns = ['browser_*', '*_test'];
      expect(isShadowed(patterns, 'browser_navigate')).toBe(true);
      expect(isShadowed(patterns, 'browser_screenshot')).toBe(true);
      expect(isShadowed(patterns, 'unit_test')).toBe(true);
      expect(isShadowed(patterns, 'integration_test')).toBe(true);
      expect(isShadowed(patterns, 'tab_close')).toBe(false);
    });

    test('should match mixed exact and wildcard patterns', () => {
      const patterns = ['browser_navigate', 'tab_*', '*_test'];
      expect(isShadowed(patterns, 'browser_navigate')).toBe(true); // exact match
      expect(isShadowed(patterns, 'tab_close')).toBe(true);        // wildcard match
      expect(isShadowed(patterns, 'tab_list')).toBe(true);         // wildcard match
      expect(isShadowed(patterns, 'unit_test')).toBe(true);        // wildcard match
      expect(isShadowed(patterns, 'browser_screenshot')).toBe(false); // no match
    });

    test('should return true if any pattern matches', () => {
      const patterns = ['no_match', 'browser_*', 'another_no_match'];
      expect(isShadowed(patterns, 'browser_navigate')).toBe(true);
      expect(isShadowed(patterns, 'other_tool')).toBe(false);
    });
  });
});