import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authenticatePi, isPiBrowser } from "@/lib/pi-sdk";
import { verifyPiToken } from "@/lib/pi-auth.functions";
import { PI_SCOPES, shortenAddress } from "@/lib/pi-network";

export type PiSession = {
  uid: string;
  username: string;
  walletAddress: string | null;
  scopes: string[];
  /** Access-token expiry in ms since epoch, when Pi reports one. */
  expiresAt: number | null;
};

type Status = "idle" | "loading" | "authenticated" | "error";

const STORE_KEY = "piswap.pi-session";

function readStored(): PiSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PiSession;
    if (!s?.uid || !s?.username) return null;
    if (s.expiresAt && s.expiresAt < Date.now()) {
      window.sessionStorage.removeItem(STORE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function usePiAuth(autoSignIn = true) {
  const [session, setSession] = useState<PiSession | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<Promise<PiSession | null> | null>(null);

  // Restore a still-valid session after hydration (never during render/SSR).
  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setSession(stored);
      setStatus("authenticated");
    }
  }, []);

  const signOut = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORE_KEY);
    }
    setSession(null);
    setStatus("idle");
    setError(null);
  }, []);

  const signIn = useCallback(async (): Promise<PiSession | null> => {
    if (inflight.current) return inflight.current;
    setStatus("loading");
    setError(null);
    const run = (async () => {
      try {
        const auth = await authenticatePi(PI_SCOPES);
        const verified = await verifyPiToken({
          data: { accessToken: auth.accessToken },
        });
        const s: PiSession = {
          uid: verified.uid,
          username: verified.username,
          walletAddress:
            verified.walletAddress ?? auth.user.wallet_address ?? null,
          scopes: verified.scopes,
          expiresAt: verified.expiresAt,
        };
        setSession(s);
        setStatus("authenticated");
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(STORE_KEY, JSON.stringify(s));
        }
        toast.success("Pi wallet connected", {
          description: s.walletAddress
            ? `@${s.username} · ${shortenAddress(s.walletAddress)}`
            : `@${s.username}`,
        });
        return s;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Pi sign-in failed";
        setError(msg);
        setStatus("error");
        toast.error("Pi wallet connection failed", {
          description: isPiBrowser()
            ? msg
            : "Open PiSwap in the Pi Browser to connect your wallet.",
        });
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
    if (readStored()) return;
    void signIn();
  }, [autoSignIn, signIn]);

  return { session, status, error, signIn, signOut };
}
