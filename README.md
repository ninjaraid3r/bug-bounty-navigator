# LiQ.Raid3r — LiQuidity Raid3r

> Autonomous bug bounty agent orchestrator — an "Evil Twin" of XBOW. Dark velvet UI with neon-gold accents, powered by an AI agent hierarchy that automates reconnaissance, exploitation, and reporting.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Features](#features)
   - [Authentication](#1-authentication)
   - [Mission Feed](#2-mission-feed)
   - [Left Sidebar Navigation](#3-left-sidebar-navigation)
   - [Second Brain — Tool Catalog](#4-second-brain--tool-catalog)
   - [Tool Sandbox — LLM Simulation](#5-tool-sandbox--llm-simulation)
   - [Right Sidebar — Mission Intel](#6-right-sidebar--mission-intel)
4. [Agent Hierarchy](#agent-hierarchy)
5. [Tech Stack](#tech-stack)

---

## Overview

LiQ.Raid3r is an AI-powered bug bounty platform that orchestrates a hierarchy of autonomous agents to perform security assessments. You act as the **Commander** — issuing high-level directives while your agents (Leads and Raiders) break down targets, run tools, and report findings.

All data (missions, messages, tools, findings) is persisted to a backend database with row-level security, so every user's workspace is private and persistent across sessions.

---

## Getting Started

1. **Sign Up / Sign In** — Create an account with your email and password on the Auth page.
2. **Land on the Mission Feed** — Your first mission and conversation are auto-created on login.
3. **Command your agents** — Type directives in the chat input to start orchestrating your recon.
4. **Explore Second Brain** — Browse, add, edit, or sandbox any security tool in your catalog.
5. **Review findings** — Check the Right Sidebar for live mission stats and agent status.

---

## Features

### 1. Authentication

- **Where:** `/auth`
- **What it does:** Provides email/password sign-up and sign-in. All routes are protected — unauthenticated users are redirected here automatically.
- **How to use:**
  1. Enter your email and a password (min 6 characters).
  2. Click **Sign Up** to create an account, or **Sign In** if you already have one.
  3. After signing up, check your email for a verification link before signing in.
  4. Once authenticated, you're redirected to the Mission Feed.

---

### 2. Mission Feed

- **Where:** `/` (home page, center panel)
- **What it does:** The main command interface. This is where you issue orders to your AI agents and see the full conversation history. Messages are role-coded (User, Commander, Lead, Raider) with distinct visual styles.
- **How to use:**
  1. Type a command in the input bar at the bottom (e.g., "Scan example.com for open ports").
  2. Press **Enter** or click the **Send** button.
  3. Your message is saved to the database and appears in the feed instantly.
  4. Agent responses (once the AI Gateway is live) will appear with their role badges.
  5. The header shows the active mission name and total message count.

---

### 3. Left Sidebar Navigation

- **Where:** Left edge of the screen (all pages)
- **What it does:** Primary navigation hub with links to all major sections. Collapsible to icon-only mode for more screen space.
- **How to use:**
  1. Click any nav item to navigate: **Recon** (Mission Feed), **Second Brain**, Attack Surface, Exploit Lab, Vuln Scanner, Payload Forge, Network Map, Targets, Reports, Automation, Settings.
  2. Click the **collapse toggle** (small circle at top-right of sidebar) to shrink it to icons only.
  3. The **green pulse dot** at the bottom confirms system connectivity.
  4. Click **Sign Out** at the bottom to log out.

---

### 4. Second Brain — Tool Catalog

- **Where:** `/second-brain`
- **What it does:** A searchable, categorized encyclopedia of bug bounty tools (Nmap, Burp Suite, ffuf, SQLMap, etc.). Pre-seeded with 20+ default tools on first visit. Supports full CRUD — add your own tools, edit existing ones, bookmark favorites, and delete tools you don't need.
- **How to use:**
  1. **Search** — Use the search bar at the top to filter tools by name, description, or tags.
  2. **Filter by category** — Click category chips (Reconnaissance, Web App Scanning, Exploitation, etc.) to narrow results.
  3. **Bookmark** — Click the **star icon** on any tool card to pin it as a favorite.
  4. **Add a tool** — Click the **+ Add Tool** button in the header. Fill in name, category, description, use case, tags, difficulty, and optional website URL. Click **Save**.
  5. **Edit a tool** — Click the **pencil icon** on any tool card. Modify fields and click **Save**.
  6. **Delete a tool** — Click the **trash icon** on any tool card. The tool is permanently removed.
  7. **View details** — Each card shows the tool's difficulty badge, description, use case, and tags.

---

### 5. Tool Sandbox — LLM Simulation

- **Where:** Accessible from any tool card in Second Brain (play ▶ button)
- **What it does:** Spins up an AI-powered sandbox that simulates running the selected tool. The LLM role-plays as that tool, generating realistic scan outputs, command suggestions, and analysis — great for learning or planning an engagement without touching a real target.
- **How to use:**
  1. In Second Brain, find the tool you want to simulate.
  2. Click the **▶ Play** button on the tool card.
  3. A terminal-style modal opens with the tool's name and description.
  4. Type a command or prompt (e.g., "Run a SYN scan on 192.168.1.0/24").
  5. The AI responds with simulated output in real-time (streamed).
  6. Continue the conversation to dig deeper — ask for flags, explanations, or next steps.
  7. Click **✕** or outside the modal to close.

---

### 6. Right Sidebar — Mission Intel

- **Where:** Right edge of the screen (Mission Feed page)
- **What it does:** Displays contextual mission intelligence — active agents, mission scope, target info, and quick stats. Collapsible like the left sidebar.
- **How to use:**
  1. View active agent status and mission metadata at a glance.
  2. Click the **collapse toggle** to hide/show the panel.

---

## Agent Hierarchy

LiQ.Raid3r uses a military-style chain of command:

| Role | Description |
|------|-------------|
| **User (You)** | The Commander. Issues high-level mission directives. |
| **Manager** | The AI Commander agent. Decomposes your orders into tactical plans. |
| **Leads** | Three specialist agents — **Phantom** (recon), **Viper** (exploitation), **Specter** (reporting). Each lead manages a team of Raiders. |
| **Raiders** | Sub-agents that execute specific tool operations (scanning, fuzzing, etc.) and report back to their Lead. |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **UI Components** | shadcn/ui, Framer Motion, Lucide Icons |
| **Backend** | Lovable Cloud (database, auth, edge functions, storage) |
| **AI** | Lovable AI Gateway (Gemini / GPT models) |
| **Design** | Dark grey + dark velvet surfaces, neon gold accents, JetBrains Mono + Inter |

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `missions` | Active engagements — target, scope, status |
| `agents` | Agent registry with hierarchy (`parent_agent_id`) |
| `conversations` | Chat threads tied to missions |
| `messages` | Role-tagged messages (user/manager/lead/raider) |
| `tools` | Second Brain catalog (default + custom) |
| `findings` | Discovered vulnerabilities with severity and PoC |

All tables enforce **Row Level Security (RLS)** — each user can only access their own data.

---

*Built with [Lovable](https://lovable.dev)*
