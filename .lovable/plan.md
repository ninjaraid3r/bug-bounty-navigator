# Plan v2: Cartographer Lead + Mind-Map Memory + Skill Approval

## Part 1 — New Lead: CARTOGRAPHER (Recon Mapper)

A 4th base Lead specialized in **attack-surface mapping**. Wields verified industry tools:
subfinder, amass, assetfinder, findomain, chaos, github-subdomains, dnsx, puredns, massdns, shuffledns, httpx, katana, gau, waybackurls, hakrawler, gowitness, crt.sh, dnsdumpster, cloud_enum, s3scanner, GCPBucketBrute, ffuf, dirsearch, feroxbuster, arjun, paramspider, shodan, fofa, censys, zoomeye.

System prompt instructs Cartographer to:
1. Respond conversationally with the recon plan/findings.
2. Emit a fenced ` ```mindmap` JSON block with `{ target, nodes:[{key,parent,label,type,note}], edges:[], summary, tips:[], killchain:[] }`.
3. `tips` = ranked exploit/bug-hunt areas of interest with rationale.
4. `killchain` = ordered kill-chain test stages tied to findings (Recon → Weaponize → Deliver → Exploit → Persist → Exfil) with recommended tools per stage.

**Files**
- `supabase/functions/mission-chat/index.ts` — append CARTOGRAPHER to `AGENT_CHAIN`. After response, parse the mindmap block and upsert into `recon_maps` + `recon_map_nodes` (mission + session scoped, dedup by `node_key`). Persist `tips` and `killchain` JSON onto the `recon_maps` row.
- `src/components/RightSidebar.tsx` — add CARTOGRAPHER chip with toggle.
- `src/components/ConversationFeed.tsx` — include in enabled/disabled list.

## Part 2 — Cartographer Memory UI (lives in AgentProfile)

When user opens `/agents/cartographer`, the Memory tab gets a new **"Recon Maps"** section (in addition to existing learnings/handoffs):

```
┌─ Recon Maps ───────────────────────────────────┐
│ Table: Target | Session | Nodes | Updated | ⋯  │
│  ▸ api.acme.com   2026-05-12   42  [Open]     │
│  ▸ shop.foo.io    2026-05-10   17  [Open]     │
└────────────────────────────────────────────────┘
```

Click a row → opens a detail view (modal or inline panel) with:
- **Mind-map canvas** rendered with `@xyflow/react` (radial layout, gold-on-dark, color-coded by node type).
- **Professional Summary** block below: target, scope, asset counts by type, key risks, generated `summary` paragraph.
- Two action buttons next to the title:
  - **TIPS** → opens drawer listing Cartographer's recommended areas of interest, each with severity chip + rationale + suggested next test.
  - **KILL-CHAIN** → opens drawer listing the recommended kill-chain stages with tools per stage and which finding triggered each.

**Persistence guarantee**: `recon_maps` and `recon_map_nodes` have **no delete RLS policy** (only insert/select/update). They cannot be deleted from the UI — explicit design choice per your instruction. (Service role can still purge if ever needed.)

**Files**
- `src/components/ReconMindMap.tsx` — react-flow canvas, read-only, fits to view, export-PNG button.
- `src/components/ReconMapDetail.tsx` — visual + summary + TIPS / KILL-CHAIN buttons + drawers.
- `src/pages/AgentProfile.tsx` — when codename is CARTOGRAPHER show the Recon Maps table; clicking a row mounts `ReconMapDetail`.

## Part 3 — Skill Approval Queue

AI-extracted automations from `lead-review` and `pass-to-lead` currently insert as `status='approved'`. Change to `status='pending'`, add a queue.

- **Edge function changes**: both functions insert with `status: 'pending'`.
- **AgentProfile**: new "Pending Skills" section per lead with inline edit + Approve / Reject / Edit-and-approve.
- **New page** `src/pages/SkillApprovalQueue.tsx` at `/skills/pending` — global view across all leads, badge in left sidebar showing pending count.

## Part 4 — Database Migration

```sql
-- Recon maps (one per session/target)
create table public.recon_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mission_id uuid not null,
  session_id uuid,
  target text not null,
  summary text,
  tips jsonb not null default '[]',
  killchain jsonb not null default '[]',
  node_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mind-map nodes
create table public.recon_map_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  map_id uuid not null,
  node_key text not null,
  parent_key text,
  label text not null,
  node_type text not null,  -- root|domain|subdomain|ip|endpoint|bucket|panel|tech|note
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (map_id, node_key)
);

-- RLS: SELECT + INSERT + UPDATE only. NO DELETE policy = recon memory is permanent.
alter table public.recon_maps enable row level security;
alter table public.recon_map_nodes enable row level security;
-- (owner policies for select/insert/update on both)

-- Realtime + index for approval queue
alter publication supabase_realtime add table public.recon_map_nodes;
create index automations_status_idx on public.automations (user_id, status);
```

## Part 5 — Dependencies
- `bun add @xyflow/react`

## Out of scope this round
- Manual editing of mind-map nodes (read-only; only Cartographer writes).
- Real tool execution (Cartographer still simulates; live execution would need a separate compute backend).

After approval I'll run the migration first, then ship code.