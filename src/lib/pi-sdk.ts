// Pi Network SDK client loader + typed helpers.
// Wraps the official Pi SDK (window.Pi) with Promise-based init, auth,
// payments, ads and native-feature helpers, per the Pi App Platform docs.

import { PI_SANDBOX, PI_SCOPES } from "./pi-network";

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

export type AdType = "interstitial" | "rewarded";

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
    scopes: readonly string[],
    onIncompletePaymentFound: (payment: PiPaymentDTO) => void,
  ) => Promise<PiAuthResult>;
  createPayment: (data: PiPaymentData, callbacks: PiPaymentCallbacks) => void;
  openShareDialog?: (title: string, message: string) => void;
  openUrlInSystemBrowser?: (url: string) => Promise<void>;
  nativeFeaturesList?: () => Promise<string[]>;
  Ads?: {
    showAd: (adType: AdType) => Promise<ShowAdResponse>;
    isAdReady: (adType: AdType) => Promise<{ type: AdType; ready: boolean }>;
    requestAd: (
      adType: AdType,
    ) => Promise<{
      type: AdType;
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

let sdkPromise: Promise<PiSDK> | null = null;
let initPromise: Promise<void> | null = null;

/** True when running inside the Pi Browser (the SDK only works there). */
export function isPiBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /PiBrowser/i.test(navigator.userAgent);
}

function loadScript(): Promise<PiSDK> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Pi SDK requires a browser"));
  }
  if (window.Pi) return Promise.resolve(window.Pi);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<PiSDK>((resolve, reject) => {
    const fail = () => {
      sdkPromise = null;
      reject(
        new Error(
          "Failed to load the Pi SDK. Open this app inside the Pi Browser.",
        ),
      );
    };
    const handle = () => {
      if (window.Pi) resolve(window.Pi);
      else fail();
    };
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", handle, { once: true });
      existing.addEventListener("error", fail, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = handle;
    s.onerror = fail;
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export async function initPi(): Promise<PiSDK> {
  const Pi = await loadScript();
  if (!initPromise) {
    initPromise = Promise.resolve(
      Pi.init({ version: "2.0", sandbox: PI_SANDBOX }),
    ).then(() => undefined);
  }
  await initPromise;
  return Pi;
}

/**
 * Recover a payment left dangling by a previous session:
 * complete it when the blockchain tx exists, otherwise cancel it so the
 * user is not blocked from starting a new payment.
 */
async function defaultOnIncompletePayment(payment: PiPaymentDTO) {
  console.warn("[Pi] incomplete payment found", payment.identifier);
  try {
    const { completePiPayment, cancelPiPayment } = await import(
      "./pi-payments.functions"
    );
    const txid = payment.transaction?.txid;
    if (txid) {
      await completePiPayment({ data: { paymentId: payment.identifier, txid } });
    } else {
      await cancelPiPayment({ data: { paymentId: payment.identifier } });
    }
  } catch (err) {
    console.error("[Pi] failed to resolve incomplete payment", err);
  }
}

export async function authenticatePi(
  scopes: readonly string[] = PI_SCOPES,
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

export async function isPiAdReady(adType: AdType): Promise<boolean> {
  const Pi = await initPi();
  if (!Pi.Ads) return false;
  return (await Pi.Ads.isAdReady(adType)).ready;
}

export async function showPiAd(adType: AdType): Promise<ShowAdResponse> {
  const Pi = await initPi();
  if (!Pi.Ads) {
    return adType === "rewarded"
      ? { type: "rewarded", result: "ADS_NOT_SUPPORTED" }
      : { type: "interstitial", result: "AD_NOT_AVAILABLE" };
  }
  // Per the Ads docs, request the ad first when it isn't cached yet.
  const { ready } = await Pi.Ads.isAdReady(adType);
  if (!ready) {
    const requested = await Pi.Ads.requestAd(adType);
    if (requested.result !== "AD_LOADED") {
      return adType === "rewarded"
        ? { type: "rewarded", result: "AD_NOT_AVAILABLE" }
        : { type: "interstitial", result: "AD_NOT_AVAILABLE" };
    }
  }
  return Pi.Ads.showAd(adType);
}

export async function openPiShareDialog(title: string, message: string) {
  const Pi = await initPi();
  Pi.openShareDialog?.(title, message);
}

export async function openPiUrl(url: string) {
  const Pi = await initPi();
  if (Pi.openUrlInSystemBrowser) await Pi.openUrlInSystemBrowser(url);
  else if (typeof window !== "undefined") window.open(url, "_blank", "noopener");
}

export async function piNativeFeatures(): Promise<string[]> {
  const Pi = await initPi();
  return (await Pi.nativeFeaturesList?.()) ?? [];
}
