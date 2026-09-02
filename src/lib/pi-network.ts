// Shared, client-safe Pi Network environment config.
// Sandbox/Testnet in development, Mainnet in production.
// Override explicitly with VITE_PI_SANDBOX=1 / =0.

export const PI_SANDBOX =
  (import.meta.env.VITE_PI_SANDBOX ?? (import.meta.env.DEV ? "1" : "0")) === "1";

/** Stellar network passphrase used by the Pi blockchain. */
export const PI_NETWORK_PASSPHRASE = PI_SANDBOX ? "Pi Testnet" : "Pi Network";

export const PI_NETWORK_LABEL = PI_SANDBOX ? "Testnet" : "Mainnet";

/** Public Horizon API for the active network. */
export const PI_HORIZON_URL = PI_SANDBOX
  ? "https://api.testnet.minepi.com"
  : "https://api.mainnet.minepi.com";

/** Blockexplorer base for the active network. */
export const PI_EXPLORER_URL = PI_SANDBOX
  ? "https://blockexplorer.minepi.com/testnet"
  : "https://blockexplorer.minepi.com/mainnet";

export function piTxUrl(txid: string) {
  return `${PI_EXPLORER_URL}/transactions/${txid}`;
}

export function piAccountUrl(address: string) {
  return `${PI_EXPLORER_URL}/accounts/${address}`;
}

export function shortenAddress(address: string, lead = 6, tail = 4) {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Pi Platform API scopes this app requests. */
export const PI_SCOPES = [
  "username",
  "payments",
  "wallet_address",
] as const;
export type PiScope = (typeof PI_SCOPES)[number];
