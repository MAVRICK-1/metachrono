# ⏳ MetaChronos — Temporal Intelligence for OpenMetadata

> **Time-travel through your data's metadata history.**
> Understand what changed, when, why, and what broke — all powered by OpenMetadata.

[![Deploy Frontend](https://github.com/YOUR_USERNAME/metachrono/actions/workflows/ci-deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/metachrono/actions)
[![OpenMetadata](https://img.shields.io/badge/Built%20on-OpenMetadata-7c5cfc?logo=data:image/svg+xml;base64,)](https://open-metadata.org)

---

## 🏆 WeMakeDevs × OpenMetadata Hackathon — "Time Travel Protocol"

MetaChronos addresses **all 6 Temporal Paradoxes** in one unified platform:

| Paradox | Feature |
|---------|---------|
| **T-01** MCP & AI Agents | Full MCP server — plug Claude/Cursor into your data catalog |
| **T-02** Data Observability | Change velocity, schema drift alerts, DQ trend tracking |
| **T-03** Connectors | Built on OpenMetadata's 70+ connectors; works with any source |
| **T-04** Developer Tooling | GitHub Action that blocks PRs with breaking blast radius |
| **T-05** Comms Apps | AI assistant answers "why did my pipeline break?" in natural language |
| **T-06** Governance | Full audit trail, PII classification history, compliance scorecard |

---

## ✨ Features

### ⏱ Time Travel
Rewind any data asset to its exact state at any past timestamp. See the **complete change timeline** — who changed what column, what the old type was, when an owner was removed.

### 💥 Blast Radius Calculator
Before making a breaking schema change, **calculate exactly which downstream dashboards, pipelines, and reports will break** — scored by criticality with hop distance.

### 🕸️ Lineage Explorer
Interactive graph showing upstream/downstream lineage for any asset, with **temporal diff** showing what nodes/edges were added or removed between two dates.

### 🛡️ Governance Audit Trail
Per-asset governance history: tag assignments, ownership changes, PII classification, tier changes, domain assignments. Plus a **compliance scorecard** across your entire catalog.

### 🤖 AI Root-Cause Assistant
Ask in plain English: *"Why did the orders_fact table break last week?"* The AI answer is **grounded in real OpenMetadata change events** — not hallucinated. Works without OpenAI key too (falls back to rule-based analysis).

### 🔌 MCP Server (T-01)
Full [Model Context Protocol](https://spec.modelcontextprotocol.io/) server. Add MetaChronos to **Claude Desktop or Cursor** and let AI assistants query your data catalog directly.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MetaChronos                          │
│                                                         │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │   React UI   │◄──►│     FastAPI Backend           │  │
│  │              │    │                              │  │
│  │ • Dashboard  │    │ /api/v1/timeline  (⏳)       │  │
│  │ • Timeline   │    │ /api/v1/impact    (💥)       │  │
│  │ • Lineage    │    │ /api/v1/lineage   (🕸️)       │  │
│  │ • Impact     │    │ /api/v1/governance(🛡️)       │  │
│  │ • Governance │    │ /api/v1/ai        (🤖)       │  │
│  │ • AI Chat    │    │ /api/v1/mcp       (🔌)       │  │
│  └──────────────┘    └──────────┬───────────────────┘  │
│                                 │                       │
└─────────────────────────────────┼───────────────────────┘
                                  │ REST API
                    ┌─────────────▼──────────────┐
                    │       OpenMetadata          │
                    │  • Entity Version History   │
                    │  • Lineage Graph API        │
                    │  • Search API               │
                    │  • Governance / Tags        │
                    │  • Data Quality Tests       │
                    └────────────────────────────┘
```

**Tech Stack:**
- **Backend:** Python 3.11, FastAPI, httpx, Pydantic v2, NetworkX
- **Frontend:** React 18, TypeScript, ReactFlow, Recharts, Lucide
- **Deployment:** GitHub Pages (frontend) + Render (backend)
- **OpenMetadata:** Full REST API integration — version history, lineage, governance, search

---

## 🚀 Quick Start (Local)

### Option 1: Docker Compose (Recommended)

```bash
git clone https://github.com/YOUR_USERNAME/metachrono.git
cd metachrono
cp .env.example .env
# Edit .env — point to your OpenMetadata instance
docker compose up
```

Open http://localhost:3000

### Option 2: Manual

**Backend:**
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env  # edit as needed
uvicorn app.main:app --reload
# → http://localhost:8000  (Swagger: /docs)
```

**Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
REACT_APP_API_URL=http://localhost:8000/api/v1 npm start
# → http://localhost:3000
```

### OpenMetadata (if you don't have one)
```bash
# Use the public sandbox (read-only, good for demo)
# OPENMETADATA_URL=https://sandbox.open-metadata.org/api/v1

# Or spin up locally with Docker:
curl -sL https://github.com/open-metadata/OpenMetadata/releases/latest/download/docker-compose.yml | docker compose -f - up
```

---

## 🆓 Free Deployment

### Frontend → GitHub Pages

```bash
cd frontend
npm install --legacy-peer-deps
# Edit package.json homepage → "https://YOUR_USERNAME.github.io/metachrono"
npm run deploy
```

**Or automatically via GitHub Actions** (push to `main` triggers deploy).

### Backend → Render.com (Free)

1. Fork this repo
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo, set root directory to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add env vars from `.env.example`
7. Click **Deploy** — free tier URL: `https://metachrono-api.onrender.com`

Then update your frontend's `REACT_APP_API_URL` to the Render URL and redeploy.

---

## 🔌 MCP Server — Connect Claude/Cursor

Add to `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "metachrono": {
      "url": "https://metachrono-api.onrender.com/api/v1/mcp",
      "transport": "http"
    }
  }
}
```

Now ask Claude: *"Search for all tables with missing owners in OpenMetadata"* or *"What's the blast radius if I drop the orders table?"*

**Available MCP Tools:**
| Tool | Description |
|------|-------------|
| `search_assets` | Full-text search across all data assets |
| `get_entity_timeline` | Full change history for any asset |
| `get_schema_diff` | Compare two schema versions |
| `get_lineage` | Upstream/downstream lineage graph |
| `get_impact_analysis` | Downstream blast radius of a change |
| `ask_metadata_ai` | Natural language metadata Q&A |

---

## 🛡️ GitHub Action — Schema Guard

Block PRs that would break downstream assets:

```yaml
- name: MetaChronos Schema Guard
  uses: YOUR_USERNAME/metachrono/.github/actions/metachrono-check@main
  with:
    openmetadata_url: ${{ secrets.OPENMETADATA_URL }}
    openmetadata_token: ${{ secrets.OPENMETADATA_TOKEN }}
    metachrono_url: https://metachrono-api.onrender.com
    entity_id: ${{ vars.MONITORED_TABLE_ID }}
    fail_on_critical: 'true'
```

Output in CI:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⏳ MetaChronos Blast Radius Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Entity       : orders_fact
  Total impact : 12 downstream assets
  🔴 Critical  : 3
  🟡 Warning   : 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔴 revenue_dashboard          score= 94.2  hops=1
  🔴 monthly_reports            score= 78.5  hops=1
  🟡 customer_analytics         score= 45.0  hops=2
❌ Build blocked: 3 critical asset(s) will break.
```

---

## 📡 API Reference

Full Swagger UI at `/docs` when running locally.

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/timeline/{type}/{id}` | Full change timeline |
| `GET /api/v1/timeline/{type}/{id}/snapshot?timestamp=` | Entity state at time T |
| `GET /api/v1/timeline/{type}/{id}/diff?from_version=&to_version=` | Schema diff |
| `GET /api/v1/impact/{type}/{id}` | Blast radius analysis |
| `GET /api/v1/lineage/{type}/{id}` | Lineage graph |
| `GET /api/v1/governance/{type}/{id}/audit` | Governance audit trail |
| `GET /api/v1/governance/compliance/summary` | Compliance scorecard |
| `POST /api/v1/ai/query` | AI root-cause Q&A |
| `POST /api/v1/mcp` | MCP JSON-RPC endpoint |

---

## 🤝 How We Use OpenMetadata

MetaChronos is built **entirely on top of OpenMetadata's APIs**:

1. **Entity Versioning API** — `GET /api/v1/{type}/{id}/versions/{version}` — powers all time-travel features
2. **Lineage API** — `GET /api/v1/lineage/{type}/{id}` — powers blast radius and lineage explorer
3. **Search API** — `GET /api/v1/search/query` — powers asset search
4. **Tags & Classification API** — governance audit trail
5. **Data Quality API** — test result history
6. **Users & Teams API** — actor attribution in change events

MetaChronos **does not store any metadata** — it reads everything live from OpenMetadata, making it a pure intelligence layer on top.

---

## 📄 License

MIT — built with ❤️ for the OpenMetadata WeMakeDevs Hackathon 2026.
