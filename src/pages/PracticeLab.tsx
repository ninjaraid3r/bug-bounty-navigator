import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, ExternalLink, Play, Target as TargetIcon, ShieldAlert } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Lab = {
  id: string;
  name: string;
  url: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Mixed";
  tags: string[];
  description: string;
};

const LABS: Lab[] = [
  {
    id: "juice-shop",
    name: "OWASP Juice Shop",
    url: "https://juice-shop.herokuapp.com",
    difficulty: "Mixed",
    tags: ["OWASP Top 10", "JS/Node", "API"],
    description: "Modern JavaScript SPA riddled with the entire OWASP Top 10 plus dozens of hidden challenges. Great for API + client-side attacks.",
  },
  {
    id: "dvwa",
    name: "DVWA — Damn Vulnerable Web App",
    url: "http://www.dvwa.co.uk",
    difficulty: "Beginner",
    tags: ["PHP", "SQLi", "XSS", "CSRF"],
    description: "Classic PHP/MySQL lab with tunable difficulty. Perfect warm-up for injection, upload, and auth flaws.",
  },
  {
    id: "portswigger-academy",
    name: "PortSwigger Web Security Academy",
    url: "https://portswigger.net/web-security",
    difficulty: "Mixed",
    tags: ["Curated Labs", "Burp", "Modern Bugs"],
    description: "Hosted labs by vulnerability class from the Burp Suite team. Best-in-class curriculum for serious bug hunters.",
  },
  {
    id: "vulnweb",
    name: "testphp.vulnweb.com",
    url: "http://testphp.vulnweb.com",
    difficulty: "Beginner",
    tags: ["SQLi", "XSS", "Public"],
    description: "Acunetix's public test site. Safe to scan aggressively — good for validating tooling and recon workflows.",
  },
  {
    id: "gruyere",
    name: "Google Gruyere",
    url: "https://google-gruyere.appspot.com",
    difficulty: "Intermediate",
    tags: ["XSS", "CSRF", "AuthZ"],
    description: "Google's cheesy web-security codelab covering client + server issues. Provisions a per-user instance.",
  },
  {
    id: "hackthissite",
    name: "HackThisSite",
    url: "https://www.hackthissite.org",
    difficulty: "Mixed",
    tags: ["CTF", "Web", "Missions"],
    description: "Long-running legal training ground with realistic missions across web, forensics, and stego.",
  },
];

const TEMPLATES = [
  { id: "recon", label: "Full Recon Sweep", brief: "Enumerate subdomains, endpoints, tech stack, exposed panels & buckets." },
  { id: "auth", label: "Auth & Session Testing", brief: "Probe login, JWT handling, session fixation, MFA and role isolation." },
  { id: "inject", label: "Injection Hunt (SQLi/XSS/SSTI)", brief: "Fuzz every input surface for classical + template injection vectors." },
  { id: "logic", label: "Business Logic Probe", brief: "Chain workflows to find privilege drift, race, and price/quantity abuse." },
  { id: "api", label: "API Fuzzing", brief: "Enumerate endpoints, hidden params, verb tampering, mass-assignment." },
  { id: "custom", label: "Custom Session", brief: "" },
];

const DIFF_COLOR: Record<Lab["difficulty"], string> = {
  Beginner: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  Intermediate: "text-primary border-primary/40 bg-primary/10",
  Advanced: "text-destructive border-destructive/40 bg-destructive/10",
  Mixed: "text-blue-400 border-blue-500/40 bg-blue-500/10",
};

export default function PracticeLab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState<Lab | null>(null);
  const [tpl, setTpl] = useState(TEMPLATES[0].id);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function startSession() {
    if (!user || !open) return;
    setLoading(true);
    const template = TEMPLATES.find(t => t.id === tpl)!;
    const missionNotes = [
      `PRACTICE LAB: ${open.name}`,
      `Template: ${template.label}`,
      template.brief && `Brief: ${template.brief}`,
      notes.trim() && `Operator notes: ${notes.trim()}`,
      `Reference URL: ${open.url}`,
    ].filter(Boolean).join("\n");

    const { data, error } = await supabase.from("missions").insert({
      user_id: user.id,
      name: `LAB: ${open.name}`,
      target: open.url,
      scope: open.tags.join(", "),
      status: "active",
      notes: missionNotes,
    }).select().single();

    setLoading(false);
    if (error || !data) {
      toast.error("Failed to start lab session");
      return;
    }
    toast.success(`Lab mission started — ${open.name}`);
    setOpen(null);
    setNotes("");
    navigate("/");
  }

  return (
    <AppLayout title="PRACTICE LAB" subtitle="Legally-safe vulnerable targets for agent training" icon={FlaskConical}>
      <div className="p-5 space-y-5">
        <div className="bg-surface-1 border border-border rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-xs font-mono text-muted-foreground leading-relaxed">
            Each card spins up a new mission on the Recon channel so the Commander &amp; Leads can practice against a
            legal, intentionally-vulnerable target. New patterns observed during a lab session are queued for
            Commander review under <span className="text-primary">Patterns</span>.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LABS.map(l => (
            <button
              key={l.id}
              onClick={() => setOpen(l)}
              className="text-left bg-surface-1 border border-border rounded-lg p-4 hover:border-primary/50 hover:neon-gold-border transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center neon-gold-box">
                  <TargetIcon className="w-4 h-4 text-primary" />
                </div>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${DIFF_COLOR[l.difficulty]}`}>
                  {l.difficulty.toUpperCase()}
                </span>
              </div>
              <h3 className="font-mono text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{l.name}</h3>
              <p className="text-[10px] font-mono text-muted-foreground/80 mb-2 truncate flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> {l.url}
              </p>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-3">{l.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {l.tags.map(t => (
                  <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-2 border border-border text-muted-foreground">{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[10px] font-mono text-muted-foreground">Click to configure</span>
                <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-primary">
                  <Play className="w-3 h-3" /> OPEN LAB
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-primary">
              {open?.name}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Configure a lab session. This creates an active mission on the Recon channel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground mb-2 block">Session Template</label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTpl(t.id)}
                    className={`text-left px-3 py-2 rounded border text-xs font-mono transition-all ${
                      tpl === t.id
                        ? "border-primary bg-primary/10 text-primary neon-gold-border"
                        : "border-border bg-surface-2 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {TEMPLATES.find(t => t.id === tpl)?.brief && (
                <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">
                  {TEMPLATES.find(t => t.id === tpl)?.brief}
                </p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-muted-foreground mb-2 block">Operator Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Specific areas to focus on, out-of-scope paths, agent guidance…"
                className="font-mono text-xs h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={startSession} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 neon-gold-box">
              <Play className="w-3 h-3 mr-1" /> {loading ? "Deploying…" : "Start Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
