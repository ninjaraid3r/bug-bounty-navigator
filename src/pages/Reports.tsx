import { useEffect, useState } from "react";
import { FileSearch, Download, Plus, Pencil, Trash2, Save, X, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Report = {
  id: string;
  title: string;
  target: string;
  severity: "critical" | "high" | "medium" | "low";
  payout: number;
  status: "draft" | "submitted" | "triaged" | "paid" | "rejected";
  report_date: string;
  details: string | null;
  notes: string | null;
};

const sevColor: Record<string, string> = {
  critical: "text-destructive border-destructive/40 bg-destructive/10",
  high: "text-primary border-primary/40 bg-primary/10",
  medium: "text-primary/70 border-primary/20 bg-primary/5",
  low: "text-muted-foreground border-border bg-surface-2",
};

const EMPTY: Omit<Report, "id"> = {
  title: "",
  target: "",
  severity: "medium",
  payout: 0,
  status: "draft",
  report_date: new Date().toISOString().slice(0, 10),
  details: "",
  notes: "",
};

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Report | null>(null);
  const [draft, setDraft] = useState<Omit<Report, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("report_date", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    else setReports((data as Report[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setDraft(EMPTY);
    setShowForm(true);
  };
  const openEdit = (r: Report) => {
    setEditing(r);
    setDraft({ ...r });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setDraft(EMPTY); };

  const save = async () => {
    if (!user) return;
    if (!draft.title.trim()) return toast({ title: "Title required", variant: "destructive" });
    setSaving(true);
    const payload = { ...draft, payout: Number(draft.payout) || 0, user_id: user.id };
    const q = editing
      ? (supabase as any).from("reports").update(payload).eq("id", editing.id)
      : (supabase as any).from("reports").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Report updated" : "Report created" });
    closeForm();
    load();
  };

  const remove = async (r: Report) => {
    if (!confirm(`Delete report "${r.title}"?`)) return;
    const { error } = await (supabase as any).from("reports").delete().eq("id", r.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Report deleted" });
    load();
  };

  const download = (r: Report) => {
    const md = `# ${r.title}\n\n**Target:** ${r.target}\n**Severity:** ${r.severity}\n**Status:** ${r.status}\n**Payout:** $${r.payout}\n**Date:** ${r.report_date}\n\n## Details\n${r.details || "_none_"}\n\n## Notes\n${r.notes || "_none_"}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.title.replace(/\W+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const total = reports.reduce((s, r) => s + Number(r.payout || 0), 0);

  return (
    <AppLayout
      title="REPORTS"
      subtitle="Save, edit, and manage your vulnerability reports"
      icon={FileSearch}
      actions={
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Report
        </button>
      }
    >
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Earned" value={`$${total.toLocaleString()}`} highlight />
          <StatCard label="Submitted" value={reports.length.toString()} />
          <StatCard label="Paid" value={reports.filter(r => r.status === "paid").length.toString()} />
          <StatCard label="Critical" value={reports.filter(r => r.severity === "critical").length.toString()} />
        </div>

        {showForm && (
          <div className="bg-surface-1 border border-primary/40 rounded-lg p-4 space-y-3 shadow-[0_0_12px_hsl(var(--primary)/0.15)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-primary tracking-wider">
                {editing ? "EDIT REPORT" : "NEW REPORT"}
              </h3>
              <button onClick={closeForm} className="p-1 rounded hover:bg-surface-2 text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Title">
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputCls} placeholder="SQLi in /api/search" />
              </Field>
              <Field label="Target">
                <input value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} className={inputCls} placeholder="target.com" />
              </Field>
              <Field label="Severity">
                <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as Report["severity"] })} className={inputCls}>
                  <option value="critical">critical</option>
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                  <option value="low">low</option>
                </select>
              </Field>
              <Field label="Status">
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Report["status"] })} className={inputCls}>
                  <option value="draft">draft</option>
                  <option value="submitted">submitted</option>
                  <option value="triaged">triaged</option>
                  <option value="paid">paid</option>
                  <option value="rejected">rejected</option>
                </select>
              </Field>
              <Field label="Payout ($)">
                <input type="number" value={draft.payout} onChange={(e) => setDraft({ ...draft, payout: Number(e.target.value) })} className={inputCls} />
              </Field>
              <Field label="Date">
                <input type="date" value={draft.report_date} onChange={(e) => setDraft({ ...draft, report_date: e.target.value })} className={inputCls} />
              </Field>
            </div>
            <Field label="Details">
              <textarea rows={4} value={draft.details || ""} onChange={(e) => setDraft({ ...draft, details: e.target.value })} className={inputCls} placeholder="Steps to reproduce, impact, PoC…" />
            </Field>
            <Field label="Notes">
              <textarea rows={2} value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className={inputCls} placeholder="Internal notes" />
            </Field>
            <div className="flex items-center gap-2">
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 disabled:opacity-40">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editing ? "Save Changes" : "Create Report"}
              </button>
              <button onClick={closeForm} className="px-3 py-1.5 rounded-md border border-border text-xs font-mono text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-surface-1 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-xs font-mono font-bold text-foreground tracking-wider">SUBMISSION LOG</h2>
          </div>
          {loading ? (
            <div className="p-8 flex items-center justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-muted-foreground">
              No reports yet. Click <span className="text-primary">New Report</span> to save your first finding.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reports.map(r => (
                <div key={r.id} className="px-4 py-3 hover:bg-surface-2 transition-colors flex items-center gap-4">
                  <div className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase ${sevColor[r.severity]}`}>
                    {r.severity}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-foreground truncate">{r.title}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {r.target || "—"} • {r.report_date} • <span className="uppercase">{r.status}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-primary">${Number(r.payout).toLocaleString()}</span>
                  <button onClick={() => download(r)} className="p-1.5 rounded hover:bg-primary/10 text-primary" title="Download .md">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-primary/10 text-primary" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(r)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

const inputCls = "w-full bg-surface-2 border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-surface-1 border border-border rounded-lg p-4">
      <div className="text-[10px] font-mono text-muted-foreground uppercase">{label}</div>
      <div className={`text-2xl font-mono font-bold ${highlight ? "text-primary neon-gold" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
