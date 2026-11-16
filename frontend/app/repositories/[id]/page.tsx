"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  Repository,
  RepositoryAnalysis,
  RepositoryFile,
  Issue,
  ImplementationPlan,
  GeneratedChange,
  TestExecution,
  CodeReview,
  PullRequest,
  AgentSession,
} from "@/types";
import {
  FolderGit2,
  GitBranch,
  Star,
  GitFork,
  AlertCircle,
  RefreshCw,
  Search,
  Code2,
  FileCode,
  Terminal,
  Cpu,
  ShieldCheck,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
  Send,
  ExternalLink,
  ChevronRight,
  Layers,
  FlaskConical,
  XCircle,
  Clock,
  Play,
  FileSearch,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Monaco to prevent SSR window reference errors
const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), { ssr: false });
const MonacoDiffEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.DiffEditor), { ssr: false });

export default function RepositoryWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const repoId = params.id as string;
  const initialIssueId = searchParams.get("issue");

  // Core Data States
  const [repo, setRepo] = useState<Repository | null>(null);
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [fileSearch, setFileSearch] = useState<string>("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [currentPlan, setCurrentPlan] = useState<ImplementationPlan | null>(null);
  const [currentChange, setCurrentChange] = useState<GeneratedChange | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [currentTest, setCurrentTest] = useState<TestExecution | null>(null);
  const [currentReview, setCurrentReview] = useState<CodeReview | null>(null);
  const [currentPR, setCurrentPR] = useState<PullRequest | null>(null);
  const [agentSessions, setAgentSessions] = useState<AgentSession[]>([]);

  // UI States
  const [activeTab, setActiveTab] = useState<
    "overview" | "files" | "chat" | "issues" | "plan" | "diff" | "testing" | "review" | "pr" | "agents"
  >("overview");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Chat State
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string; refs?: any[] }>>([
    {
      role: "assistant",
      text: "Hello! I am your repository-aware assistant. Ask me anything about the codebase architecture, modules, or dependencies.",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Issue Filter State
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [classificationFilter, setClassificationFilter] = useState<string>("");

  // PR Form State
  const [prConfirm, setPrConfirm] = useState<boolean>(false);
  const [prTargetBranch, setPrTargetBranch] = useState<string>("main");

  // Load Repository & Related Entities
  const loadWorkspace = async () => {
    setIsLoading(true);
    try {
      const repoData = await api.getRepository(repoId);
      setRepo(repoData);
      setPrTargetBranch(repoData.default_branch || "main");

      if (repoData.analysis) {
        setAnalysis(repoData.analysis);
      } else {
        // Run initial analysis if not yet available
        try {
          const an = await api.analyzeRepository(repoId);
          setAnalysis(an);
        } catch (_) {}
      }

      // Load files
      const fileList = await api.listFiles(repoId);
      setFiles(fileList);
      if (fileList.length > 0) setSelectedFile(fileList[0]);

      // Load issues
      const issueList = await api.listIssues(repoId);
      setIssues(issueList);

      if (initialIssueId) {
        const found = issueList.find((i) => i.id === initialIssueId);
        if (found) {
          setSelectedIssue(found);
          setActiveTab("issues");
        }
      }

      // Load agent sessions
      const sessions = await api.listAgentSessions(repoId);
      setAgentSessions(sessions);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (repoId) loadWorkspace();
  }, [repoId]);

  // Handlers
  const handleReanalyze = async () => {
    setIsActionLoading(true);
    setActionMessage("Re-analyzing repository tree, manifests, and architecture...");
    try {
      const an = await api.analyzeRepository(repoId);
      setAnalysis(an);
      const fileList = await api.listFiles(repoId);
      setFiles(fileList);
      setActionMessage("Analysis successfully updated!");
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      alert("Analysis error: " + e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setIsChatLoading(true);
    try {
      const res = await api.chatRepository(repoId, userMsg);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.answer, refs: res.references },
      ]);
    } catch (e: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Error: " + e.message },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCreatePlan = async (issue: Issue) => {
    setIsActionLoading(true);
    setActionMessage(`Implementation Planning Agent analyzing issue #${issue.github_issue_number}...`);
    try {
      const plan = await api.createPlan(issue.id);
      setCurrentPlan(plan);
      setActiveTab("plan");
      setActionMessage(null);
    } catch (e: any) {
      alert("Planning failed: " + e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleChecklistItem = async (itemIndex: number) => {
    if (!currentPlan) return;
    const updatedChecklist = [...currentPlan.checklist];
    updatedChecklist[itemIndex].completed = !updatedChecklist[itemIndex].completed;
    try {
      const updated = await api.updatePlan(currentPlan.id, { checklist: updatedChecklist });
      setCurrentPlan(updated);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleGenerateCode = async () => {
    if (!currentPlan) return;
    setIsActionLoading(true);
    setActionMessage("Code Generation Agent writing idiomatic changes & unified diffs...");
    try {
      const change = await api.generateChanges(currentPlan.id);
      setCurrentChange(change);
      setSelectedFileIndex(0);
      setActiveTab("diff");
      setActionMessage(null);
    } catch (e: any) {
      alert("Code generation failed: " + e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApproveChange = async (approved: boolean) => {
    if (!currentChange) return;
    setIsActionLoading(true);
    try {
      const updated = await api.approveChange(currentChange.id, approved, approved ? "Approved by user" : "Needs revision");
      setCurrentChange(updated);
      if (approved) {
        // Automatically run sandbox tests upon approval
        handleRunTests();
      }
    } catch (e: any) {
      alert("Approval update failed: " + e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRunTests = async () => {
    if (!currentChange) return;
    setIsActionLoading(true);
    setActionMessage("Automated Testing Agent mounting sandbox & running test suite...");
    try {
      const testRun = await api.runTests(currentChange.id);
      setCurrentTest(testRun);
      setActiveTab("testing");
      setActionMessage(null);
    } catch (e: any) {
      alert("Testing execution failed: " + e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRunReview = async () => {
    if (!currentChange) return;
    setIsActionLoading(true);
    setActionMessage("AI Code Review Agent auditing diff for vulnerabilities and quality...");
    try {
      const review = await api.runReview(currentChange.id);
      setCurrentReview(review);
      setActiveTab("review");
      setActionMessage(null);
    } catch (e: any) {
      alert("Code review failed: " + e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCreatePR = async () => {
    if (!currentChange) return;
    if (!prConfirm) {
      alert("Please check the explicit confirmation checkbox to authorize PR creation.");
      return;
    }
    setIsActionLoading(true);
    setActionMessage("Pull Request Agent creating branch & submitting PR...");
    try {
      const pr = await api.createPullRequest(currentChange.id, {
        target_branch: prTargetBranch,
        confirm_push: true,
      });
      setCurrentPR(pr);
      setActionMessage("Pull Request successfully prepared!");
    } catch (e: any) {
      alert("PR creation failed: " + e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRunFullAutonomousWorkflow = async () => {
    setIsActionLoading(true);
    setActionMessage("Autonomous LangGraph multi-agent pipeline executing all stages...");
    try {
      const session = await api.runAgentWorkflow(repoId, selectedIssue?.title || "Fix regression in core module");
      setAgentSessions((prev) => [session, ...prev]);
      setActiveTab("agents");
      setActionMessage("Multi-agent workflow execution completed!");
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e: any) {
      alert("Agent workflow error: " + e.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading || !repo) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-slate-300 font-mono">Loading Repository Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Workspace Header Bar */}
      <div className="border-b border-surface-border bg-surface px-4 sm:px-6 lg:px-8 py-4">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span className="text-emerald-400">{repo.owner}</span>
              <span>/</span>
              <span className="text-white font-semibold">{repo.name}</span>
              <a
                href={repo.github_url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-slate-300 ml-1"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl line-clamp-1">
              {repo.description || "Connected GitHub Repository"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono pr-3 border-r border-slate-800">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-400" /> {repo.stars_count}
              </span>
              <span className="flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5 text-cyan-400" /> {repo.default_branch}
              </span>
            </div>

            <button
              onClick={handleReanalyze}
              disabled={isActionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-card border border-surface-border px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isActionLoading ? "animate-spin" : ""}`} />
              Re-Analyze
            </button>

            <button
              onClick={handleRunFullAutonomousWorkflow}
              disabled={isActionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Run Full Agent Pipeline
            </button>
          </div>
        </div>

        {/* Global Action Progress Notification */}
        {actionMessage && (
          <div className="mx-auto max-w-7xl mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 text-xs font-mono text-emerald-400 flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mx-auto max-w-7xl mt-4 flex items-center gap-1 overflow-x-auto border-t border-slate-800/80 pt-2 text-xs font-medium">
          {[
            { id: "overview", label: "Architecture Overview", icon: Layers },
            { id: "files", label: "File Explorer", icon: FileCode },
            { id: "chat", label: "AI Codebase Q&A", icon: Sparkles },
            { id: "issues", label: `Issues (${issues.length})`, icon: Search },
            { id: "plan", label: "Implementation Plan", icon: Code2, badge: currentPlan ? "Active" : undefined },
            { id: "diff", label: "Code Diffs", icon: FileSearch, badge: currentChange ? "Ready" : undefined },
            { id: "testing", label: "Sandbox Testing", icon: FlaskConical, badge: currentTest?.status },
            { id: "review", label: "AI Code Review", icon: ShieldCheck, badge: currentReview ? `${currentReview.quality_score}/100` : undefined },
            { id: "pr", label: "Pull Request", icon: GitPullRequest, badge: currentPR?.state },
            { id: "agents", label: `Agent Activity (${agentSessions.length})`, icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-slate-800 text-emerald-400 font-semibold border border-slate-700"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Workspace Content */}
      <div className="mx-auto max-w-7xl w-full flex-1 p-4 sm:p-6 lg:p-8">
        {/* TAB 1: ARCHITECTURE OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-surface-border bg-surface-card p-6">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                Technical Architecture Breakdown
              </h2>
              <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line font-mono bg-slate-950 p-4 rounded-lg border border-slate-800">
                {analysis?.architecture_summary || "No architecture summary available. Click 'Re-Analyze' above."}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Languages & Frameworks */}
              <div className="rounded-xl border border-surface-border bg-surface-card p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Detected Technologies</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1 font-mono">Languages:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis?.languages && Object.keys(analysis.languages).length > 0 ? (
                        Object.entries(analysis.languages).map(([lang, count]) => (
                          <span
                            key={lang}
                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700"
                          >
                            {lang} ({count} files)
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">None detected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1 font-mono">Frameworks & Libraries:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis?.frameworks && analysis.frameworks.length > 0 ? (
                        analysis.frameworks.map((fw) => (
                          <span
                            key={fw}
                            className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20"
                          >
                            {fw}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">Standard libraries</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1 font-mono">Test Frameworks:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis?.test_frameworks && analysis.test_frameworks.length > 0 ? (
                        analysis.test_frameworks.map((tf) => (
                          <span
                            key={tf}
                            className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/20"
                          >
                            {tf}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">None detected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Entry points & Setup */}
              <div className="rounded-xl border border-surface-border bg-surface-card p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Setup & Testing Instructions</h3>
                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block mb-1">Application Entrypoints:</span>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {analysis?.entry_points?.join("\n") || "Standard library modules"}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Local Setup Guide:</span>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-emerald-400 whitespace-pre-line">
                      {analysis?.setup_instructions || "1. Clone repo\n2. Follow README"}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Testing Command:</span>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-400 whitespace-pre-line">
                      {analysis?.testing_instructions || "Run project standard test runner"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FILE EXPLORER & CODE VIEWER */}
        {activeTab === "files" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[650px]">
            {/* File List */}
            <div className="lg:col-span-4 rounded-xl border border-surface-border bg-surface-card p-4 flex flex-col h-full">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {files
                  .filter((f) => f.path.toLowerCase().includes(fileSearch.toLowerCase()))
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFile(f)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                        selectedFile?.id === f.id
                          ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                          : "text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <span className="truncate max-w-[220px]">{f.path}</span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {Math.round(f.size_bytes / 1024)} KB
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Monaco Code Viewer */}
            <div className="lg:col-span-8 rounded-xl border border-surface-border bg-surface-card p-4 flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-surface-border pb-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <FileCode className="h-4 w-4 text-emerald-400" />
                  <span>{selectedFile?.path || "Select a file to inspect"}</span>
                </div>
                {selectedFile?.is_important && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    Entrypoint / Manifest
                  </span>
                )}
              </div>

              <div className="flex-1 rounded-lg overflow-hidden border border-slate-800 bg-[#1e1e1e]">
                <MonacoEditor
                  height="100%"
                  language={
                    selectedFile?.extension === ".py"
                      ? "python"
                      : selectedFile?.extension === ".ts" || selectedFile?.extension === ".tsx"
                      ? "typescript"
                      : selectedFile?.extension === ".json"
                      ? "json"
                      : selectedFile?.extension === ".md"
                      ? "markdown"
                      : "javascript"
                  }
                  theme="vs-dark"
                  value={
                    selectedFile?.content ||
                    `// File: ${selectedFile?.path}\n// Size: ${selectedFile?.size_bytes} bytes\n// SHA: ${selectedFile?.sha || "N/A"}\n\n// Use 'AI Codebase Q&A' to ask questions about this file.`
                  }
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 12,
                    fontFamily: "monospace",
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AI CODEBASE Q&A ASSISTANT */}
        {activeTab === "chat" && (
          <div className="rounded-xl border border-surface-border bg-surface-card flex flex-col h-[650px]">
            {/* Header */}
            <div className="p-4 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Repository Understanding AI</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded">
                Grounded in actual source files
              </span>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-2xl rounded-xl p-4 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-emerald-600 text-white font-medium"
                        : "bg-slate-900 border border-slate-800 text-slate-200"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Source References if available */}
                    {msg.refs && msg.refs.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-800 space-y-1.5 font-mono text-[11px]">
                        <span className="text-emerald-400 font-semibold block">Source References:</span>
                        {msg.refs.map((r, ri) => (
                          <div key={ri} className="p-1.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                            <span>{r.file_path}</span>
                            {r.start_line && (
                              <span className="text-slate-500"> (lines {r.start_line}-{r.end_line})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Retrieving codebase context and generating answer...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendChat} className="p-4 border-t border-surface-border flex gap-2">
              <input
                type="text"
                placeholder="Ask e.g. 'How does authentication work?' or 'Where are API routes defined?'"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Ask
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: ISSUE DISCOVERY & RECOMMENDATIONS */}
        {activeTab === "issues" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="h-4 w-4 text-emerald-400" />
                  Live GitHub Issues & AI Suitability Scoring
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real issues from GitHub classified by difficulty, required skills, and suitability.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="rounded-lg bg-surface-card border border-surface-border px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                <select
                  value={classificationFilter}
                  onChange={(e) => setClassificationFilter(e.target.value)}
                  className="rounded-lg bg-surface-card border border-surface-border px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="Good First Issue">Good First Issue</option>
                  <option value="Bug">Bug</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Documentation">Documentation</option>
                  <option value="Security">Security</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issues
                .filter((i) => (!difficultyFilter || i.estimated_difficulty === difficultyFilter))
                .filter((i) => (!classificationFilter || i.classification === classificationFilter))
                .map((issue) => (
                  <div
                    key={issue.id}
                    className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                      selectedIssue?.id === issue.id
                        ? "bg-surface-card border-emerald-500/50 ring-1 ring-emerald-500/50"
                        : "bg-surface-card border-surface-border hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-mono border ${
                              issue.classification === "Good First Issue"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : issue.classification === "Bug"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : issue.classification === "Security"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                            }`}
                          >
                            {issue.classification}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Difficulty: <b className="text-slate-200 capitalize">{issue.estimated_difficulty}</b>
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">#{issue.github_issue_number}</span>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-2 line-clamp-2">{issue.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">
                        {issue.body || "No issue description provided on GitHub."}
                      </p>

                      {issue.suitability_reason && (
                        <div className="rounded bg-slate-900 border border-slate-800 p-2 text-[11px] text-slate-300 italic mb-3">
                          💡 {issue.suitability_reason}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mb-4">
                        {issue.required_skills?.map((sk) => (
                          <span key={sk} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                      >
                        GitHub Issue <ExternalLink className="h-3 w-3" />
                      </a>

                      <button
                        onClick={() => {
                          setSelectedIssue(issue);
                          handleCreatePlan(issue);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
                      >
                        <Code2 className="h-3.5 w-3.5" />
                        Create Implementation Plan
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 5: IMPLEMENTATION PLANNER */}
        {activeTab === "plan" && (
          <div className="space-y-6">
            {!currentPlan ? (
              <div className="rounded-xl border border-surface-border bg-surface-card p-12 text-center">
                <Code2 className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-300">No Plan Generated Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Select an issue from the 'Issues' tab to trigger the Implementation Planning Agent.
                </p>
                <button
                  onClick={() => setActiveTab("issues")}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Browse Issues
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-emerald-400">Implementation Plan</span>
                    <h2 className="text-lg font-bold text-white">{currentPlan.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
                      Status: {currentPlan.status}
                    </span>
                    <button
                      onClick={handleGenerateCode}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Approve & Generate Code
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Analysis Breakdown */}
                  <div className="rounded-xl border border-surface-border bg-surface-card p-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                        Problem Explanation
                      </h4>
                      <p className="text-xs text-slate-200 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                        {currentPlan.problem_explanation}
                      </p>
                    </div>

                    {currentPlan.root_cause_analysis && (
                      <div>
                        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Root Cause Analysis
                        </h4>
                        <p className="text-xs text-slate-200 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                          {currentPlan.root_cause_analysis}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                        Implementation Strategy
                      </h4>
                      <p className="text-xs text-emerald-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                        {currentPlan.strategy_overview}
                      </p>
                    </div>
                  </div>

                  {/* Editable Checklist */}
                  <div className="rounded-xl border border-surface-border bg-surface-card p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                          Implementation Checklist (Editable)
                        </h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {currentPlan.checklist.filter((c) => c.completed).length} / {currentPlan.checklist.length} Completed
                        </span>
                      </div>

                      <div className="space-y-2">
                        {currentPlan.checklist.map((item, idx) => (
                          <div
                            key={item.id}
                            onClick={() => handleToggleChecklistItem(idx)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                              item.completed
                                ? "bg-emerald-500/5 border-emerald-500/30 text-slate-400 line-through"
                                : "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => {}}
                              className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
                            />
                            <div className="flex-1 text-xs">
                              <p className="leading-snug">{item.description}</p>
                              {item.file_path && (
                                <span className="text-[10px] text-slate-500 font-mono block mt-1">
                                  File: {item.file_path}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono text-slate-400">
                      Testing Strategy: {currentPlan.testing_strategy}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: MONACO DIFF INSPECTION */}
        {activeTab === "diff" && (
          <div className="space-y-6">
            {!currentChange ? (
              <div className="rounded-xl border border-surface-border bg-surface-card p-12 text-center">
                <Code2 className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-300">No Code Changes Generated</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Approve an implementation plan to generate minimal code changes and inspect unified diffs.
                </p>
                <button
                  onClick={() => setActiveTab("plan")}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  View Plan
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono text-emerald-400">Generated Code Modifications</span>
                    <h2 className="text-lg font-bold text-white">{currentChange.title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{currentChange.summary}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveChange(false)}
                      className="rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Reject Edits
                    </button>
                    <button
                      onClick={() => handleApproveChange(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve & Run Tests
                    </button>
                  </div>
                </div>

                {/* File Switcher & Explanation */}
                <div className="flex items-center gap-2">
                  {currentChange.files_changed.map((fc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFileIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                        selectedFileIndex === idx
                          ? "bg-slate-800 text-emerald-400 border border-slate-700"
                          : "text-slate-400 bg-slate-900 hover:text-slate-200"
                      }`}
                    >
                      {fc.file_path}
                    </button>
                  ))}
                </div>

                {/* Explanation pill */}
                {currentChange.files_changed[selectedFileIndex] && (
                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 text-xs text-slate-300 font-mono">
                    💡 {currentChange.files_changed[selectedFileIndex].explanation}
                  </div>
                )}

                {/* Monaco Diff Viewer */}
                <div className="h-[480px] rounded-xl overflow-hidden border border-surface-border bg-[#1e1e1e]">
                  <MonacoDiffEditor
                    height="100%"
                    language="python"
                    theme="vs-dark"
                    original={currentChange.files_changed[selectedFileIndex]?.original_content || ""}
                    modified={currentChange.files_changed[selectedFileIndex]?.new_content || ""}
                    options={{
                      readOnly: true,
                      renderSideBySide: true,
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: SANDBOX TESTING CONSOLE */}
        {activeTab === "testing" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-emerald-400" />
                  Isolated Sandbox Test Execution
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Execution running in a non-privileged, isolated environment with memory and timeout boundaries.
                </p>
              </div>

              {currentChange && (
                <button
                  onClick={handleRunTests}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isActionLoading ? "animate-spin" : ""}`} />
                  Re-Run Tests
                </button>
              )}
            </div>

            {!currentTest ? (
              <div className="rounded-xl border border-surface-border bg-surface-card p-12 text-center">
                <FlaskConical className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-300">No Tests Executed Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Approve a code change to execute the test suite in an isolated sandbox.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-surface-border bg-surface-card p-4 font-mono">
                    <span className="text-[10px] text-slate-500 block">STATUS</span>
                    <span
                      className={`text-lg font-bold ${
                        currentTest.status === "passed" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {currentTest.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card p-4 font-mono">
                    <span className="text-[10px] text-slate-500 block">TOTAL TESTS</span>
                    <span className="text-lg font-bold text-white">{currentTest.total_tests}</span>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card p-4 font-mono">
                    <span className="text-[10px] text-slate-500 block">PASSED / FAILED</span>
                    <span className="text-lg font-bold text-emerald-400">{currentTest.passed_tests}</span>
                    <span className="text-slate-500"> / </span>
                    <span className="text-lg font-bold text-rose-400">{currentTest.failed_tests}</span>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card p-4 font-mono">
                    <span className="text-[10px] text-slate-500 block">DURATION</span>
                    <span className="text-lg font-bold text-white">{currentTest.duration_seconds}s</span>
                  </div>
                </div>

                {/* Console Log */}
                <div className="rounded-xl border border-surface-border bg-slate-950 p-4 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                    <span>Command: {currentTest.command_executed}</span>
                    <span>Exit Code: {currentTest.exit_code}</span>
                  </div>
                  <pre className="text-slate-300 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {currentTest.stdout || currentTest.stderr || "No console output recorded."}
                  </pre>
                </div>

                {/* AI Failure Analysis if applicable */}
                {currentTest.ai_failure_analysis && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-xs">
                    <h4 className="font-bold text-rose-400 mb-1">AI Test Failure Diagnostics</h4>
                    <p className="text-slate-300 font-mono whitespace-pre-line">{currentTest.ai_failure_analysis}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleRunReview}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Proceed to AI Code Review
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 8: AI CODE REVIEW */}
        {activeTab === "review" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  AI Code Review & Quality Audit
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated security, maintainability, and regression vulnerability analysis.
                </p>
              </div>

              {currentChange && (
                <button
                  onClick={handleRunReview}
                  disabled={isActionLoading}
                  className="rounded-lg bg-surface-card border border-surface-border px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  Re-Audit Changes
                </button>
              )}
            </div>

            {!currentReview ? (
              <div className="rounded-xl border border-surface-border bg-surface-card p-12 text-center">
                <ShieldCheck className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-300">No Review Completed Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Run tests on generated code changes to proceed to the code review stage.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="rounded-xl border border-surface-border bg-surface-card p-4 font-mono text-center">
                    <span className="text-[10px] text-slate-500 block">QUALITY SCORE</span>
                    <span className="text-2xl font-extrabold text-emerald-400">
                      {currentReview.quality_score}
                      <span className="text-xs text-slate-500">/100</span>
                    </span>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card p-4 font-mono text-center">
                    <span className="text-[10px] text-slate-500 block">CRITICAL</span>
                    <span className="text-xl font-bold text-rose-500">{currentReview.critical_count}</span>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card p-4 font-mono text-center">
                    <span className="text-[10px] text-slate-500 block">HIGH</span>
                    <span className="text-xl font-bold text-amber-500">{currentReview.high_count}</span>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card p-4 font-mono text-center">
                    <span className="text-[10px] text-slate-500 block">MEDIUM / LOW</span>
                    <span className="text-xl font-bold text-slate-300">
                      {currentReview.medium_count + currentReview.low_count}
                    </span>
                  </div>
                  <div className="rounded-xl border border-surface-border bg-surface-card p-4 font-mono text-center">
                    <span className="text-[10px] text-slate-500 block">INFORMATIONAL</span>
                    <span className="text-xl font-bold text-cyan-400">{currentReview.info_count}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-surface-border bg-surface-card p-5">
                  <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2">Review Summary</h4>
                  <p className="text-xs text-slate-200 leading-relaxed font-mono">{currentReview.summary}</p>
                </div>

                {/* Findings List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                    Detailed Findings ({currentReview.findings?.length || 0})
                  </h4>
                  {currentReview.findings?.map((f, fi) => (
                    <div
                      key={fi}
                      className="rounded-xl border border-surface-border bg-surface-card p-4 flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              f.severity === "Critical"
                                ? "bg-rose-500/20 text-rose-400"
                                : f.severity === "High"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {f.severity}
                          </span>
                          <span className="font-semibold text-white">{f.category}</span>
                        </div>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {f.file_path}
                          {f.line_reference && `:${f.line_reference}`}
                        </span>
                      </div>

                      <p className="text-slate-300 leading-relaxed">{f.explanation}</p>

                      <div className="rounded bg-slate-900 border border-slate-800 p-2 font-mono text-[11px] text-emerald-400">
                        Suggested Fix: {f.suggested_correction}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveTab("pr")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <GitPullRequest className="h-4 w-4" />
                    Prepare GitHub Pull Request
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 9: PULL REQUEST ASSISTANT */}
        {activeTab === "pr" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GitPullRequest className="h-4 w-4 text-emerald-400" />
                Pull Request Preparation & Authorization
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review pull request details. Changes will not be pushed without your explicit confirmation.
              </p>
            </div>

            <div className="rounded-xl border border-surface-border bg-surface-card p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Target Base Branch</label>
                  <input
                    type="text"
                    value={prTargetBranch}
                    onChange={(e) => setPrTargetBranch(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Suggested Source Branch</label>
                  <input
                    type="text"
                    disabled
                    value={currentPR?.source_branch || "repopilot/patch-branch"}
                    className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">PR Title</label>
                <input
                  type="text"
                  disabled={Boolean(currentPR)}
                  defaultValue={currentPR?.title || `fix: resolve issue in ${repo.name}`}
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">PR Description (Markdown)</label>
                <textarea
                  rows={8}
                  disabled={Boolean(currentPR)}
                  defaultValue={
                    currentPR?.body ||
                    `## Summary of Changes\n- Implemented targeted fixes based on approved implementation plan.\n\n### Verification & Tests\n- Tests executed in isolated sandbox runner.\n- AI Code Review passed with quality score.\n\n---\n*Generated by RepoPilot AI*`
                  }
                  className="w-full rounded-lg bg-slate-900 border border-slate-800 p-3 text-xs text-slate-200 font-mono leading-relaxed"
                />
              </div>

              {/* Explicit Confirmation Checkbox (SECURITY REQUIREMENT) */}
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="pr-confirm-check"
                  checked={prConfirm}
                  onChange={(e) => setPrConfirm(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                />
                <label htmlFor="pr-confirm-check" className="text-xs text-amber-200 leading-snug cursor-pointer">
                  <b>Explicit Developer Authorization Required:</b> I confirm that I have reviewed the generated code changes, sandbox test results, and diffs, and authorize RepoPilot to prepare this branch and pull request.
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {currentPR?.html_url && (
                  <a
                    href={currentPR.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 font-mono hover:underline flex items-center gap-1"
                  >
                    View Pull Request / Compare on GitHub <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                <button
                  onClick={handleCreatePR}
                  disabled={!prConfirm || isActionLoading || Boolean(currentPR?.github_pr_number)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors ml-auto shadow-sm"
                >
                  <GitPullRequest className="h-4 w-4" />
                  {currentPR ? "Pull Request Created" : "Authorize & Create Pull Request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: AGENT ACTIVITY CENTER */}
        {activeTab === "agents" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  Agent Activity Center & Telemetry Stream
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real backend event stream from LangGraph state transitions and tool executions.
                </p>
              </div>

              <button
                onClick={handleRunFullAutonomousWorkflow}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Launch Pipeline
              </button>
            </div>

            <div className="space-y-4">
              {agentSessions.map((s) => (
                <div key={s.id} className="rounded-xl border border-surface-border bg-surface-card p-5">
                  <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-white">{s.current_agent}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">Stage: {s.current_stage}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-slate-500">Duration: {s.duration_seconds}s</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                          s.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse"
                        }`}
                      >
                        {s.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Events list */}
                  <div className="space-y-2 font-mono text-xs">
                    {s.events && s.events.length > 0 ? (
                      s.events.map((ev, ei) => (
                        <div
                          key={ei}
                          className="flex items-start gap-2 p-2 rounded bg-slate-900/60 border border-slate-800/60"
                        >
                          <span className="text-slate-500 shrink-0">
                            {new Date(ev.created_at).toLocaleTimeString()}
                          </span>
                          <span
                            className={`px-1 rounded text-[10px] shrink-0 ${
                              ev.event_type === "step"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : ev.event_type === "warning"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-cyan-500/20 text-cyan-400"
                            }`}
                          >
                            {ev.agent_name.split(" ")[0]}
                          </span>
                          <span className="text-slate-200">{ev.message}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-500 text-xs">State checkpoints saved in PostgreSQL.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
