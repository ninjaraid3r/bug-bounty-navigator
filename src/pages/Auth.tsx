import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crosshair, Mail, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast({
          title: "Account created",
          description: "Check your email to confirm, or sign in if auto-confirm is enabled.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center neon-gold-box">
            <Crosshair className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-mono text-xl font-bold text-primary tracking-wider neon-gold">XBOW</h1>
          <p className="text-xs font-mono text-muted-foreground">Bug Bounty Agent Orchestrator</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-surface-1 border border-border rounded-lg p-5">
          <h2 className="text-sm font-mono font-bold text-foreground text-center">
            {isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
          </h2>

          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-surface-2 rounded-md border border-border focus-within:border-primary/30 transition-all">
              <Mail className="w-3.5 h-3.5 text-muted-foreground ml-3" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="flex-1 bg-transparent px-2 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-surface-2 rounded-md border border-border focus-within:border-primary/30 transition-all">
              <Lock className="w-3.5 h-3.5 text-muted-foreground ml-3" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="flex-1 bg-transparent px-2 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isLogin ? "ENTER" : "DEPLOY"}
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors text-center"
          >
            {isLogin ? "Need an account? Sign up" : "Already deployed? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
