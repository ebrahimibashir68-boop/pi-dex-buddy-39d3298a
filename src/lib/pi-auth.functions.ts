import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const verifyPiToken = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ accessToken: z.string().min(10).max(4096) }).parse(data),
  )
  .handler(async ({ data }) => {
    const res = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Pi token verification failed (${res.status})`);
    }
    const me = (await res.json()) as {
      uid: string;
      username: string;
      wallet_address?: string;
    };
    return {
      uid: me.uid,
      username: me.username,
      walletAddress: me.wallet_address ?? null,
      verifiedAt: Date.now(),
    };
  });
