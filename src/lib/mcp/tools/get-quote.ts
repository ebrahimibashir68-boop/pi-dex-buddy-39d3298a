import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { TOKENS, getQuote } from "@/lib/tokens";

export default defineTool({
  name: "get_swap_quote",
  title: "Get swap quote",
  description:
    "Get a simulated PiSwap quote for swapping an input amount of one token into another. Returns output amount, rate, price impact, and fee.",
  inputSchema: {
    from_symbol: z.string().describe("Source token symbol, e.g. PI"),
    to_symbol: z.string().describe("Destination token symbol, e.g. USDP"),
    amount: z.number().positive().describe("Amount of the source token to swap"),
    slippage_pct: z
      .number()
      .min(0)
      .max(50)
      .default(0.5)
      .describe("Max slippage percentage (default 0.5)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ from_symbol, to_symbol, amount, slippage_pct }) => {
    const from = TOKENS.find((t) => t.symbol.toLowerCase() === from_symbol.toLowerCase());
    const to = TOKENS.find((t) => t.symbol.toLowerCase() === to_symbol.toLowerCase());
    if (!from || !to) {
      return {
        content: [
          {
            type: "text",
            text: `Unknown token symbol. Available: ${TOKENS.map((t) => t.symbol).join(", ")}`,
          },
        ],
        isError: true,
      };
    }
    const q = getQuote(amount, from, to, slippage_pct);
    const result = {
      from: from.symbol,
      to: to.symbol,
      amount_in: amount,
      amount_out: q.out,
      min_out: q.min,
      rate: q.rate,
      price_impact_pct: q.impact,
      fee_pct: q.fee,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
