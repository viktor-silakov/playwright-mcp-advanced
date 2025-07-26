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

/**
 * Matches a string against a pattern that supports wildcards.
 * Supports:
 * - '*' matches any sequence of characters (including empty)
 * - Exact string matching when no wildcards present
 * 
 * @param pattern Pattern to match against (e.g., "browser_*", "*_test", "*middle*")
 * @param text Text to check against the pattern
 * @returns true if the text matches the pattern
 */
export function matchesPattern(pattern: string, text: string): boolean {
  // If no wildcards, do exact match
  if (!pattern.includes('*')) {
    return pattern === text;
  }

  // Convert wildcard pattern to regex
  // Escape all regex special characters except *
  const escapedPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*/g, '.*'); // Replace * with .*

  const regex = new RegExp(`^${escapedPattern}$`);
  return regex.test(text);
}

/**
 * Checks if a name should be shadowed based on shadow patterns.
 * 
 * @param shadowPatterns Array of patterns that may contain wildcards
 * @param name Name to check for shadowing
 * @returns true if the name should be shadowed (hidden)
 */
export function isShadowed(shadowPatterns: string[] | undefined, name: string): boolean {
  if (!shadowPatterns || shadowPatterns.length === 0) {
    return false;
  }

  return shadowPatterns.some(pattern => matchesPattern(pattern, name));
}