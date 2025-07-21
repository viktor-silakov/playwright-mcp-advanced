/**
 * Utilities for handling CDP (Chrome DevTools Protocol) responses
 * 
 * When using playwright-mcp in extension mode with CDP relay, some methods
 * that normally return primitive types (strings, Buffers, arrays) may instead
 * return CDP response objects. These utilities handle both cases gracefully.
 */

/**
 * Extract generic content from various response formats including CDP responses
 * 
 * This function handles the case where methods return a CDP response object
 * instead of the expected type when using extension mode with CDP relay.
 * 
 * @param response - The response which could be a primitive type or CDP response object
 * @returns The extracted content in its expected format
 */
function extractGenericContentFromCDPResponse(response: any): any {
  // If it's already a primitive type or expected object, return as is (normal Playwright case)
  if (typeof response === 'string' || 
      typeof response === 'number' || 
      typeof response === 'boolean' ||
      response instanceof Buffer || 
      Array.isArray(response) ||
      response === null ||
      response === undefined) {
    return response;
  }
  
  // Screenshot response: { data: "base64string" }
  if (response?.data !== undefined && typeof response.data === 'string') {
    return response.data;
  }
  
  // If it's a CDP response object with nested result.result.value
  if (response?.result?.result?.value !== undefined) {
    return response.result.result.value;
  }
  
  // If it's a direct result object with result.value
  if (response?.result?.value !== undefined) {
    return response.result.value;
  }
  
  // If it's just a result object with value
  if (response?.value !== undefined) {
    return response.value;
  }
  
  // Fallback to original response for unknown structures
  return response;
}

/**
 * Extract HTML content from various response formats including CDP responses
 * 
 * This function handles the case where page.content() returns a CDP response object
 * instead of a string when using extension mode with CDP relay.
 * 
 * @param response - The response which could be a string or CDP response object
 * @returns The HTML content as a string
 */
export function extractContentFromCDPResponse(response: any): any {
  return extractStringFromCDPResponse(response);
}

/**
 * Extract string data from CDP responses
 * 
 * Handles page.content() and similar string-returning methods
 * 
 * @param response - The response that should contain string data
 * @returns The extracted string
 */
export function extractStringFromCDPResponse(response: any): string {
  const extracted = extractGenericContentFromCDPResponse(response);
  
  // If it's already a string, return it
  if (typeof extracted === 'string') {
    return extracted;
  }
  
  // If it's a Buffer, convert to string
  if (extracted instanceof Buffer) {
    return extracted.toString();
  }
  
  // Fallback to string conversion
  return String(extracted || '');
}

/**
 * Extract elements array from CDP responses
 * 
 * Specifically handles locator.all() responses that may come back as CDP objects
 * 
 * @param response - The response from locator.all() or similar methods
 * @returns An array of elements
 */
export function extractElementsFromCDPResponse(response: any): any[] {
  const extracted = extractGenericContentFromCDPResponse(response);
  
  // If it's already an array, return it
  if (Array.isArray(extracted)) {
    return extracted;
  }
  
  // If it's a single element object, wrap in array
  if (extracted && typeof extracted === 'object' && extracted._guid) {
    return [extracted];
  }
  
  // If it's null/undefined, return empty array
  if (extracted === null || extracted === undefined) {
    return [];
  }
  
  // For other single values, wrap in array (fallback)
  return [extracted];
}

/**
 * Extract Buffer data from CDP responses
 * 
 * Handles screenshot and other binary data that may come back as CDP objects
 * 
 * @param response - The response from page.screenshot() or similar methods
 * @returns A Buffer containing the binary data
 */
export function extractBufferFromCDPResponse(response: any): Buffer {
  const extracted = extractGenericContentFromCDPResponse(response);
  
  // If it's already a Buffer, return it
  if (extracted instanceof Buffer) {
    return extracted;
  }
  
  // If it's a string, try to convert from base64
  if (typeof extracted === 'string') {
    try {
      return Buffer.from(extracted, 'base64');
    } catch (e) {
      // If base64 conversion fails, create buffer from string
      return Buffer.from(extracted);
    }
  }
  
  // If it's an array of numbers (Uint8Array-like), convert to Buffer
  if (Array.isArray(extracted) && extracted.every(item => typeof item === 'number')) {
    return Buffer.from(extracted);
  }
  
  // Fallback: create empty buffer
  console.warn('Unable to extract Buffer from CDP response, returning empty buffer');
  return Buffer.alloc(0);
}

/**
 * Extract boolean data from CDP responses
 * 
 * @param response - The response that should contain boolean data
 * @returns The extracted boolean
 */
export function extractBooleanFromCDPResponse(response: any): boolean {
  const extracted = extractGenericContentFromCDPResponse(response);
  
  // If it's already a boolean, return it
  if (typeof extracted === 'boolean') {
    return extracted;
  }
  
  // Convert to boolean
  return Boolean(extracted);
}

/**
 * Extract number data from CDP responses
 * 
 * @param response - The response that should contain number data
 * @returns The extracted number
 */
export function extractNumberFromCDPResponse(response: any): number {
  const extracted = extractGenericContentFromCDPResponse(response);
  
  // If it's already a number, return it
  if (typeof extracted === 'number') {
    return extracted;
  }
  
  // Convert to number
  const num = Number(extracted);
  return isNaN(num) ? 0 : num;
}