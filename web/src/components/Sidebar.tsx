"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useDisconnect, useConnect } from "wagmi";
import { contractAddress } from "@/config/contract";
import { ritualChain } from "@/config/wagmi";
import { useState, useEffect } from "react";
import { SidebarRitualWallet } from "@/components/SidebarRitualWallet";

/* ─── Icons (monochrome SVG) ──────────────────────────── */

function IconDashboard() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconBounties() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function IconCreate() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconSubmissions() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-2.52.952m0 0a6.004 6.004 0 01-2.52-.952" />
    </svg>
  );
}

function IconExplorer() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function IconContract() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/* ─── Types ───────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  requireWallet?: boolean;
  copyText?: string;
}

/* ─── Config ──────────────────────────────────────────── */

const explorerBase = ritualChain.blockExplorers?.default.url ?? "";

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <IconDashboard /> },
    ],
  },
  {
    title: "BOUNTIES",
    items: [
      { label: "All Bounties", href: "/bounties", icon: <IconBounties /> },
      { label: "Create Bounty", href: "/bounties/create", icon: <IconCreate /> },
      { label: "My Bounties", href: "/bounties/mine", icon: <IconBounties />, requireWallet: true },
    ],
  },
  {
    title: "ACTIVITY",
    items: [
      { label: "My Submissions", href: "/activity/submissions", icon: <IconSubmissions />, requireWallet: true },
      { label: "My Wins", href: "/activity/wins", icon: <IconTrophy />, requireWallet: true },
    ],
  },
  {
    title: "NETWORK",
    items: [
      { label: "Explorer", href: `${explorerBase}/address/${contractAddress}`, icon: <IconExplorer /> },
    ],
  },
];

/* ─── Components ──────────────────────────────────────── */

function SidebarLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive = item.href === pathname;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (item.copyText) {
      try {
        await navigator.clipboard.writeText(item.copyText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback
      }
    }
  };

  const isExternal = item.href.startsWith("http");

  const className = `flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-200 cursor-pointer ${
    isActive
      ? "bg-[var(--accent-glow)] text-[var(--accent-light)] ring-1 ring-[var(--accent)]/20"
      : "text-[#888] hover:text-white hover:bg-white/[0.04]"
  } ${collapsed ? "justify-center px-2" : ""}`;

  const iconSpan = (
    <span className={isActive ? "text-[var(--accent)]" : "text-[#555]"}>{item.icon}</span>
  );

  const labelSpan = !collapsed ? <span className="truncate">{item.label}</span> : null;

  if (isExternal) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" title={collapsed ? item.label : undefined} className={className}>
        {iconSpan}
        {labelSpan}
      </a>
    );
  }

  return (
    <Link href={item.href} title={collapsed ? item.label : undefined} className={className}>
      {iconSpan}
      {labelSpan}
    </Link>
  );
}

function SidebarSection({
  section,
  collapsed,
  isConnected,
}: {
  section: (typeof NAV_SECTIONS)[number];
  collapsed: boolean;
  isConnected: boolean;
}) {
  return (
    <div>
      {section.title && !collapsed && (
        <div className="px-3 mb-1 text-[10px] uppercase tracking-[0.12em] text-[#444] select-none">
          {section.title}
        </div>
      )}
      {section.title && collapsed && (
        <div className="my-2 mx-auto w-4 h-[1px] bg-white/[0.06]" />
      )}
      <div className="space-y-0.5">
        {section.items.map((item, i) => {
          if (item.requireWallet && !isConnected) return null;
          return <SidebarLink key={i} item={item} collapsed={collapsed} />;
        })}
      </div>
    </div>
  );
}

/* ─── Main Sidebar ────────────────────────────────────── */

