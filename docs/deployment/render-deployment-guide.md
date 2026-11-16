# 🚀 Deploying RepoPilot AI to Render

This guide provides step-by-step instructions for deploying **RepoPilot AI** (Next.js 14 Frontend, FastAPI Backend with LangGraph agents, and PostgreSQL Database) to [Render](https://render.com).

---

## 🏗️ Architecture on Render

```
                                      ┌────────────────────────────────────┐
                                      │       User's Web Browser           │
                                      └─────────────────┬──────────────────┘
                                                        │
                         ┌──────────────────────────────┴──────────────────────────────┐
                         │                                                             │
                         ▼                                                             ▼
         ┌───────────────────────────────┐                             ┌───────────────────────────────┐
         │  repopilot-frontend           │  Direct API / Next Rewrites │  repopilot-backend            │
         │  (Render Web Service - Node)  ├────────────────────────────►│  (Render Web Service - Python)│
         │  https://...onrender.com      │                             │  https://...onrender.com      │
         └───────────────────────────────┘                             └───────────────┬───────────────┘
                                                                                       │
                                                                                       ▼
                                                                       ┌───────────────────────────────┐
                                                                       │  repopilot-db                 │
                                                                       │  (Render PostgreSQL Database) │
                                                                       └───────────────────────────────┘
```

---

## ⚡ Method 1: 1-Click Blueprint Deployment (Recommended)

RepoPilot AI includes a `render.yaml` Blueprint file in the repository root. This allows Render to provision the PostgreSQL database, backend API, and frontend web service simultaneously with pre-linked environment variables.

### Steps:
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. In the top right, click **New +** and select **Blueprint**.
3. Connect your GitHub account and select your repository: **`sujitkr268/RepoPilot-AI`**.
4. Choose a name for your Blueprint instance (e.g., `repopilot-production`).
5. Render will automatically parse `render.yaml` and display 3 resources:
   - 🐘 **`repopilot-db`** (PostgreSQL Database - Free)
   - ⚡ **`repopilot-backend`** (Python Web Service - Free)
   - 🌐 **`repopilot-frontend`** (Node Web Service - Free)
6. Click **Apply**.
7. Render will build and deploy the database and both services.

---

## 🛠️ Method 2: Manual Step-by-Step Setup

If you prefer to configure each service manually in the Render UI, follow these steps:

### Step 1: Create a PostgreSQL Database
1. Go to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **PostgreSQL**.
3. Enter:
   - **Name**: `repopilot-db`
   - **Database**: `repopilot`
   - **User**: `repopilot_user`
   - **Region**: Choose the closest region (e.g., Oregon or Frankfurt).
   - **Plan**: **Free** (or Starter for high volume).
4. Click **Create Database**.
5. Once created, copy the **Internal Database URL** (e.g., `postgres://repopilot_user:...@dpg-...-a/repopilot`).

---

### Step 2: Deploy Backend Web Service (FastAPI)
1. Click **New +** -> **Web Service**.
2. Select repository: **`sujitkr268/RepoPilot-AI`**.
3. Configure the service:
   - **Name**: `repopilot-backend`
   - **Region**: Same region as your database.
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: **Free**
4. Under **Advanced** -> **Health Check Path**, enter: `/healthz`
5. In **Environment Variables**, add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `PYTHON_VERSION` | `3.11.9` | Recommended Python version |
   | `ENVIRONMENT` | `production` | Environment mode |
   | `DEBUG` | `false` | Disable debug stack traces |
   | `SECRET_KEY` | *(Click "Generate" or enter 32+ random characters)* | JWT signing key |
   | `DATABASE_URL` | *(Paste Internal Database URL from Step 1)* | Database connection |
   | `LLM_PROVIDER` | `mock` *(or `openai` / `anthropic` / `gemini`)* | LLM backend |
   | `LLM_API_KEY` | *(Optional: your OpenAI/Anthropic/Gemini API key)* | LLM access key |
   | `GITHUB_DEFAULT_TOKEN` | *(Optional: GitHub personal access token)* | Unlocks 5,000 req/hr on GitHub API |
6. Click **Create Web Service**.
7. Note down your backend URL (e.g., `https://repopilot-backend.onrender.com`).

---

### Step 3: Deploy Frontend Web Service (Next.js 14)
1. Click **New +** -> **Web Service**.
2. Select repository: **`sujitkr268/RepoPilot-AI`**.
3. Configure the service:
   - **Name**: `repopilot-frontend`
   - **Region**: Same region as your backend.
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: **Free**
4. Under **Advanced** -> **Health Check Path**, enter: `/`
5. In **Environment Variables**, add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_VERSION` | `20.12.0` | Node.js LTS version |
   | `NEXT_PUBLIC_API_URL` | `https://repopilot-backend.onrender.com/api/v1` | URL of the backend service created in Step 2 |
6. Click **Create Web Service**.

---

## 🔍 Verification & Post-Deployment Checklist

Once both services show **Live**:

1. **Verify Backend Health**:
   - Open `https://<your-backend-name>.onrender.com/healthz` in your browser.
   - It should return: `{"status":"healthy","version":"0.1.0"}`.
   - Open `https://<your-backend-name>.onrender.com/docs` to test Swagger UI API endpoints.

2. **Verify Frontend UI**:
   - Open `https://<your-frontend-name>.onrender.com`.
   - The landing page and dashboard should load with full dark-mode styling and live metrics.
   - Click into any sample repository (`RepoPilot-AI` or `FastAPI`) to test the 10-tab workspace.

---

## 💡 Troubleshooting & FAQs

### Q: Why does the first request take 30–50 seconds on the free tier?
Render's free tier spins down web services after 15 minutes of inactivity. The first request after sleep spins the container back up. Upgrading to the $7/mo Starter plan keeps services warm 24/7.

### Q: Does CORS work automatically between Render subdomains?
Yes! RepoPilot AI has built-in regex matching for `https://.*\.onrender\.com` in its CORS middleware, so requests from any Render frontend domain to the backend are automatically authorized.

### Q: Can I run without an OpenAI API key?
Yes! By default, `LLM_PROVIDER=mock`, which uses deterministic AI engineering responses for analysis, planning, diff generation, and code review. To use real models, set `LLM_PROVIDER=openai` and add `LLM_API_KEY=sk-...`.

### Q: How do I avoid GitHub API rate limits?
Add a personal GitHub token under `GITHUB_DEFAULT_TOKEN` in the backend environment variables. This elevates the rate limit from 60 requests/hr to 5,000 requests/hr.
