"use client";

import { useEffect, useState } from "react";
import { StatsDashboard } from "@/components/StatsDashboard";
import { LiveBounties } from "@/components/LiveBounties";
import { BountyGrid } from "@/components/BountyGrid";
import { ToastContainer, useToast } from "@/components/Toast";
import { useRecentBounties } from "@/hooks/useRecentBounties";
import { isContractConfigured } from "@/config/contract";
import { Notice } from "@/components/ui";
import Link from "next/link";

export default function DashboardPage() {
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const { ids, add } = useRecentBounties();
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedId !== null) add(selectedId);
  }, [selectedId, add]);

  return (
    <div className="relative min-h-screen">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.012)_1px,transparent_1px)] bg-[size:60px_60px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] animate-pulse" style={{ background: "rgba(180,158,255,0.06)", animationDuration: "8s" }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] animate-pulse" style={{ background: "rgba(168,85,247,0.04)", animationDuration: "12s" }} />
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="relative z-10 px-6 pt-16 pb-8 lg:pt-8 max-w-5xl mx-auto">
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
          <div className="mt-4 overflow-hidden">
            {/* Desktop: flex wrap */}
            <div className="hidden sm:flex flex-wrap gap-2">
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
            {/* Mobile: marquee */}
            <div className="sm:hidden relative">
              <div className="flex marquee-track w-max">
                {[...Array(2)].map((_, dup) => (
                  <div key={dup} className="flex gap-3 pr-3">
                    {[
                      { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "AI review is advisory" },
                      { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", text: "Judged after deadline" },
                      { icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z", text: "One winner per bounty" },
                    ].map((item, i) => (
                      <span key={`${dup}-${i}`} className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-[11px] text-[#888] whitespace-nowrap">
                        <svg className="w-3 h-3 text-[var(--accent)] opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
                        {item.text}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className={`mb-6 fi ${mounted ? 'v' : ''} d3`}>
          <StatsDashboard />
        </section>

        {/* Live Bounties */}
        <section className={`fi ${mounted ? 'v' : ''} d3`}>
          <LiveBounties />
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

        {/* Quick actions */}
        <section className={`mb-6 fi ${mounted ? 'v' : ''} d4`}>
          <div className="flex gap-3">
            <Link
              href="/bounties/create"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] text-white px-4 py-2 text-xs font-semibold tracking-wide hover:bg-[var(--accent-dark)] transition-colors shadow-[0_4px_16px_rgba(180,158,255,0.25)]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create Bounty
            </Link>
            <Link
              href="/bounties"
              className="inline-flex items-center gap-2 rounded-lg bg-transparent text-white border border-white/[0.06] px-4 py-2 text-xs font-semibold tracking-wide hover:border-[var(--accent)] hover:text-[var(--accent-light)] hover:bg-[var(--accent-glow)] transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              </svg>
              Browse All
            </Link>
          </div>
        </section>

        {/* Recent bounties */}
        <div className={`fi ${mounted ? 'v' : ''} d5`}>
          <BountyGrid selectedId={selectedId} onSelect={setSelectedId} recentIds={ids} />
        </div>

        {/* Empty state */}
        {ids.length === 0 && (
          <section className={`mt-12 flex flex-col items-center justify-center py-12 fi ${mounted ? 'v' : ''} d5`}>
            <svg className="w-12 h-12 mb-4 text-[#333]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <p className="text-sm text-[#555]">No bounties yet. Create one to get started.</p>
            <Link href="/bounties/create" className="mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
              Create your first bounty →
            </Link>
          </section>
        )}
        {/* Mobile footer */}
        <footer className="mt-12 mb-6 flex flex-col items-center gap-2 lg:hidden">
          <div className="w-8 h-px bg-white/[0.06]" />
          <div className="flex items-center gap-2 text-[10px] text-[#444] tracking-wide">
            <span>Built by <span className="text-[var(--accent)] font-medium">Frianowzki</span></span>
            <a href="https://github.com/frianowzki/ritual-chain-workshop" target="_blank" rel="noopener noreferrer" className="text-[#555] hover:text-white transition-colors" title="GitHub">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
