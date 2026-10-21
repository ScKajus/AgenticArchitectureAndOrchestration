import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerGetCustomer } from "./tools/getCustomer.ts";
import { registerLookupOrder } from "./tools/lookupOrder.ts";
import { registerProcessRefund } from "./tools/processRefund.ts";

const server = new McpServer({ name: "support", version: "1.0.0" });

registerGetCustomer(server);
registerLookupOrder(server);
registerProcessRefund(server);

await server.connect(new StdioServerTransport());
// stdout carries the MCP protocol, so log to stderr only.
console.error("support MCP server running on stdio");
