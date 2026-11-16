"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { GitBranch, Terminal, Shield, Sparkles, FolderGit2, CheckCircle2, UserCheck } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    api.getMe()
      .then(setUser)
      .catch(() => {});
  }, []);

  const handleDemoLogin = async () => {
    try {
      const res = await api.loginDemo();
      setUser(res.user);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform">
              <Terminal className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-white flex items-center gap-1.5">
                RepoPilot <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Autonomous OSS Engineering</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-300">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                pathname === "/" ? "text-emerald-400 bg-surface-card" : "hover:text-white hover:bg-surface-card/60"
              }`}
            >
              Overview
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                pathname?.startsWith("/dashboard") || pathname?.startsWith("/repositories")
                  ? "text-emerald-400 bg-surface-card"
                  : "hover:text-white hover:bg-surface-card/60"
              }`}
            >
              Dashboard
            </Link>
          </nav>
        </div>

        {/* User / Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LangGraph Multi-Agent Active
          </div>

          {user ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-surface-border">
              <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-xs font-bold text-emerald-400">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="h-full w-full object-cover" />
                ) : (
                  user.username?.[0]?.toUpperCase() || "D"
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200">{user.username}</span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5">
                  <UserCheck className="h-2.5 w-2.5" /> Ready
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleDemoLogin}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> Quick Start
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
