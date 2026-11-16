"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Repository, AgentSession, Issue } from "@/types";
import {
  FolderGit2,
  GitPullRequest,
  CheckCircle2,
  Sparkles,
  Search,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock,
  Terminal,
  AlertCircle,
  Code2,
  Cpu,
  Layers,
  ChevronRight,
  Flame,
  Star,
  GitBranch,
} from "lucide-react";

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [recommendedIssues, setRecommendedIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New Repo Connect state
  const [newRepoUrl, setNewRepoUrl] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");

  const sampleRepos = [
    { label: "RepoPilot AI (This Project)", url: "https://github.com/sujitkr268/RepoPilot-AI" },
    { label: "FastAPI", url: "https://github.com/fastapi/fastapi" },
    { label: "Flask", url: "https://github.com/pallets/flask" },
    { label: "Rich", url: "https://github.com/Textualize/rich" },
  ];

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const repoList = await api.listRepositories();
      setRepos(repoList);

      const sessionList = await api.listAgentSessions();
      setSessions(sessionList);

      // If repos exist, fetch issues for the first repo to display recommendations
      if (repoList.length > 0) {
        try {
          const issues = await api.listIssues(repoList[0].id);
          const topRecommended = issues
            .filter((i) => i.classification === "Good First Issue" || i.estimated_difficulty === "beginner")
            .slice(0, 4);
          setRecommendedIssues(topRecommended.length > 0 ? topRecommended : issues.slice(0, 4));
        } catch (_) {}
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnect = async (urlToConnect?: string) => {
    const targetUrl = urlToConnect || newRepoUrl;
    if (!targetUrl) return;
    setIsConnecting(true);
    setConnectError(null);
    try {
      await api.connectRepository(targetUrl);
      setNewRepoUrl("");
      await loadData();
    } catch (err: any) {
      setConnectError(err.message || "Failed to connect repository.");
    } finally {
      setIsConnecting(false);
    }
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dashboard Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20 font-semibold">
              Developer Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Engineering Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Monitor connected repositories, autonomous agent pipelines, and open-source contributions.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-center rounded-xl bg-surface-card border border-surface-border px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-surface-card to-slate-900/60 p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono">
            <span className="text-xs font-medium uppercase tracking-wider">Repositories</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FolderGit2 className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-white">{repos.length}</span>
          <span className="text-[11px] text-slate-400 block mt-1 font-mono">Connected & Indexed</span>
        </div>

        <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-surface-card to-slate-900/60 p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono">
            <span className="text-xs font-medium uppercase tracking-wider">Agent Pipelines</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-white">{sessions.length}</span>
          <span className="text-[11px] text-cyan-400 block mt-1 font-mono">Autonomous Sessions Run</span>
        </div>

        <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-surface-card to-slate-900/60 p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono">
            <span className="text-xs font-medium uppercase tracking-wider">Recommended Issues</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-white">{recommendedIssues.length}</span>
          <span className="text-[11px] text-purple-400 block mt-1 font-mono">High-Match OSS Tasks</span>
        </div>

        <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-surface-card to-slate-900/60 p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between text-slate-400 mb-2 font-mono">
            <span className="text-xs font-medium uppercase tracking-wider">Sandbox Runner</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-emerald-400">Online</span>
          <span className="text-[11px] text-slate-400 block mt-1 font-mono">Isolated Execution Ready</span>
        </div>
      </div>

      {/* Connect Repository Section */}
      <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="h-4 w-4 text-emerald-400" />
            Connect GitHub Repository
          </h2>
          <span className="text-[11px] font-mono text-slate-400">Public or Authenticated Private Repos</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConnect();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g. https://github.com/fastapi/fastapi or https://github.com/sujitkr268/RepoPilot-AI"
              value={newRepoUrl}
              onChange={(e) => setNewRepoUrl(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isConnecting || !newRepoUrl}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20 shrink-0"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Connecting...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Connect & Analyze
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Selector */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-amber-400" /> Quick Try:
          </span>
          {sampleRepos.map((sr) => (
            <button
              key={sr.url}
              onClick={() => handleConnect(sr.url)}
              disabled={isConnecting}
              className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
            >
              {sr.label}
            </button>
          ))}
        </div>

        {connectError && (
          <p className="mt-3 text-xs text-rose-400 flex items-center gap-1.5 font-mono">
            <AlertCircle className="h-4 w-4 shrink-0" /> {connectError}
          </p>
        )}
      </div>

      {/* Main Grid: Connected Repositories & Agent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Connected Repositories */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-emerald-400" />
              Connected Repositories ({filteredRepos.length})
            </h2>

            {/* Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search repos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-surface-card border border-surface-border pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-3" />
              <p className="text-xs text-slate-400 font-mono">Loading connected repositories...</p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center">
              <FolderGit2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-200">No repositories connected yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Connect a GitHub repository above to analyze codebase architecture, find issues, and prepare pull requests.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRepos.map((repo) => (
                <Link
                  key={repo.id}
                  href={`/repositories/${repo.id}`}
                  className="group rounded-2xl border border-surface-border bg-surface-card p-5 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all flex flex-col justify-between shadow-lg shadow-black/20 hover:scale-[1.01]"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                      <span className="text-emerald-400 truncate max-w-[150px] font-semibold">{repo.owner}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                        {repo.primary_language || "Code"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {repo.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {repo.description || "Connected GitHub repository ready for analysis."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-400" /> {repo.stars_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3 text-cyan-400" /> {repo.default_branch}
                    </span>
                    <span className="text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center font-semibold">
                      Open Workspace <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Recommended Issues Section */}
          {recommendedIssues.length > 0 && (
            <div className="pt-6 border-t border-surface-border space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  Recommended Open-Source Tasks
                </h2>
                <span className="text-[11px] font-mono text-slate-400">AI Matched for Contributors</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-2xl border border-surface-border bg-surface-card p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-semibold">
                          ⭐ {issue.classification}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">#{issue.github_issue_number}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 line-clamp-2">{issue.title}</h4>
                      {issue.suitability_reason && (
                        <p className="mt-2 text-xs text-slate-400 italic line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          "{issue.suitability_reason}"
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-slate-400">
                        {issue.required_skills?.slice(0, 2).join(", ")}
                      </span>
                      <Link
                        href={`/repositories/${issue.repository_id}?issue=${issue.id}`}
                        className="text-xs text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1 font-mono"
                      >
                        Plan Fix <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Agent Activity Feed */}
        <div className="lg:col-span-4 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-400" />
              Agent Activity Center
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
              Live Telemetry
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Terminal className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              No active agent sessions yet. Select an issue in any workspace to trigger autonomous planning.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 6).map((s) => (
                <div key={s.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-200 font-bold">{s.current_agent}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : s.status === "running"
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {s.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Stage: {s.current_stage}</p>
                  <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-900">
                    <span>Duration: {s.duration_seconds}s</span>
                    <span>{new Date(s.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
