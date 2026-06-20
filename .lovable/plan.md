## 0. Smoke test first
- Open the preview and walk these routes to confirm no runtime errors after the recent AppShell/Agents refactor: `/`, `/agents`, `/agents/tier/leads`, `/commander/sessions`, `/targets`, `/settings`, `/skills/pending`.
- Verify the flicker fix still holds and the new agent_* tables read cleanly.
- Capture any breakage and fix before starting the consolidation work below.

## 1. Tab consolidation

### A. New "Offensive Ops" tab (`/offensive-ops`)
Merges: Exploit Lab + Vuln Scanner + Automation + Payload Forge.
- Single page with 4 sub-sections rendered as a vertical stack of **expandable hero cards** (click to expand → reveals full toolset for that section, click again to collapse). Only one open at a time.
  - Exploit Lab — PoC runner, recent exploit attempts, success rate ring.
  - Vuln Scanner — scan queue, severity histogram, last-scan delta.
  - Automation — pipelines, schedule heatmap, run history.
  - Payload Forge — category grid, copy-to-clipboard, "send to Exploit Lab" handoff.
- Collapsed state shows a metric strip (count, last-run, status pulse). Expanded state shows the full tool surface plus a new "Innovations" mini-panel suggesting next-step automations derived from the data already present (no new business logic — purely UI surfacing what the table already holds).
- Remove old sidebar entries for Exploit Lab, Vuln Scanner, Automation, Payload Forge; keep routes redirecting to `/offensive-ops` so old links don't 404.

### B. New "Intel Map" tab (`/intel-map`)
Merges: Targets + Reports + Network Map.
- Top hero: live Network Map canvas (existing component) full-bleed.
- Below: two expandable card columns — **Targets** (asset list, status, scope) and **Reports** (PDF/MD findings, severity breakdown). Each card click-to-expand into a rich detail drawer with metrics: open findings per target, last-touched, related recon nodes.
- Innovations strip: "Auto-correlate findings to targets", "Generate exec report from selected nodes" — UI surfaces only, wired to existing endpoints where they exist.
- Sidebar removes Targets / Reports / Network Map; routes redirect to `/intel-map`.

## 2. New "Data Vault" tab (`/data-vault`)
Single source of truth for what graduates into the knowledge base.
- Pulls from `agent_learnings`, `agent_memory`, `agent_opinions`, `agent_recommendations`, plus findings + session summaries.
- Three columns: **Pending** | **Confirmed** | **Rejected**. Each row is a clickable card → drawer with source agent, session link, raw text, metadata.
- Bulk select + Confirm/Reject buttons. Confirm flips a new `status` column (`pending|confirmed|rejected`) on the source row; confirmed items are what the rest of the platform treats as canonical.
- Migration: add nullable `vault_status text default 'pending'` to the four agent_* tables + `findings`. Backfill existing rows to `pending`. RLS unchanged (user-scoped).

## 3. Settings expansion
Keep all current toggles; add a second column of cards:
- **AGENT DEFAULTS** — default Lead persona, auto-spawn raiders on new session, max concurrent raiders (slider).
- **DATA VAULT** — auto-confirm High learnings, auto-reject Low after N days, require commander sign-off.
- **NOTIFICATIONS+** — session-end summary, new persona added, skill approved.
- **INTERFACE** — sidebar collapsed by default, reduce motion, compact density.
- **INTEGRATIONS** — placeholders (disabled toggles) for HackerOne / Bugcrowd / Slack webhook URLs (text inputs, persisted to localStorage only for now).
All new state persists to localStorage; no schema change required.

## 4. Commander Personas (RightSidebar)
- Add a **Personas** button on the Commander card in the right sidebar.
- Clicking opens a dialog/sheet showing:
  - Current active persona (highlighted) with description.
  - Library of template personas (seeded list of 4-6: Strategist, Red-Team Lead, Bug-Bounty Hunter, Stealth Operator, Teacher, Auditor).
  - Per-row Edit / Delete buttons; top-level "Add new persona from template" → form (name, role, system prompt).
- Selecting a persona sets it active; the persona **name** then renders inline on the Commander card under the role line (e.g. "Manager Agent · STRATEGIST").
- Storage: new `commander_personas` table (id, user_id, name, description, system_prompt, is_active, created_at). RLS user-scoped, GRANTs to authenticated + service_role. Only one `is_active=true` per user enforced client-side on save.

## 5. Order of operations
1. Smoke test → fix any breakage.
2. Migration: vault_status columns + commander_personas table.
3. Build `/offensive-ops` and `/intel-map`, add redirects, update LeftSidebar.
4. Build `/data-vault`.
5. Extend Settings.
6. Build Personas card + dialog in RightSidebar, wire to commander_personas.
7. Final preview pass on every route.

## Out of scope this pass
- Filesystem `.md` export of skills (still DB-only).
- Real HackerOne/Bugcrowd integrations (UI shells only).
- AI auto-grading of vault items (manual confirm/reject only).
