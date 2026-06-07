import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TOKENS, type Token } from "@/lib/tokens";
import { TokenIcon } from "./TokenIcon";
import { ChevronDown, Search } from "lucide-react";

export function TokenSelectDialog({
  value,
  onChange,
  disabledSymbol,
}: {
  value: Token;
  onChange: (t: Token) => void;
  disabledSymbol?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = TOKENS.filter(
    (t) =>
      t.symbol.toLowerCase().includes(q.toLowerCase()) ||
      t.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-secondary/80 hover:bg-secondary pl-1.5 pr-3 py-1.5 transition-colors border border-border"
        >
          <TokenIcon token={value} size={28} />
          <span className="font-semibold text-base">{value.symbol}</span>
          <ChevronDown className="size-4 opacity-70" />
        </button>
      </DialogTrigger>
      <DialogContent className="glass-card max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Select a token</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or paste address"
            className="pl-9 bg-input/60 border-border"
          />
        </div>
        <div className="mt-2 max-h-80 overflow-y-auto -mx-2">
          {list.map((t) => {
            const disabled = t.symbol === disabledSymbol;
            return (
              <button
                key={t.symbol}
                disabled={disabled}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
              >
                <TokenIcon token={t} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{t.symbol}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.name}</div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{t.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                  <div className="text-xs text-muted-foreground">
                    ${(t.balance * t.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
