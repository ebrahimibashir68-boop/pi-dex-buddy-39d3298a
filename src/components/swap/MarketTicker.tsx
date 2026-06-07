import { TOKENS } from "@/lib/tokens";
import { TokenIcon } from "./TokenIcon";

const ROWS = TOKENS.map((t, i) => ({
  ...t,
  change: [2.34, -0.12, 1.05, -1.78, 4.21, 8.6][i] ?? 0,
}));

export function MarketTicker() {
  const loop = [...ROWS, ...ROWS];
  return (
    <div className="relative overflow-hidden border-y border-border bg-card/30 backdrop-blur-md">
      <div className="flex gap-8 py-3 animate-[ticker_40s_linear_infinite] whitespace-nowrap">
        {loop.map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <TokenIcon token={t} size={22} />
            <span className="font-semibold">{t.symbol}</span>
            <span className="font-mono text-muted-foreground">
              ${t.price.toLocaleString(undefined, { maximumFractionDigits: t.price < 1 ? 4 : 2 })}
            </span>
            <span className={t.change >= 0 ? "text-success" : "text-destructive"}>
              {t.change >= 0 ? "+" : ""}
              {t.change}%
            </span>
          </div>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}
