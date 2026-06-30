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

      <div className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
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
      </div>
    </div>
  );
}
