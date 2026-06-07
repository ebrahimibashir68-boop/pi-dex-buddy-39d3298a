export type Token = {
  symbol: string;
  name: string;
  /** USD price (mock) */
  price: number;
  balance: number;
  color: string;
  glyph: string;
};

export const TOKENS: Token[] = [
  { symbol: "PI", name: "Pi Network", price: 0.42, balance: 1280.55, color: "#8a5cf6", glyph: "π" },
  { symbol: "USDP", name: "Pi USD", price: 1.0, balance: 540.12, color: "#22c55e", glyph: "$" },
  { symbol: "wBTC", name: "Wrapped BTC", price: 67250.0, balance: 0.0124, color: "#f7931a", glyph: "₿" },
  { symbol: "wETH", name: "Wrapped ETH", price: 3480.0, balance: 0.412, color: "#627eea", glyph: "Ξ" },
  { symbol: "PiOS", name: "Pioneer Stake", price: 2.18, balance: 96.4, color: "#eab308", glyph: "◎" },
  { symbol: "MOON", name: "Moonshot", price: 0.0034, balance: 152340, color: "#ec4899", glyph: "☾" },
];

export const getQuote = (
  inAmt: number,
  from: Token,
  to: Token,
  slippage: number,
) => {
  if (!inAmt || inAmt <= 0) return { out: 0, rate: 0, min: 0, impact: 0, fee: 0 };
  const rate = from.price / to.price;
  // simulate constant-product impact: 0.05% per $1k of trade
  const usd = inAmt * from.price;
  const impactPct = Math.min(usd / 200_000, 0.05); // cap 5%
  const fee = 0.003; // 0.3%
  const out = inAmt * rate * (1 - impactPct) * (1 - fee);
  const min = out * (1 - slippage / 100);
  return { out, rate, min, impact: impactPct * 100, fee: fee * 100 };
};
