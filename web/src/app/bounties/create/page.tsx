"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CreateBountyForm } from "@/components/CreateBountyForm";
import { ToastContainer, useToast } from "@/components/Toast";
import { useRecentBounties } from "@/hooks/useRecentBounties";

export default function CreateBountyPage() {
  const router = useRouter();
  const { add } = useRecentBounties();
  const { toasts, addToast, removeToast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreated = useCallback(
    (id: bigint) => {
      add(id);
      addToast(`Bounty #${id.toString()} created!`, "success");
      // Navigate to the new bounty
      setTimeout(() => {
        router.push(`/bounties/${id.toString()}`);
      }, 500);
    },
    [add, addToast, router],
  );

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.012)_1px,transparent_1px)] bg-[size:60px_60px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="relative z-10 px-6 pt-16 pb-8 lg:pt-8 max-w-2xl mx-auto">
        {/* Header */}
        <section className={`mb-6 fi ${mounted ? 'v' : ''}`}>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Create a Bounty
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            Fund a reward. Answers stay hidden until the reveal phase.
          </p>
        </section>

        {/* Form */}
        <section className={`fi ${mounted ? 'v' : ''} d3`}>
          <CreateBountyForm onCreated={handleCreated} />
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
