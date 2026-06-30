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

      <div className="relative z-10 px-6 py-8 max-w-2xl mx-auto">
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
      </div>
    </div>
  );
}
