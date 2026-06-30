"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { ritualChain } from "@/config/wagmi";
import { shortenAddress } from "@/lib/format";
import { Button, Badge } from "@/components/ui";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const wrongChain = isConnected && chainId !== ritualChain.id;

  useEffect(() => {
    if (connectError) {
      setError(connectError.message?.split("\n")[0] || "Connection error");
    }
  }, [connectError]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleConnect = useCallback((connector: NonNullable<typeof connectors>[number]) => {
    setError(null);
    connect({ connector });
    setOpen(false);
  }, [connect]);

  const copyAddress = useCallback(() => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {wrongChain ? (
          <Button
            variant="secondary"
            onClick={() => switchChain({ chainId: ritualChain.id })}
          >
            Switch to {ritualChain.name}
          </Button>
        ) : (
          <Badge tone="accent">{ritualChain.name}</Badge>
        )}
        <div className="relative" ref={dropdownRef}>
          <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-1" />
            {shortenAddress(address)}
          </Button>
          {open && (
            <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0a0a] shadow-xl shadow-black/40">
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <div className="text-[10px] uppercase tracking-wider text-[#444] mb-1">Connected</div>
                <div className="font-mono text-xs text-[#888] break-all">{address}</div>
              </div>
              <button
                onClick={copyAddress}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-[#888] hover:bg-white/[0.04] hover:text-white transition-colors"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                    Copy address
                  </>
                )}
              </button>
              <button
                onClick={() => { disconnect(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/[0.06]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const seen = new Set<string>();
  const list = connectors.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <Button onClick={() => setOpen((v) => !v)} disabled={isPending}>
        {isPending ? "Connecting…" : "Connect Wallet"}
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-lg border border-white/[0.06] bg-[#0a0a0a] shadow-xl shadow-black/40">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#444] border-b border-white/[0.06]">
            Select Wallet
          </div>
          {list.length === 0 && (
            <div className="px-3 py-2 text-xs text-[#555]">
              No wallet connectors found.
            </div>
          )}
          {list.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => handleConnect(connector)}
              disabled={isPending}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs text-[#888] hover:bg-white/[0.04] hover:text-white transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 text-[var(--accent)] opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              {connector.name}
            </button>
          ))}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-red-400 border-t border-white/[0.06] break-all">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
