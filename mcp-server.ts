import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BACKEND_URL = "http://localhost:8080/api/finance";

const server = new Server(
  {
    name: "finance-tracker-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Helper to fetch data from the Java Backend
 */
async function fetchFromBackend(endpoint: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/${endpoint}`);
    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return { error: String(error) };
  }
}

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_transactions",
        description: "Retrieve all transactions from the database",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_budgets",
        description: "Retrieve all budget categories and limits",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_accounts",
        description: "Retrieve all linked bank accounts and balances",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;

  switch (name) {
    case "get_transactions":
      const transactions = await fetchFromBackend("transactions");
      return {
        content: [{ type: "text", text: JSON.stringify(transactions, null, 2) }],
      };

    case "get_budgets":
      const budgets = await fetchFromBackend("budgets");
      return {
        content: [{ type: "text", text: JSON.stringify(budgets, null, 2) }],
      };

    case "get_accounts":
      const accounts = await fetchFromBackend("bank-accounts");
      return {
        content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

/**
 * Start the server using stdio transport
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Finance Tracker MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
