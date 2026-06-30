"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BountyView } from "@/components/BountyView";
import { ToastContainer, useToast } from "@/components/Toast";

export default function BountyDetailPage() {
  const params = useParams();
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [bountyId, setBountyId] = useState<bigint | null>(null);
  const [parseError, setParseError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (params.id) {
      try {
        const id = BigInt(params.id as string);
        if (id < 0n) {
          setParseError(true);
        } else {
          setBountyId(id);
          setParseError(false);
        }
      } catch {
        setParseError(true);
      }
    }
  }, [params.id]);

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.012)_1px,transparent_1px)] bg-[size:60px_60px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="relative z-10 px-6 pt-16 pb-8 lg:pt-8 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <section className={`mb-6 fi ${mounted ? 'v' : ''}`}>
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Link href="/bounties" className="hover:text-[var(--accent)] transition-colors">
              Bounties
            </Link>
            <span>/</span>
            <span className="text-[#888]">#{params.id}</span>
          </div>
        </section>

        {/* Content */}
        <section className={`fi ${mounted ? 'v' : ''} d3`}>
          {parseError ? (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-inset ring-red-500/30">
              Invalid bounty ID: {params.id}
            </div>
          ) : bountyId !== null ? (
            <BountyView bountyId={bountyId} />
          ) : (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading…
            </div>
          )}
        </section>
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
