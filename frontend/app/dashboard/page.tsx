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
        const issues = await api.listIssues(repoList[0].id);
        const topRecommended = issues
          .filter((i) => i.classification === "Good First Issue" || i.estimated_difficulty === "beginner")
          .slice(0, 4);
        setRecommendedIssues(topRecommended.length > 0 ? topRecommended : issues.slice(0, 4));
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

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl) return;
    setIsConnecting(true);
    setConnectError(null);
    try {
      const connected = await api.connectRepository(newRepoUrl);
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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-8 border-b border-surface-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Engineering Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor connected repositories, autonomous agent pipelines, and open-source contributions.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-center rounded-lg bg-surface-card border border-surface-border px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Metrics Row */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase font-mono">Repositories</span>
            <FolderGit2 className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-white">{repos.length}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Connected & Indexed</span>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase font-mono">Agent Sessions</span>
            <Cpu className="h-4 w-4 text-cyan-400" />
          </div>
          <span className="text-2xl font-bold text-white">{sessions.length}</span>
          <span className="text-[11px] text-emerald-400 block mt-1">LangGraph Pipelines Run</span>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase font-mono">Recommended Tasks</span>
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <span className="text-2xl font-bold text-white">{recommendedIssues.length}</span>
          <span className="text-[11px] text-slate-400 block mt-1">High-match OSS issues</span>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase font-mono">System Status</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-emerald-400">100%</span>
          <span className="text-[11px] text-slate-400 block mt-1">Sandbox Runner Ready</span>
        </div>
      </div>

      {/* Connect Repository Bar */}
      <div className="mt-8 rounded-xl border border-surface-border bg-surface-card p-5">
        <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-400" />
          Connect GitHub Repository
        </h2>
        <form onSubmit={handleConnect} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g. https://github.com/fastapi/fastapi or owner/repo"
              value={newRepoUrl}
              onChange={(e) => setNewRepoUrl(e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isConnecting || !newRepoUrl}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shrink-0"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Connecting...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" /> Connect & Analyze
              </>
            )}
          </button>
        </form>
        {connectError && (
          <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> {connectError}
          </p>
        )}
      </div>

      {/* Main Grid: Connected Repositories & Agent Activity */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Connected Repositories */}
        <div className="lg:col-span-8 space-y-4">
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
                className="w-full rounded-lg bg-surface-card border border-surface-border pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-surface-border bg-surface-card p-12 text-center">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Loading repositories...</p>
            </div>
          ) : filteredRepos.length === 0 ? (
            <div className="rounded-xl border border-surface-border bg-surface-card p-12 text-center">
              <FolderGit2 className="h-8 w-8 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-300">No repositories connected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Enter a GitHub URL above to analyze codebase architecture, find issues, and prepare pull requests.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRepos.map((repo) => (
                <Link
                  key={repo.id}
                  href={`/repositories/${repo.id}`}
                  className="group rounded-xl border border-surface-border bg-surface-card p-5 hover:border-emerald-500/50 hover:bg-surface-card/90 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-mono text-emerald-400 truncate max-w-[150px]">{repo.owner}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono">
                        {repo.primary_language || "Code"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {repo.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                      {repo.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>★ {repo.stars_count}</span>
                    <span>Issues: {repo.open_issues_count}</span>
                    <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                      Workspace <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Recommended Issues Section */}
          {recommendedIssues.length > 0 && (
            <div className="mt-8 pt-8 border-t border-surface-border">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                Recommended Open-Source Issues
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="rounded-xl border border-surface-border bg-surface-card p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          {issue.classification}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">#{issue.github_issue_number}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200 line-clamp-2">{issue.title}</h4>
                      {issue.suitability_reason && (
                        <p className="mt-2 text-xs text-slate-400 italic line-clamp-2">
                          "{issue.suitability_reason}"
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-slate-400">
                        {issue.required_skills?.slice(0, 2).join(", ")}
                      </span>
                      <Link
                        href={`/repositories/${issue.repository_id}?issue=${issue.id}`}
                        className="text-xs text-emerald-400 font-medium hover:underline inline-flex items-center gap-1"
                      >
                        Plan Fix <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Agent Activity Feed */}
        <div className="lg:col-span-4 rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-400" />
              Agent Activity Center
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
              Live Telemetry
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <Terminal className="h-6 w-6 text-slate-600 mx-auto mb-2" />
              No active agent sessions yet. Select an issue in any workspace to trigger autonomous planning.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1.5 font-mono">
                    <span className="text-slate-300 font-semibold">{s.current_agent}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] ${
                        s.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : s.status === "running"
                          ? "bg-cyan-500/20 text-cyan-400 animate-pulse"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Stage: {s.current_stage}</p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center justify-between">
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
