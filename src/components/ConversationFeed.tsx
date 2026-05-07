import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Crosshair, User, Swords, Activity, Loader2, Bot, Globe, Network, Fingerprint, Search, ShieldAlert, Mail, Target, Check, X, Pencil } from "lucide-react";
import { useMission, useMessages } from "@/hooks/useMission";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const roleStyles = {
  user: { border: "border-foreground/20", badge: "bg-foreground/10 text-foreground", icon: User },
  manager: { border: "border-primary/40", badge: "bg-primary/15 text-primary", icon: Crosshair },
  lead: { border: "border-primary/25", badge: "bg-primary/10 text-primary", icon: Swords },
  raider: { border: "border-border", badge: "bg-surface-3 text-muted-foreground", icon: Activity },
};

// Validate domain / IPv4 / IPv6 / CIDR
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const IPV4_RE = /^(25[0-5]|2[0-4]\d|[01]?\d?\d)(\.(25[0-5]|2[0-4]\d|[01]?\d?\d)){3}(\/([0-9]|[12]\d|3[0-2]))?$/;
const IPV6_RE = /^([0-9a-f]{1,4}:){2,7}[0-9a-f]{1,4}(\/\d{1,3})?$/i;
const isValidScope = (s: string) => {
  const v = s.trim().toLowerCase();
  if (!v || v === "target.com") return false;
  return DOMAIN_RE.test(v) || IPV4_RE.test(v) || IPV6_RE.test(v);
};

