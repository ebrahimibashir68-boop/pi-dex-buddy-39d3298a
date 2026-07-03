import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { TOKENS } from "@/lib/tokens";

export default defineTool({
  name: "list_tokens",
  title: "List tokens",
  description:
    "List all tokens available on PiSwap with their symbol, name, and current mock USD price.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const rows = TOKENS.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      price_usd: t.price,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { tokens: rows },
    };
  },
});
