import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Radar, Globe, Shield, Bug, Terminal, Network, Lock, FileSearch, Zap,
  Database, Code, Eye, Smartphone, Cloud, ArrowLeft, ExternalLink, BookOpen,
  Star, ChevronDown, ChevronRight, Layers, Fingerprint, Wifi, KeyRound, Binary,
  Plus, Pencil, Trash2, X, Loader2, Save, Play, Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ToolSandbox from "@/components/ToolSandbox";
import { useToast } from "@/hooks/use-toast";

interface Tool {
  id?: string;
  name: string;
  description: string;
  use_case: string;
  tags: string[];
  difficulty: string;
  website_url?: string;
  category: string;
  is_default: boolean;
  bookmarked: boolean;
  custom_notes?: string;
}

const categoryMeta: Record<string, { icon: any; description: string }> = {
  "Reconnaissance": { icon: Radar, description: "Passive and active information gathering" },
  "Web App Scanning": { icon: Globe, description: "Automated and manual web app vuln scanning" },
  "Exploitation": { icon: Shield, description: "Frameworks for exploiting discovered vulns" },
  "Fuzzing & Brute Force": { icon: Zap, description: "Content discovery, parameter fuzzing" },
  "Network & MITM": { icon: Network, description: "Network analysis, packet capture, MITM" },
  "Cryptography & Auth": { icon: KeyRound, description: "Auth, tokens, and crypto testing" },
  "Cloud & Infrastructure": { icon: Cloud, description: "Cloud security and container testing" },
  "Mobile Security": { icon: Smartphone, description: "Android and iOS app security" },
  "OSINT & Social": { icon: Eye, description: "Open-source intelligence gathering" },
  "Post-Exploitation": { icon: Terminal, description: "Persistence, privesc, lateral movement" },
  "Reporting & Workflow": { icon: FileSearch, description: "Documentation and report generation" },
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-primary/15 text-primary border-primary/20",
  intermediate: "bg-primary/10 text-primary/80 border-primary/15",
  advanced: "bg-primary/5 text-primary/60 border-primary/10",
};

