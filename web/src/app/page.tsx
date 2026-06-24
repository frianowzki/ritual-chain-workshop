"use client";

import { useCallback, useEffect, useState } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { CRCreateBountyForm } from "@/components/CRCreateBountyForm";
import { LoadBountyPanel } from "@/components/LoadBountyPanel";
import { CRBountyView } from "@/components/CRBountyView";
import { useRecentBounties } from "@/hooks/useRecentBounties";
import { isCRContractConfigured, crContractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { shortenAddress } from "@/lib/format";
import { Notice } from "@/components/ui";

export default function Home() {
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const { ids, add } = useRecentBounties();

  useEffect(() => {
    if (selectedId !== null) add(selectedId);
  }, [selectedId, add]);

  const handleCreated = useCallback(
    (id: bigint) => {
      add(id);
      setSelectedId(id);
    },
    [add],
  );

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-400 text-sm font-bold text-zinc-950">
              AI
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">AI Bounty Judge</h1>
              <p className="text-[11px] leading-tight text-zinc-500">on {ritualChain.name}</p>
            </div>
          </div>
          <WalletConnect />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <section className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Crowd-judged bounties, settled by AI.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Submit answers to a bounty. After the deadline, Ritual AI ranks all submissions. The
            bounty owner finalizes the winner.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-400">
            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-inset ring-white/10">
              AI review is advisory. The owner finalizes the winner.
            </span>
            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-inset ring-white/10">
              All submissions are judged together after the deadline.
            </span>
            <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-inset ring-white/10">
              Only one winner receives the bounty reward.
            </span>
          </div>
        </section>

        {!isCRContractConfigured && (
          <div className="mb-6">
            <Notice tone="amber">
              Set <code className="font-mono">NEXT_PUBLIC_CR_CONTRACT_ADDRESS</code> in{" "}
              <code className="font-mono">.env.local</code> to start.
            </Notice>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CRCreateBountyForm onCreated={handleCreated} />
          <LoadBountyPanel selectedId={selectedId} onSelect={setSelectedId} recentIds={ids} />
        </section>

        {selectedId !== null && (
          <section className="mt-6">
            <CRBountyView bountyId={selectedId} />
          </section>
        )}

        <footer className="mt-10 border-t border-white/10 pt-4 text-xs text-zinc-600">
          {crContractAddress ? (
            <>
              Contract <span className="font-mono">{shortenAddress(crContractAddress, 6)}</span> ·
              Chain {ritualChain.id}
            </>
          ) : (
            <>Workshop demo · {ritualChain.name}</>
          )}
        </footer>
      </main>
    </div>
  );
}
