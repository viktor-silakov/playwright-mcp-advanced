/**
 * Test for Extension mode CDP response issues
 * 
 * This test suite reproduces issues that occur when using playwright-mcp 
 * in extension mode where CDP responses are returned as objects instead of
 * expected primitive types.
 */

import { test, expect } from '@playwright/test';

/**
 * Mock CDP responses that would be returned in extension mode
 */
function mockCDPResponse(value: any, nested = false) {
  if (nested) {
    return {
      result: {
        result: {
          value: value
        }
      }
    };
  }
  return {
    result: {
      value: value
    }
  };
}

/**
 * Test function to extract content from CDP responses
 */
function extractContentFromCDPResponse(response: any): any {
  // If it's already a primitive, return as is (normal Playwright case)
  if (typeof response === 'string' || response instanceof Buffer || Array.isArray(response)) {
    return response;
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
  
  // Fallback to original response
  return response;
}

/**
 * Test function to extract elements array from CDP responses
 */
function extractElementsFromCDPResponse(response: any): any[] {
  const extracted = extractContentFromCDPResponse(response);
  
  // If it's already an array, return it
  if (Array.isArray(extracted)) {
    return extracted;
  }
  
  // If it's a single element, wrap in array
  if (extracted && typeof extracted === 'object') {
    return [extracted];
  }
  
  return [];
}

test.describe('Extension Mode CDP Response Issues', () => {
  test('should extract base64 data from CDP response correctly', async () => {
    // Simulate screenshot data that comes back as CDP response
    const mockScreenshotBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    
    // Test case 1: Normal Playwright response (Buffer)
    const normalResponse = mockScreenshotBuffer;
    const extractedNormal = extractContentFromCDPResponse(normalResponse);
    expect(extractedNormal).toBeInstanceOf(Buffer);
    expect(extractedNormal.toString('base64')).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    
    // Test case 2: CDP response with nested structure
    const cdpResponse = mockCDPResponse(mockScreenshotBuffer, true);
    const extractedCDP = extractContentFromCDPResponse(cdpResponse);
    expect(extractedCDP).toBeInstanceOf(Buffer);
    expect(extractedCDP.toString('base64')).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    
    // Test case 3: CDP response with single level structure
    const cdpResponseSingle = mockCDPResponse(mockScreenshotBuffer);
    const extractedCDPSingle = extractContentFromCDPResponse(cdpResponseSingle);
    expect(extractedCDPSingle).toBeInstanceOf(Buffer);
    expect(extractedCDPSingle.toString('base64')).toBe('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  });

  test('should extract elements array from CDP response correctly', async () => {
    // Mock element objects
    const mockElement1 = { _guid: 'element1' };
    const mockElement2 = { _guid: 'element2' };
    const mockElementsArray = [mockElement1, mockElement2];
    
    // Test case 1: Normal Playwright response (array of elements)
    const normalResponse = mockElementsArray;
    const extractedNormal = extractElementsFromCDPResponse(normalResponse);
    expect(Array.isArray(extractedNormal)).toBe(true);
    expect(extractedNormal).toHaveLength(2);
    expect(extractedNormal[0]._guid).toBe('element1');
    expect(extractedNormal[1]._guid).toBe('element2');
    
    // Test case 2: CDP response with nested structure
    const cdpResponse = mockCDPResponse(mockElementsArray, true);
    const extractedCDP = extractElementsFromCDPResponse(cdpResponse);
    expect(Array.isArray(extractedCDP)).toBe(true);
    expect(extractedCDP).toHaveLength(2);
    expect(extractedCDP[0]._guid).toBe('element1');
    expect(extractedCDP[1]._guid).toBe('element2');
    
    // Test case 3: CDP response with single level structure
    const cdpResponseSingle = mockCDPResponse(mockElementsArray);
    const extractedCDPSingle = extractElementsFromCDPResponse(cdpResponseSingle);
    expect(Array.isArray(extractedCDPSingle)).toBe(true);
    expect(extractedCDPSingle).toHaveLength(2);
    expect(extractedCDPSingle[0]._guid).toBe('element1');
    expect(extractedCDPSingle[1]._guid).toBe('element2');
    
    // Test case 4: Empty array in CDP response
    const emptyCdpResponse = mockCDPResponse([]);
    const extractedEmpty = extractElementsFromCDPResponse(emptyCdpResponse);
    expect(Array.isArray(extractedEmpty)).toBe(true);
    expect(extractedEmpty).toHaveLength(0);
    
    // Test case 5: Single element in CDP response
    const singleElementCdpResponse = mockCDPResponse(mockElement1);
    const extractedSingle = extractElementsFromCDPResponse(singleElementCdpResponse);
    expect(Array.isArray(extractedSingle)).toBe(true);
    expect(extractedSingle).toHaveLength(1);
    expect(extractedSingle[0]._guid).toBe('element1');
  });

  test('should handle string data from CDP response correctly', async () => {
    const mockHtmlContent = '<html><body><h1>Test Page</h1></body></html>';
    
    // Test case 1: Normal Playwright response (string)
    const normalResponse = mockHtmlContent;
    const extractedNormal = extractContentFromCDPResponse(normalResponse);
    expect(typeof extractedNormal).toBe('string');
    expect(extractedNormal).toBe(mockHtmlContent);
    
    // Test case 2: CDP response with nested structure
    const cdpResponse = mockCDPResponse(mockHtmlContent, true);
    const extractedCDP = extractContentFromCDPResponse(cdpResponse);
    expect(typeof extractedCDP).toBe('string');
    expect(extractedCDP).toBe(mockHtmlContent);
    
    // Test case 3: CDP response with single level structure
    const cdpResponseSingle = mockCDPResponse(mockHtmlContent);
    const extractedCDPSingle = extractContentFromCDPResponse(cdpResponseSingle);
    expect(typeof extractedCDPSingle).toBe('string');
    expect(extractedCDPSingle).toBe(mockHtmlContent);
  });

  test('should validate base64 format correctly', async () => {
    // Valid base64 string
    const validBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    // Test extracting valid base64 from CDP response
    const cdpResponse = mockCDPResponse(Buffer.from(validBase64, 'base64'));
    const extractedBuffer = extractContentFromCDPResponse(cdpResponse);
    
    expect(extractedBuffer).toBeInstanceOf(Buffer);
    
    // Convert to base64 and verify it's valid
    const extractedBase64 = extractedBuffer.toString('base64');
    expect(extractedBase64).toBe(validBase64);
    
    // Verify it can be converted back to buffer
    const verifyBuffer = Buffer.from(extractedBase64, 'base64');
    expect(verifyBuffer).toEqual(extractedBuffer);
  });

  test('should handle edge cases gracefully', async () => {
    // Test null response
    const nullResponse = null;
    const extractedNull = extractContentFromCDPResponse(nullResponse);
    expect(extractedNull).toBe(null);
    
    // Test undefined response
    const undefinedResponse = undefined;
    const extractedUndefined = extractContentFromCDPResponse(undefinedResponse);
    expect(extractedUndefined).toBe(undefined);
    
    // Test empty object
    const emptyObject = {};
    const extractedEmpty = extractContentFromCDPResponse(emptyObject);
    expect(extractedEmpty).toEqual({});
    
    // Test object without expected structure
    const randomObject = { foo: 'bar', baz: 123 };
    const extractedRandom = extractContentFromCDPResponse(randomObject);
    expect(extractedRandom).toEqual(randomObject);
  });
});