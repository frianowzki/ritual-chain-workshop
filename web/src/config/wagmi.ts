import { createConfig, http } from "wagmi";
import { defineChain, custom } from "viem";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { ritualChainId, ritualRpcUrl } from "@/config/contract";

/**
 * Custom Ritual Chain definition.
 *
 * Ritual Chain returns `baseFeePerGas` in block headers, which makes
 * MetaMask think EIP-1559 (type 2) is supported — but the RPC actually
 * rejects type 2 tx with "transaction type not supported".
 */
export const ritualChain = defineChain({
  id: ritualChainId,
  name: "Ritual Chain",
  nativeCurrency: { name: "Ritual", symbol: "RITUAL", decimals: 18 },
  rpcUrls: {
    default: { http: [ritualRpcUrl] },
  },
  blockExplorers: {
    default: { name: "RitualScan", url: "https://explorer.ritualfoundation.org" },
  },
});

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();

const connectors = [
  injected({ shimDisconnect: true }),
  ...(walletConnectProjectId ? [walletConnect({ projectId: walletConnectProjectId })] : []),
];

/**
 * Custom transport that wraps window.ethereum and intercepts transaction
 * requests to strip EIP-1559 fields, forcing legacy (type 0) transactions.
 *
 * Ritual Chain has baseFeePerGas in blocks but rejects type 2 tx.
 * MetaMask sees baseFeePerGas and auto-applies EIP-1559 — we intercept
 * and force legacy before it reaches MetaMask.
 */
function injectedTransport() {
  if (typeof window === "undefined") return http(ritualRpcUrl);

  return custom({
    async request({ method, params }: { method: string; params: any }) {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("No injected provider found");

      // Intercept transaction sends — force legacy format
      if (
        method === "eth_sendTransaction" ||
        method === "wallet_sendTransaction"
      ) {
        const tx = { ...(params?.[0] ?? {}) };

        // Strip EIP-1559 fields that MetaMask may add
        delete tx.maxFeePerGas;
        delete tx.maxPriorityFeePerGas;
        delete tx.maxFeePerBlobGas;

        // Explicitly set legacy type
        tx.type = "0x0";

        // Ensure gasPrice exists — fetch from RPC if missing
        if (!tx.gasPrice) {
          try {
            const gasResp = await fetch(ritualRpcUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_gasPrice",
                params: [],
                id: 1,
              }),
            });
            const gasJson = await gasResp.json();
            tx.gasPrice = gasJson.result;
          } catch {
            // 10 gwei fallback
            tx.gasPrice = "0x2540be400";
          }
        }

        // Send through MetaMask with cleaned legacy params
        return eth.request({ method, params: [tx] });
      }

      // All other calls: pass through to MetaMask directly
      return eth.request({ method, params });
    },
  });
}

export const config = createConfig({
  chains: [ritualChain],
  connectors,
  ssr: true,
  transports: {
    [ritualChain.id]: injectedTransport(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