export default function ConversationFeed() {
  const { mission, conversation, loading: missionLoading, updateTarget } = useMission();
  const { messages, loading: msgLoading, sendMessage, refresh } = useMessages(conversation?.id);
  const [input, setInput] = useState("");
  const [agentsThinking, setAgentsThinking] = useState(false);
  const [editingScope, setEditingScope] = useState(false);
  const [scopeDraft, setScopeDraft] = useState("");
  const [savingScope, setSavingScope] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentsThinking]);

  const runPrompt = async (text: string) => {
    if (!text.trim() || agentsThinking) return;
    const userMsg = await sendMessage(text);
    if (!userMsg) return;

    setAgentsThinking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let extraLeads: any[] = [];
      let toggles: Record<string, boolean> = {};
      try {
        const t = localStorage.getItem("liq.leadToggles");
        if (t) toggles = JSON.parse(t) || {};
      } catch {}
      const isOn = (n: string) => toggles[n] !== false; // default ON
      try {
        const raw = localStorage.getItem("liq.activeLeads");
        if (raw) {
          extraLeads = (JSON.parse(raw) || [])
            .filter((l: any) => l && l.name && l.prompt && isOn(l.name))
            .map((l: any) => ({ codename: l.name, role: l.role, prompt: l.prompt }));
        }
      } catch {}
      const disabledBaseLeads = ["PHANTOM", "VIPER", "SPECTER"].filter(n => !isOn(n));
      const body = JSON.stringify({
        conversationId: conversation?.id,
        userMessage: text,
        history: messages.slice(-20),
        extraLeads,
        disabledBaseLeads,
      });

      // Retry on transient edge-runtime outages (503/504/502)
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
              body,
            }
          );
          if (resp.ok || !TRANSIENT.has(resp.status)) break;
          lastErr = new Error(`Edge runtime ${resp.status} (attempt ${attempt}/${MAX_ATTEMPTS})`);
        } catch (netErr) {
          lastErr = netErr;
        }
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }

      if (!resp || !resp.ok) {
        if (resp && TRANSIENT.has(resp.status)) {
          throw new Error("The agent service is temporarily unavailable. Please try again in a moment.");
        }
        const err = resp ? await resp.json().catch(() => ({ error: `Error ${resp!.status}` })) : { error: lastErr?.message };
        throw new Error(err.error || `Error ${resp?.status ?? "network"}`);
      }

      await refresh();
    } catch (e: any) {
      console.error("Agent error:", e);
      toast({
        title: "Agent Error",
        description: e.message || "Failed to get agent response",
        variant: "destructive",
      });
    } finally {
      setAgentsThinking(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || agentsThinking) return;
    const text = input;
    setInput("");
    await runPrompt(text);
  };

  const target = mission?.target || "target.com";
  const quickActions = [
    {
      label: "DNS Recon",
      icon: Globe,
      prompt: `Phantom: Run full DNS reconnaissance on ${target}. Enumerate A/AAAA/MX/NS/TXT/CNAME records, check for zone transfer (AXFR), identify DNS providers, and surface any subdomain hints from records. Provide exact dig/dnsx commands and parse expected output.`,
    },
    {
      label: "Subdomain Enum",
      icon: Search,
      prompt: `Phantom: Perform passive + active subdomain enumeration on ${target} using subfinder, amass, assetfinder, and crt.sh. Deduplicate, resolve live hosts with httpx, and report wildcard handling. Output the exact commands and a sample pipeline.`,
    },
    {
      label: "Port Scan",
      icon: Network,
      prompt: `Phantom: Run a tiered port scan on ${target}. Start with masscan top-1000, then nmap -sV -sC -p- on responsive hosts. Identify exposed services, banners, and unusual ports. Provide commands, expected runtime, and triage notes.`,
    },
    {
      label: "Tech Fingerprint",
      icon: Fingerprint,
      prompt: `Phantom: Fingerprint the tech stack of ${target} using whatweb, wappalyzer, httpx -tech-detect, and nuclei -t technologies/. Identify CMS, frameworks, CDN/WAF, JS libs, server headers, and likely versions. List CVE-relevant versions for Viper to follow up on.`,
    },
    {
      label: "WAF/CDN Detect",
      icon: ShieldAlert,
      prompt: `Specter: Detect WAF/CDN protecting ${target} using wafw00f, nmap http-waf-detect, and header analysis. Identify provider (Cloudflare/Akamai/AWS/etc.), origin-IP leak vectors (DNS history, SSL cert SANs, subdomain misconfig), and bypass approaches.`,
    },
    {
      label: "Email/OSINT",
      icon: Mail,
      prompt: `Phantom: Gather OSINT on ${target} — harvest emails (theHarvester, hunter.io patterns), check breach exposure (HIBP), enumerate employees on LinkedIn, find leaked creds on GitHub/pastebin, and surface SPF/DMARC/DKIM posture for phishing assessment.`,
    },
  ];

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
          <span className="font-mono text-xs font-bold text-primary tracking-wider neon-gold">
            MISSION FEED
          </span>
          <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-surface-2 border border-border">
            {mission ? `ACTIVE — ${mission.name.toUpperCase()}` : "NO MISSION"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span>{messages.length} messages</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !agentsThinking && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Crosshair className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm font-mono text-muted-foreground">No messages yet.</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">Command your agents to begin the mission.</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const style = roleStyles[msg.role] || roleStyles.user;
          const Icon = style.icon;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex gap-3 ${msg.role === "raider" ? "ml-8" : ""}`}
            >
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
                <p className="text-[12px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{msg.content}</p>
              </div>
            </motion.div>
          );
        })}

        {/* Thinking indicator */}
        {agentsThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center border border-primary/40 bg-surface-2">
              <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-primary animate-spin" />
              <span className="text-[11px] font-mono text-primary animate-pulse">
                Agents processing mission directives...
              </span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
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
                    if (!isValidScope(scopeDraft)) {
                      toast({ title: "Invalid scope", description: "Enter a valid domain, IP, or CIDR.", variant: "destructive" });
                      return;
                    }
                    setSavingScope(true);
                    await updateTarget(scopeDraft.trim().toLowerCase());
                    setSavingScope(false);
                    setEditingScope(false);
                  } else if (e.key === "Escape") {
                    setEditingScope(false);
                  }
                }}
                placeholder="example.com or 10.0.0.0/24"
                className={`bg-surface-2 border rounded px-2 py-0.5 text-[10px] font-mono w-56 focus:outline-none ${
                  scopeDraft && !isValidScope(scopeDraft) ? "border-destructive text-destructive" : "border-primary/40 text-foreground"
                }`}
              />
              <button
                onClick={async () => {
                  if (!isValidScope(scopeDraft)) {
                    toast({ title: "Invalid scope", description: "Enter a valid domain, IP, or CIDR.", variant: "destructive" });
                    return;
                  }
                  setSavingScope(true);
                  await updateTarget(scopeDraft.trim().toLowerCase());
                  setSavingScope(false);
                  setEditingScope(false);
                }}
                disabled={savingScope || !isValidScope(scopeDraft)}
                className="p-0.5 rounded text-primary hover:bg-primary/15 disabled:opacity-30"
              >
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
                isValidScope(target)
                  ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                  : "border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/15"
              }`}
            >
              <Target className="w-3 h-3" />
              {isValidScope(target) ? target : "NO SCOPE SET"}
              <Pencil className="w-2.5 h-2.5 opacity-60" />
            </button>
          )}
        </div>
        {!isValidScope(target) && !editingScope && (
          <p className="text-[9px] font-mono text-destructive/80 mb-1.5">
            Set a valid target (domain, IP, or CIDR) to enable quick actions.
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {quickActions.map((a) => {
            const Icon = a.icon;
            const disabled = agentsThinking || !isValidScope(target);
            return (
              <button
                key={a.label}
                onClick={() => runPrompt(a.prompt)}
                disabled={disabled}
                title={!isValidScope(target) ? "Set a valid scope first" : a.prompt}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-2 hover:bg-primary/15 border border-border hover:border-primary/40 text-[10px] font-mono text-foreground/80 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-2 disabled:hover:border-border disabled:hover:text-foreground/80"
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
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={agentsThinking ? "Agents working..." : "Command your agents..."}
            disabled={agentsThinking}
            className="flex-1 bg-transparent px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={agentsThinking || !input.trim()}
            className="mr-2 p-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2 px-1">
          <span className="text-[9px] font-mono text-muted-foreground">
            Press Enter to send • Commander → Leads respond with AI intelligence
          </span>
        </div>
      </div>
    </div>
  );
}
