
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testSnapshot() {
  const client = new Client({name: "test", version: "1.0.0"});
  const transport = new StdioClientTransport({
    command: "node",
    args: ["cli.js", "--headless"]
  });
  
  try {
    await client.connect(transport);
    
    // Navigate to a test page
    await client.callTool("browser_navigate", { url: "data:text/html,<button>Submit</button>" });
    
    // Take a snapshot
    const result = await client.callTool("browser_snapshot", {});
    console.log("SNAPSHOT RESULT:");
    console.log(JSON.stringify(result, null, 2));
    
    await client.close();
  } catch (e) {
    console.error("Error:", e.message);
  }
}

testSnapshot();

