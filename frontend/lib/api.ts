const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

class ApiClient {
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("repopilot_token");
  }

  public setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("repopilot_token", token);
    }
  }

  public clearToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("repopilot_token");
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
      let errorMsg = `API request failed with status ${res.status}`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson.detail || errorJson.message || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return res.json();
  }

  // Auth
  async getMe() {
    return this.request<any>("/auth/me");
  }

  async loginDemo() {
    const res = await this.request<{ access_token: string; user: any }>("/auth/demo", {
      method: "POST",
    });
    this.setToken(res.access_token);
    return res;
  }

  // Repositories
  async listRepositories() {
    return this.request<any[]>("/repositories");
  }

  async getRepository(id: string) {
    return this.request<any>(`/repositories/${id}`);
  }

  async connectRepository(github_url: string) {
    return this.request<any>("/repositories/connect", {
      method: "POST",
      body: JSON.stringify({ github_url }),
    });
  }

  async analyzeRepository(id: string) {
    return this.request<any>(`/repositories/${id}/analyze`, {
      method: "POST",
    });
  }

  async listFiles(id: string, search?: string) {
    const url = search ? `/repositories/${id}/files?search=${encodeURIComponent(search)}` : `/repositories/${id}/files`;
    return this.request<any[]>(url);
  }

  async chatRepository(id: string, message: string) {
    return this.request<any>(`/repositories/${id}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  // Issues
  async listIssues(repoId: string, params?: { refresh?: boolean; difficulty?: string; classification?: string; search?: string }) {
    const q = new URLSearchParams();
    if (params?.refresh) q.set("refresh", "true");
    if (params?.difficulty) q.set("difficulty", params.difficulty);
    if (params?.classification) q.set("classification", params.classification);
    if (params?.search) q.set("search", params.search);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return this.request<any[]>(`/repositories/${repoId}/issues${qs}`);
  }

  async recommendIssue(issueId: string) {
    return this.request<any>(`/issues/${issueId}/recommend`, {
      method: "POST",
    });
  }

  // Plans
  async createPlan(issueId: string) {
    return this.request<any>(`/issues/${issueId}/plan`, {
      method: "POST",
    });
  }

  async getPlan(planId: string) {
    return this.request<any>(`/plans/${planId}`);
  }

  async updatePlan(planId: string, payload: any) {
    return this.request<any>(`/plans/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  // Changes
  async generateChanges(planId: string) {
    return this.request<any>(`/plans/${planId}/generate`, {
      method: "POST",
    });
  }

  async getChange(changeId: string) {
    return this.request<any>(`/changes/${changeId}`);
  }

  async approveChange(changeId: string, approved: boolean, notes?: string) {
    return this.request<any>(`/changes/${changeId}/approve`, {
      method: "POST",
      body: JSON.stringify({ approved, notes }),
    });
  }

  // Testing
  async runTests(changeId: string) {
    return this.request<any>(`/changes/${changeId}/test`, {
      method: "POST",
    });
  }

  // Code Review
  async runReview(changeId: string) {
    return this.request<any>(`/changes/${changeId}/review`, {
      method: "POST",
    });
  }

  // Pull Requests
  async createPullRequest(changeId: string, payload: { target_branch: string; branch_name?: string; confirm_push: boolean }) {
    return this.request<any>(`/changes/${changeId}/pull-request`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Agent Sessions
  async listAgentSessions(repoId?: string) {
    const qs = repoId ? `?repository_id=${repoId}` : "";
    return this.request<any[]>(`/agents/sessions${qs}`);
  }

  async getAgentSession(sessionId: string) {
    return this.request<any>(`/agents/sessions/${sessionId}`);
  }

  async runAgentWorkflow(repoId: string, issueTitle?: string) {
    return this.request<any>(`/agents/sessions/run-workflow?repository_id=${repoId}&issue_title=${encodeURIComponent(issueTitle || "")}`, {
      method: "POST",
    });
  }
}

export const api = new ApiClient();
