# Practice Lab + Patterns Library

Add two new tabs to the platform: a **Practice Lab** with curated vulnerable-site cards agents can train on (synced with Recon), and a **Patterns** library where every agent contributes learned patterns and the Commander approves/rejects them.

## 1. Practice Lab (`/lab`)

New page with a grid of clickable **Lab Cards**, each representing a legally-safe intentionally-vulnerable practice target:

1. **OWASP Juice Shop** — `https://juice-shop.herokuapp.com` — modern JS app, full OWASP Top 10.
2. **DVWA** (Damn Vulnerable Web App) — `http://www.dvwa.co.uk` / local — classic PHP/MySQL vuln lab.
3. **PortSwigger Web Security Academy** — `https://portswigger.net/web-security` — hosted labs by vuln class.
4. **HackTheBox / testphp.vulnweb.com** — `http://testphp.vulnweb.com` — Acunetix's public test site (SQLi, XSS).
5. **Google Gruyere** — `https://google-gruyere.appspot.com` — XSS, CSRF, AuthZ.
6. **HackThisSite** — `https://www.hackthissite.org` — legal challenges + missions.
7. **Hack The Box: Web Challenges** — `https://www.hackthebox.com` — reference link.

Each card shows: name, target URL, difficulty, vuln categories (tags), short description, "Open Lab Session" button.

### Lab Session flow
Clicking a card opens a **Lab Session** dialog with:
- **Template picker**: `Full Recon Sweep`, `Auth & Session Testing`, `Injection Hunt (SQLi/XSSI/SSTI)`, `Business Logic Probe`, `API Fuzzing`, or `Custom Session` (blank).
- Optional operator notes.
- **Start Session** button → creates a new `missions` row with `name = "LAB: {site}"`, `target = url`, `notes = template + operator notes`, `status = 'active'`, then navigates to `/` (Recon) so Commander/Leads pick it up as the active mission.
- Because `useMission` selects the latest active mission, the new lab mission becomes the live one and the conversation feed is scoped to it.

## 2. Patterns Library (`/patterns`)

New tab where every agent (raider + leads) submits patterns they've learned; Commander approves or declines.

### DB — new table `patterns`
```
id uuid pk
user_id uuid not null
mission_id uuid null (source mission, optional)
session_id uuid null
agent_codename text not null       -- who found it
category text not null             -- e.g. auth, injection, recon, business-logic
title text not null
description text not null
example text null                  -- payload/snippet
tags text[] default '{}'
status text not null default 'pending'   -- pending | approved | declined
commander_note text null
created_at timestamptz default now()
reviewed_at timestamptz null
```
+ standard grants + RLS (owner-only) + updated_at trigger not needed (no updated_at).

### Patterns page
- Filter chips: `All | Pending | Approved | Declined` + agent filter.
- Cards show title, agent, category, tags, description, example, status pill.
- Commander actions per pending card: **Approve** / **Decline** (with optional note) → updates row, flips status.
- **Add Pattern** button opens a form (agent codename dropdown incl. `Operator`, category, title, description, example, tags). Approved patterns feed the Second Brain-style knowledge base.

### Agent instruction injection
Update `mission-chat/index.ts` system prompts so every Lead + Raider is told: *"When you notice a novel exploitation or recon pattern during this session, emit a `PATTERN:` block at the end of your message with `title | category | description | example`. These are queued for Commander review — do not treat them as approved skills."*
Commander system prompt gets: *"You are the sole approver of new patterns. When the operator asks about pending patterns, summarise and recommend accept/decline."*

Parsing agent output for `PATTERN:` blocks and auto-inserting `patterns` rows (status=pending, agent_codename=lead) happens in the edge function after each lead reply.

## 3. Navigation
Add `Lab` (FlaskConical icon) and `Patterns` (Sparkles icon) to `LeftSidebar` between existing items. Add routes in `App.tsx`.

## 4. Files touched
- New: `src/pages/PracticeLab.tsx`, `src/pages/Patterns.tsx`, `supabase/migrations/<ts>_patterns.sql`
- Edit: `src/App.tsx`, `src/components/LeftSidebar.tsx`, `supabase/functions/mission-chat/index.ts`

## Out of scope
- Actually proxying/embedding lab sites (we link out — safer legally).
- Automated pattern extraction from historical sessions (only new agent turns).
