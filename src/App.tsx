import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Targets from "./pages/Targets";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AgentProfile from "./pages/AgentProfile";
import CommanderSessions from "./pages/CommanderSessions";
import SessionDetail from "./pages/SessionDetail";
import SkillApprovalQueue from "./pages/SkillApprovalQueue";
import Commander from "./pages/Commander";
import Leads from "./pages/Leads";
import Raiders from "./pages/Raiders";
import Learnings from "./pages/Learnings";
import Shell from "./components/Shell";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse-gold" />
      </div>
    );
  }
  return <>{children}</>;
}

const AppRoutes = () => (
  <AuthGate>
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Index />} />
        <Route path="/commander" element={<Commander />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/raiders" element={<Raiders />} />
        <Route path="/targets" element={<Targets />} />
        <Route path="/learnings" element={<Learnings />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/agents/:codename" element={<AgentProfile />} />
        <Route path="/commander/sessions" element={<CommanderSessions />} />
        <Route path="/commander/sessions/:id" element={<SessionDetail />} />
        <Route path="/skills/pending" element={<SkillApprovalQueue />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthGate>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
