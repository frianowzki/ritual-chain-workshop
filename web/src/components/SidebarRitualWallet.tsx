"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { RITUAL_WALLET, ritualWalletAbi } from "@/abi/RitualWallet";
import { LOCK_DURATION } from "@/lib/ritualWallet";
import { ritualChain } from "@/config/wagmi";
import { useWriteTx } from "@/hooks/useWriteTx";
import { useRitualWalletStatus } from "@/hooks/useRitualWalletStatus";

function IconBank() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg className={`w-3.5 h-3.5 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function SpinnerMini() {
  return <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />;
}

/**
 * Compact RitualWallet sidebar widget.
 * Default: collapsed button showing balance status.
 * Expanded: deposit form inline.
 */
export function SidebarRitualWallet({ collapsed }: { collapsed: boolean }) {
  const { address } = useAccount();
  const walletStatus = useRitualWalletStatus(address);
  const tx = useWriteTx(() => walletStatus.refetch());
  const [expanded, setExpanded] = useState(false);
  const [customAmount, setCustomAmount] = useState("0.35");

  if (!address) return null;

  // Loading
  if (walletStatus.isLoading || !walletStatus.hasData) {
    if (collapsed) {
      return (
        <div className="flex justify-center py-2">
          <SpinnerMini />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-[#555]">
        <SpinnerMini /> Loading…
      </div>
    );
  }

  const { ready, balance } = walletStatus;
  const balanceStr = formatEther(balance ?? 0n);
  const balanceNum = parseFloat(balanceStr);

  async function handleDeposit() {
    try {
      const amount = parseEther(customAmount);
      if (amount <= 0n) return;
      await tx.run({
        address: RITUAL_WALLET,
        abi: ritualWalletAbi,
        functionName: "deposit",
        args: [LOCK_DURATION],
        value: amount,
        chainId: ritualChain.id,
      });
      setExpanded(false);
    } catch {
      /* surfaced via tx.state */
    }
  }

  // Collapsed sidebar — just icon
  if (collapsed) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex justify-center w-full p-1.5 rounded-md transition-colors hover:bg-white/[0.04]"
        title={`RitualWallet: ${balanceNum.toFixed(4)} RITUAL${ready ? " (ready)" : " (needs deposit)"}`}
      >
        <span className="text-[#555]">
          <IconBank />
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-1">
      {/* Toggle button — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          expanded
            ? "bg-white/[0.04] text-white"
            : "text-[#888] hover:text-white hover:bg-white/[0.04]"
        }`}
      >
        <span className="text-[#555]">
          <IconBank />
        </span>
        <span className="flex-1 text-left truncate">Ritual Wallet</span>
        <span className="text-[11px] font-mono text-[#666]">{balanceNum.toFixed(3)}</span>
        <IconChevron open={expanded} />
      </button>

      {/* Expanded deposit form */}
      {expanded && (
        <div className="mx-3 space-y-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
          {/* Balance display */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-[#555]">Balance</span>
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${ready ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="text-[13px] font-mono text-[#888]">{balanceNum.toFixed(4)} RITUAL</span>
            </div>
          </div>

          {/* Deposit input */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wide text-[#555]">Deposit Amount</label>
            <input
              type="number"
              min="0"
              step="any"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.35"
              className="w-full rounded-md border border-white/[0.06] bg-white/[0.04] px-2.5 py-2 text-[12px] text-white placeholder-[#444] focus:border-[var(--accent)]/30 focus:outline-none focus:ring-0 transition-colors [color-scheme:dark] font-mono"
            />
          </div>

          {/* Deposit button */}
          <button
            onClick={handleDeposit}
            disabled={tx.isBusy || !customAmount}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[var(--accent-dark)] disabled:opacity-40 transition-colors"
          >
            {tx.isBusy ? (
              <>
                <SpinnerMini /> Depositing…
              </>
            ) : (
              <>
                <IconPlus /> Deposit
              </>
            )}
          </button>

          {/* Status messages */}
          {tx.state === "confirmed" && (
            <p className="text-[10px] text-emerald-400 text-center">✓ Deposited successfully</p>
          )}
          {tx.state === "failed" && (
            <p className="text-[10px] text-red-400 text-center">✗ {String(tx.error).slice(0, 60) || "Failed"}</p>
          )}
        </div>
      )}
    </div>
  );
}
