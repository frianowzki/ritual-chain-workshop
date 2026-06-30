"use client";

import { useCallback, useEffect, useState } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { CreateBountyForm } from "@/components/CreateBountyForm";
import { LoadBountyPanel } from "@/components/LoadBountyPanel";
import { BountyGrid } from "@/components/BountyGrid";
import { StatsDashboard } from "@/components/StatsDashboard";
import { ToastContainer, useToast } from "@/components/Toast";
import { useRecentBounties } from "@/hooks/useRecentBounties";
import { isContractConfigured, contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { Notice } from "@/components/ui";

export default function Home() {
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const { ids, add } = useRecentBounties();
  const { toasts, addToast, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedId !== null) add(selectedId);
  }, [selectedId, add]);

  const handleCreated = useCallback(
    (id: bigint) => {
      add(id);
      setSelectedId(id);
      addToast(`Bounty #${id.toString()} created!`, "success");
    },
    [add, addToast],
  );

  const explorerBase = ritualChain.blockExplorers?.default.url;

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.012)_1px,transparent_1px)] bg-[size:60px_60px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse" style={{ background: "rgba(180,158,255,0.06)", animationDuration: "8s" }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] animate-pulse" style={{ background: "rgba(168,85,247,0.04)", animationDuration: "12s" }} />
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Top nav — fixed */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-black/60 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="font-display text-lg font-bold tracking-tight">
                <span className="bg-gradient-to-r from-[var(--accent-light)] to-[var(--accent)] bg-clip-text text-transparent">AI</span>
                <span className="text-white/60 ml-1 text-sm font-medium">Bounty Judge</span>
              </div>
            </div>
            <WalletConnect />
          </div>
        </div>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />
      </header>

      <div className="h-[53px]" />

      <main className="relative z-10 flex-1 mx-auto max-w-5xl w-full px-6 py-8">
        {/* Hero */}
        <section className={`mb-8 fi ${mounted ? 'v' : ''}`}>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl leading-tight">
            <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Crowd-judged bounties,</span>
            <br />
            <span className="bg-gradient-to-r from-[var(--accent-light)] via-purple-400 to-[var(--accent)] bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent">settled by AI.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[#888] leading-relaxed">
            Submit answers to a bounty. After the deadline, Ritual AI ranks all submissions.
            The bounty owner finalizes the winner.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "AI review is advisory" },
              { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", text: "Judged after deadline" },
              { icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z", text: "One winner per bounty" },
            ].map((item, i) => (
              <span key={i} className={`fi ${mounted ? 'v' : ''} d${i + 1} inline-flex items-center gap-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-[11px] text-[#888]`}>
                <svg className="w-3 h-3 text-[var(--accent)] opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                {item.text}
              </span>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className={`mb-6 fi ${mounted ? 'v' : ''} d3`}>
          <StatsDashboard />
        </section>

        {!isContractConfigured && (
          <div className={`mb-6 fi ${mounted ? 'v' : ''} d3`}>
            <Notice tone="amber">
              No contract address configured. Copy <code className="font-mono">.env.example</code>{" "}
              to <code className="font-mono">.env.local</code> and set{" "}
              <code className="font-mono">NEXT_PUBLIC_CONTRACT_ADDRESS</code>.
            </Notice>
          </div>
        )}

        {/* Dashboard */}
        <section className={`grid grid-cols-1 gap-4 lg:grid-cols-2 fi ${mounted ? 'v' : ''} d4`}>
          <CreateBountyForm onCreated={handleCreated} />
          <LoadBountyPanel selectedId={selectedId} onSelect={setSelectedId} recentIds={ids} />
        </section>

        {/* Bounty cards grid + inline detail */}
        <div className={`fi ${mounted ? 'v' : ''} d5`}>
          <BountyGrid selectedId={selectedId} onSelect={setSelectedId} recentIds={ids} />
        </div>

        {/* Empty state */}
        {selectedId === null && ids.length === 0 && (
          <section className={`mt-12 flex flex-col items-center justify-center py-12 fi ${mounted ? 'v' : ''} d5`}>
            <svg className="w-12 h-12 mb-4 text-[#333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <p className="text-sm text-[#555]">No bounty selected. Create one or load by ID above.</p>
          </section>
        )}
      </main>

      {/* Footer — fixed */}
      <footer className="fixed bottom-0 left-0 right-0 z-50">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-transparent" />
        <div className="bg-black/80 backdrop-blur py-2.5 px-6">
          <div className="mx-auto max-w-5xl flex items-center justify-between text-xs text-[#444]">
            {contractAddress && explorerBase ? (
              <a
                href={`${explorerBase}/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[#555] hover:text-[var(--accent)] transition-colors"
              >
                SC: {contractAddress}
              </a>
            ) : (
              <span className="font-display text-[#444]">Workshop demo</span>
            )}
            <span className="font-display text-[#555]">Built by <span className="text-[var(--accent)]">Frianowzki</span></span>
          </div>
        </div>
      </footer>

      <div className="h-[42px]" />
    </div>
  );
}
