import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PI_API_BASE = "https://api.minepi.com/v2";

function apiKey(): string {
  const key = process.env["PI_API_KEY"];
  if (!key) throw new Error("PI_API_KEY is not configured");
  return key;
}

/** Server-side view of the active Pi network (Testnet in dev, Mainnet in prod). */
function piNet() {
  const sandbox =
    (process.env["PI_SANDBOX"] ??
      (process.env["NODE_ENV"] === "production" ? "0" : "1")) === "1";
  return {
    sandbox,
    passphrase: sandbox ? "Pi Testnet" : "Pi Network",
    horizon: sandbox
      ? "https://api.testnet.minepi.com"
      : "https://api.mainnet.minepi.com",
  };
}

async function piRequest<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
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
    throw new Error(
      `Pi API ${path} failed (${res.status}): ${body.slice(0, 300)}`,
    );
  }
  return (await res.json()) as T;
}

const paymentId = z.string().min(3).max(256);

/** Serializable shape of a Pi Platform payment record. */
export type PiPaymentApi = {
  identifier: string;
  amount: number;
  memo: string;
  direction: string;
  network: string;
  status: Record<string, boolean>;
  transaction: { txid: string; verified: boolean } | null;
};

/* ------------------------------------------------------------------ *
 * U2A (user pays the app)
 * ------------------------------------------------------------------ */

/** Phase I — server-side approval, from `onReadyForServerApproval`. */
export const approvePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ paymentId }).parse(data))
  .handler(async ({ data }) => {
    const payment = await piRequest<PiPaymentApi>(`/payments/${data.paymentId}/approve`, {
      method: "POST",
    });
    return { ok: true as const, payment };
  });

/** Phase III — server-side completion, from `onReadyForServerCompletion`. */
export const completePiPayment = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ paymentId, txid: z.string().min(3).max(256) }).parse(data),
  )
  .handler(async ({ data }) => {
    const payment = await piRequest<PiPaymentApi>(`/payments/${data.paymentId}/complete`, {
      method: "POST",
      body: JSON.stringify({ txid: data.txid }),
    });
    return { ok: true as const, payment };
  });

/** Cancel a payment that can no longer be completed (e.g. no on-chain tx). */
export const cancelPiPayment = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ paymentId }).parse(data))
  .handler(async ({ data }) => {
    const payment = await piRequest<PiPaymentApi>(`/payments/${data.paymentId}/cancel`, {
      method: "POST",
    });
    return { ok: true as const, payment };
  });

/** Read the authoritative status of a payment from the Pi Platform API. */
export const getPiPayment = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ paymentId }).parse(data))
  .handler(async ({ data }) => {
    const payment = await piRequest<PiPaymentApi>(`/payments/${data.paymentId}`);
    return {
      identifier: payment.identifier,
      amount: payment.amount,
      status: payment.status,
      txid: payment.transaction?.txid ?? null,
      verified: payment.transaction?.verified ?? false,
    };
  });

/* ------------------------------------------------------------------ *
 * A2U (app pays the user)
 * ------------------------------------------------------------------ */

type A2UCreated = {
  identifier: string;
  recipient: string;
  amount: number;
  memo: string;
};

/**
 * Full A2U payout: create the payment record, sign and submit the Pi
 * blockchain transaction with the app wallet, then complete the payment.
 * Requires the app wallet passphrase secret `PI_WALLET_PRIVATE_SEED`.
 */
export const payoutPiToUser = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        uid: z.string().min(3).max(128),
        amount: z.number().positive().max(1_000_000),
        memo: z.string().min(1).max(28),
        metadata: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const seed = process.env["PI_WALLET_PRIVATE_SEED"];
    if (!seed) throw new Error("PI_WALLET_PRIVATE_SEED is not configured");
    const net = piNet();

    // 1. Create the payment on the Pi Platform API.
    const created = await piRequest<A2UCreated>("/payments", {
      method: "POST",
      body: JSON.stringify({
        payment: {
          amount: Number(data.amount.toFixed(7)),
          memo: data.memo,
          metadata: data.metadata,
          uid: data.uid,
        },
      }),
    });

    // 2. Build, sign and submit the blockchain transaction.
    const {
      Horizon,
      Keypair,
      TransactionBuilder,
      Operation,
      Asset,
      Memo,
      BASE_FEE,
    } = await import("@stellar/stellar-sdk");

    const server = new Horizon.Server(net.horizon);
    const keypair = Keypair.fromSecret(seed);
    const account = await server.loadAccount(keypair.publicKey());
    const fee = await server.fetchBaseFee().catch(() => Number(BASE_FEE));

    const tx = new TransactionBuilder(account, {
      fee: String(fee),
      networkPassphrase: net.passphrase,
      timebounds: await server.fetchTimebounds(180),
    })
      .addOperation(
        Operation.payment({
          destination: created.recipient,
          asset: Asset.native(),
          amount: created.amount.toFixed(7),
        }),
      )
      // The payment identifier MUST be the transaction memo.
      .addMemo(Memo.text(created.identifier))
      .build();

    tx.sign(keypair);
    const submitted = await server.submitTransaction(tx);
    const txid = submitted.hash;

    // 3. Complete the payment so the Pi servers verify it.
    const payment = await piRequest<PiPaymentApi>(`/payments/${created.identifier}/complete`, {
      method: "POST",
      body: JSON.stringify({ txid }),
    });

    return {
      ok: true as const,
      paymentId: created.identifier,
      txid,
      network: net.passphrase,
      payment,
    };
  });

/**
 * List A2U payments that were created but never completed, so they can be
 * retried or cancelled (per the Pi payments docs recovery guidance).
 */
export const listIncompleteServerPayments = createServerFn({
  method: "POST",
}).handler(async () => {
  const result = await piRequest<{ incomplete_server_payments: PiPaymentApi[] }>(
    "/payments/incomplete_server_payments",
  );
  return { payments: result.incomplete_server_payments ?? [] };
});
