import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { authenticatePi } from "@/lib/pi-sdk";
import { verifyPiToken } from "@/lib/pi-auth.functions";

export type PiSession = {
  uid: string;
  username: string;
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
        const auth = await authenticatePi();
        const verified = await verifyPiToken({
          data: { accessToken: auth.accessToken },
        });
        const s: PiSession = { uid: verified.uid, username: verified.username };
        setSession(s);
        setStatus("authenticated");
        toast.success("Signed in with Pi", { description: `@${s.username}` });
        return s;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Pi sign-in failed";
        setError(msg);
        setStatus("error");
        toast.error("Pi sign-in failed", { description: msg });
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
