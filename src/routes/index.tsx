import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/swap/Header";
import { SwapCard } from "@/components/swap/SwapCard";
import { MarketTicker } from "@/components/swap/MarketTicker";
import { Toaster } from "@/components/ui/sonner";
import { Shield, Sparkles, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PiSwap — The Pi Ecosystem DEX" },
      { name: "description", content: "Swap tokens instantly on the Pi Network with low fees, deep liquidity, and a beautifully simple interface." },
      { property: "og:title", content: "PiSwap — The Pi Ecosystem DEX" },
      { property: "og:description", content: "Swap tokens instantly on the Pi Network with low fees, deep liquidity, and a beautifully simple interface." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <MarketTicker />

      <main className="flex-1 px-4 py-10 sm:py-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Hero copy */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground mb-5">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              Live on Pi Testnet
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-semibold leading-[1.05]">
              Trade the <span className="text-gradient-pi">Pi ecosystem</span>
              <br />
              in one tap.
            </h1>
            <p className="mt-5 text-muted-foreground text-base sm:text-lg max-w-md mx-auto lg:mx-0">
              Lightning-fast token swaps powered by Pioneer liquidity. Built for the Pi
              Browser, optimized for mobile, secured by you.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto lg:mx-0">
              <Stat icon={<Activity className="size-4" />} label="24h Volume" value="$2.4M" />
              <Stat icon={<Sparkles className="size-4" />} label="Pairs" value="128" />
              <Stat icon={<Shield className="size-4" />} label="TVL" value="$18.7M" />
            </div>
          </div>

          {/* Swap */}
          <div className="order-1 lg:order-2">
            <SwapCard />
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 px-4 text-center text-xs text-muted-foreground">
        PiSwap · A demo DEX interface for the Pi ecosystem · Not financial advice
      </footer>

      <Toaster position="top-center" />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 backdrop-blur p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="font-display text-xl font-semibold mt-1 text-gradient-pi">{value}</div>
    </div>
  );
}
