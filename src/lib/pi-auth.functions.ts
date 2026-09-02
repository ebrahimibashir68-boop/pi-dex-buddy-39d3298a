import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PI_API_BASE = "https://api.minepi.com/v2";

type PiMe = {
  uid: string;
  username: string;
  wallet_address?: string;
  credentials?: {
    scopes?: string[];
    valid_until?: { timestamp: number; iso8601?: string };
  };
};

/**
 * Verifies a Pi access token server-side against the Pi Platform API.
 * The client never decides who it is — the `/me` response is authoritative.
 */
export const verifyPiToken = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ accessToken: z.string().min(10).max(4096) }).parse(data),
  )
  .handler(async ({ data }) => {
    const res = await fetch(`${PI_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error("Pi access token is invalid or expired");
    }
    if (!res.ok) {
      throw new Error(`Pi token verification failed (${res.status})`);
    }
    const me = (await res.json()) as PiMe;
    if (!me?.uid || !me?.username) {
      throw new Error("Pi returned an unexpected profile payload");
    }

    const expiresAt = me.credentials?.valid_until?.timestamp
      ? me.credentials.valid_until.timestamp * 1000
      : null;

    return {
      uid: me.uid,
      username: me.username,
      walletAddress: me.wallet_address ?? null,
      scopes: me.credentials?.scopes ?? [],
      expiresAt,
      verifiedAt: Date.now(),
    };
  });
