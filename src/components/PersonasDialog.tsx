import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Edit2, Trash2, Check, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Persona {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  is_active: boolean;
}

export const PERSONA_TEMPLATES = [
  { name: "STRATEGIST", description: "Long-range planner. Picks targets, sequences attacks, weighs ROI.", system_prompt: "You are the Commander in STRATEGIST mode. Think 5 moves ahead. Score every option by impact × success-probability × payout. Output a numbered plan before any action." },
  { name: "RED-TEAM LEAD", description: "Aggressive offensive mindset. Pushes Leads hard, chains attacks.", system_prompt: "You are the Commander in RED-TEAM LEAD mode. Coordinate Leads aggressively. Demand PoCs, chain primitives into impact. Never accept a vague finding." },
  { name: "BUG-BOUNTY HUNTER", description: "Payout-optimizer. Prioritizes triage-friendly, high-CVSS reports.", system_prompt: "You are the Commander in BUG-BOUNTY HUNTER mode. Optimize for paid criticals: low duplicate-risk surfaces, clear repro, business-impact narrative." },
  { name: "STEALTH OPERATOR", description: "Low-and-slow. Avoids WAFs, rate-limits, leaves no trace.", system_prompt: "You are the Commander in STEALTH OPERATOR mode. Every Lead must throttle, rotate, and obfuscate. Reject loud tooling." },
  { name: "TEACHER", description: "Explains every decision. Great for learning sessions.", system_prompt: "You are the Commander in TEACHER mode. Before every action, explain WHY in 1-2 sentences. Cite techniques by name (OWASP, MITRE ATT&CK)." },
  { name: "AUDITOR", description: "Compliance-focused. Maps findings to controls (SOC2, ISO).", system_prompt: "You are the Commander in AUDITOR mode. Map every finding to a control (SOC2 CC, ISO 27001, PCI). Output a control gap matrix." },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onActiveChange?: (name: string | null) => void;
}

export default function PersonasDialog({ open, onClose, onActiveChange }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editing, setEditing] = useState<Partial<Persona> | null>(null);

  useEffect(() => { if (open && user) load(); /* eslint-disable-next-line */ }, [open, user]);

  async function load() {
    if (!user) return;
    const { data } = await (supabase as any).from("commander_personas").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
    setPersonas((data as Persona[]) || []);
    const active = (data as Persona[] | null)?.find(p => p.is_active);
    onActiveChange?.(active?.name ?? null);
  }

  async function activate(p: Persona) {
    if (!user) return;
    await (supabase as any).from("commander_personas").update({ is_active: false }).eq("user_id", user.id);
    await (supabase as any).from("commander_personas").update({ is_active: true }).eq("id", p.id);
    toast({ title: `${p.name} is now active` });
    try { window.dispatchEvent(new Event("liq:persona-changed")); } catch {}
    load();
  }

  async function remove(p: Persona) {
    await (supabase as any).from("commander_personas").delete().eq("id", p.id);
    toast({ title: "Persona removed" });
    load();
  }

  async function save() {
    if (!editing || !user || !editing.name || !editing.system_prompt) return;
    if (editing.id) {
      await (supabase as any).from("commander_personas").update({ name: editing.name, description: editing.description, system_prompt: editing.system_prompt }).eq("id", editing.id);
    } else {
      await (supabase as any).from("commander_personas").insert({ user_id: user.id, name: editing.name, description: editing.description || "", system_prompt: editing.system_prompt, is_active: personas.length === 0 });
    }
    setEditing(null);
    try { window.dispatchEvent(new Event("liq:persona-changed")); } catch {}
    load();
  }

  function addFromTemplate(t: typeof PERSONA_TEMPLATES[number]) {
    setEditing({ name: t.name, description: t.description, system_prompt: t.system_prompt });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4"
          onClick={onClose}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-surface-1 border border-primary/30 rounded-lg neon-gold-box overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="font-mono text-xs font-bold text-primary tracking-widest neon-gold">COMMANDER PERSONAS</h3>
              </div>
              <button onClick={onClose} className="p-1 rounded hover:bg-surface-2 text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {editing ? (
                <div className="space-y-3 bg-surface-2 border border-primary/30 rounded p-4">
                  <h4 className="font-mono text-xs text-primary uppercase tracking-widest">{editing.id ? "Edit" : "New"} persona</h4>
                  <input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value.toUpperCase() })} placeholder="Name (e.g. NIGHTSHADE)" className="w-full bg-surface-1 border border-border rounded px-3 py-2 text-xs font-mono text-foreground" />
                  <input value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Short description" className="w-full bg-surface-1 border border-border rounded px-3 py-2 text-xs font-mono text-foreground" />
                  <textarea value={editing.system_prompt || ""} onChange={e => setEditing({ ...editing, system_prompt: e.target.value })} placeholder="System prompt — how the Commander thinks in this mode" rows={6} className="w-full bg-surface-1 border border-border rounded px-3 py-2 text-xs font-mono text-foreground" />
                  <div className="flex gap-2">
                    <button onClick={save} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-mono font-bold">Save</button>
                    <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded bg-surface-1 border border-border text-xs font-mono text-foreground">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">Your Personas ({personas.length})</span>
                      <button onClick={() => setEditing({})} className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono uppercase hover:border-primary">
                        <Plus className="w-3 h-3" /> Blank
                      </button>
                    </div>
                    {personas.length === 0 ? (
                      <p className="text-xs font-mono text-muted-foreground italic">No personas yet. Add one from the templates below.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {personas.map(p => (
                          <div key={p.id} className={`flex items-center gap-2 p-3 rounded border ${p.is_active ? "border-primary bg-primary/5" : "border-border bg-surface-2"}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-primary">{p.name}</span>
                                {p.is_active && <span className="flex items-center gap-1 text-[9px] font-mono text-primary uppercase"><Check className="w-2.5 h-2.5" /> Active</span>}
                              </div>
                              {p.description && <div className="text-[10px] font-mono text-muted-foreground truncate">{p.description}</div>}
                            </div>
                            {!p.is_active && <button onClick={() => activate(p)} className="text-[10px] font-mono px-2 py-1 rounded bg-primary/10 text-primary border border-primary/30 hover:border-primary">Activate</button>}
                            <button onClick={() => setEditing(p)} className="p-1 rounded hover:bg-surface-1 text-muted-foreground hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                            <button onClick={() => remove(p)} className="p-1 rounded hover:bg-surface-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Templates — click to add</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {PERSONA_TEMPLATES.map(t => (
                        <button key={t.name} onClick={() => addFromTemplate(t)}
                          className="text-left p-3 rounded border border-border bg-surface-2/60 hover:border-primary hover:neon-gold-box transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-bold text-primary">{t.name}</span>
                            <Plus className="w-3 h-3 text-primary" />
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground">{t.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
