import { Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function Header() {
  const [connected, setConnected] = useState(false);
  const addr = "Gπ7x...4kQa";
  return (
    <header className="w-full px-4 sm:px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
      <div className="flex items-center gap-2.5">
        <div
          className="size-9 grid place-items-center rounded-xl font-display font-bold text-xl text-gold-foreground"
          style={{ background: "linear-gradient(135deg, var(--gold), oklch(0.7 0.18 60))" }}
        >
          π
        </div>
        <div className="leading-tight">
          <div className="font-display font-semibold">PiSwap</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Pi DEX</div>
        </div>
      </div>

      <nav className="hidden sm:flex items-center gap-1 rounded-full bg-secondary/50 border border-border p-1">
        {["Swap", "Pools", "Portfolio"].map((l, i) => (
          <button
            key={l}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              i === 0 ? "bg-primary/30 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </nav>

      <button
        onClick={() => {
          setConnected(true);
          toast.success("Connected to Pi Wallet", { description: addr });
        }}
        className="btn-pi rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-2 hover:btn-pi-hover"
      >
        <Wallet className="size-4" />
        {connected ? addr : "Connect"}
      </button>
    </header>
  );
}
