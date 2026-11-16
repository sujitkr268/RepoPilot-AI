"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  GitBranch,
  ShieldCheck,
  Cpu,
  Search,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Code2,
  FileSearch,
  Layers,
  FlaskConical,
  GitPullRequest,
  Lock,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const workflowSteps = [
    {
      title: "1. Repository Analysis & Tree Indexing",
      desc: "Connect any public or authenticated GitHub repository. RepoPilot validates the URL, extracts the directory tree, analyzes manifests (pyproject.toml, package.json, Cargo.toml), detects entrypoints, and generates a structured architectural breakdown.",
      icon: FileSearch,
      agent: "Repository Analyzer Agent",
      badge: "Deep AST & Manifest Parsing",
    },
    {
      title: "2. Intelligent Issue Discovery & Scoring",
      desc: "Live GitHub issues are fetched and classified into Good First Issues, Bugs, Features, and Documentation. AI calculates difficulty ratings and required skills so developers pick tasks perfectly aligned with their background.",
      icon: Search,
      agent: "Issue Discovery Agent",
      badge: "Personalized Suitability",
    },
    {
      title: "3. Implementation Planning & Codegen",
      desc: "Before writing a line of code, the planning agent analyzes root causes, maps affected modules, and generates an editable checklist. Once approved, the Code Generation Agent produces clean, minimal unified git diffs.",
      icon: Code2,
      agent: "Planning & Codegen Agents",
      badge: "Editable Checklists & Monaco Diffs",
    },
    {
      title: "4. Isolated Testing, Review & PR",
      desc: "Tests run inside an isolated sandbox with resource bounds and security policies. The AI Code Review Agent audits for logic flaws and vulnerabilities before generating a human-confirmed Pull Request.",
      icon: FlaskConical,
      agent: "Testing, Review & PR Agents",
      badge: "Safe Sandboxing & Approval Gate",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36 border-b border-surface-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]"></div>
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Autonomous Open-Source Engineering Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl text-white">
            Your AI Engineering Partner <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              for Open Source.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
            Understand repositories, discover issues, generate solutions, run tests in an isolated environment, and contribute to open source with intelligent AI agents.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
            >
              Start Building
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl bg-surface-card border border-surface-border px-6 py-3.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-all hover:border-slate-700"
            >
              Explore Features
            </a>
          </div>

          {/* Interactive Agent Flow Summary */}
          <div className="mt-16 rounded-2xl border border-surface-border bg-surface-card/60 p-4 sm:p-6 backdrop-blur-xl shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span>repopilot-agent-pipeline v0.1.0</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                LangGraph StateMachine: READY
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 block mb-1">01 / DISCOVERY</span>
                <span className="text-slate-200 font-medium">Repo Analyzer & Issue Triage</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 block mb-1">02 / PLANNING</span>
                <span className="text-slate-200 font-medium">Root Cause & Checklist</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 block mb-1">03 / VERIFICATION</span>
                <span className="text-slate-200 font-medium">Isolated Sandbox Testing</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-500 block mb-1">04 / DELIVERY</span>
                <span className="text-slate-200 font-medium">Review & GitHub PR</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How RepoPilot Works */}
      <section id="how-it-works" className="w-full py-24 border-b border-surface-border bg-surface/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono text-emerald-400 tracking-wider uppercase mb-2">Autonomous Workflow</h2>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              From an unfamiliar repository to a verified pull request.
            </p>
            <p className="mt-4 text-slate-400 text-sm sm:text-base">
              RepoPilot unifies codebase analysis, task selection, planning, code modification, sandbox testing, and AI review in one deterministic environment.
            </p>
          </div>

          {/* Interactive Steps Visualizer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Step list selector */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {workflowSteps.map((step, idx) => {
                const Icon = step.icon;
                const isSelected = activeTab === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-surface-card border-emerald-500/50 shadow-md shadow-emerald-500/5"
                        : "bg-surface/50 border-surface-border hover:bg-surface-card/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-slate-200 text-sm">{step.title}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {step.agent.split(" ")[0]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 pl-10">{step.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Step Detail Card */}
            <div className="lg:col-span-7 rounded-2xl border border-surface-border bg-surface-card p-6 sm:p-8 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-surface-border pb-4 mb-6">
                <div>
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
                    {workflowSteps[activeTab].agent}
                  </span>
                  <h3 className="text-xl font-bold text-white">{workflowSteps[activeTab].title}</h3>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {workflowSteps[activeTab].badge}
                </span>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed mb-6">{workflowSteps[activeTab].desc}</p>

              {/* Mock Agent Output Preview */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-slate-300">
                <div className="flex items-center gap-2 text-slate-500 border-b border-slate-800/80 pb-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span>Agent Telemetry Output</span>
                </div>
                {activeTab === 0 && (
                  <div className="space-y-1 text-slate-300">
                    <p className="text-emerald-400">[✓] Validated GitHub URL: https://github.com/fastapi/fastapi</p>
                    <p>[i] Language Breakdown: Python (98.4%), Shell (1.6%)</p>
                    <p>[i] Frameworks: FastAPI, Starlette, Pydantic, AnyIO</p>
                    <p>[i] Entry Points: fastapi/main.py, fastapi/applications.py</p>
                    <p className="text-cyan-400">[✓] Architecture summary synthesized & vector indexed</p>
                  </div>
                )}
                {activeTab === 1 && (
                  <div className="space-y-1 text-slate-300">
                    <p className="text-emerald-400">[✓] Fetched 25 real GitHub issues</p>
                    <p>[★] Recommended: #10482 - "Add validation hint for schema bounds"</p>
                    <p>[i] Estimated Difficulty: Beginner (Score: 0.15)</p>
                    <p>[i] Required Skills: Python, Pydantic, Pytest</p>
                    <p className="text-emerald-400">[✓] Suitability: Great first-timer issue with isolated changes</p>
                  </div>
                )}
                {activeTab === 2 && (
                  <div className="space-y-1 text-slate-300">
                    <p className="text-emerald-400">[✓] Generated structured implementation plan</p>
                    <p>[i] Root Cause: Missing null safety guard in validator parameter unpack</p>
                    <p>[i] Checklist: 3 tasks created (editable)</p>
                    <p className="text-emerald-400">[✓] Unified diff generated for app/core/validator.py</p>
                    <p className="text-amber-400">[!] Human approval requested before test execution</p>
                  </div>
                )}
                {activeTab === 3 && (
                  <div className="space-y-1 text-slate-300">
                    <p className="text-cyan-400">[&gt;] Mounting sandbox environment in temporary directory</p>
                    <p className="text-emerald-400">[✓] Executed: pytest tests/test_validator.py (Duration: 0.45s)</p>
                    <p>[i] Test Results: 4 passed, 0 failed</p>
                    <p>[i] AI Review: Quality score 96/100 (0 Critical, 0 High vulnerabilities)</p>
                    <p className="text-emerald-400">[✓] PR Branch created: repopilot/patch-4f2a (Awaiting authorization)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Feature Showcase */}
      <section className="w-full py-24 border-b border-surface-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono text-emerald-400 tracking-wider uppercase mb-2">Core Capabilities</h2>
            <p className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Engineered specifically for real software developers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 hover:border-slate-700 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <FileSearch className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Deep Repository Intelligence</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Connect any repository URL. Inspect directory trees, dependencies, manifests, entrypoints, and architecture explanations without cloning locally.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 hover:border-slate-700 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Repository-Aware AI Assistant</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Ask how authentication works or where routes are defined. The assistant cites real source file paths and line ranges with zero code hallucination.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 hover:border-slate-700 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Secure Isolated Sandbox</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tests run with command allowlists, execution timeouts, and strict memory limits. Untrusted scripts on the host are strictly blocked.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 hover:border-slate-700 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Code2 className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Monaco Diff Inspection</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Review proposed code changes side-by-side using the Monaco editor. Inspect individual files, approve edits, or request revisions.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 hover:border-slate-700 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Evidence-Based Code Review</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Audits code changes for security vulnerabilities, logic defects, missing tests, and maintainability with severity badges from Critical to Info.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 hover:border-slate-700 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <GitPullRequest className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Human-Authorized PRs</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Automatic generation of descriptive PR titles, comprehensive markdown summaries, and test evidence. Never pushes without explicit confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Reliability Section */}
      <section className="w-full py-20 bg-surface/30 border-b border-surface-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-8 sm:p-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-3">
                <Lock className="h-3.5 w-3.5" /> Security & Trust First
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Enterprise-Grade Isolation</h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                We treat all repository files and external inputs as untrusted data.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Strict SSRF protection and GitHub URL verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Prompt injection safeguards preventing codebase instruction hijacking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Isolated test execution with resource quotas and process sandboxing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Explicit human approval gating before branch creation or PR submission</span>
                </li>
              </ul>
            </div>
            <div className="shrink-0 p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <ShieldCheck className="h-16 w-16 text-emerald-400 mx-auto mb-2" />
              <span className="font-bold text-white text-sm block">Verified Safe Runner</span>
              <span className="text-[10px] text-slate-400 font-mono">No Host Execution</span>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="w-full py-20 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to Accelerate Your Open-Source Contributions?
          </h2>
          <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
            Connect a repository or test with a public GitHub project in seconds.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-base font-semibold text-slate-950 hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 hover:scale-105"
            >
              Open Developer Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-surface-border bg-surface py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-slate-300">RepoPilot AI</span>
            <span>- Autonomous AI Engineering Platform</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI Backend</span>
            <span>•</span>
            <span>LangGraph Multi-Agent</span>
            <span>•</span>
            <span>Next.js Frontend</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
