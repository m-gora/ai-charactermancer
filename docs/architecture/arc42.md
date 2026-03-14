# AI Charactermancer — Architecture Documentation (arc42)

> Template version 8.2 EN  
> Last updated: 2026-03-14 (rev 4 — Kubernetes deployment, autosave, Auth0 deletion hook)

---

## Table of Contents

1. [Introduction and Goals](#1-introduction-and-goals)
2. [Architecture Constraints](#2-architecture-constraints)
3. [System Scope and Context](#3-system-scope-and-context)
4. [Solution Strategy](#4-solution-strategy)
5. [Building Block View](#5-building-block-view)
6. [Runtime View](#6-runtime-view)
7. [Deployment View](#7-deployment-view)
8. [Crosscutting Concepts](#8-crosscutting-concepts)
9. [Architecture Decisions](#9-architecture-decisions)
10. [Quality Requirements](#10-quality-requirements)
11. [Risks and Technical Debt](#11-risks-and-technical-debt)
12. [Glossary](#12-glossary)

---

## 1. Introduction and Goals

### 1.1 Requirements Overview

AI Charactermancer is a web application that guides players through creating a **Pathfinder 1e** tabletop RPG character via a step-by-step wizard. An AI sidekick is available throughout the process to answer questions, explain rules, and make contextual suggestions — but all final decisions remain with the user.

The shift from the previous concept (autonomous agent driving the whole creation process) to the current one is deliberate: the complexity of a fully autonomous character builder is too high for an initial viable product, and the user experience of a guided wizard with optional AI assistance is both more reliable and more enjoyable.

**Core user story:**
> As a new or experienced Pathfinder 1e player, I want to be walked through character creation step by step, and get smart, context-aware suggestions from an AI sidekick at any point, so that I can make informed decisions without needing to read hundreds of pages of rules.

### 1.2 Quality Goals

| Priority | Quality Goal | Motivation |
|---|---|---|
| 1 | **Usability** | The wizard must be understandable without prior knowledge of the rules |
| 2 | **Correctness** | Character data and rule references provided by the AI must be accurate |
| 3 | **Responsiveness** | The UI must feel snappy; AI responses should stream where possible |
| 4 | **Maintainability** | Wizard steps and rule data should be easy to extend as new content is added |
| 5 | **Portability** | Must run locally for development; deployable to a cloud provider |

### 1.3 Stakeholders

| Role | Expectations |
|---|---|
| Player (end user) | Guided, clear wizard; helpful and non-intrusive AI sidekick |
| Game Master | Could use the tool to quickly prepare NPCs and pre-gens |
| Developer | Clean separation between wizard logic, AI integration, and rule data |

---

## 2. Architecture Constraints

### 2.1 Technical Constraints

| Constraint | Background |
|---|---|
| Frontend: React + Material UI | Consistent design language and large ecosystem |
| AI backend: Python | Existing agent code and LangChain/LangGraph tooling already in place |
| Pathfinder 1e rules | Content is open under the Pathfinder Compatibility License (PRD); must be respected |
| Authentication: Auth0 | Managed identity provider; eliminates custom auth code and handles token lifecycle |
| Persistence: MongoDB Atlas free tier | Zero-ops managed database; document model fits character drafts and rule data naturally |
| Retrieval: GraphRAG | Rule content is modelled as a knowledge graph; graph traversal enriches retrieval quality over flat vector search |
| Ingestion source: PF1e Foundry VTT module (GitLab) | Well-structured JSON data for all PF1e entities; avoids hand-authoring Markdown rule files |
| Local-first development | The full stack must run on a developer laptop with a single startup command |

### 2.2 Organisational Constraints

| Constraint | Background |
|---|---|
| Solo project | Architecture must minimise operational overhead |
| Open source | No secrets (API keys, etc.) may be committed; `.env`-based config only |

---

## 3. System Scope and Context

### 3.1 Business Context

```
┌──────────────────────────────────────────────────────────────────┐
│                          AI Charactermancer                       │
│                                                                  │
│   ┌──────────────────────┐       ┌────────────────────────────┐  │
│   │  Character Creation  │◄─────►│      AI Sidekick Chat      │  │
│   │       Wizard         │       │  (contextual suggestions)  │  │
│   └──────────────────────┘       └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         ▲          saves/loads         ▲             ▲ login
         │ uses     character drafts    │ queries     │
         ▼               ▼             ▼ rules        ▼
   ┌──────────┐  ┌──────────────────┐  ┌──────────┐  ┌──────────┐
   │  Player  │  │  MongoDB Atlas   │  │   LLM    │  │  Auth0   │
   └──────────┘  │  (free tier)     │  │ Provider │  │  (IdP)   │
                 └──────────────────┘  └──────────┘  └──────────┘
```

| Neighbour | Type | Description |
|---|---|---|
| Player | Human actor | Fills out the wizard, asks the AI sidekick questions |
| LLM Provider | External SaaS / local model | Provides language model completions; accessed via API key |
| MongoDB Atlas | External managed database | Stores saved character drafts and the GraphRAG knowledge graph for PF1e rules |
| Auth0 | External identity provider | Handles user registration, login, and JWT issuance; no credentials stored in the application |

### 3.2 Technical Context

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React App (Vite, Material UI)                       │   │
│  │  - Auth0 SDK (login / token management)              │   │
│  │  - Wizard UI (multi-step form)                       │   │
│  │  - Sidekick Chat Panel                               │   │
│  │  - Character Sheet Preview                          │   │
│  └──────────────────────┬───────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
         │ redirect/token │ HTTP + Bearer JWT / SSE
         ▼                ▼
   ┌──────────┐  ┌─────────────────────────────────────────┐
   │  Auth0   │  │  Python Backend (FastAPI)               │
   │  (IdP)   │  │  ┌──────────────┐  ┌────────────────┐  │
   └──────────┘  │  │ Character API│  │ AI Sidekick API│  │
        ▲        │  │ - validate   │  │ - chat (SSE)   │  │
        │ JWKS   │  │ - save/load  │  │ - GraphRAG     │  │
        └────────┤  │ - export     │  │ - context inj. │  │
                 │  └──────────────┘  └────────────────┘  │
                 │  ┌──────────────────────────────────┐   │
                 │  │  GraphRAG Layer                  │   │
                 │  │  - knowledge graph (feats, …)    │   │
                 │  │  - graph traversal + vector srch │   │
                 │  └──────────────────────────────────┘   │
                 └──────────────────┬──────────────────────┘
                                    │ motor (async driver)
                     ┌──────────────▼──────────────┐
                     │  MongoDB Atlas (free tier)  │
                     │  - characters collection    │
                     │  - rule_nodes collection    │
                     │  - rule_edges collection    │
                     │  - Atlas Vector Search idx  │
                     └─────────────────────────────┘
```

---

## 4. Solution Strategy

| Goal | Decision |
|---|---|
| Guided user experience | Multi-step wizard with one concern per step (race → class → attributes → feats → …) |
| Non-intrusive AI | AI sidekick lives in a collapsible side panel; it is never in the critical path of form submission |
| Streaming AI responses | Backend uses Server-Sent Events (SSE) for the chat endpoint so the UI shows tokens as they arrive |
| Rule accuracy | AI sidekick uses GraphRAG: rule content is stored as a knowledge graph in MongoDB Atlas and retrieved via graph traversal + vector search |
| Character persistence | Saved character drafts are stored in MongoDB Atlas (`characters` collection); the browser session links to a draft by ID |
| Authentication | Auth0 handles all identity concerns; the React app uses the Auth0 SPA SDK and the backend validates Auth0-issued JWTs |
| Rule data sourcing | The PF1e Foundry VTT module (GitLab) is cloned and parsed by the ingestion script; its entity JSON is the single authoritative source for rule content |
| Maintainability | Wizard steps are data-driven: a step registry defines order, labels, validation schema, and which graph subgraph to query for AI context |
| Portability | Frontend served by Vite dev server; backend served by `uvicorn`; MongoDB and Auth0 config supplied via `.env` |

---

## 5. Building Block View

### 5.1 Level 1 — Whitebox: Overall System

```
ai-charactermancer/
├── frontend/          # React + Material UI SPA
├── agent/             # Python backend (FastAPI + AI logic)
└── docs/              # Architecture and design documentation
```

### 5.2 Level 2 — Whitebox: Frontend

```
frontend/src/
├── App.tsx                    # Root component, router, Auth0Provider, theme provider
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx # Redirects unauthenticated users to Auth0 login
│   ├── wizard/
│   │   ├── WizardShell.tsx    # Step progress bar, nav buttons, step renderer
│   │   ├── steps/
│   │   │   ├── RaceStep.tsx
│   │   │   ├── ClassStep.tsx
│   │   │   ├── AttributesStep.tsx
│   │   │   ├── FeatsStep.tsx
│   │   │   └── SummaryStep.tsx
│   │   └── StepRegistry.ts    # Ordered list of step metadata
│   ├── sidekick/
│   │   ├── SidekickPanel.tsx  # Collapsible chat side panel
│   │   ├── ChatMessage.tsx
│   │   └── useSidekick.ts     # Hook: sends wizard context + user message
│   └── character/
│       └── CharacterSheet.tsx # Read-only preview, updated on each step
├── store/
│   └── characterStore.ts      # Zustand store: wizard state + character data
├── api/
│   └── client.ts              # Typed fetch helpers; attaches Auth0 Bearer token
└── theme/
    └── theme.ts               # Material UI theme customisation
```

**Responsibilities:**

| Component | Responsibility |
|---|---|
| `App.tsx` | Wraps the app in `Auth0Provider`; passes domain and clientId from env vars |
| `ProtectedRoute` | Checks Auth0 `isAuthenticated`; redirects to Auth0 Universal Login if false |
| `WizardShell` | Renders the active step, enforces forward/back navigation, calls validation before advancing |
| `StepRegistry` | Single source of truth for wizard step order, labels, and route segments |
| `SidekickPanel` | Streams AI responses from the backend; injects current character state as context |
| `characterStore` | Persists wizard progress in-memory; tracks Auth0 user ID for character ownership |
| `client.ts` | Centralises all HTTP calls; attaches Auth0 access token as `Authorization: Bearer` header |

### 5.3 Level 2 — Whitebox: Backend

```
agent/src/ai_charactermancer/
├── main.py                    # FastAPI app factory, mounts routers
├── auth/
│   └── jwt.py                 # Auth0 JWT validation (JWKS fetch + token verify)
├── routers/
│   ├── character.py           # POST /character/validate-step
│   │                          # POST /character/save, GET /character/{id}
│   │                          # GET  /character/{id}/export
│   │                          # All routes require valid Auth0 JWT
│   └── sidekick.py            # POST /sidekick/chat (SSE streaming, JWT-gated)
├── services/
│   ├── character_service.py   # Step validation logic, character assembly
│   ├── sidekick_service.py    # Builds LLM prompt with GraphRAG context, runs chain
│   └── graphrag_service.py    # Graph traversal + vector search against Atlas
├── db/
│   ├── client.py              # motor AsyncIOMotorClient, connection lifecycle
│   └── repositories/
│       ├── character_repo.py  # CRUD for characters collection (scoped to owner_id)
│       └── rule_repo.py       # Queries against rule_nodes / rule_edges collections
├── ingestion/             # GPLv3 — only component that touches Foundry module files
│   ├── ingest_rules.py        # One-off CLI job: clones Foundry module → builds graph → Atlas
│   └── foundry_parser.py      # Transforms Foundry VTT entity JSON into RuleNode/RuleEdge
└── models.py                  # Pydantic models: CharacterDraft, RuleNode, RuleEdge, …
```

**Responsibilities:**

| Component | Responsibility |
|---|---|
| `auth/jwt.py` | Fetches Auth0 JWKS, verifies incoming JWT signature and claims; used as a FastAPI dependency |
| `character.py` router | Validates the data submitted at each wizard step; saves and loads character drafts scoped to the authenticated user's `owner_id`; `DELETE /users/{owner_id}` removes all drafts on account deletion |
| `sidekick.py` router | Accepts the current character draft + a user message; streams an LLM response |
| `sidekick_service` | Calls `graphrag_service` to retrieve a relevant rule subgraph, then builds and streams the LLM prompt |
| `graphrag_service` | Queries `rule_nodes` / `rule_edges` collections via graph traversal; uses Atlas Vector Search for semantic node recall |
| `character_repo` | Persists and retrieves `CharacterDraft` documents from the `characters` collection |
| `rule_repo` | Low-level Atlas queries for rule nodes and edges; called exclusively by `graphrag_service` |
| `ingest_rules.py` | One-off CLI job: clones the PF1e Foundry VTT GitLab module, passes each pack directory to `foundry_parser`, upserts resulting nodes/edges into Atlas |
| `foundry_parser.py` | Reads Foundry VTT entity JSON (feats, classes, ancestries, …), maps to `RuleNode` + `RuleEdge`, computes embeddings |

---

## 6. Runtime View

### 6.1 Authentication (Login Flow)

```
Player        React App       Auth0          Backend
  │  opens app   │               │               │
  │─────────────►│               │               │
  │              │ not authed    │               │
  │              │──[redirect]──►│               │
  │ login/signup │               │               │
  │─────────────────────────────►│               │
  │              │               │ issue JWT     │
  │◄─────────────────────────────│               │
  │              │◄──[callback + │               │
  │              │    access_token]              │
  │              │               │               │
  │  API call    │─────────────[Bearer JWT]──────►│
  │              │               │ verify JWT    │
  │              │               │ (JWKS)        │
  │              │◄──────────────────[200 OK]────│
```

### 6.2 Wizard Step Submission

```
Player          WizardShell       characterStore    Backend /validate
  │  fills form       │                  │                  │
  │──[submit]────────►│                  │                  │
  │                   │──[update draft]─►│                  │
  │                   │──[POST /character/validate-step + JWT]►│
  │                   │                  │    validate rules │
  │                   │◄─────────────────────[200 OK / 422]──│
  │                   │  (on success)    │                  │
  │                   │──[advance step]──►│                  │
  │◄──[render next step]─────────────────│                  │
```

### 6.3 AI Sidekick Chat (with GraphRAG)

```
Player      SidekickPanel   Backend /chat   graphrag_service   MongoDB Atlas
  │ types msg    │                │                │                 │
  │──[send]─────►│                │                │                 │
  │              │──[POST /chat + JWT]►            │                 │
  │              │ {msg, draft,   │                │                 │
  │              │  step}         │──[retrieve(    │                 │
  │              │                │   step, draft)]►│                 │
  │              │                │                │──[graph query]─►│
  │              │                │                │◄─[rule subgraph]─│
  │              │                │                │──[vector search]►│
  │              │                │                │◄─[ranked nodes]──│
  │              │                │◄──[context]────│                 │
  │              │                │  build prompt  │                 │
  │              │                │  (draft+context│                 │
  │              │                │   +system msg) │                 │
  │              │◄──[SSE stream]─│  stream tokens │                 │
  │◄─[tokens]────│                │                │                 │
```

---

## 7. Deployment View

### 7.1 Local Development

```
localhost:5173  ──►  Vite dev server  ──►  React SPA
localhost:8000  ──►  uvicorn          ──►  FastAPI backend
                                               │
                                               │ MONGODB_URI (env)
                                               ▼
                                      MongoDB Atlas (cloud, free tier)

Auth0 (cloud) ◄──── React SPA (Auth0 SPA SDK, VITE_AUTH0_* env vars)
Auth0 (cloud) ◄──── FastAPI backend (JWKS verification, AUTH0_* env vars)
```

Both app processes are started independently (or via a `docker-compose` target). In local dev the Vite dev server proxies `/api/*` to the backend to keep the same-origin behaviour consistent with production. All secrets (`MONGODB_URI`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `VITE_AUTH0_CLIENT_ID`, etc.) are read from `.env` files and never committed.

The `ingest_rules.py` script is run once (or when the Foundry module is updated) to populate the `rule_nodes` and `rule_edges` collections and rebuild the Atlas Vector Search index. It requires `FOUNDRY_MODULE_PATH` and `MONGODB_URI` in the environment.

### 7.2 Production — Docker / Kubernetes

The entire stack is containerised and deployed on Kubernetes. A single Ingress controller routes on path prefix, so both the SPA and the API share the same external origin — no cross-origin issues arise.

```
External origin: https://charactermancer.example.com
                          │
              ┌───────────▼────────────┐
              │   Ingress controller   │
              │  /       → frontend   │
              │  /api/*  → backend    │
              └─────┬──────────┬───────┘
                    │          │
          ┌─────────▼──┐  ┌────▼────────────┐
          │  frontend  │  │    backend      │
          │ Deployment │  │   Deployment    │
          │ (nginx +   │  │  (uvicorn)      │
          │  SPA dist) │  └──────┬──────────┘
          └────────────┘         │ MONGODB_URI (K8s Secret)
                                 ▼
                        MongoDB Atlas (cloud)

Auth0 (cloud) ─── handles identity in all environments
```

**Kubernetes resource overview:**

| Resource | Purpose |
|---|---|
| `Deployment/frontend` | Serves the built React SPA via nginx |
| `Deployment/backend` | Runs the FastAPI app with `uvicorn` |
| `Job/ingest` | One-off Job that runs the ingestion pipeline; triggered manually or via CI |
| `Secret/mongodb` | `MONGODB_URI` and Atlas credentials |
| `Secret/auth0` | `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_DELETION_SECRET` |
| `Secret/llm` | LLM provider API key |
| `Ingress` | Path-based routing; TLS termination |

The ingestion job is a Kubernetes `Job` (not a `CronJob`) — triggered manually or as a CI pipeline step when the Foundry module repository has new commits.

---

## 8. Crosscutting Concepts

### 8.1 Character State Model

The `CharacterDraft` is the single shared data structure passed between wizard steps, sent to the backend for validation, and injected into the AI sidekick context.

```typescript
// frontend/src/store/characterStore.ts (target)
interface CharacterDraft {
  id?: string;             // MongoDB ObjectId (absent until first save)
  ownerId?: string;        // Auth0 user sub (set by backend on save)
  race?: string;
  class?: string;
  level: number;           // defaults to 1
  attributes: {
    str: number; dex: number; con: number;
    int: number; wis: number; cha: number;
  };
  feats: string[];
  skills: Record<string, number>;
}
```

```python
# agent/src/ai_charactermancer/models.py (target)
class CharacterDraft(BaseModel):
    id: str | None = None       # MongoDB ObjectId as string
    owner_id: str | None = None # Auth0 user sub; set server-side from JWT
    race: str | None = None
    class_name: str | None = None
    level: int = 1
    attributes: dict[str, int] = {}
    feats: list[str] = []
    skills: dict[str, int] = {}

class RuleNode(BaseModel):
    node_id: str                # e.g. "feat:power_attack"
    kind: str                   # "feat" | "class" | "race" | "skill" | ...
    name: str
    description: str
    embedding: list[float]      # stored in Atlas, not returned to client

class RuleEdge(BaseModel):
    source_id: str              # node_id of prerequisite / related node
    target_id: str
    relation: str               # "requires" | "grants" | "synergizes_with" | ...
```

### 8.2 Authentication Flow

Auth0 is used as the identity provider. The React app integrates the Auth0 SPA SDK (`@auth0/auth0-react`), which handles the redirect-based Universal Login flow and token storage. The FastAPI backend validates every protected request with a JWT middleware implemented in `auth/jwt.py`:

1. On startup, `jwt.py` fetches the Auth0 JWKS endpoint and caches the signing keys.
2. Each request to a protected route must carry an `Authorization: Bearer <access_token>` header.
3. The middleware verifies the token signature (RS256), expiry, issuer (`AUTH0_DOMAIN`), and audience (`AUTH0_AUDIENCE`).
4. The verified `sub` claim is extracted as `owner_id` and injected into the request state; all character operations are scoped to this value.

**User deletion — Auth0 post-delete Action:**

When a user deletes their Auth0 account, an **Auth0 Action** (post-user-deletion trigger) calls the backend's `DELETE /users/{owner_id}` endpoint. The backend deletes all `characters` documents for that `owner_id` from Atlas. This ensures no orphaned personal data remains.

```
Auth0  ──[post-delete Action]──►  DELETE /users/{owner_id}  ──►  Atlas
                                  (server-to-server, signed
                                   with a shared M2M secret)
```

The M2M secret used by the Auth0 Action is stored as `AUTH0_DELETION_SECRET` in the backend environment and verified before any deletion is processed.

**Environment variables required:**

| Variable | Where | Value |
|---|---|---|
| `VITE_AUTH0_DOMAIN` | Frontend `.env` | e.g. `my-app.eu.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | Frontend `.env` | Auth0 SPA application client ID |
| `VITE_AUTH0_AUDIENCE` | Frontend `.env` | API audience identifier |
| `AUTH0_DOMAIN` | Backend `.env` | Same domain as above |
| `AUTH0_AUDIENCE` | Backend `.env` | Same audience as above |
| `AUTH0_DELETION_SECRET` | Backend K8s Secret (`Secret/auth0`) | Shared secret verified on the deletion endpoint |

### 8.3 AI Context Injection via GraphRAG

Before every sidekick chat call the backend enriches the prompt using a two-phase GraphRAG retrieval:

**Phase 1 — Seed node recall (vector search)**  
The user message and current step label are embedded, and Atlas Vector Search returns the top-k most semantically similar rule nodes from the `rule_nodes` collection.

**Phase 2 — Graph expansion**  
For each seed node, `graphrag_service` traverses outgoing edges in the `rule_edges` collection up to a configurable depth (default: 2 hops). This surfaces prerequisites, granted abilities, and known synergies that a flat vector search would miss.

The final context injected into the prompt contains:
1. The current `CharacterDraft` serialised to a compact JSON summary.
2. The retrieved rule subgraph formatted as a structured text block (node descriptions + relationship annotations).
3. A fixed system prompt describing the AI's role (helpful sidekick, never overrides user choice, always cites the rule node name).

The graph approach is particularly valuable for feats (deep prerequisite chains) and multiclassing (class feature interactions).

### 8.4 Autosave Strategy

The character draft is persisted to Atlas automatically on every wizard step advance — no explicit "Save" button is required. The flow:

1. The user clicks "Next" in the wizard.
2. `WizardShell` dispatches a step-advance action to `characterStore`.
3. The store optimistically updates local state and fires `POST /character/save` (or `PATCH /character/{id}` for subsequent saves) in the background.
4. Atlas writes are upserts keyed on the document `_id`; a single upsert per step advance is well within the Atlas free tier's write throughput (roughly 100 writes/second sustained).
5. If the save fails, the store keeps the draft in memory, marks a `dirty` flag, and retries on the next user action. The wizard is never blocked by a transient save failure.

**Why not debounce on every field change?**  
Field-level changes within a step (e.g. tweaking an attribute score) are frequent and would generate excessive writes. Saving on step advance is the right granularity: infrequent enough to stay well below any Atlas rate limit, fine-grained enough that a crash never loses more than one step of work.

### 8.5 Error Handling

- Frontend validation errors from the backend are shown inline in the wizard step form using Material UI form helper text.
- AI chat errors (timeout, model unavailable) show a dismissible error banner in the sidekick panel; the wizard remains fully functional.
- API keys are loaded from `.env`; missing keys cause a clear startup error in the backend, not a silent failure.

### 8.6 Theming

Material UI's `createTheme` is used to define a single dark/fantasy-themed palette in `frontend/src/theme/theme.ts`. Components use the theme token system (no hardcoded colours in component files).

---

## 9. Architecture Decisions

### ADR-001: Wizard over autonomous agent as primary UX pattern

**Status:** Accepted

**Context:** The original concept used a fully autonomous LangGraph agent to create a character from a single prompt. This proved difficult to make reliably correct and gave the user no visibility or control over intermediate decisions.

**Decision:** Replace the autonomous agent flow with a step-by-step wizard. The AI becomes a sidekick (advisory role) rather than the primary actor.

**Consequences:**
- (+) User has full control and understanding of every choice.
- (+) Wizard steps are individually testable and debuggable.
- (+) AI errors do not break the core user flow.
- (-) More frontend complexity (multi-step form state management).
- (-) The AI sidekick must receive rich context per step instead of having access to the full agent state graph.

---

### ADR-002: FastAPI over Chainlit for the backend

**Status:** Accepted

**Context:** The existing backend used Chainlit, which is optimised for pure chat UIs. The new concept requires a REST API for wizard step validation and character export, plus a streaming chat endpoint.

**Decision:** Replace Chainlit with FastAPI. The AI sidekick chat is exposed as an SSE endpoint within the same FastAPI app.

**Consequences:**
- (+) Full control over API design; easy to add non-chat endpoints.
- (+) SSE streaming is simple to implement with FastAPI's `StreamingResponse`.
- (-) Chainlit's built-in UI is no longer available (replaced by the custom React frontend).

---

### ADR-003: React + Material UI for the frontend

**Status:** Accepted

**Context:** The existing frontend was a minimal React scaffold without a design system. Building a polished wizard UI from scratch without a component library would be slow.

**Decision:** Adopt Material UI (MUI v6) as the component and theming foundation.

**Consequences:**
- (+) Rich set of form, stepper, and layout components directly applicable to the wizard.
- (+) Built-in accessibility support.
- (+) Theming system supports a cohesive visual identity.
- (-) Bundle size increase compared to a headless solution; acceptable for this use case.

---

### ADR-009: Autosave on step advance

**Status:** Accepted

**Context:** Character draft data must survive a page refresh without manual user action. The two plausible options are (a) save on every field change (debounced) or (b) save once per wizard step advance.

**Decision:** Save on step advance. `WizardShell` triggers a background upsert to the `/character/save` endpoint each time the user navigates forward. The draft is also kept in the Zustand store so the UI is never blocked waiting for the network.

**Consequences:**
- (+) Atlas write rate is proportional to wizard step count (≤ 10 writes per character creation session), not to keystroke frequency.
- (+) Maximum data loss on crash is one step's worth of changes — acceptable.
- (+) Implementation is simple: one write per step-advance event.
- (-) A crash mid-step (rare) loses in-step changes; mitigated by the `dirty` flag retry on next action.
- (-) Step-advance and save must be kept in sync if wizard navigation logic changes.

---

### ADR-007: Auth0 for authentication

**Status:** Accepted

**Context:** The application needs user identity to scope saved characters. Building a custom auth system (password hashing, session management, token refresh) is significant undifferentiated work and a common source of security vulnerabilities.

**Decision:** Delegate all authentication to Auth0. The React app uses the Auth0 SPA SDK and the backend validates Auth0-issued JWTs. No user credentials are stored in the application database.

**Consequences:**
- (+) No custom auth code; eliminates a large class of security risks (broken authentication, credential storage).
- (+) Social login (Google, GitHub, etc.) available for free on the Auth0 free tier.
- (+) Token refresh handled transparently by the SDK.
- (-) Dependency on an external SaaS; free tier has a 7,500 MAU limit (acceptable for a hobby project).
- (-) Requires JWKS caching and refresh logic in the backend to avoid a network call on every request.

---

### ADR-008: PF1e Foundry VTT module as ingestion source

**Status:** Accepted (with licence mitigation — see below)

**Context:** Pathfinder 1e has thousands of entities (feats, classes, spells, items). Hand-authoring Markdown files for each entity is impractical. The community-maintained PF1e system module for Foundry VTT (hosted on GitLab) provides comprehensive, machine-readable JSON for all core entities, already structured with names, descriptions, prerequisites, and cross-references.

**Licence analysis:**

Two separate licences apply to the content we want to use:

| Layer | Licence | What it covers |
|---|---|---|
| Foundry module code & data files | **GPL v3 (copyleft)** | The module's JavaScript, tooling, and the compiled/structured JSON packs |
| PF1e game rules text & stats | **OGL v1.0a** | The underlying rule content (feat names, descriptions, prerequisites, stat values) that appears _inside_ those JSON files |

The GPL's copyleft clause requires that any software that is a _derivative work_ of GPL code must itself be released under the GPL. Running a script that reads GPL-licensed files and transforms them into a new data structure is likely such a derivative work — meaning the ingestion script (`ingest_rules.py` + `foundry_parser.py`) must be GPL-licensed.

However, the **rule content itself** (feat descriptions, prerequisites, class abilities) is Open Game Content under the OGL. Once extracted and stored in MongoDB Atlas as `RuleNode` / `RuleEdge` documents, those records are governed by the OGL — not the GPL — because the underlying facts and text are OGL-licensed.

The main application (FastAPI backend, React frontend) only ever reads the already-extracted documents from Atlas and never touches the Foundry module files, so it is **not** a derivative work of the GPL module and can be licensed independently.

**Decision:** Keep the ingestion pipeline (`agent/ingestion/`) as a **strictly isolated, separately GPL-licensed sub-package**. The rest of the codebase is not a derivative of the Foundry module and may carry a different licence. The extracted Atlas data is treated as OGL content.

**Architectural consequence of the licence split:**

```
agent/
├── ingestion/          ← GPLv3 (touches Foundry module files)
│   ├── ingest_rules.py
│   └── foundry_parser.py
└── src/                ← project licence (e.g. MIT / Apache 2.0)
    └── ai_charactermancer/
        ├── db/         ← reads Atlas (OGL data); no GPL contact
        └── ...
```

The ingestion job is the **only** component that clones the Foundry module repository and reads its files. It has no runtime dependency on the main application — it is invoked as a standalone CLI tool.

**Consequences:**
- (+) Covers the full PF1e Core Rulebook and most splatbooks with minimal manual effort.
- (+) Foundry entity JSON already encodes prerequisite relationships — directly usable as graph edges.
- (+) Module is actively maintained; updates can be re-ingested.
- (+) Licence isolation means the main app is not contaminated by GPL.
- (-) Ingestion pipeline must be kept GPL-licensed; contributors must be aware.
- (-) Dependency on a third-party community module; ingestion must tolerate schema variations across module versions.
- (-) Foundry's internal data format may change; `foundry_parser.py` must be kept in sync.
- (-) OGL requires attribution in any distributed product — add a `NOTICE` / `OGL.md` file listing the Open Game Content used.
- (-) Legal analysis above is best-effort; consult a lawyer before any commercial publication.

---

### ADR-005: MongoDB Atlas free tier for persistence

**Status:** Accepted

**Context:** Character drafts need to survive page refreshes and be shareable. The free tier of MongoDB Atlas provides a managed, zero-ops document store with a generous free quota (512 MB). The document model maps naturally to the nested `CharacterDraft` structure, and Atlas also provides the Vector Search index required by GraphRAG.

**Decision:** Use MongoDB Atlas (free tier M0 cluster) as the single database for both character persistence and the GraphRAG rule knowledge graph.

**Consequences:**
- (+) No self-hosted database infrastructure.
- (+) Vector Search index available on the same cluster — single connection string for all data.
- (+) `motor` async driver integrates cleanly with FastAPI's async stack.
- (-) Requires a network connection even in local development (no embedded fallback); mitigated by using the Atlas free tier connection from any machine.
- (-) Free tier has no SLA; acceptable for a hobby project.

---

### ADR-006: GraphRAG for rule retrieval

**Status:** Accepted

**Context:** PF1e rules form a dense graph of relationships (feat prerequisites, class progressions, race trait interactions). A flat vector search retrieves semantically similar nodes but misses structurally important neighbours (e.g. a feat three hops away in a prerequisite chain). GraphRAG combines vector recall with graph traversal to surface richer context.

**Decision:** Model PF1e rule content as a knowledge graph (`RuleNode` + `RuleEdge` documents in Atlas). Retrieval uses Atlas Vector Search for seed nodes followed by multi-hop edge traversal via `rule_edges` queries.

**Consequences:**
- (+) Prerequisite chains and synergy paths surfaced automatically, not just by keyword similarity.
- (+) Graph can be extended incrementally (new nodes/edges) without re-indexing everything.
- (+) Both vector index and graph storage live in the same Atlas cluster.
- (-) Requires an offline ingestion step (`ingest_rules.py`) to populate the graph from Markdown source files.
- (-) Retrieval latency higher than plain vector search; mitigated by capping traversal depth and parallelising hop queries.

---

### ADR-004: Zustand for frontend state management

**Status:** Proposed

**Context:** The character draft must be accessible across wizard steps and the sidekick panel. React Context would cause excessive re-renders; Redux adds significant boilerplate.

**Decision:** Use Zustand for a lightweight, hook-based global store.

**Consequences:**
- (+) Minimal boilerplate; integrates cleanly with TypeScript.
- (+) Easy to persist state to `localStorage` for session recovery.
- (-) Less tooling than Redux DevTools (though Zustand has basic devtools support).

---

## 10. Quality Requirements

### 10.1 Quality Tree

```
Quality
├── Usability
│   ├── Wizard steps are self-explanatory (no required external docs)
│   └── AI sidekick responses are concise and link-free (no markdown overload)
├── Correctness
│   ├── Feat prerequisites enforced by backend validation
│   └── AI never contradicts validated character state
├── Responsiveness
│   ├── Wizard step transitions < 100 ms
│   └── First AI token visible < 2 s
├── Maintainability
│   ├── New wizard step addable without touching existing steps
│   └── Rule data files editable by non-developers
└── Security
    ├── API keys never exposed to the frontend
    └── User input sanitised before LLM prompt injection
```

### 10.2 Quality Scenarios

| Scenario | Stimulus | Response | Metric |
|---|---|---|---|
| Feat prerequisite violated | User selects feat without required base attack bonus | Backend returns 422 with explaining error message | Error shown inline < 200 ms |
| AI sidekick timeout | LLM provider takes > 10 s | Sidekick shows error banner; wizard unaffected | < 10 s wait before error shown |
| Session recovery | User refreshes browser | Draft state reloaded from MongoDB Atlas by character ID stored in URL/localStorage | All selected options preserved |
| Rule data update | New feat added to Markdown source file | Run `ingest_rules.py`; feat node and edges available immediately | No application code change required |
| GraphRAG retrieval slow | Atlas latency spike | Sidekick response delayed; wizard unaffected; timeout after 8 s | Error banner shown if context retrieval > 8 s |

---

## 11. Risks and Technical Debt

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| LLM hallucination of rules | High | Medium | GraphRAG injects exact rule text; sidekick clearly labelled as "AI suggestion" |
| PF1e rule complexity (1000+ feats) | High | Medium | Implement incremental content: start with Core Rulebook only; ingest script is additive |
| Scope creep (spells, equipment, …) | High | Medium | Strictly MVP-scope each iteration; use GitHub Issues to park future ideas |
| LLM provider cost | Low | Low | Use `gpt-4o-mini` or a local Ollama model for development |
| Atlas free tier limits (512 MB, 100 connections) | Low | Low | Core Rulebook graph is well within 512 MB; connection pool capped at 10 in `motor` config |
| Atlas IP allowlist blocks backend | Low | High | Add the Kubernetes egress IP (or NAT gateway CIDR) to the Atlas IP allowlist before first deployment; use `0.0.0.0/0` only for local dev |
| Graph ingestion quality | Medium | Medium | Unit-test node/edge counts after ingestion; review a sample subgraph manually per CRB chapter |
| Auth0 free tier MAU limit (7,500) | Low | Low | Acceptable for a hobby project; upgrade plan available if needed |
| Foundry module schema changes | Medium | Low | Pin the module to a specific git tag for each ingestion run; update parser when upgrading |
| GPL copyleft scope creep | Low | High | Ingestion package is strictly isolated (`agent/ingestion/`); main app never imports it at runtime |
| OGL attribution missing | Medium | Medium | Add `OGL.md` / `NOTICE` file; list all Open Game Content used before any public release |
| Legal interpretation incorrect | Low | High | Licence analysis is best-effort; consult a lawyer before commercialising |

**Existing technical debt:**

| Item | Origin | Planned Resolution |
|---|---|---|
| Chainlit-based main.py still active | Previous autonomous agent concept | Replace with FastAPI app in next iteration |
| LangGraph graph still wired in main.py | Previous concept | Remove or isolate behind a feature flag |
| No backend tests | Early prototype stage | Add pytest coverage for step validation and GraphRAG retrieval before first public release |
| Rule data only in Markdown files | Early prototype stage | Run `ingest_rules.py` against the Foundry module to migrate into Atlas graph; Markdown files superseded |
| No OGL attribution file | Licence obligation | Add `OGL.md` listing all Open Game Content before first public distribution |
| Ingestion package has no explicit GPL header | Licence obligation | Add GPL v3 `SPDX-License-Identifier` header to every file in `agent/ingestion/` |

---

## 12. Glossary

| Term | Definition |
|---|---|
| **PF1e** | Pathfinder First Edition, the tabletop RPG system this app targets |
| **Character Draft** | The in-progress character data model shared between frontend and backend |
| **Wizard** | The multi-step form UI that guides the user through character creation |
| **AI Sidekick** | The AI chat assistant embedded in the wizard, providing optional contextual help |
| **Feat** | A character ability chosen at specific levels; feats have prerequisites in PF1e |
| **Step Registry** | A data structure in the frontend that defines the ordered list of wizard steps |
| **GraphRAG** | Retrieval-Augmented Generation using a knowledge graph; combines vector search (seed node recall) with graph traversal (multi-hop context expansion) |
| **RuleNode** | A document in the `rule_nodes` Atlas collection representing one PF1e entity (feat, class, race, etc.) with an embedding |
| **RuleEdge** | A document in the `rule_edges` Atlas collection representing a directed relationship between two `RuleNode`s |
| **Foundry VTT module** | The community PF1e system module for Foundry Virtual Tabletop (hosted on GitLab); used as the authoritative source for rule entity data |
| **Ingestion job** | `ingest_rules.py` + `foundry_parser.py` — one-off pipeline that reads Foundry entity JSON, builds nodes/edges, and upserts them into Atlas |
| **Atlas Vector Search** | MongoDB Atlas feature that stores and queries dense vector embeddings; used for semantic seed-node recall in GraphRAG |
| **motor** | Async Python MongoDB driver used by FastAPI to interact with Atlas |
| **Auth0** | External identity provider; issues JWTs used by both the React SPA and the FastAPI backend |
| **JWKS** | JSON Web Key Set — Auth0 public keys fetched by the backend to verify JWT signatures |
| **owner_id** | The Auth0 `sub` claim extracted from the JWT; used to scope character documents in Atlas |
| **SSE** | Server-Sent Events — a one-way HTTP streaming mechanism used for the chat endpoint |
| **ADR** | Architecture Decision Record — a short document capturing a key architectural choice |
