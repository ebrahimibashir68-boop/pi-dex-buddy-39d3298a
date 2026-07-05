// Pi Network SDK client loader + typed helpers.
// Wraps the official Pi SDK (window.Pi) with Promise-based init, auth,
// payments, and ads helpers, per the Pi App Platform docs.

export type PiAuthResult = {
  accessToken: string;
  user: { uid: string; username: string; wallet_address?: string };
};

export type PiPaymentDTO = {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  from_address: string;
  to_address: string;
  direction: "user_to_app" | "app_to_user";
  created_at: string;
  network: "Pi Network" | "Pi Testnet";
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: null | { txid: string; verified: boolean; _link: string };
};

export type PiPaymentData = {
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
};

export type PiPaymentCallbacks = {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: PiPaymentDTO) => void;
};

export type ShowAdResponse =
  | {
      type: "interstitial";
      result: "AD_CLOSED" | "AD_DISPLAY_ERROR" | "AD_NETWORK_ERROR" | "AD_NOT_AVAILABLE";
    }
  | {
      type: "rewarded";
      result:
        | "AD_REWARDED"
        | "AD_CLOSED"
        | "AD_DISPLAY_ERROR"
        | "AD_NETWORK_ERROR"
        | "AD_NOT_AVAILABLE"
        | "ADS_NOT_SUPPORTED"
        | "USER_UNAUTHENTICATED";
      adId?: string;
    };

type PiSDK = {
  init: (opts: { version: string; sandbox?: boolean }) => unknown;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: PiPaymentDTO) => void,
  ) => Promise<PiAuthResult>;
  createPayment: (data: PiPaymentData, callbacks: PiPaymentCallbacks) => void;
  openShareDialog?: (title: string, message: string) => void;
  openUrlInSystemBrowser?: (url: string) => Promise<void>;
  nativeFeaturesList?: () => Promise<string[]>;
  Ads?: {
    showAd: (adType: "interstitial" | "rewarded") => Promise<ShowAdResponse>;
    isAdReady: (
      adType: "interstitial" | "rewarded",
    ) => Promise<{ type: "interstitial" | "rewarded"; ready: boolean }>;
    requestAd: (
      adType: "interstitial" | "rewarded",
    ) => Promise<{
      type: "interstitial" | "rewarded";
      result: "AD_LOADED" | "AD_FAILED_TO_LOAD" | "AD_NOT_AVAILABLE";
    }>;
  };
};

declare global {
  interface Window {
    Pi?: PiSDK;
  }
}

const SDK_URL = "https://sdk.minepi.com/pi-sdk.js";
// Sandbox in dev, mainnet in prod. Override with VITE_PI_SANDBOX=1 if needed.
const SANDBOX =
  (import.meta.env.VITE_PI_SANDBOX ?? (import.meta.env.DEV ? "1" : "0")) === "1";

let sdkPromise: Promise<PiSDK> | null = null;
let initPromise: Promise<void> | null = null;

function loadScript(): Promise<PiSDK> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Pi SDK requires a browser"));
  }
  if (window.Pi) return Promise.resolve(window.Pi);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<PiSDK>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_URL}"]`,
    );
    const handle = () => {
      if (window.Pi) resolve(window.Pi);
      else reject(new Error("Pi SDK loaded but window.Pi is undefined"));
    };
    if (existing) {
      existing.addEventListener("load", handle, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Pi SDK")),
        { once: true },
      );
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = handle;
    s.onerror = () => reject(new Error("Failed to load Pi SDK"));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export async function initPi(): Promise<PiSDK> {
  const Pi = await loadScript();
  if (!initPromise) {
    initPromise = Promise.resolve(
      Pi.init({ version: "2.0", sandbox: SANDBOX }),
    ).then(() => undefined);
  }
  await initPromise;
  return Pi;
}

async function defaultOnIncompletePayment(payment: PiPaymentDTO) {
  // Best-effort recovery: hand the incomplete payment to the server so it
  // can be completed on-chain per the Pi payment flow docs.
  console.warn("[Pi] incomplete payment found", payment);
  try {
    const { completePiPayment } = await import("./pi-payments.functions");
    if (payment.transaction?.txid) {
      await completePiPayment({
        data: { paymentId: payment.identifier, txid: payment.transaction.txid },
      });
    }
  } catch (err) {
    console.error("[Pi] failed to complete incomplete payment", err);
  }
}

export async function authenticatePi(
  scopes: string[] = ["username", "payments", "wallet_address"],
): Promise<PiAuthResult> {
  const Pi = await initPi();
  return Pi.authenticate(scopes, defaultOnIncompletePayment);
}

export async function createPiPayment(
  data: PiPaymentData,
  callbacks: PiPaymentCallbacks,
): Promise<void> {
  const Pi = await initPi();
  Pi.createPayment(data, callbacks);
}

export async function showPiAd(
  adType: "interstitial" | "rewarded",
): Promise<ShowAdResponse> {
  const Pi = await initPi();
  if (!Pi.Ads) {
    return adType === "rewarded"
      ? { type: "rewarded", result: "ADS_NOT_SUPPORTED" }
      : { type: "interstitial", result: "AD_NOT_AVAILABLE" };
  }
  return Pi.Ads.showAd(adType);
}

export async function openPiShareDialog(title: string, message: string) {
  const Pi = await initPi();
  Pi.openShareDialog?.(title, message);
}
