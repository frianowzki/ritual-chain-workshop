"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWaitForTransactionReceipt, useWalletClient } from "wagmi";
import {
  type Abi,
  type Address,
  type TransactionReceipt,
  type WalletClient,
  encodeFunctionData,
  publicActions,
} from "viem";

type WriteParams = {
  address: Address;
  abi: Abi | readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  chainId?: number;
  gas?: bigint;
};

export type TxState =
  | "idle"
  | "wallet"
  | "pending"
  | "confirmed"
  | "failed";

export type WriteTx = ReturnType<typeof useWriteTx>;

function describeError(err: unknown): string {
  if (!err) return "Transaction failed.";
  const anyErr = err as { shortMessage?: string; message?: string };
  const msg = anyErr.shortMessage || anyErr.message || String(err);
  if (/user rejected|denied|rejected the request/i.test(msg)) {
    return "Request rejected in wallet.";
  }
  return msg.split("\n")[0];
}

/**
 * Ritual Chain returns baseFeePerGas in block headers, which causes wallets
 * (MetaMask, Rabby) to auto-apply EIP-1559 (type 2) — but the RPC rejects
 * type 2 with "transaction type not supported".
 *
 * Fix: intercept the wallet client's `request` method and rewrite every
 * `eth_sendTransaction` call to strip EIP-1559 fields and force legacy
 * (type 0x0) + gasPrice. This happens AFTER viem/wagmi format the tx and
 * BEFORE it reaches the wallet provider (Rabby/MetaMask).
 */
export function useWriteTx(onConfirmed?: (receipt: TransactionReceipt) => void) {
  const { data: walletClient } = useWalletClient();

  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (isConfirmed && receipt && !notifiedRef.current) {
      notifiedRef.current = true;
      onConfirmed?.(receipt);
    }
  }, [isConfirmed, receipt, onConfirmed]);

  const error =
    submitError ?? (isReceiptError && receiptError ? describeError(receiptError) : null);

  const state: TxState = error
    ? "failed"
    : isConfirmed
      ? "confirmed"
      : isConfirming
        ? "pending"
        : submitting
          ? "wallet"
          : "idle";

  const run = useCallback(
    async (params: WriteParams) => {
      if (!walletClient) {
        setSubmitError("Wallet not connected.");
        throw new Error("Wallet not connected");
      }

      setSubmitError(null);
      notifiedRef.current = false;
      setSubmitting(true);

      try {
        const data = encodeFunctionData({
          abi: params.abi as any,
          functionName: params.functionName,
          args: params.args as any,
        });

        // Fetch gasPrice from RPC
        let gasPrice: `0x${string}`;
        try {
          const rpcUrl = walletClient.chain?.rpcUrls.default.http[0];
          const resp = await fetch(rpcUrl!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_gasPrice",
              params: [],
              id: 1,
            }),
          });
          const json = await resp.json();
          gasPrice = json.result;
        } catch {
          gasPrice = "0x2540be400"; // 10 gwei
        }

        // Estimate gas via RPC
        let gasEstimate: `0x${string}`;
        try {
          const rpcUrl = walletClient.chain?.rpcUrls.default.http[0];
          const resp = await fetch(rpcUrl!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_estimateGas",
              params: [
                {
                  from: walletClient.account?.address,
                  to: params.address,
                  data,
                  value: params.value ? `0x${params.value.toString(16)}` : "0x0",
                },
              ],
              id: 2,
            }),
          });
          const json = await resp.json();
          gasEstimate = json.result;
        } catch {
          gasEstimate = "0x493e0"; // 300k gas fallback
        }

        // Get nonce
        let nonce: `0x${string}`;
        try {
          const rpcUrl = walletClient.chain?.rpcUrls.default.http[0];
          const resp = await fetch(rpcUrl!, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_getTransactionCount",
              params: [walletClient.account?.address, "pending"],
              id: 3,
            }),
          });
          const json = await resp.json();
          nonce = json.result;
        } catch {
          nonce = "0x0";
        }

        // Build raw legacy tx params — type 0x0, gasPrice, no EIP-1559 fields
        const legacyTx = {
          from: walletClient.account?.address,
          to: params.address,
          data,
          value: params.value ? `0x${params.value.toString(16)}` : "0x0",
          gasPrice,
          gas: gasEstimate,
          nonce,
          type: "0x0" as const,
          chainId: `0x${(walletClient.chain?.id ?? 1979).toString(16)}`,
        };

        // Intercept the wallet client's request to ensure legacy params
        const originalRequest = walletClient.request.bind(walletClient);
        const interceptedRequest = async (args: any): Promise<any> => {
          if (
            args.method === "eth_sendTransaction" ||
            args.method === "wallet_sendTransaction"
          ) {
            // Force legacy: override whatever viem/wagmi formatted
            return originalRequest({
              ...args,
              params: [legacyTx],
            });
          }
          return originalRequest(args);
        };

        // Create a patched wallet client with our intercepted request
        const patchedClient = Object.create(walletClient);
        patchedClient.request = interceptedRequest;

        // Send via the patched client
        const txHash = await patchedClient.sendTransaction({
          to: params.address,
          data,
          value: params.value ?? 0n,
          gasPrice: BigInt(gasPrice),
          gas: BigInt(gasEstimate),
          nonce: BigInt(nonce),
          type: "legacy" as any,
        });

        setHash(txHash);
        return txHash;
      } catch (e) {
        setSubmitError(describeError(e));
        throw e;
      } finally {
        setSubmitting(false);
      }
    },
    [walletClient],
  );

  const reset = useCallback(() => {
    setHash(undefined);
    setSubmitError(null);
    notifiedRef.current = false;
    setSubmitting(false);
  }, []);

  return {
    run,
    reset,
    state,
    hash,
    receipt,
    error,
    isBusy: state === "wallet" || state === "pending",
    isConfirmed,
  };
}
