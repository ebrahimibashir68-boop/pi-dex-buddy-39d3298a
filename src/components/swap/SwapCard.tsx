import { useMemo, useState } from "react";
import { ArrowDown, Settings2, Zap, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TOKENS, getQuote, type Token } from "@/lib/tokens";
import { TokenSelectDialog } from "./TokenSelectDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { createPiPayment } from "@/lib/pi-sdk";
import { approvePiPayment, completePiPayment } from "@/lib/pi-payments.functions";
import { usePiAuth } from "@/hooks/use-pi-auth";

const PRESETS = [0.1, 0.5, 1.0];

export function SwapCard() {
  const [from, setFrom] = useState<Token>(TOKENS[0]);
  const [to, setTo] = useState<Token>(TOKENS[1]);
  const [amount, setAmount] = useState("100");
  const [slippage, setSlippage] = useState(0.5);
  const [paying, setPaying] = useState(false);
  const { session, signIn } = usePiAuth(false);

  const inAmt = parseFloat(amount) || 0;
  const quote = useMemo(() => getQuote(inAmt, from, to, slippage), [inAmt, from, to, slippage]);

  const flip = () => {
    setFrom(to);
    setTo(from);
    setAmount(quote.out ? quote.out.toPrecision(6) : amount);
  };

  const handleSwap = async () => {
    if (!inAmt) return toast.error("Enter an amount");
    if (inAmt > from.balance) return toast.error("Insufficient balance");

    // Only PI → X uses a real Pi U2A payment; other pairs stay simulated.
    if (from.symbol !== "PI") {
      toast.success(
        `Swapped ${inAmt} ${from.symbol} → ${quote.out.toPrecision(6)} ${to.symbol}`,
        { description: `Slippage ${slippage}% · Fee ${quote.fee}% · simulated` },
      );
      return;
    }

    const s = session ?? (await signIn());
    if (!s) return;

    setPaying(true);
    try {
      await createPiPayment(
        {
          amount: Number(inAmt.toFixed(7)),
          memo: `PiSwap: ${inAmt} PI → ${quote.out.toPrecision(6)} ${to.symbol}`,
          metadata: {
            kind: "swap",
            from: from.symbol,
            to: to.symbol,
            amountIn: inAmt,
            expectedOut: quote.out,
            minOut: quote.min,
            slippagePct: slippage,
          },
        },
        {
          onReadyForServerApproval: (paymentId) => {
            void approvePiPayment({ data: { paymentId } }).catch((e) =>
              toast.error("Payment approval failed", { description: String(e) }),
            );
          },
          onReadyForServerCompletion: (paymentId, txid) => {
            void completePiPayment({ data: { paymentId, txid } })
              .then(() => {
                toast.success(
                  `Swap sent: ${inAmt} PI → ${quote.out.toPrecision(6)} ${to.symbol}`,
                  { description: `txid ${txid.slice(0, 10)}…` },
                );
              })
              .catch((e) =>
                toast.error("Payment completion failed", { description: String(e) }),
              )
              .finally(() => setPaying(false));
          },
          onCancel: () => {
            setPaying(false);
            toast.message("Payment cancelled");
          },
          onError: (error) => {
            setPaying(false);
            toast.error("Payment error", { description: error.message });
          },
        },
      );
    } catch (e) {
      setPaying(false);
      toast.error("Could not start Pi payment", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const insufficient = inAmt > from.balance;

  return (
    <div className="glass-card rounded-3xl p-5 sm:p-6 w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Swap</h2>
          <p className="text-xs text-muted-foreground">Instant trades on the Pi ecosystem</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="Swap settings"
              className="size-9 grid place-items-center rounded-full bg-secondary/70 hover:bg-secondary border border-border transition-colors"
            >
              <Settings2 className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="glass-card w-72">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Slippage tolerance</span>
                <span className="text-sm font-mono text-gold">{slippage.toFixed(2)}%</span>
              </div>
              <div className="flex gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSlippage(p)}
                    className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                      slippage === p
                        ? "bg-primary/30 border-primary text-foreground"
                        : "border-border hover:bg-accent/50"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <Slider
                value={[slippage]}
                onValueChange={(v) => setSlippage(v[0])}
                min={0.1}
                max={5}
                step={0.1}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* FROM */}
      <TokenInput
        label="You pay"
        token={from}
        amount={amount}
        onAmount={setAmount}
        onToken={setFrom}
        disabledSymbol={to.symbol}
        max={from.balance}
        editable
      />

      {/* Flip */}
      <div className="relative h-2">
        <button
          onClick={flip}
          aria-label="Flip tokens"
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 size-10 grid place-items-center rounded-xl bg-card border-2 border-background hover:rotate-180 transition-transform duration-300 shadow-lg"
          style={{ borderColor: "var(--background)" }}
        >
          <ArrowDown className="size-4" />
        </button>
      </div>

      {/* TO */}
      <TokenInput
        label="You receive"
        token={to}
        amount={quote.out ? quote.out.toPrecision(6) : ""}
        onAmount={() => {}}
        onToken={setTo}
        disabledSymbol={from.symbol}
        max={to.balance}
      />

      {/* Quote details */}
      {inAmt > 0 && (
        <div className="mt-4 rounded-2xl bg-secondary/40 border border-border p-3 text-sm space-y-1.5">
          <Row label="Rate">
            1 {from.symbol} ={" "}
            <span className="font-mono">{quote.rate.toPrecision(6)}</span> {to.symbol}
          </Row>
          <Row label="Price impact">
            <span className={quote.impact > 1 ? "text-destructive" : "text-success"}>
              {quote.impact.toFixed(2)}%
            </span>
          </Row>
          <Row label="Min received">
            <span className="font-mono">{quote.min.toPrecision(6)}</span> {to.symbol}
          </Row>
          <Row label="Network fee">
            <span className="text-gold">~ 0.0001 PI</span>
          </Row>
        </div>
      )}

      <button
        onClick={handleSwap}
        disabled={!inAmt || insufficient || paying}
        className="mt-5 w-full btn-pi rounded-2xl py-4 font-display font-semibold text-lg hover:[&:not(:disabled)]:btn-pi-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {paying ? <Loader2 className="size-5 animate-spin" /> : <Zap className="size-5" />}
        {paying
          ? "Confirm in Pi Wallet…"
          : insufficient
            ? `Insufficient ${from.symbol}`
            : inAmt
              ? from.symbol === "PI"
                ? "Swap with Pi"
                : "Swap"
              : "Enter an amount"}
      </button>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground justify-center">
        <Info className="size-3" />
        Demo interface · trades are simulated with mock liquidity
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function TokenInput({
  label,
  token,
  amount,
  onAmount,
  onToken,
  disabledSymbol,
  max,
  editable = false,
}: {
  label: string;
  token: Token;
  amount: string;
  onAmount: (v: string) => void;
  onToken: (t: Token) => void;
  disabledSymbol?: string;
  max: number;
  editable?: boolean;
}) {
  const usd = (parseFloat(amount) || 0) * token.price;
  return (
    <div className="rounded-2xl bg-secondary/40 border border-border p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>{label}</span>
        <button
          onClick={() => editable && onAmount(String(max))}
          className={editable ? "hover:text-gold transition-colors" : ""}
        >
          Balance: {max.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          {editable && <span className="ml-1.5 text-gold font-semibold">MAX</span>}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          readOnly={!editable}
          placeholder="0.0"
          aria-label={`${label} amount in ${token.symbol}`}
          className="flex-1 min-w-0 bg-transparent outline-none text-3xl font-display font-semibold placeholder:text-muted-foreground/40"
        />
        <TokenSelectDialog value={token} onChange={onToken} disabledSymbol={disabledSymbol} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        ≈ ${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}