export function Sidebar() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending } = useConnect();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Effective collapsed state — manual toggle only
  const isCollapsed = collapsed;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  const explorerUrl = explorerBase && address ? `${explorerBase}/address/${address}` : null;

  const handleConnect = () => {
    const metaMask = connectors.find((c) => c.name === "MetaMask" || c.id === "metaMaskSDK");
    if (metaMask) {
      connect({ connector: metaMask });
    } else if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-[60] lg:hidden p-2 rounded-lg bg-black/80 backdrop-blur border border-white/[0.06] text-[#888] hover:text-white transition-colors"
      >
        <IconMenu />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-[58] flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
          ${isCollapsed ? "w-[60px]" : "w-[220px]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          bg-black/90 backdrop-blur-xl border-r border-white/[0.06]`}
      >
        {/* Header */}
        <div className={`flex items-center h-[53px] border-b border-white/[0.06] ${isCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          {!isCollapsed && (
            <Link href="/dashboard" className="font-display text-sm font-bold tracking-tight">
              <span className="bg-gradient-to-r from-[var(--accent-light)] to-[var(--accent)] bg-clip-text text-transparent">AI</span>
              <span className="text-white/60 ml-1 text-xs font-medium">Bounty Judge</span>
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setCollapsed(!collapsed); }}
              className="hidden lg:flex p-1.5 rounded-md text-[#555] hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <svg className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-[#555] hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <IconClose />
            </button>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3">
          {NAV_SECTIONS.map((section, i) => (
            <SidebarSection
              key={i}
              section={section}
              collapsed={isCollapsed}
              isConnected={isConnected}
            />
          ))}
        </nav>

        {/* Footer — ritual wallet + wallet + credit */}
        <div className={`border-t border-white/[0.06] p-3 space-y-2 ${isCollapsed ? "items-center" : ""}`}>
          {/* RitualWallet — always visible when connected */}
          {isConnected && <SidebarRitualWallet collapsed={isCollapsed} />}

          {isConnected && address && (
            <div className={`${isCollapsed ? "flex justify-center" : ""}`}>
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 rounded-lg text-[12px] text-[#666] hover:text-[var(--accent)] hover:bg-white/[0.04] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"}`}
                  title={isCollapsed ? address : undefined}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <span className={`font-mono truncate transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>
                    {address.slice(0, 6)}…{address.slice(-4)}
                  </span>
                </a>
              ) : (
                <div
                  className={`flex items-center gap-2 rounded-lg text-[12px] text-[#666] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"}`}
                  title={isCollapsed ? address : undefined}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                  <span className={`font-mono truncate transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>
                    {address.slice(0, 6)}…{address.slice(-4)}
                  </span>
                </div>
              )}
              <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? "max-h-0 opacity-0" : "max-h-10 opacity-100"}`}>
                <button
                  onClick={() => disconnect()}
                  className="w-full mt-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-[#555] hover:text-red-400 hover:bg-red-500/5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Disconnect
                </button>
              </div>
            </div>
          )}
          <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${!isConnected ? (isCollapsed ? "max-h-12 opacity-100" : "max-h-12 opacity-100") : "max-h-0 opacity-0"}`}>
            {!isConnected && !isCollapsed && (
              <button
                onClick={handleConnect}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] text-white px-3 py-2 text-[12px] font-semibold hover:bg-[var(--accent-dark)] transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                    </svg>
                    Connect Wallet
                  </>
                )}
              </button>
            )}
            {!isConnected && isCollapsed && (
              <button
                onClick={handleConnect}
                disabled={isPending}
                className="flex justify-center w-full p-2 rounded-lg text-[#555] hover:text-[var(--accent)] hover:bg-white/[0.04] transition-colors disabled:opacity-50"
                title="Connect Wallet"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
              </button>
            )}
          </div>
          <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? "max-h-0 opacity-0" : "max-h-6 opacity-100"}`}>
            <div className="px-3 pt-1 text-[10px] text-[#333]">
              Built by <span className="text-[var(--accent)]/60">Frianowzki</span>
            </div>
          </div>
          {/* GitHub — always visible */}
          <div className={`flex transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCollapsed ? "justify-center py-2" : "px-3 pb-1"}`}>
            <a
              href="https://github.com/frianowzki/ritual-chain-workshop"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#444] hover:text-white transition-colors"
              title="GitHub"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
