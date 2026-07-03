import { defineMcp } from "@lovable.dev/mcp-js";
import listTokensTool from "./tools/list-tokens";
import getQuoteTool from "./tools/get-quote";

export default defineMcp({
  name: "piswap-mcp",
  title: "PiSwap MCP",
  version: "0.1.0",
  instructions:
    "Tools for PiSwap, a Pi Network DEX. Use `list_tokens` to see available tokens, and `get_swap_quote` to simulate a swap between two tokens.",
  tools: [listTokensTool, getQuoteTool],
});
