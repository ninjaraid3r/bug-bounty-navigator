import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowLeft, ChevronRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const gradeColor = (g?: string | null) =>
  g === "A" ? "text-primary" : g === "B" ? "text-foreground" : g === "C" ? "text-muted-foreground" : g === "D" ? "text-orange-400" : g === "F" ? "text-destructive" : "text-muted-foreground";

export default function CommanderSessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("sessions").select("*").eq("user_id", user.id).order("started_at", { ascending: false })
      .then(({ data }) => { setSessions(data || []); setLoading(false); });
  }, [user]);

  return (
    <AppLayout
      title="COMMANDER REPORTS"
      subtitle="Session after-action reports"
      icon={FileText}
      actions={<Button variant="ghost" size="sm" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4 mr-1" /> Recon</Button>}
    >
      <div className="p-5 max-w-5xl mx-auto space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground font-mono">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground font-mono">No sessions yet. Run commands in the Mission Feed to generate session reports.</CardContent></Card>
        ) : (
          sessions.map(s => (
            <button
              key={s.id}
              onClick={() => navigate(`/commander/sessions/${s.id}`)}
              className="w-full text-left border border-border rounded-md p-4 bg-surface-1 hover:border-primary/50 hover:bg-surface-2 transition-colors flex items-center gap-4"
            >
              <div className={`text-3xl font-mono font-bold ${gradeColor(s.grade)} shrink-0 w-10 text-center`}>{s.grade || "—"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-semibold text-foreground truncate">{s.title}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {new Date(s.started_at).toLocaleString()} · {s.tasks_count} tasks · {s.findings_count} signals
                </div>
                {s.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.summary}</p>}
              </div>
              <Badge variant={s.status === "active" ? "default" : "outline"} className="text-[9px]">{s.status}</Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))
        )}
      </div>
    </AppLayout>
  );
}