// Hardcoded default tools for seeding
const defaultTools: Omit<Tool, "id" | "is_default" | "bookmarked">[] = [
  { name: "Nmap", description: "Network discovery and security auditing.", use_case: "Map open ports, detect services, identify OS", tags: ["port-scan", "network"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://nmap.org" },
  { name: "Amass", description: "Attack surface mapping and asset discovery.", use_case: "Subdomain enumeration, ASN discovery", tags: ["subdomain", "osint"], difficulty: "intermediate", category: "Reconnaissance", website_url: "https://github.com/owasp-amass/amass" },
  { name: "Subfinder", description: "Fast passive subdomain enumeration.", use_case: "Discover subdomains via passive sources", tags: ["subdomain", "passive"], difficulty: "beginner", category: "Reconnaissance" },
  { name: "Shodan", description: "Search engine for internet-connected devices.", use_case: "Find exposed services without active scanning", tags: ["osint", "search-engine"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://shodan.io" },
  { name: "Burp Suite", description: "Industry-standard web app security testing.", use_case: "Intercept HTTP, scan for web vulns", tags: ["proxy", "scanner"], difficulty: "intermediate", category: "Web App Scanning", website_url: "https://portswigger.net/burp" },
  { name: "Nuclei", description: "Fast template-based vulnerability scanner.", use_case: "Run templates to detect CVEs at scale", tags: ["templates", "cve"], difficulty: "intermediate", category: "Web App Scanning", website_url: "https://github.com/projectdiscovery/nuclei" },
  { name: "OWASP ZAP", description: "Free open-source web app scanner.", use_case: "Automated scanning, passive detection", tags: ["scanner", "free"], difficulty: "beginner", category: "Web App Scanning", website_url: "https://zaproxy.org" },
  { name: "Metasploit", description: "Most used penetration testing framework.", use_case: "Exploit development, payloads, post-exploitation", tags: ["framework", "exploits"], difficulty: "intermediate", category: "Exploitation", website_url: "https://metasploit.com" },
  { name: "SQLMap", description: "Automatic SQL injection exploitation.", use_case: "Detect and exploit SQLi, dump databases", tags: ["sqli", "automation"], difficulty: "intermediate", category: "Exploitation", website_url: "https://sqlmap.org" },
  { name: "ffuf", description: "Fast web fuzzer written in Go.", use_case: "Directory brute-force, parameter fuzzing", tags: ["fuzzing", "fast"], difficulty: "beginner", category: "Fuzzing & Brute Force", website_url: "https://github.com/ffuf/ffuf" },
  { name: "Gobuster", description: "Directory/file and DNS brute-forcing.", use_case: "Brute-force directories, subdomains", tags: ["brute-force", "discovery"], difficulty: "beginner", category: "Fuzzing & Brute Force" },
  { name: "Hydra", description: "Fast network logon cracker.", use_case: "Brute-force credentials across protocols", tags: ["brute-force", "credentials"], difficulty: "intermediate", category: "Fuzzing & Brute Force" },
  { name: "Wireshark", description: "Network protocol analyzer.", use_case: "Deep packet inspection, traffic analysis", tags: ["packet-capture", "analysis"], difficulty: "intermediate", category: "Network & MITM", website_url: "https://wireshark.org" },
  { name: "Hashcat", description: "GPU-accelerated password recovery.", use_case: "Crack password hashes at massive speed", tags: ["password", "gpu"], difficulty: "intermediate", category: "Cryptography & Auth", website_url: "https://hashcat.net" },
  { name: "jwt_tool", description: "JWT security testing toolkit.", use_case: "Test JWT for known vulnerabilities", tags: ["jwt", "auth"], difficulty: "intermediate", category: "Cryptography & Auth" },
  { name: "Prowler", description: "AWS security assessment tool.", use_case: "Audit AWS against CIS benchmarks", tags: ["aws", "audit"], difficulty: "intermediate", category: "Cloud & Infrastructure" },
  { name: "Trivy", description: "Container vulnerability scanner.", use_case: "Scan Docker images for CVEs", tags: ["container", "docker"], difficulty: "beginner", category: "Cloud & Infrastructure" },
  { name: "Frida", description: "Dynamic instrumentation toolkit.", use_case: "Hook apps, bypass SSL pinning", tags: ["dynamic", "hooking"], difficulty: "advanced", category: "Mobile Security", website_url: "https://frida.re" },
  { name: "MobSF", description: "Mobile Security Framework.", use_case: "Analyze APK/IPA for vulnerabilities", tags: ["static-analysis", "mobile"], difficulty: "intermediate", category: "Mobile Security" },
  { name: "Maltego", description: "Visual link analysis tool.", use_case: "Map relationships between entities", tags: ["visualization", "graph"], difficulty: "intermediate", category: "OSINT & Social", website_url: "https://maltego.com" },
  { name: "Sherlock", description: "Hunt usernames across networks.", use_case: "Find accounts across 300+ platforms", tags: ["username", "social-media"], difficulty: "beginner", category: "OSINT & Social" },
  { name: "LinPEAS / WinPEAS", description: "Privilege escalation scripts.", use_case: "Enumerate privesc vectors", tags: ["privesc", "enumeration"], difficulty: "intermediate", category: "Post-Exploitation" },
  { name: "BloodHound", description: "AD attack path mapping.", use_case: "Find shortest path to domain admin", tags: ["active-directory", "graph"], difficulty: "advanced", category: "Post-Exploitation" },
];

// Elite arsenal — verified, high-impact tools used by top bug hunters (NahamSec, Jhaddix, STÖK, etc.)
const eliteArsenal: Omit<Tool, "id" | "is_default" | "bookmarked">[] = [
  // Recon
  { name: "httpx", description: "Fast HTTP toolkit by ProjectDiscovery.", use_case: "Probe live hosts, status, tech detect at scale", tags: ["http", "probe", "projectdiscovery"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://github.com/projectdiscovery/httpx" },
  { name: "naabu", description: "Fast SYN/CONNECT port scanner in Go.", use_case: "Mass port scan pipelines, faster than nmap for discovery", tags: ["port-scan", "fast"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://github.com/projectdiscovery/naabu" },
  { name: "dnsx", description: "Fast DNS toolkit.", use_case: "Bulk DNS resolution, wildcard detection, brute-force", tags: ["dns", "fast"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://github.com/projectdiscovery/dnsx" },
  { name: "katana", description: "Next-gen crawling and spidering framework.", use_case: "JS-aware crawl, headless mode, endpoint discovery", tags: ["crawler", "js"], difficulty: "intermediate", category: "Reconnaissance", website_url: "https://github.com/projectdiscovery/katana" },
  { name: "gau", description: "Get All URLs from Wayback, AlienVault, CommonCrawl.", use_case: "Pull historical URLs to find forgotten endpoints", tags: ["wayback", "urls"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://github.com/lc/gau" },
  { name: "waybackurls", description: "Fetch URLs from the Wayback Machine.", use_case: "Discover legacy endpoints and parameters", tags: ["wayback", "history"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://github.com/tomnomnom/waybackurls" },
  { name: "assetfinder", description: "Find related domains and subdomains.", use_case: "Quick passive subdomain discovery", tags: ["subdomain", "passive"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://github.com/tomnomnom/assetfinder" },
  { name: "chaos", description: "ProjectDiscovery's continuously updated subdomain dataset.", use_case: "Pull pre-collected subdomains for in-scope programs", tags: ["subdomain", "dataset"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://chaos.projectdiscovery.io" },
  { name: "Censys", description: "Internet-wide scanning search engine.", use_case: "Find exposed assets, certs, services", tags: ["osint", "scanning"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://censys.io" },
  { name: "FOFA", description: "China-based internet asset search engine.", use_case: "Discover assets often missed by Shodan", tags: ["osint", "search-engine"], difficulty: "intermediate", category: "Reconnaissance", website_url: "https://fofa.info" },

  // Web App
  { name: "Caido", description: "Modern web proxy alternative to Burp.", use_case: "Lightweight intercept, projects, replay, automation", tags: ["proxy", "modern"], difficulty: "intermediate", category: "Web App Scanning", website_url: "https://caido.io" },
  { name: "Param Miner", description: "Burp extension for hidden parameter discovery.", use_case: "Find unlinked parameters, headers, cookies", tags: ["burp-ext", "params"], difficulty: "intermediate", category: "Web App Scanning", website_url: "https://github.com/PortSwigger/param-miner" },
  { name: "Autorize", description: "Burp extension for automated authz testing.", use_case: "Detect IDOR/BOLA across roles automatically", tags: ["burp-ext", "idor", "authz"], difficulty: "intermediate", category: "Web App Scanning", website_url: "https://github.com/Quitten/Autorize" },
  { name: "Turbo Intruder", description: "High-speed Burp request engine.", use_case: "Race conditions, mass fuzzing at 30k req/s", tags: ["burp-ext", "race"], difficulty: "advanced", category: "Web App Scanning" },
  { name: "Dalfox", description: "Powerful XSS scanner and parameter analyzer.", use_case: "Detect reflected/stored/DOM XSS automatically", tags: ["xss", "scanner"], difficulty: "intermediate", category: "Web App Scanning", website_url: "https://github.com/hahwul/dalfox" },
  { name: "kxss", description: "Find reflected XSS candidates in URLs.", use_case: "Pipe URLs in, get likely reflection params out", tags: ["xss", "reflection"], difficulty: "beginner", category: "Web App Scanning", website_url: "https://github.com/Emoe/kxss" },
  { name: "interactsh", description: "OOB (Out-of-Band) interaction server.", use_case: "Detect blind SSRF/RCE/XXE via DNS/HTTP callback", tags: ["oob", "blind"], difficulty: "intermediate", category: "Web App Scanning", website_url: "https://github.com/projectdiscovery/interactsh" },

  // API
  { name: "kiterunner", description: "API content discovery (Assetnote).", use_case: "Brute-force API routes with smart wordlists", tags: ["api", "discovery"], difficulty: "intermediate", category: "Fuzzing & Brute Force", website_url: "https://github.com/assetnote/kiterunner" },
  { name: "GraphQLmap", description: "GraphQL pentesting tool.", use_case: "Introspection, batching, injection on GraphQL", tags: ["graphql", "api"], difficulty: "intermediate", category: "Web App Scanning", website_url: "https://github.com/swisskyrepo/GraphQLmap" },
  { name: "Postman", description: "API design and testing platform.", use_case: "Manual API exploration, collections, fuzzing", tags: ["api", "manual"], difficulty: "beginner", category: "Web App Scanning", website_url: "https://postman.com" },

  // JS / Secrets
  { name: "subjs", description: "Fetch JavaScript files from URLs.", use_case: "Pull all JS for secret/endpoint mining", tags: ["js", "discovery"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://github.com/lc/subjs" },
  { name: "LinkFinder", description: "Discover endpoints in JS files.", use_case: "Parse minified JS to find hidden API routes", tags: ["js", "endpoints"], difficulty: "beginner", category: "Reconnaissance", website_url: "https://github.com/GerbenJavado/LinkFinder" },
  { name: "TruffleHog", description: "Find leaked secrets in git, JS, S3 buckets.", use_case: "Detect API keys, tokens, creds across sources", tags: ["secrets", "git"], difficulty: "beginner", category: "OSINT & Social", website_url: "https://github.com/trufflesecurity/trufflehog" },
  { name: "gitleaks", description: "Scan git repos for secrets.", use_case: "Pre-commit and historical secret detection", tags: ["secrets", "git"], difficulty: "beginner", category: "OSINT & Social", website_url: "https://github.com/gitleaks/gitleaks" },

  // Wordlists / Fuzzing
  { name: "SecLists", description: "Massive collection of security wordlists.", use_case: "Use for any fuzzing/brute-force task", tags: ["wordlists", "essential"], difficulty: "beginner", category: "Fuzzing & Brute Force", website_url: "https://github.com/danielmiessler/SecLists" },
  { name: "Assetnote Wordlists", description: "Continuously updated content discovery wordlists.", use_case: "Higher-signal alternative to common wordlists", tags: ["wordlists", "assetnote"], difficulty: "beginner", category: "Fuzzing & Brute Force", website_url: "https://wordlists.assetnote.io" },
  { name: "Arjun", description: "HTTP parameter discovery suite.", use_case: "Find hidden GET/POST/JSON params", tags: ["params", "fuzzing"], difficulty: "beginner", category: "Fuzzing & Brute Force", website_url: "https://github.com/s0md3v/Arjun" },

  // Cloud
  { name: "ScoutSuite", description: "Multi-cloud security auditing tool.", use_case: "Audit AWS/GCP/Azure/Aliyun configs", tags: ["cloud", "audit"], difficulty: "intermediate", category: "Cloud & Infrastructure", website_url: "https://github.com/nccgroup/ScoutSuite" },
  { name: "CloudSploit", description: "Cloud security configuration scanner.", use_case: "Continuous misconfig detection across clouds", tags: ["cloud", "misconfig"], difficulty: "intermediate", category: "Cloud & Infrastructure" },
  { name: "S3Scanner", description: "Scan for open AWS S3 buckets.", use_case: "Find publicly readable/writable buckets", tags: ["aws", "s3"], difficulty: "beginner", category: "Cloud & Infrastructure", website_url: "https://github.com/sa7mon/S3Scanner" },
  { name: "Pacu", description: "AWS exploitation framework by Rhino Security.", use_case: "Post-exploitation attacks on AWS environments", tags: ["aws", "post-exploit"], difficulty: "advanced", category: "Cloud & Infrastructure", website_url: "https://github.com/RhinoSecurityLabs/pacu" },

  // Mobile
  { name: "Objection", description: "Runtime mobile exploration toolkit (Frida-based).", use_case: "Bypass SSL pinning, dump keychain, no-code Frida", tags: ["mobile", "frida"], difficulty: "intermediate", category: "Mobile Security", website_url: "https://github.com/sensepost/objection" },
  { name: "apktool", description: "Reverse engineering APK files.", use_case: "Decompile, modify, rebuild Android apps", tags: ["android", "reverse"], difficulty: "intermediate", category: "Mobile Security", website_url: "https://apktool.org" },

  // OSINT
  { name: "GitDorker", description: "Automated GitHub dorking for secrets.", use_case: "Find leaked creds in target's GitHub orgs", tags: ["github", "dorking"], difficulty: "beginner", category: "OSINT & Social", website_url: "https://github.com/obheda12/GitDorker" },
  { name: "theHarvester", description: "Email, name, subdomain harvester.", use_case: "Passive recon for emails and employees", tags: ["osint", "emails"], difficulty: "beginner", category: "OSINT & Social", website_url: "https://github.com/laramies/theHarvester" },
  { name: "Spiderfoot", description: "Automated OSINT collection (200+ modules).", use_case: "Full automated OSINT footprinting", tags: ["osint", "automation"], difficulty: "intermediate", category: "OSINT & Social", website_url: "https://spiderfoot.net" },

  // Reporting / Workflow
  { name: "notify", description: "ProjectDiscovery alerting tool.", use_case: "Pipe results to Slack/Discord/Telegram", tags: ["alerts", "workflow"], difficulty: "beginner", category: "Reporting & Workflow", website_url: "https://github.com/projectdiscovery/notify" },
  { name: "Obsidian", description: "Knowledge base for hunters.", use_case: "Note-taking, target dossiers, methodology", tags: ["notes", "workflow"], difficulty: "beginner", category: "Reporting & Workflow", website_url: "https://obsidian.md" },
  { name: "ReconFTW", description: "Full automated recon framework.", use_case: "End-to-end recon pipeline orchestration", tags: ["automation", "framework"], difficulty: "advanced", category: "Reporting & Workflow", website_url: "https://github.com/six2dez/reconftw" },
  { name: "Axiom", description: "Dynamic infra framework for hunters.", use_case: "Spin up cloud workers for distributed scans", tags: ["infra", "scaling"], difficulty: "advanced", category: "Reporting & Workflow", website_url: "https://github.com/pry0cc/axiom" },
];

export default function SecondBrain() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [sandboxTool, setSandboxTool] = useState<Tool | null>(null);

  useEffect(() => {
    loadTools();
  }, [user]);

  async function loadTools() {
    const { data } = await supabase
      .from("tools")
      .select("*")
      .order("name");

    if (data && data.length > 0) {
      setTools(data.map(t => ({ ...t, use_case: t.use_case || "", tags: t.tags || [], difficulty: t.difficulty || "intermediate" })));
      setExpandedCats(new Set([...new Set(data.map(t => t.category))]));
    } else {
      // Seed defaults if empty
      await seedDefaults();
    }
    setLoading(false);
  }

  async function seedDefaults() {
    if (!user) return;
    const inserts = defaultTools.map(t => ({
      ...t,
      user_id: user.id,
      is_default: true,
      bookmarked: false,
    }));
    const { data } = await supabase.from("tools").insert(inserts).select();
    if (data) {
      setTools(data.map(t => ({ ...t, use_case: t.use_case || "", tags: t.tags || [], difficulty: t.difficulty || "intermediate" })));
      setExpandedCats(new Set([...new Set(data.map(t => t.category))]));
    }
  }

  async function saveTool(tool: Tool) {
    if (!user) return;
    if (tool.id) {
      // Update
      const { error } = await supabase.from("tools").update({
        name: tool.name,
        description: tool.description,
        use_case: tool.use_case,
        tags: tool.tags,
        difficulty: tool.difficulty,
        category: tool.category,
        website_url: tool.website_url,
        custom_notes: tool.custom_notes,
      }).eq("id", tool.id);
      if (!error) {
        setTools(prev => prev.map(t => t.id === tool.id ? tool : t));
        toast({ title: "Tool updated" });
      }
    } else {
      // Insert
      const { data, error } = await supabase.from("tools").insert({
        ...tool,
        user_id: user.id,
        is_default: false,
        bookmarked: false,
      }).select().single();
      if (data && !error) {
        setTools(prev => [...prev, { ...data, use_case: data.use_case || "", tags: data.tags || [], difficulty: data.difficulty || "intermediate" }]);
        toast({ title: "Tool added" });
      }
    }
    setEditingTool(null);
    setShowForm(false);
  }

  async function deleteTool(id: string) {
    const { error } = await supabase.from("tools").delete().eq("id", id);
    if (!error) {
      setTools(prev => prev.filter(t => t.id !== id));
      toast({ title: "Tool deleted" });
    }
  }

  async function syncEliteArsenal() {
    if (!user) return;
    const existingNames = new Set(tools.map(t => t.name.toLowerCase()));
    const toAdd = eliteArsenal.filter(t => !existingNames.has(t.name.toLowerCase()));
    if (toAdd.length === 0) {
      toast({ title: "Arsenal already synced", description: "All elite tools present." });
      return;
    }
    const inserts = toAdd.map(t => ({ ...t, user_id: user.id, is_default: true, bookmarked: false }));
    const { data, error } = await supabase.from("tools").insert(inserts).select();
    if (error) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      setTools(prev => [...prev, ...data.map(t => ({ ...t, use_case: t.use_case || "", tags: t.tags || [], difficulty: t.difficulty || "intermediate" }))]);
      setExpandedCats(prev => new Set([...prev, ...data.map(t => t.category)]));
      toast({ title: "Elite Arsenal synced", description: `${data.length} new tools added.` });
    }
  }

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tools.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [tools]);

  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = tools.filter(t => {
      const matchesSearch = !q || t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q) || t.tags?.some(tag => tag.includes(q));
      const matchesTag = !selectedTag || t.tags?.includes(selectedTag);
      return matchesSearch && matchesTag;
    });

    const groups: Record<string, Tool[]> = {};
    filtered.forEach(t => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [tools, search, selectedTag]);

  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-surface-1 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-1.5 rounded-md hover:bg-surface-2 transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h1 className="font-mono text-sm font-bold text-primary tracking-wider neon-gold">
                SECOND BRAIN
              </h1>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-surface-2 border border-border">
              {tools.length} TOOLS
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncEliteArsenal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-mono font-bold hover:bg-primary/90 transition-colors"
              title="Add curated elite bug bounty arsenal"
            >
              <Sparkles className="w-3 h-3" /> SYNC ELITE ARSENAL
            </button>
            <button
              onClick={() => {
                setEditingTool({
                  name: "", description: "", use_case: "", tags: [], difficulty: "intermediate",
                  category: Object.keys(categoryMeta)[0], is_default: false, bookmarked: false,
                });
                setShowForm(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-[10px] font-mono font-bold hover:bg-primary/20 transition-colors border border-primary/20"
            >
              <Plus className="w-3 h-3" /> ADD TOOL
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-surface-2 rounded-lg border border-border focus-within:border-primary/30 focus-within:neon-gold-box transition-all">
            <Search className="w-3.5 h-3.5 text-muted-foreground ml-3" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools, techniques, tags..."
              className="flex-1 bg-transparent px-2 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch("")} className="mr-2 text-[10px] font-mono text-muted-foreground hover:text-foreground">CLEAR</button>
            )}
          </div>
          {selectedTag && (
            <button onClick={() => setSelectedTag(null)} className="text-[10px] font-mono px-2 py-1 rounded bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors">
              #{selectedTag} ✕
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {allTags.slice(0, 20).map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                selectedTag === tag
                  ? "bg-primary/15 text-primary border-primary/25"
                  : "bg-surface-2 text-muted-foreground border-border hover:text-primary hover:border-primary/20"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {Object.entries(grouped).map(([cat, catTools]) => {
          const meta = categoryMeta[cat] || { icon: Database, description: cat };
          const Icon = meta.icon;
          const isExpanded = expandedCats.has(cat);
          return (
            <motion.section key={cat} layout>
              <button onClick={() => toggleCat(cat)} className="w-full flex items-center gap-3 mb-2 group">
                <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center neon-gold-box shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-mono text-xs font-bold text-primary tracking-wider neon-gold">
                    {cat.toUpperCase()}
                  </span>
                  <span className="ml-2 text-[10px] font-mono text-muted-foreground">({catTools.length})</span>
                </div>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>

              {!isExpanded && <p className="text-[10px] font-mono text-muted-foreground ml-10 mb-2">{meta.description}</p>}

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <p className="text-[10px] font-mono text-muted-foreground ml-10 mb-3">{meta.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-10">
                      {catTools.map(tool => (
                        <ToolCard
                          key={tool.id || tool.name}
                          tool={tool}
                          onTagClick={setSelectedTag}
                          onEdit={() => { setEditingTool(tool); setShowForm(true); }}
                          onDelete={() => tool.id && deleteTool(tool.id)}
                          onSandbox={() => setSandboxTool(tool)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          );
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm font-mono text-muted-foreground">No tools found.</p>
            <button onClick={() => { setSearch(""); setSelectedTag(null); }} className="mt-2 text-xs font-mono text-primary hover:underline">Clear filters</button>
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      {showForm && editingTool && (
        <ToolForm
          tool={editingTool}
          onSave={saveTool}
          onCancel={() => { setShowForm(false); setEditingTool(null); }}
        />
      )}

      {/* Sandbox Modal */}
      <AnimatePresence>
        {sandboxTool && (
          <ToolSandbox
            toolName={sandboxTool.name}
            toolDescription={sandboxTool.description || ""}
            toolUseCase={sandboxTool.use_case || ""}
            onClose={() => setSandboxTool(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolCard({ tool, onTagClick, onEdit, onDelete, onSandbox }: {
  tool: Tool;
  onTagClick: (tag: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onSandbox: () => void;
}) {
  return (
    <div className="group rounded-lg border border-border bg-surface-1 hover:border-primary/20 hover:neon-gold-box transition-all p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground group-hover:text-primary transition-colors">{tool.name}</span>
            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full border ${difficultyColors[tool.difficulty] || difficultyColors.intermediate}`}>
              {(tool.difficulty || "intermediate").toUpperCase()}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{tool.description}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onSandbox} className="p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title="Run in Sandbox">
            <Play className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 rounded hover:bg-surface-2 text-muted-foreground hover:text-primary transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-surface-2 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
          {tool.website_url && (
            <a href={tool.website_url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-surface-2 text-muted-foreground hover:text-primary transition-colors">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          </div>
        </div>
      </div>

      {tool.use_case && (
        <div className="bg-surface-2/50 rounded-md px-2 py-1.5 border border-border">
          <div className="flex items-center gap-1 mb-0.5">
            <Layers className="w-2.5 h-2.5 text-primary" />
            <span className="text-[8px] font-mono font-bold text-primary uppercase">Use Case</span>
          </div>
          <p className="text-[10px] text-foreground/75 leading-relaxed">{tool.use_case}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {tool.tags?.map(tag => (
          <button key={tag} onClick={() => onTagClick(tag)} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border hover:text-primary hover:border-primary/20 transition-colors">
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolForm({ tool, onSave, onCancel }: { tool: Tool; onSave: (t: Tool) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Tool>({ ...tool });
  const [tagInput, setTagInput] = useState(tool.tags?.join(", ") || "");

  const handleSave = () => {
    const tags = tagInput.split(",").map(t => t.trim()).filter(Boolean);
    onSave({ ...form, tags });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-1 border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold text-primary">{tool.id ? "EDIT TOOL" : "ADD NEW TOOL"}</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-surface-2 text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tool name" className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30" />
        <input value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30" />
        <input value={form.use_case || ""} onChange={e => setForm({ ...form, use_case: e.target.value })} placeholder="Use case" className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30" />
        <input value={form.website_url || ""} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="Website URL" className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30" />
        <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tags (comma separated)" className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30" />

        <div className="flex gap-2">
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="flex-1 bg-surface-2 border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/30">
            {Object.keys(categoryMeta).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })} className="bg-surface-2 border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/30">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <textarea value={form.custom_notes || ""} onChange={e => setForm({ ...form, custom_notes: e.target.value })} placeholder="Custom notes..." rows={3} className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 resize-none" />

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">CANCEL</button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors">
            <Save className="w-3 h-3" /> SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
