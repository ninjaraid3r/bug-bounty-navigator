## 1. Fix the page-flicker bug

Root cause: every page mounts its own `LeftSidebar`, so on navigation the sidebar unmounts/remounts and replays its framer-motion entry animation (opacity + width tween). The flash you see is the sidebar re-animating in.

Fix (option 1 from chat): introduce a single `<AppShell>` route wrapper in `src/App.tsx` that renders `LeftSidebar` once and an `<Outlet />` for the page. All routes that currently embed `LeftSidebar` themselves (Index, AppLayout-based pages, AgentProfile, etc.) get the sidebar removed from their own JSX. Result: sidebar mounts exactly once, navigation = pure outlet swap, no flicker.

Also: `AuthGate` stays at the top so the loader doesn't run per-route.

## 2. New Agents hub

New routes:

```text
/agents                 → Agents hub (cards for Commander, Leads, Raiders)
/agents/commander       → Commander page (personas, memory, orchestrator)
/agents/leads           → Leads index + per-Lead drill-in
/agents/leads/:codename → Lead detail (Phantom / Viper / Specter / Cartographer)
/agents/raiders         → Raiders index + per-Raider drill-in
/agents/raiders/:codename
```

Each agent detail page has these sections, all populated from DB:

- **High / Medium / Low Learnings** (color-coded columns, filter by session)
- **Memory Summaries** (one card per session, agent-authored)
- **Agent Opinions** (free-form notes the agent adds from its specialty)
- **Recommended Workflows / Automations**
- **Recommended skill.md files** → "Promote to Skills tab" button writes into existing skill approval queue

The Agents hub replaces nothing in this pass — we just add it. (Tab cleanup is queued for a follow-up so we don't blow up routes while we're stabilizing the flicker fix.)

## 3. End-of-Session Overview button (Recon tab)

In the Recon page (`src/pages/Index.tsx` / `ConversationFeed`), add a button under the active-Leads area: **"End Session — Generate Overviews"**. Clicking it calls a new edge function `lead-session-overview` that, for every Lead/Raider currently flagged active in the session:

1. Pulls that agent's messages + tasks from the session
2. Asks the model to emit a structured JSON: `{summary, high[], medium[], low[], opinions[], recommended_skills[], recommended_workflows[]}`
3. Writes rows into the new `agent_learnings`, `agent_memory`, `agent_opinions`, `agent_recommendations` tables
4. Posts a short summary message back into the conversation as the agent

Button shows progress per agent and links to `/agents/<role>/<codename>` when each finishes.

## 4. Visual refresh (Settings, Targets, Sessions, Agents)

Single cohesive pass keeping the existing dark + gold-neon system. No new color palette, just richer layouts:

- **Settings**: split into sectioned cards (Profile, Workspace, Agents, Skills, Danger Zone) with neon-bordered group headers, JetBrains Mono labels, tabbed sub-nav.
- **Targets**: hero header with target chip + impact badge, two-column grid (metadata left, embedded Recon graph/canvas right with the existing toggle), expandable node list under.
- **Sessions / Session Detail**: timeline rail on the left, transcript/findings tabs on the right, agent-grade chips, status pill with neon glow.
- **Agents pages**: hero card per agent (codename, role, status dot, active toggle), then the four sections from §2 as horizontally-scrollable shelves with neon dividers.

No font changes (keeps JetBrains Mono / Inter).

## 5. Database additions

One migration adds:

- `agent_learnings(user_id, mission_id, session_id, agent_codename, level, title, body)` — level enum: high/medium/low
- `agent_memory(user_id, mission_id, session_id, agent_codename, summary)`
- `agent_opinions(user_id, agent_codename, topic, body)`
- `agent_recommendations(user_id, agent_codename, kind, title, body, status)` — kind: workflow/automation/skill, status: pending/promoted/rejected

All RLS-locked to `user_id = auth.uid()`, with GRANTs to `authenticated` + `service_role`.

## 6. New edge function

`lead-session-overview` — auth-required, ownership-checked (same pattern as `mission-chat`). Iterates active agents in the session, calls Lovable AI per agent, inserts rows into the four new tables, returns a per-agent summary array.

## 7. Order of work

1. Migration (§5) — needs approval before code reads new tables.
2. Persistent-layout flicker fix (§1).
3. Agents hub routes + pages (§2) wired to the new tables (empty states until §3 runs).
4. `lead-session-overview` edge function (§6) + Recon button (§3).
5. Visual refresh pass (§4).

## Out of scope this pass

- Deleting/consolidating existing sidebar tabs (Attack Surface, Vuln Scanner, etc.) — covered in the earlier restructure plan, will do after this stabilizes.
- Exporting agent-recommended skills as on-disk `.md` files — for now they land in the existing Skill Approval Queue as DB rows; filesystem export is a follow-up.