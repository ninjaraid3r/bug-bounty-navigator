import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AppShell from "./components/AppShell";
import Index from "./pages/Index";
import SecondBrain from "./pages/SecondBrain";
import AttackSurface from "./pages/AttackSurface";
import Bounty from "./pages/Bounty";
import ExploitLab from "./pages/ExploitLab";
import VulnScanner from "./pages/VulnScanner";
import PayloadForge from "./pages/PayloadForge";
import NetworkMap from "./pages/NetworkMap";
import Targets from "./pages/Targets";
import Reports from "./pages/Reports";
import Automation from "./pages/Automation";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import AgentProfile from "./pages/AgentProfile";
import CommanderSessions from "./pages/CommanderSessions";
import SessionDetail from "./pages/SessionDetail";
import SkillApprovalQueue from "./pages/SkillApprovalQueue";
import Agents from "./pages/Agents";
import AgentsTier from "./pages/AgentsTier";

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
      {/* Persistent shell — LeftSidebar mounts once here, fixing nav flicker. */}
      <Route element={<AppShell />}>
        <Route path="/" element={<Index />} />
        <Route path="/second-brain" element={<SecondBrain />} />
        <Route path="/bounty" element={<Bounty />} />
        <Route path="/attack-surface" element={<AttackSurface />} />
        <Route path="/exploit-lab" element={<ExploitLab />} />
        <Route path="/vuln-scanner" element={<VulnScanner />} />
        <Route path="/payload-forge" element={<PayloadForge />} />
        <Route path="/network-map" element={<NetworkMap />} />
        <Route path="/targets" element={<Targets />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/automation" element={<Automation />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/agents/tier/:tier" element={<AgentsTier />} />
        <Route path="/agents/:codename" element={<AgentProfile />} />
        <Route path="/commander/sessions" element={<CommanderSessions />} />
        <Route path="/commander/sessions/:id" element={<SessionDetail />} />
        <Route path="/skills/pending" element={<SkillApprovalQueue />} />
        <Route path="*" element={<NotFound />} />
      </Route>
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
