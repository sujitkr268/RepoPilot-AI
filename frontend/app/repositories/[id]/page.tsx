"use client";

import React, { useEffect, useState, useRef } from "react";
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
  MessageSquare,
  Plus,
  Check,
  ChevronDown,
  Lock,
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
  const [fileContentLoading, setFileContentLoading] = useState<boolean>(false);
  const [fileSearch, setFileSearch] = useState<string>("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [currentPlan, setCurrentPlan] = useState<ImplementationPlan | null>(null);
  const [currentChange, setCurrentChange] = useState<GeneratedChange | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [isDiffSideBySide, setIsDiffSideBySide] = useState<boolean>(true);
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
      text: "Hello! I am your repository-aware engineering assistant. Ask me anything about the codebase architecture, modules, or dependencies.",
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // New task input state for plan checklist
  const [newTaskInput, setNewTaskInput] = useState<string>("");

  // Issue Filter State
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [classificationFilter, setClassificationFilter] = useState<string>("");

  // PR Form State
  const [prConfirm, setPrConfirm] = useState<boolean>(false);
  const [prTargetBranch, setPrTargetBranch] = useState<string>("main");
  const isAnalyzingRef = useRef<boolean>(false);

  const quickQuestions = [
    "Explain the architecture and high-level structure.",
    "Where is the primary application entrypoint?",
    "How does the request and validation flow work?",
    "What automated tests exist in this repository?",
  ];

  // Load Repository & Related Entities
  const loadWorkspace = async () => {
    setIsLoading(true);
    try {
      const repoData = await api.getRepository(repoId);
      setRepo(repoData);
      setPrTargetBranch(repoData.default_branch || "main");

      if (repoData.analysis) {
        setAnalysis(repoData.analysis);
      } else if (!isAnalyzingRef.current) {
        isAnalyzingRef.current = true;
        try {
          const an = await api.analyzeRepository(repoId);
          setAnalysis(an);
        } catch (_) {
        } finally {
          isAnalyzingRef.current = false;
        }
      }

      // Load files
      const fileList = await api.listFiles(repoId);
      setFiles(fileList);
      if (fileList.length > 0) {
        handleSelectFile(fileList[0]);
      }

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

  // Load real file content on file select
  const handleSelectFile = async (f: RepositoryFile) => {
    setSelectedFile(f);
    if (!f.content) {
      setFileContentLoading(true);
      try {
        const res = await api.getFileContent(repoId, f.path);
        setSelectedFile((prev) => (prev && prev.id === f.id ? { ...prev, content: res.content } : prev));
      } catch (e) {
        console.error(e);
      } finally {
        setFileContentLoading(false);
      }
    }
  };

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

  const handleSendChat = async (messageText?: string) => {
    const textToSend = messageText || chatInput.trim();
    if (!textToSend || isChatLoading) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: textToSend }]);
    setIsChatLoading(true);
    try {
      const res = await api.chatRepository(repoId, textToSend);
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

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlan || !newTaskInput.trim()) return;
    const newItem = {
      id: currentPlan.checklist.length + 1,
      description: newTaskInput.trim(),
      completed: false,
    };
    const updatedChecklist = [...currentPlan.checklist, newItem];
    setNewTaskInput("");
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
      const updated = await api.approveChange(currentChange.id, approved, approved ? "Approved by developer" : "Revision requested");
      setCurrentChange(updated);
      if (approved) {
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
      <div className="border-b border-surface-border bg-slate-950/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span className="text-emerald-400 font-semibold">{repo.owner}</span>
              <span>/</span>
              <span className="text-white font-extrabold text-sm">{repo.name}</span>
              <a
                href={repo.github_url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-500 hover:text-emerald-400 ml-1 transition-colors"
                title="View on GitHub"
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface-card border border-surface-border px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isActionLoading ? "animate-spin" : ""}`} />
              Re-Analyze
            </button>

            <button
              onClick={handleRunFullAutonomousWorkflow}
              disabled={isActionLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-1.5 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-500 transition-all shadow-md shadow-emerald-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Run Full Agent Pipeline
            </button>
          </div>
        </div>

        {/* Global Action Progress Notification */}
        {actionMessage && (
          <div className="mx-auto max-w-7xl mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-xs font-mono text-emerald-400 flex items-center gap-2.5 shadow-lg shadow-emerald-500/5 animate-pulse">
            <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
            <span className="font-semibold">{actionMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mx-auto max-w-7xl mt-4 flex items-center gap-1.5 overflow-x-auto border-t border-slate-800/80 pt-2.5 text-xs font-medium pb-1">
          {[
            { id: "overview", label: "Architecture", icon: Layers },
            { id: "files", label: "File Explorer", icon: FileCode },
            { id: "chat", label: "AI Codebase Q&A", icon: Sparkles },
            { id: "issues", label: `Issues (${issues.length})`, icon: Search },
            { id: "plan", label: "Implementation Plan", icon: Code2, badge: currentPlan ? "Ready" : undefined },
            { id: "diff", label: "Monaco Diffs", icon: FileSearch, badge: currentChange ? "Active" : undefined },
            { id: "testing", label: "Sandbox Testing", icon: FlaskConical, badge: currentTest?.status },
            { id: "review", label: "AI Code Review", icon: ShieldCheck, badge: currentReview ? `${currentReview.quality_score}/100` : undefined },
            { id: "pr", label: "Pull Request", icon: GitPullRequest, badge: currentPR?.state },
            { id: "agents", label: `Activity Telemetry (${agentSessions.length})`, icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap text-xs ${
                  isActive
                    ? "bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace Content */}
      <div className="mx-auto max-w-7xl w-full flex-1 p-4 sm:p-6 lg:p-8">
        {/* TAB 1: ARCHITECTURE OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  Technical Architecture Breakdown
                </h2>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  AI Synthesized
                </span>
              </div>
              <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line font-mono bg-slate-950 p-5 rounded-xl border border-slate-800/80 shadow-inner">
                {analysis?.architecture_summary || "Analyzing codebase architecture..."}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Languages & Frameworks */}
              <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-lg shadow-black/20 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-cyan-400" />
                  Detected Technologies
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5 font-mono">Languages:</span>
                    <div className="flex flex-wrap gap-2">
                      {analysis?.languages && Object.keys(analysis.languages).length > 0 ? (
                        Object.entries(analysis.languages).map(([lang, count]) => (
                          <span
                            key={lang}
                            className="px-3 py-1 rounded-lg bg-slate-900 text-slate-200 text-xs font-mono border border-slate-800 font-semibold"
                          >
                            {lang} <span className="text-slate-500">({count} files)</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">None detected</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5 font-mono">Frameworks & Libraries:</span>
                    <div className="flex flex-wrap gap-2">
                      {analysis?.frameworks && analysis.frameworks.length > 0 ? (
                        analysis.frameworks.map((fw) => (
                          <span
                            key={fw}
                            className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/30 font-semibold"
                          >
                            {fw}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">Standard modular libraries</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-1.5 font-mono">Test Frameworks:</span>
                    <div className="flex flex-wrap gap-2">
                      {analysis?.test_frameworks && analysis.test_frameworks.length > 0 ? (
                        analysis.test_frameworks.map((tf) => (
                          <span
                            key={tf}
                            className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-mono border border-cyan-500/30 font-semibold"
                          >
                            {tf}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">Standard test runner</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Entry points & Setup */}
              <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-lg shadow-black/20 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  Execution & Testing Instructions
                </h3>
                <div className="space-y-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block mb-1">Application Entrypoints:</span>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                      {analysis?.entry_points?.slice(0, 4).join("\n") || "Standard library modules"}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Local Setup Guide:</span>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 whitespace-pre-line">
                      {analysis?.setup_instructions || "Follow project README"}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1">Testing Command:</span>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 whitespace-pre-line">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[700px]">
            {/* File List */}
            <div className="lg:col-span-4 rounded-2xl border border-surface-border bg-surface-card p-4 flex flex-col h-full shadow-xl shadow-black/20">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">Repository Files</span>
                <span className="text-[10px] font-mono text-slate-500">{files.length} indexed</span>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter files..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {files
                  .filter((f) => f.path.toLowerCase().includes(fileSearch.toLowerCase()))
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleSelectFile(f)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-colors ${
                        selectedFile?.id === f.id
                          ? "bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20"
                          : "text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <span className="truncate max-w-[210px]">{f.path}</span>
                      <span className="text-[10px] text-slate-500 shrink-0 font-normal">
                        {Math.round(f.size_bytes / 1024)} KB
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Monaco Code Viewer */}
            <div className="lg:col-span-8 rounded-2xl border border-surface-border bg-surface-card p-4 flex flex-col h-full shadow-xl shadow-black/20">
              <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-200">
                  <FileCode className="h-4 w-4 text-emerald-400" />
                  <span className="font-bold">{selectedFile?.path || "Select a file"}</span>
                  {fileContentLoading && (
                    <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                  )}
                </div>
                {selectedFile?.is_important && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                    Important Module
                  </span>
                )}
              </div>

              <div className="flex-1 rounded-xl overflow-hidden border border-slate-800 bg-[#1e1e1e]">
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
                    `// Loading content for ${selectedFile?.path}...`
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
          <div className="rounded-2xl border border-surface-border bg-surface-card flex flex-col h-[700px] shadow-xl shadow-black/20">
            {/* Header */}
            <div className="p-4 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Repository Understanding AI</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-semibold">
                Grounded in Codebase Context
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px] font-mono">
              <span className="text-slate-500 shrink-0">Ask:</span>
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(q)}
                  disabled={isChatLoading}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-3xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium shadow-md shadow-emerald-500/10"
                        : "bg-slate-950 border border-slate-800/90 text-slate-200"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                    {/* Source References if available */}
                    {msg.refs && msg.refs.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 font-mono text-xs">
                        <span className="text-emerald-400 font-bold block">Verified Codebase Citations:</span>
                        {msg.refs.map((r, ri) => (
                          <div key={ri} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-between">
                            <span className="text-emerald-300 font-semibold">{r.file_path}</span>
                            {r.start_line && (
                              <span className="text-slate-500">lines {r.start_line} - {r.end_line}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 p-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Retrieving relevant source files & generating answer...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="p-4 border-t border-surface-border flex gap-2">
              <input
                type="text"
                placeholder="Ask about repository architecture, auth, functions, or file roles..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 rounded-xl bg-slate-950 border border-slate-700/80 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
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
                  className="rounded-xl bg-surface-card border border-surface-border px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
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
                  className="rounded-xl bg-surface-card border border-surface-border px-3 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
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
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all shadow-lg shadow-black/20 ${
                      selectedIssue?.id === issue.id
                        ? "bg-surface-card border-emerald-500/60 ring-1 ring-emerald-500/40"
                        : "bg-surface-card border-surface-border hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
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
                        <div className="rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-[11px] text-slate-300 italic mb-3">
                          💡 {issue.suitability_reason}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {issue.required_skills?.map((sk) => (
                          <span key={sk} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
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
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-sm"
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
              <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center shadow-xl shadow-black/20">
                <Code2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-200">No Plan Generated Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Select an open-source issue from the 'Issues' tab to trigger the Implementation Planning Agent.
                </p>
                <button
                  onClick={() => setActiveTab("issues")}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Browse Issues
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
                      Implementation Plan
                    </span>
                    <h2 className="text-lg font-bold text-white">{currentPlan.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                      Status: {currentPlan.status}
                    </span>
                    <button
                      onClick={handleGenerateCode}
                      disabled={isActionLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-500 transition-all shadow-md shadow-emerald-500/20"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Approve & Generate Code
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Analysis Breakdown */}
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-6 space-y-4 shadow-xl shadow-black/20">
                    <div>
                      <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">
                        Problem Explanation
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                        {currentPlan.problem_explanation}
                      </p>
                    </div>

                    {currentPlan.root_cause_analysis && (
                      <div>
                        <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">
                          Root Cause Analysis
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                          {currentPlan.root_cause_analysis}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1 font-bold">
                        Implementation Strategy
                      </h4>
                      <p className="text-xs sm:text-sm text-emerald-300 leading-relaxed bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                        {currentPlan.strategy_overview}
                      </p>
                    </div>
                  </div>

                  {/* Interactive Editable Checklist */}
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-6 flex flex-col justify-between shadow-xl shadow-black/20">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
                          Interactive Task Checklist
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {currentPlan.checklist.filter((c) => c.completed).length} / {currentPlan.checklist.length} Completed
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        {currentPlan.checklist.map((item, idx) => (
                          <div
                            key={item.id}
                            onClick={() => handleToggleChecklistItem(idx)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                              item.completed
                                ? "bg-emerald-500/5 border-emerald-500/30 text-slate-500 line-through"
                                : "bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700"
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
                                <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                                  File: {item.file_path}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add new task input */}
                      <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add custom task item..."
                          value={newTaskInput}
                          onChange={(e) => setNewTaskInput(e.target.value)}
                          className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                        <button
                          type="submit"
                          disabled={!newTaskInput.trim()}
                          className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </form>
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
              <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center shadow-xl shadow-black/20">
                <Code2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-200">No Code Changes Generated</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Approve an implementation plan to generate minimal code changes and inspect unified diffs.
                </p>
                <button
                  onClick={() => setActiveTab("plan")}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  View Plan
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
                      Generated Code Modifications
                    </span>
                    <h2 className="text-lg font-bold text-white">{currentChange.title}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{currentChange.summary}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsDiffSideBySide(!isDiffSideBySide)}
                      className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white"
                    >
                      {isDiffSideBySide ? "Inline Diff" : "Side-by-Side Diff"}
                    </button>
                    <button
                      onClick={() => handleApproveChange(false)}
                      className="rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Reject Edits
                    </button>
                    <button
                      onClick={() => handleApproveChange(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve & Run Tests
                    </button>
                  </div>
                </div>

                {/* File Switcher */}
                <div className="flex items-center gap-2">
                  {currentChange.files_changed.map((fc, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFileIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-colors ${
                        selectedFileIndex === idx
                          ? "bg-slate-800 text-emerald-400 border border-slate-700 font-bold"
                          : "text-slate-400 bg-slate-950 hover:text-slate-200"
                      }`}
                    >
                      {fc.file_path}
                    </button>
                  ))}
                </div>

                {/* Explanation pill */}
                {currentChange.files_changed[selectedFileIndex] && (
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-300 font-mono">
                    💡 {currentChange.files_changed[selectedFileIndex].explanation}
                  </div>
                )}

                {/* Monaco Diff Viewer */}
                <div className="h-[520px] rounded-2xl overflow-hidden border border-surface-border bg-[#1e1e1e] shadow-2xl">
                  <MonacoDiffEditor
                    height="100%"
                    language="python"
                    theme="vs-dark"
                    original={currentChange.files_changed[selectedFileIndex]?.original_content || ""}
                    modified={currentChange.files_changed[selectedFileIndex]?.new_content || ""}
                    options={{
                      readOnly: true,
                      renderSideBySide: isDiffSideBySide,
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
                  Tests run in a non-privileged, isolated environment with memory and timeout boundaries.
                </p>
              </div>

              {currentChange && (
                <button
                  onClick={handleRunTests}
                  disabled={isActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isActionLoading ? "animate-spin" : ""}`} />
                  Re-Run Tests
                </button>
              )}
            </div>

            {!currentTest ? (
              <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center shadow-xl shadow-black/20">
                <FlaskConical className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-200">No Tests Executed Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Approve a code change to execute the test suite in an isolated sandbox.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4 font-mono">
                    <span className="text-[10px] text-slate-500 block font-bold">STATUS</span>
                    <span
                      className={`text-xl font-extrabold ${
                        currentTest.status === "passed" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {currentTest.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4 font-mono">
                    <span className="text-[10px] text-slate-500 block font-bold">TOTAL TESTS</span>
                    <span className="text-xl font-extrabold text-white">{currentTest.total_tests}</span>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4 font-mono">
                    <span className="text-[10px] text-slate-500 block font-bold">PASSED / FAILED</span>
                    <span className="text-xl font-extrabold text-emerald-400">{currentTest.passed_tests}</span>
                    <span className="text-slate-500"> / </span>
                    <span className="text-xl font-extrabold text-rose-400">{currentTest.failed_tests}</span>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4 font-mono">
                    <span className="text-[10px] text-slate-500 block font-bold">DURATION</span>
                    <span className="text-xl font-extrabold text-white">{currentTest.duration_seconds}s</span>
                  </div>
                </div>

                {/* macOS Style Console Terminal */}
                <div className="rounded-2xl border border-surface-border bg-slate-950 overflow-hidden shadow-2xl">
                  <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between font-mono text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block"></span>
                      <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block"></span>
                      <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block"></span>
                      <span className="ml-2 font-bold text-slate-300">Sandbox Test Runner Terminal</span>
                    </div>
                    <span>Exit Code: {currentTest.exit_code}</span>
                  </div>
                  <pre className="p-5 text-slate-300 font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {currentTest.stdout || currentTest.stderr || "No console output recorded."}
                  </pre>
                </div>

                {/* AI Failure Diagnostics */}
                {currentTest.ai_failure_analysis && (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 text-xs">
                    <h4 className="font-bold text-rose-400 mb-1">AI Test Diagnostics</h4>
                    <p className="text-slate-300 font-mono whitespace-pre-line">{currentTest.ai_failure_analysis}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleRunReview}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
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
                  className="rounded-xl bg-surface-card border border-surface-border px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Re-Audit Changes
                </button>
              )}
            </div>

            {!currentReview ? (
              <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center shadow-xl shadow-black/20">
                <ShieldCheck className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-200">No Review Completed Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Run tests on generated code changes to proceed to the code review stage.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4 font-mono text-center">
                    <span className="text-[10px] text-slate-500 block font-bold">QUALITY SCORE</span>
                    <span className="text-3xl font-extrabold text-emerald-400">
                      {currentReview.quality_score}
                      <span className="text-xs text-slate-500">/100</span>
                    </span>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4 font-mono text-center">
                    <span className="text-[10px] text-slate-500 block font-bold">CRITICAL</span>
                    <span className="text-2xl font-bold text-rose-500">{currentReview.critical_count}</span>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4 font-mono text-center">
                    <span className="text-[10px] text-slate-500 block font-bold">HIGH</span>
                    <span className="text-2xl font-bold text-amber-500">{currentReview.high_count}</span>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4 font-mono text-center">
                    <span className="text-[10px] text-slate-500 block font-bold">MEDIUM / LOW</span>
                    <span className="text-2xl font-bold text-slate-300">
                      {currentReview.medium_count + currentReview.low_count}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-surface-border bg-surface-card p-4 font-mono text-center">
                    <span className="text-[10px] text-slate-500 block font-bold">INFORMATIONAL</span>
                    <span className="text-2xl font-bold text-cyan-400">{currentReview.info_count}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl shadow-black/20">
                  <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2 font-bold">
                    Review Summary
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-mono">{currentReview.summary}</p>
                </div>

                {/* Findings List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider font-bold">
                    Detailed Findings ({currentReview.findings?.length || 0})
                  </h4>
                  {currentReview.findings?.map((f, fi) => (
                    <div
                      key={fi}
                      className="rounded-2xl border border-surface-border bg-surface-card p-5 flex flex-col gap-2.5 text-xs shadow-md shadow-black/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                              f.severity === "Critical"
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : f.severity === "High"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {f.severity}
                          </span>
                          <span className="font-bold text-white">{f.category}</span>
                        </div>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {f.file_path}
                          {f.line_reference && `:${f.line_reference}`}
                        </span>
                      </div>

                      <p className="text-slate-300 leading-relaxed">{f.explanation}</p>

                      <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] text-emerald-400">
                        Suggested Fix: {f.suggested_correction}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveTab("pr")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
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

            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-8 space-y-6 shadow-xl shadow-black/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Target Base Branch</label>
                  <input
                    type="text"
                    value={prTargetBranch}
                    onChange={(e) => setPrTargetBranch(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Suggested Source Branch</label>
                  <input
                    type="text"
                    disabled
                    value={currentPR?.source_branch || "repopilot/patch-branch"}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-slate-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">PR Title</label>
                <input
                  type="text"
                  disabled={Boolean(currentPR)}
                  defaultValue={currentPR?.title || `fix: resolve issue in ${repo.name}`}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs text-white font-mono"
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
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-200 font-mono leading-relaxed"
                />
              </div>

              {/* Explicit Confirmation Checkbox (SECURITY REQUIREMENT) */}
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex items-start gap-3">
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
                    className="text-xs text-emerald-400 font-mono hover:underline flex items-center gap-1 font-bold"
                  >
                    View Pull Request on GitHub <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <button
                  onClick={handleCreatePR}
                  disabled={!prConfirm || isActionLoading || Boolean(currentPR?.github_pr_number)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors ml-auto shadow-md shadow-emerald-500/20"
                >
                  <GitPullRequest className="h-4 w-4" />
                  {currentPR ? "Pull Request Prepared" : "Authorize & Create Pull Request"}
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Launch Pipeline
              </button>
            </div>

            <div className="space-y-4">
              {agentSessions.map((s) => (
                <div key={s.id} className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-xl shadow-black/20">
                  <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-white">{s.current_agent}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">Stage: {s.current_stage}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-slate-500">Duration: {s.duration_seconds}s</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                          s.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse"
                        }`}
                      >
                        {s.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Events timeline */}
                  <div className="space-y-2 font-mono text-xs">
                    {s.events && s.events.length > 0 ? (
                      s.events.map((ev, ei) => (
                        <div
                          key={ei}
                          className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80"
                        >
                          <span className="text-slate-500 shrink-0">
                            {new Date(ev.created_at).toLocaleTimeString()}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] shrink-0 font-bold ${
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
