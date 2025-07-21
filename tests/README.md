# CDP Relay Tests

This directory contains tests for the CDP Relay, focusing on redirect handling and targetInfo updates.

## Test Files

- **test_redirect.mjs**: Basic tests for HTTP redirects
- **test_cdp_relay.mjs**: Tests for CDP Relay with simulated extension
- **test_integration.mjs**: End-to-end integration tests
- **test_error_handling.mjs**: Tests for error handling during redirects
- **test_performance.mjs**: Performance tests for redirect handling
- **test_snapshot.mjs**: Tests for snapshot functionality
- **test_visibility.mjs**: Tests for element visibility

## Running Tests

To run all tests:

```bash
node run_tests.mjs
```

To run a specific test:

```bash
node tests/test_redirect.mjs
```

## Test Structure

Each test file follows a similar structure:

1. **Setup**: Connect to the MCP server
2. **Test Cases**: Run specific test cases
3. **Assertions**: Verify that the system behaves as expected
4. **Cleanup**: Close connections and clean up resources

## Writing New Tests

When writing new tests, follow these guidelines:

1. **Isolation**: Each test should be independent and not rely on the state from other tests
2. **Error Handling**: Use try/catch blocks to handle errors gracefully
3. **Assertions**: Use assert to verify that the system behaves as expected
4. **Cleanup**: Always clean up resources, even if the test fails

Example:

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import assert from 'assert';

async function testExample() {
  const client = new Client({name: "example-test", version: "1.0.0"});
  const transport = new StdioClientTransport({
    command: "node",
    args: ["cli.js", "--headless"]
  });
  
  try {
    await client.connect(transport);
    
    // Test case
    await client.callTool("browser_navigate", { url: "https://example.com" });
    
    // Assertion
    const snapshot = await client.callTool("browser_snapshot", {});
    const snapshotText = snapshot.result;
    const urlMatch = snapshotText.match(/url: (.*)/);
    const finalUrl = urlMatch ? urlMatch[1] : null;
    
    assert(finalUrl === "https://example.com/", "URL should be example.com");
    
    await client.close();
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

testExample();
```

## Test Coverage

The tests cover the following areas:

1. **HTTP Redirects**: 301, 302, 303, 307, 308 redirects
2. **Meta Redirects**: `<meta http-equiv="refresh">`
3. **JavaScript Redirects**: `window.location.href`
4. **Error Handling**: Navigation errors, JavaScript errors
5. **Performance**: Time to update targetInfo, stress testing

## Debugging Tests

If a test fails, check the following:

1. **Logs**: Look for error messages in the logs
2. **Network**: Check if the test can access the required URLs
3. **Timeouts**: Increase timeouts if necessary
4. **Assertions**: Verify that the assertions are correct