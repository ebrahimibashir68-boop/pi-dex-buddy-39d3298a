// Pi Network SDK client loader + typed helpers.
// Loads the official Pi SDK script and provides a Promise-based init/auth flow.

type PiAuthResult = {
  accessToken: string;
  user: { uid: string; username: string; wallet_address?: string };
};

type PiSDK = {
  init: (opts: { version: string; sandbox?: boolean }) => unknown;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: unknown) => void,
  ) => Promise<PiAuthResult>;
};

declare global {
  interface Window {
    Pi?: PiSDK;
  }
}

const SDK_URL = "https://sdk.minepi.com/pi-sdk.js";
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
    // Pi.init returns void/undefined in some SDK builds; wrap in Promise.resolve
    // to guarantee we fully await it before authenticate().
    initPromise = Promise.resolve(Pi.init({ version: "2.0", sandbox: true })).then(
      () => undefined,
    );
  }
  await initPromise;
  return Pi;
}

export async function authenticatePi(): Promise<PiAuthResult> {
  const Pi = await initPi();
  return Pi.authenticate(["username"], (payment) => {
    // Required callback for incomplete payments; surface for visibility.
    console.warn("[Pi] incomplete payment found", payment);
  });
}
