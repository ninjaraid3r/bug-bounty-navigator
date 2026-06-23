import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Send, Crosshair, User, Swords, Activity, Loader2, Bot, Globe, Network, Fingerprint, Search,
  ShieldAlert, Mail, Target, Check, X, Pencil, Trash2, CheckSquare, Square, Save, PhoneCall, FileCheck,
  UserCog, ClipboardList,
} from "lucide-react";
import { useMission, useMessages } from "@/hooks/useMission";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";

const roleStyles = {
  user: { border: "border-foreground/20", badge: "bg-foreground/10 text-foreground", icon: User },
  manager: { border: "border-primary/40", badge: "bg-primary/15 text-primary", icon: Crosshair },
  lead: { border: "border-primary/25", badge: "bg-primary/10 text-primary", icon: Swords },
  raider: { border: "border-border", badge: "bg-surface-3 text-muted-foreground", icon: Activity },
};

const BASE_LEADS = ["PHANTOM", "VIPER", "SPECTER", "CARTOGRAPHER"];

// Validate domain / IPv4 / IPv6 / CIDR
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const IPV4_RE = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}(\/([0-9]|[12]\d|3[0-2]))?$/;
const IPV6_RE = /^([0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}(\/\d{1,3})?$/i;
const isValidScope = (s: string) => {
  const v = s.trim().toLowerCase();
  if (!v || v === "target.com") return false;
  return DOMAIN_RE.test(v) || IPV4_RE.test(v) || IPV6_RE.test(v);
};

// Parse Commander's "RECOMMENDED LEADS: PHANTOM, VIPER" line.
function parseRecommendedLeads(content: string): string[] {
  const m = content.match(/RECOMMENDED LEADS\s*:\s*([^\n\r]+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s && s !== "NONE");
}

export default function ConversationFeed() {
  const { mission, conversation, loading: missionLoading, updateTarget } = useMission();
  const { messages, loading: msgLoading, sendMessage, refresh } = useMessages(conversation?.id);
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [agentsThinking, setAgentsThinking] = useState<string | null>(null);
  const [editingScope, setEditingScope] = useState(false);
  const [scopeDraft, setScopeDraft] = useState("");
  const [savingScope, setSavingScope] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [ending, setEnding] = useState(false);
  const [persona, setPersona] = useState<{ name: string; system_prompt: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Active persona (live)
  useEffect(() => {
    if (!user) return;
    const fetchPersona = async () => {
      const { data } = await (supabase as any)
        .from("commander_personas")
        .select("name,system_prompt")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      setPersona(data ? { name: data.name, system_prompt: data.system_prompt } : null);
    };
    fetchPersona();
    const h = () => fetchPersona();
    window.addEventListener("liq:persona-changed", h);
    return () => window.removeEventListener("liq:persona-changed", h);
  }, [user]);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentsThinking]);

  // Latest commander message's recommendations -> drive the "Call Lead" chips
  const recommended = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "manager") return parseRecommendedLeads(messages[i].content);
    }
    return [];
  }, [messages]);

  function getDynamicLeadsFromStorage() {
    let extraLeads: any[] = [];
    let toggles: Record<string, boolean> = {};
    try {
      const t = localStorage.getItem("liq.leadToggles");
      if (t) toggles = JSON.parse(t) || {};
    } catch {}
    const isOn = (n: string) => toggles[n] !== false;
    try {
      const raw = localStorage.getItem("liq.activeLeads");
      if (raw) {
        extraLeads = (JSON.parse(raw) || [])
          .filter((l: any) => l && l.name && l.prompt && isOn(l.name))
          .map((l: any) => ({ codename: l.name, role: l.role, prompt: l.prompt }));
      }
    } catch {}
    const disabledBaseLeads = BASE_LEADS.filter((n) => !isOn(n));
    return { extraLeads, disabledBaseLeads };
  }

  async function callEdge(body: any, label: string) {
    setAgentsThinking(label);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const TRANSIENT = new Set([502, 503, 504]);
      const MAX_ATTEMPTS = 3;
      let resp: Response | null = null;
      let lastErr: any = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mission-chat`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify(body),
            }
          );
          if (resp.ok || !TRANSIENT.has(resp.status)) break;
          lastErr = new Error(`Edge runtime ${resp.status} (attempt ${attempt}/${MAX_ATTEMPTS})`);
        } catch (netErr) { lastErr = netErr; }
        if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 1500 * attempt));
      }

      if (!resp || !resp.ok) {
        if (resp && TRANSIENT.has(resp.status)) throw new Error("The agent service is temporarily unavailable. Please try again in a moment.");
        const err = resp ? await resp.json().catch(() => ({ error: `Error ${resp!.status}` })) : { error: lastErr?.message };
        throw new Error(err.error || `Error ${resp?.status ?? "network"}`);
      }
      await refresh();
    } catch (e: any) {
      console.error("Agent error:", e);
      toast({ title: "Agent Error", description: e.message || "Failed to get agent response", variant: "destructive" });
    } finally {
      setAgentsThinking(null);
    }
  }

  // Commander-only turn (default chat send)
  const runPrompt = async (text: string) => {
    if (!text.trim() || agentsThinking) return;
    const userMsg = await sendMessage(text);
    if (!userMsg) return;
    const { extraLeads, disabledBaseLeads } = getDynamicLeadsFromStorage();
    await callEdge({
      conversationId: conversation?.id,
      userMessage: text,
      history: messages.slice(-20),
      extraLeads,
      disabledBaseLeads,
      invokeLeads: [], // Commander-only
      personaName: persona?.name,
      personaPrompt: persona?.system_prompt,
    }, persona ? `Commander · ${persona.name}` : "Commander");
  };

  // Operator summons specific Lead(s) — Commander does not re-respond.
  const callLeads = async (leadCodes: string[]) => {
    if (!leadCodes.length || agentsThinking) return;
    const summons = `[Operator] Calling on ${leadCodes.join(", ")} per the agreed plan. Execute your part.`;
    const userMsg = await sendMessage(summons);
    if (!userMsg) return;
    const { extraLeads, disabledBaseLeads } = getDynamicLeadsFromStorage();
    await callEdge({
      conversationId: conversation?.id,
      userMessage: summons,
      history: messages.slice(-20),
      extraLeads,
      disabledBaseLeads,
      invokeLeads: leadCodes,
      skipCommander: true,
    }, leadCodes.join(" + "));
  };

  const handleSend = async () => {
    if (!input.trim() || agentsThinking) return;
    const text = input;
    setInput("");
    await runPrompt(text);
  };

  const target = mission?.target || "target.com";
  const quickActions = [
    { label: "DNS Recon", icon: Globe, leads: ["PHANTOM"], prompt: `Run full DNS reconnaissance on ${target}. Enumerate A/AAAA/MX/NS/TXT/CNAME records, check AXFR, identify DNS providers and subdomain hints.` },
    { label: "Subdomain Enum", icon: Search, leads: ["PHANTOM", "CARTOGRAPHER"], prompt: `Passive + active subdomain enumeration on ${target} via subfinder, amass, assetfinder, crt.sh. Dedupe and resolve with httpx.` },
    { label: "Port Scan", icon: Network, leads: ["PHANTOM"], prompt: `Tiered port scan on ${target}: masscan top-1000 then nmap -sV -sC -p- on responsive hosts.` },
    { label: "Tech Fingerprint", icon: Fingerprint, leads: ["PHANTOM"], prompt: `Fingerprint tech stack of ${target} with whatweb, wappalyzer, httpx -tech-detect, nuclei -t technologies/.` },
    { label: "WAF/CDN Detect", icon: ShieldAlert, leads: ["SPECTER"], prompt: `Detect WAF/CDN protecting ${target} with wafw00f and header analysis. Find origin-IP leak vectors and bypass approaches.` },
    { label: "Email/OSINT", icon: Mail, leads: ["PHANTOM"], prompt: `OSINT on ${target} — harvest emails, breach exposure, employee enumeration, leaked creds, SPF/DMARC/DKIM posture.` },
  ];

  // ------- selection / edit / delete helpers -------
  const allIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const allSelected = selectedIds.size > 0 && selectedIds.size === allIds.length;
  const toggleSelect = (id: string) => {
    const n = new Set(selectedIds);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelectedIds(n);
  };
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  };
  const clearSelection = () => setSelectedIds(new Set());

  async function deleteSelected() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} message(s) permanently?`)) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("messages").delete().in("id", ids);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: `Deleted ${ids.length} message(s)` });
    clearSelection();
    await refresh();
  }

  function startEditSelected() {
    if (selectedIds.size !== 1) return toast({ title: "Select exactly one message to edit" });
    const id = Array.from(selectedIds)[0];
    const msg = messages.find((m) => m.id === id);
    if (!msg) return;
    if (msg.role !== "user") return toast({ title: "Only your own messages can be edited" });
    setEditingMsgId(id);
    setEditDraft(msg.content);
  }

  async function saveEdit() {
    if (!editingMsgId) return;
    const { error } = await supabase.from("messages").update({ content: editDraft }).eq("id", editingMsgId);
    if (error) return toast({ title: "Edit failed", description: error.message, variant: "destructive" });
    toast({ title: "Message updated" });
    setEditingMsgId(null);
    setEditDraft("");
    await refresh();
  }

  async function endSessionOverview() {
    if (ending || !conversation?.id) return;
    // Collect active agents from localStorage (Leads + dynamic) + Commander
    let activeLeads: string[] = [];
    try {
      const raw = localStorage.getItem("liq.activeLeads");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) activeLeads = parsed.map((s) => String(s).toUpperCase());
      }
    } catch { /* ignore */ }
    // Default: all base leads if nothing toggled
    if (!activeLeads.length) activeLeads = ["PHANTOM", "VIPER", "SPECTER", "CARTOGRAPHER"];
    const codenames = ["COMMANDER", ...activeLeads];

    setEnding(true);
    toast({ title: "Generating overviews", description: `${codenames.length} agents writing end-of-session summaries…` });
    try {
      const { data, error } = await supabase.functions.invoke("lead-session-overview", {
        body: { conversationId: conversation.id, missionId: mission?.id, agentCodenames: codenames },
      });
      if (error) throw error;
      const oks = (data?.perAgent || []).filter((a: any) => a.ok).length;
      toast({ title: "Overviews complete", description: `${oks}/${codenames.length} agents saved. Open the Agents tab to review.` });
      await refresh();
    } catch (e: any) {
      toast({ title: "End session failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setEnding(false);
    }
  }

  if (missionLoading || msgLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-1">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-gold" />
          <span className="font-mono text-xs font-bold text-primary tracking-wider neon-gold">MISSION FEED</span>
          <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-surface-2 border border-border">
            {mission ? `ACTIVE — ${mission.name.toUpperCase()}` : "NO MISSION"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span>{messages.length} messages</span>
        </div>
      </div>

      {/* Selection toolbar */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-surface-1/60">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-1.5 text-[10px] font-mono text-foreground/70 hover:text-primary"
        >
          {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
          {allSelected ? "Unselect All" : "Select All"}
        </button>
        <span className="text-[10px] font-mono text-muted-foreground">
          {selectedIds.size} selected
        </span>
        <div className="flex-1" />
        <button
          onClick={startEditSelected}
          disabled={selectedIds.size !== 1}
          className="flex items-center gap-1 text-[10px] font-mono text-foreground/70 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed px-2 py-0.5 rounded border border-border hover:border-primary/40"
          title="Edit selected message (only your own)"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={deleteSelected}
          disabled={!selectedIds.size}
          className="flex items-center gap-1 text-[10px] font-mono text-destructive/80 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed px-2 py-0.5 rounded border border-destructive/30 hover:border-destructive/60"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !agentsThinking && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Crosshair className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm font-mono text-muted-foreground">No messages yet.</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">Brief the Commander to start planning.</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const style = roleStyles[msg.role] || roleStyles.user;
          const Icon = style.icon;
          const isSelected = selectedIds.has(msg.id);
          const isEditing = editingMsgId === msg.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex gap-2 ${msg.role === "raider" ? "ml-8" : ""} ${isSelected ? "bg-primary/5 -mx-2 px-2 py-1 rounded" : ""}`}
            >
              <div className="pt-1.5">
                <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(msg.id)} />
              </div>
              <div className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center border ${style.border} bg-surface-2`}>
                <Icon className={`w-3.5 h-3.5 ${msg.role === "manager" || msg.role === "lead" ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] font-mono font-bold ${msg.role === "user" ? "text-foreground" : "text-primary"}`}>
                    {msg.sender_name}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </span>
                </div>
                {isEditing ? (
                  <div className="flex flex-col gap-1">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      className="w-full text-[12px] bg-surface-2 border border-primary/40 rounded p-2 font-mono text-foreground focus:outline-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={saveEdit} className="flex items-center gap-1 text-[10px] font-mono text-primary hover:bg-primary/15 px-2 py-0.5 rounded border border-primary/40">
                        <Save className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => { setEditingMsgId(null); setEditDraft(""); }} className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Thinking indicator */}
        {agentsThinking && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
            <div className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center border border-primary/40 bg-surface-2">
              <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-primary animate-spin" />
              <span className="text-[11px] font-mono text-primary animate-pulse">
                {agentsThinking} processing directives...
              </span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* CALL LEAD chips — recommended by Commander */}
      <div className="px-3 pt-2 pb-2 border-t border-border bg-surface-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-[9px] font-mono font-bold text-primary tracking-wider">CALL LEAD</span>
          <span className="text-[9px] font-mono text-muted-foreground">
            {recommended.length ? "Commander recommends:" : "Plan with Commander first, then summon a Lead:"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {BASE_LEADS.map((lead) => {
            const isRec = recommended.includes(lead);
            const disabled = !!agentsThinking;
            return (
              <button
                key={lead}
                onClick={() => callLeads([lead])}
                disabled={disabled}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isRec
                    ? "bg-primary/15 border border-primary/60 text-primary hover:bg-primary/25 shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
                    : "bg-surface-2 border border-border text-foreground/70 hover:border-primary/40 hover:text-primary"
                }`}
              >
                <PhoneCall className="w-3 h-3" />
                {lead}
                {isRec && <span className="text-[8px] opacity-70">★</span>}
              </button>
            );
          })}
          {recommended.length > 1 && (
            <button
              onClick={() => callLeads(recommended)}
              disabled={!!agentsThinking}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              <PhoneCall className="w-3 h-3" />
              Call All Recommended
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={endSessionOverview}
            disabled={ending || !!agentsThinking}
            title="Have Commander + active Leads each write an end-of-session overview (saved to Agents tab)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono bg-surface-2 border border-primary/40 text-primary hover:bg-primary/15 hover:neon-gold-box transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {ending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCheck className="w-3 h-3" />}
            {ending ? "Generating…" : "End Session — Generate Overviews"}
          </button>
        </div>
      </div>

      {/* Quick Recon Actions */}
      <div className="px-3 pt-2 pb-2 border-t border-border bg-surface-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[9px] font-mono font-bold text-primary tracking-wider">QUICK RECON</span>
          <span className="text-[9px] font-mono text-muted-foreground">SCOPE:</span>
          {editingScope ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={scopeDraft}
                onChange={(e) => setScopeDraft(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    if (!isValidScope(scopeDraft)) { toast({ title: "Invalid scope", description: "Enter a valid domain, IP, or CIDR.", variant: "destructive" }); return; }
                    setSavingScope(true); await updateTarget(scopeDraft.trim().toLowerCase()); setSavingScope(false); setEditingScope(false);
                  } else if (e.key === "Escape") { setEditingScope(false); }
                }}
                placeholder="example.com or 10.0.0.0/24"
                className={`bg-surface-2 border rounded px-2 py-0.5 text-[10px] font-mono w-56 focus:outline-none ${
                  scopeDraft && !isValidScope(scopeDraft) ? "border-destructive text-destructive" : "border-primary/40 text-foreground"
                }`}
              />
              <button onClick={async () => { if (!isValidScope(scopeDraft)) { toast({ title: "Invalid scope", description: "Enter a valid domain, IP, or CIDR.", variant: "destructive" }); return; } setSavingScope(true); await updateTarget(scopeDraft.trim().toLowerCase()); setSavingScope(false); setEditingScope(false); }} disabled={savingScope || !isValidScope(scopeDraft)} className="p-0.5 rounded text-primary hover:bg-primary/15 disabled:opacity-30">
                {savingScope ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              </button>
              <button onClick={() => setEditingScope(false)} className="p-0.5 rounded text-muted-foreground hover:bg-surface-2">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setScopeDraft(mission?.target && mission.target !== "target.com" ? mission.target : ""); setEditingScope(true); }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono transition-all ${
                isValidScope(target) ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15" : "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/15"
              }`}
            >
              <Target className="w-3 h-3" />
              {isValidScope(target) ? target : "NO SCOPE SET"}
              <Pencil className="w-2.5 h-2.5 opacity-60" />
            </button>
          )}
        </div>
        {!isValidScope(target) && !editingScope && (
          <p className="text-[9px] font-mono text-destructive/80 mb-1.5">Set a valid target (domain, IP, or CIDR) to enable quick actions.</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {quickActions.map((a) => {
            const Icon = a.icon;
            const disabled = !!agentsThinking || !isValidScope(target);
            return (
              <button
                key={a.label}
                onClick={async () => {
                  // Brief commander, then summon the specialist leads in one move
                  await runPrompt(a.prompt);
                  await callLeads(a.leads);
                }}
                disabled={disabled}
                title={!isValidScope(target) ? "Set a valid scope first" : `${a.prompt}\nCalls: ${a.leads.join(", ")}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-2 hover:bg-primary/15 border border-border hover:border-primary/40 text-[10px] font-mono text-foreground/80 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon className="w-3 h-3" />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-surface-1">
        <div className="flex items-center gap-2 bg-surface-2 rounded-lg border border-border focus-within:border-primary/30 focus-within:neon-gold-box transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={agentsThinking ? "Agents working..." : "Brief the Commander..."}
            disabled={!!agentsThinking}
            className="flex-1 bg-transparent px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={!!agentsThinking || !input.trim()} className="mr-2 p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-30">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2 px-1">
          <span className="text-[9px] font-mono text-muted-foreground">
            Enter → talks to Commander only · Use "Call Lead" chips to summon a Lead
          </span>
        </div>
      </div>
    </div>
  );
}
