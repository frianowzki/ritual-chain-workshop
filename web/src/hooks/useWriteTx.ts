"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWaitForTransactionReceipt, useWalletClient } from "wagmi";
import { type Abi, type Address, type TransactionReceipt, encodeFunctionData } from "viem";

/**
 * Structural shape of a contract write.
 */
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

/** Turn an unknown thrown value into a short, human-friendly message. */
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
 * Wraps viem walletClient.writeContract + receipt into a clean state machine:
 * idle → wallet → pending → confirmed | failed.
 *
 * Uses viem's walletClient directly (not wagmi's writeContractAsync) to have
 * full control over the transaction type. Ritual Chain RPC only supports legacy
 * (type 0) transactions — EIP-1559 (type 2) is rejected with "transaction type
 * not supported".
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
        // Encode the function call
        const data = encodeFunctionData({
          abi: params.abi as any,
          functionName: params.functionName,
          args: params.args as any,
        });

        // Fetch current gas price for legacy tx
        let gasPrice: bigint;
        try {
          const transport = walletClient.transport;
          const rpcUrl = (transport as any)?.url || (transport as any)?.value?.url;
          const resp = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 1 }),
          });
          const json = await resp.json();
          gasPrice = BigInt(json.result);
        } catch {
          gasPrice = 10_000_000_000n; // 10 gwei fallback
        }

        // Send legacy transaction directly — no wagmi fee estimation override
        const txHash = await walletClient.sendTransaction({
          to: params.address,
          data,
          value: params.value ?? 0n,
          gasPrice,            // ← forces legacy (type 0) tx
          ...(params.gas ? { gas: params.gas } : {}),
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
