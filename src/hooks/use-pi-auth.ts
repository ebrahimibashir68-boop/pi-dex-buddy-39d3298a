import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authenticatePi } from "@/lib/pi-sdk";
import { verifyPiToken } from "@/lib/pi-auth.functions";

export type PiSession = {
  uid: string;
  username: string;
  walletAddress: string | null;
};

type Status = "idle" | "loading" | "authenticated" | "error";

export function usePiAuth(autoSignIn = true) {
  const [session, setSession] = useState<PiSession | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<Promise<PiSession | null> | null>(null);

  const signIn = useCallback(async (): Promise<PiSession | null> => {
    if (inflight.current) return inflight.current;
    setStatus("loading");
    setError(null);
    const run = (async () => {
      try {
        const auth = await authenticatePi([
          "username",
          "payments",
          "wallet_address",
        ]);
        const verified = await verifyPiToken({
          data: { accessToken: auth.accessToken },
        });
        const s: PiSession = {
          uid: verified.uid,
          username: verified.username,
          walletAddress:
            verified.walletAddress ?? auth.user.wallet_address ?? null,
        };
        setSession(s);
        setStatus("authenticated");
        toast.success("Pi wallet connected", {
          description: s.walletAddress
            ? `@${s.username} · ${s.walletAddress.slice(0, 6)}…${s.walletAddress.slice(-4)}`
            : `@${s.username}`,
        });
        return s;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Pi sign-in failed";
        setError(msg);
        setStatus("error");
        toast.error("Pi wallet connection failed", { description: msg });
        return null;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, []);

  useEffect(() => {
    if (!autoSignIn) return;
    if (typeof window === "undefined") return;
    void signIn();
  }, [autoSignIn, signIn]);

  return { session, status, error, signIn };
}
