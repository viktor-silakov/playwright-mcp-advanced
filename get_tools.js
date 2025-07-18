
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

async function getTools() {
  const client = new Client({name: "test", version: "1.0.0"});
  const transport = new StdioClientTransport({
    command: "node",
    args: ["cli.js", "--headless"]
  });
  
  try {
    await client.connect(transport);
    const result = await client.listTools();
    console.log("=== SNAPSHOT TOOLS ===");
    console.log(JSON.stringify(result.tools.map(t => t.name).sort(), null, 2));
    await client.close();
  } catch (e) {
    console.error("Error:", e.message);
  }
}

getTools();

