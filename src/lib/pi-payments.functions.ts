import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PI_API_BASE = "https://api.minepi.com/v2";

function apiKey(): string {
  const key = process.env.PI_API_KEY;
  if (!key) throw new Error("PI_API_KEY is not configured");
  return key;
}

async function piRequest(path: string, init?: RequestInit) {
  const res = await fetch(`${PI_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Key ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pi API ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Server-Side Approval — Phase I of the U2A payment flow.
 * Called from the SDK's `onReadyForServerApproval` callback.
 */
export const approvePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ paymentId: z.string().min(3).max(256) }).parse(data),
  )
  .handler(async ({ data }) => {
    const result = await piRequest(`/payments/${data.paymentId}/approve`, {
      method: "POST",
    });
    return { ok: true, payment: result };
  });

/**
 * Server-Side Completion — Phase III of the U2A payment flow.
 * Called from the SDK's `onReadyForServerCompletion` callback (and used to
 * recover incomplete payments surfaced by `onIncompletePaymentFound`).
 */
export const completePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        paymentId: z.string().min(3).max(256),
        txid: z.string().min(3).max(256),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const result = await piRequest(`/payments/${data.paymentId}/complete`, {
      method: "POST",
      body: JSON.stringify({ txid: data.txid }),
    });
    return { ok: true, payment: result };
  });
