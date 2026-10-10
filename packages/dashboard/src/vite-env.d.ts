/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full RPC endpoint. Overrides VITE_HELIUS_API_KEY when both are set. */
  readonly VITE_SOLANA_RPC_URL?: string;
  /** Helius devnet key; used to build an endpoint when no explicit URL is set. */
  readonly VITE_HELIUS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
