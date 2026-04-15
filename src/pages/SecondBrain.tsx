import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Radar,
  Globe,
  Shield,
  Bug,
  Terminal,
  Network,
  Lock,
  FileSearch,
  Zap,
  Database,
  Code,
  Eye,
  Smartphone,
  Cloud,
  ArrowLeft,
  ExternalLink,
  BookOpen,
  Star,
  ChevronDown,
  ChevronRight,
  Layers,
  Fingerprint,
  Wifi,
  KeyRound,
  Binary,
} from "lucide-react";
import { Link } from "react-router-dom";

interface Tool {
  name: string;
  description: string;
  useCase: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  url?: string;
  starred?: boolean;
}

interface Category {
  id: string;
  label: string;
  icon: any;
  description: string;
  tools: Tool[];
}

const categories: Category[] = [
  {
    id: "recon",
    label: "Reconnaissance",
    icon: Radar,
    description: "Passive and active information gathering to map attack surfaces",
    tools: [
      { name: "Nmap", description: "Network discovery and security auditing tool. Port scanning, service detection, OS fingerprinting.", useCase: "Map open ports, detect services, identify OS versions on target hosts", tags: ["port-scan", "service-detection", "network"], difficulty: "beginner", url: "https://nmap.org" },
      { name: "Amass", description: "In-depth attack surface mapping and asset discovery using OSINT.", useCase: "Subdomain enumeration, ASN discovery, network mapping at scale", tags: ["subdomain", "osint", "dns"], difficulty: "intermediate", url: "https://github.com/owasp-amass/amass" },
      { name: "Subfinder", description: "Fast passive subdomain enumeration tool.", useCase: "Quickly discover subdomains using passive sources like crt.sh, SecurityTrails", tags: ["subdomain", "passive", "fast"], difficulty: "beginner", url: "https://github.com/projectdiscovery/subfinder" },
      { name: "Shodan", description: "Search engine for internet-connected devices.", useCase: "Find exposed services, IoT devices, misconfigured servers without active scanning", tags: ["osint", "search-engine", "iot"], difficulty: "beginner", url: "https://shodan.io" },
      { name: "Censys", description: "Internet-wide scanning and certificate transparency search.", useCase: "Discover hosts, certificates, and services across the internet", tags: ["certificates", "search-engine", "tls"], difficulty: "intermediate", url: "https://censys.io" },
      { name: "theHarvester", description: "Gather emails, subdomains, IPs from public sources.", useCase: "OSINT gathering for email addresses, employee names, and subdomains", tags: ["osint", "email", "passive"], difficulty: "beginner", url: "https://github.com/laramies/theHarvester" },
      { name: "Masscan", description: "Internet-scale port scanner. Scans the entire internet in under 6 minutes.", useCase: "Extremely fast port scanning for large IP ranges", tags: ["port-scan", "fast", "network"], difficulty: "intermediate", url: "https://github.com/robertdavidgraham/masscan" },
      { name: "DNSRecon", description: "DNS enumeration and reconnaissance tool.", useCase: "Zone transfers, brute-force subdomains, DNS record enumeration", tags: ["dns", "enumeration", "zone-transfer"], difficulty: "intermediate" },
      { name: "Recon-ng", description: "Full-featured web reconnaissance framework.", useCase: "Modular OSINT framework for automating recon workflows", tags: ["framework", "osint", "automation"], difficulty: "intermediate", url: "https://github.com/lanmaster53/recon-ng" },
    ],
  },
  {
    id: "web-scanning",
    label: "Web App Scanning",
    icon: Globe,
    description: "Automated and manual web application vulnerability scanning",
    tools: [
      { name: "Burp Suite", description: "Industry-standard web application security testing platform.", useCase: "Intercept/modify HTTP traffic, scan for web vulns, manual testing with Repeater/Intruder", tags: ["proxy", "scanner", "manual-testing"], difficulty: "intermediate", url: "https://portswigger.net/burp" },
      { name: "OWASP ZAP", description: "Free and open-source web app security scanner.", useCase: "Automated scanning, spidering, active/passive vulnerability detection", tags: ["scanner", "free", "proxy"], difficulty: "beginner", url: "https://zaproxy.org" },
      { name: "Nikto", description: "Web server scanner for dangerous files, outdated software, and misconfigurations.", useCase: "Quick scan for common web server issues and known vulnerabilities", tags: ["scanner", "web-server", "misconfig"], difficulty: "beginner", url: "https://github.com/sullo/nikto" },
      { name: "Nuclei", description: "Fast, template-based vulnerability scanner.", useCase: "Run community templates to detect CVEs, misconfigs, exposed panels at scale", tags: ["templates", "fast", "cve"], difficulty: "intermediate", url: "https://github.com/projectdiscovery/nuclei" },
      { name: "WPScan", description: "WordPress security scanner.", useCase: "Enumerate WordPress plugins, themes, users, and known vulnerabilities", tags: ["wordpress", "cms", "enumeration"], difficulty: "beginner", url: "https://wpscan.com" },
      { name: "Wappalyzer", description: "Technology profiler that identifies frameworks, CMS, and libraries.", useCase: "Fingerprint target tech stack to tailor attacks", tags: ["fingerprint", "tech-stack", "passive"], difficulty: "beginner", url: "https://www.wappalyzer.com" },
    ],
  },
  {
    id: "exploitation",
    label: "Exploitation",
    icon: Shield,
    description: "Frameworks and tools for exploiting discovered vulnerabilities",
    tools: [
      { name: "Metasploit", description: "The world's most used penetration testing framework.", useCase: "Exploit development, payload generation, post-exploitation, pivoting", tags: ["framework", "exploits", "payloads"], difficulty: "intermediate", url: "https://metasploit.com" },
      { name: "SQLMap", description: "Automatic SQL injection detection and exploitation.", useCase: "Detect and exploit SQL injection flaws, dump databases, get OS shells", tags: ["sqli", "database", "automation"], difficulty: "intermediate", url: "https://sqlmap.org" },
      { name: "XSSHunter", description: "Blind XSS detection and proof-of-concept tool.", useCase: "Plant blind XSS payloads and get notified when they fire with screenshots", tags: ["xss", "blind", "callback"], difficulty: "intermediate" },
      { name: "Commix", description: "Automated command injection exploitation tool.", useCase: "Detect and exploit command injection vulnerabilities", tags: ["command-injection", "rce", "automation"], difficulty: "intermediate", url: "https://github.com/commixproject/commix" },
      { name: "BeEF", description: "Browser Exploitation Framework.", useCase: "Hook browsers and launch client-side attacks, social engineering", tags: ["browser", "client-side", "hook"], difficulty: "advanced", url: "https://beefproject.com" },
    ],
  },
  {
    id: "fuzzing",
    label: "Fuzzing & Brute Force",
    icon: Zap,
    description: "Content discovery, parameter fuzzing, and brute-force tools",
    tools: [
      { name: "ffuf", description: "Fast web fuzzer written in Go.", useCase: "Directory/file brute-forcing, parameter fuzzing, virtual host discovery", tags: ["fuzzing", "fast", "discovery"], difficulty: "beginner", url: "https://github.com/ffuf/ffuf" },
      { name: "Gobuster", description: "Directory/file and DNS brute-forcing tool.", useCase: "Brute-force directories, files, subdomains, and virtual hosts", tags: ["brute-force", "discovery", "dns"], difficulty: "beginner", url: "https://github.com/OJ/gobuster" },
      { name: "Dirsearch", description: "Web path discovery tool.", useCase: "Find hidden directories and files on web servers", tags: ["discovery", "directories", "wordlist"], difficulty: "beginner", url: "https://github.com/maurosoria/dirsearch" },
      { name: "Feroxbuster", description: "Fast, recursive content discovery tool.", useCase: "Recursive directory brute-forcing with smart filtering", tags: ["recursive", "fast", "discovery"], difficulty: "beginner", url: "https://github.com/epi052/feroxbuster" },
      { name: "Hydra", description: "Fast network logon cracker supporting many protocols.", useCase: "Brute-force login credentials across SSH, FTP, HTTP, RDP, etc.", tags: ["brute-force", "credentials", "multi-protocol"], difficulty: "intermediate", url: "https://github.com/vanhauser-thc/thc-hydra" },
      { name: "Arjun", description: "HTTP parameter discovery suite.", useCase: "Find hidden GET/POST parameters on web endpoints", tags: ["parameters", "hidden", "discovery"], difficulty: "beginner", url: "https://github.com/s0md3v/Arjun" },
    ],
  },
  {
    id: "network",
    label: "Network & MITM",
    icon: Network,
    description: "Network analysis, packet capture, and man-in-the-middle tools",
    tools: [
      { name: "Wireshark", description: "Network protocol analyzer and packet capture.", useCase: "Deep packet inspection, traffic analysis, protocol debugging", tags: ["packet-capture", "analysis", "protocol"], difficulty: "intermediate", url: "https://wireshark.org" },
      { name: "Responder", description: "LLMNR/NBT-NS/MDNS poisoner.", useCase: "Capture NTLMv2 hashes on local networks via poisoning", tags: ["mitm", "ntlm", "local-network"], difficulty: "advanced", url: "https://github.com/lgandx/Responder" },
      { name: "Bettercap", description: "Swiss army knife for network attacks.", useCase: "ARP spoofing, DNS spoofing, WiFi attacks, BLE recon", tags: ["mitm", "spoofing", "wifi"], difficulty: "advanced", url: "https://bettercap.org" },
      { name: "tcpdump", description: "Command-line packet analyzer.", useCase: "Quick packet capture and filtering from the terminal", tags: ["packet-capture", "cli", "lightweight"], difficulty: "intermediate" },
    ],
  },
  {
    id: "crypto",
    label: "Cryptography & Auth",
    icon: KeyRound,
    description: "Tools for testing authentication, tokens, and cryptographic implementations",
    tools: [
      { name: "Hashcat", description: "Advanced password recovery tool using GPU acceleration.", useCase: "Crack password hashes (MD5, SHA, NTLM, bcrypt) at massive speed", tags: ["password", "gpu", "hash-cracking"], difficulty: "intermediate", url: "https://hashcat.net" },
      { name: "John the Ripper", description: "Versatile password cracker.", useCase: "Crack various hash types, supports wordlists and rules", tags: ["password", "wordlist", "versatile"], difficulty: "intermediate", url: "https://www.openwall.com/john/" },
      { name: "jwt_tool", description: "JWT security testing toolkit.", useCase: "Test JWT implementations for known vulnerabilities (none algo, key confusion)", tags: ["jwt", "auth", "tokens"], difficulty: "intermediate", url: "https://github.com/ticarpi/jwt_tool" },
      { name: "CyberChef", description: "Web-based data transformation and encoding tool.", useCase: "Decode, encode, encrypt, compress data — the Swiss army knife for data ops", tags: ["encoding", "crypto", "transform"], difficulty: "beginner", url: "https://gchq.github.io/CyberChef/" },
    ],
  },
  {
    id: "cloud",
    label: "Cloud & Infrastructure",
    icon: Cloud,
    description: "Cloud security assessment, container testing, and infrastructure tools",
    tools: [
      { name: "ScoutSuite", description: "Multi-cloud security auditing tool.", useCase: "Audit AWS, Azure, GCP configurations for security issues", tags: ["cloud", "audit", "multi-cloud"], difficulty: "intermediate", url: "https://github.com/nccgroup/ScoutSuite" },
      { name: "Prowler", description: "AWS security assessment and compliance tool.", useCase: "Check AWS accounts against CIS benchmarks and best practices", tags: ["aws", "compliance", "audit"], difficulty: "intermediate", url: "https://github.com/prowler-cloud/prowler" },
      { name: "CloudBrute", description: "Cloud infrastructure enumeration tool.", useCase: "Find open cloud storage buckets, app services across providers", tags: ["cloud", "enumeration", "storage"], difficulty: "intermediate" },
      { name: "Trivy", description: "Container and artifact vulnerability scanner.", useCase: "Scan Docker images, filesystems, and repos for CVEs and misconfigs", tags: ["container", "docker", "cve"], difficulty: "beginner", url: "https://github.com/aquasecurity/trivy" },
    ],
  },
  {
    id: "mobile",
    label: "Mobile Security",
    icon: Smartphone,
    description: "Tools for testing Android and iOS application security",
    tools: [
      { name: "Frida", description: "Dynamic instrumentation toolkit.", useCase: "Hook into running apps, bypass SSL pinning, modify runtime behavior", tags: ["dynamic", "hooking", "runtime"], difficulty: "advanced", url: "https://frida.re" },
      { name: "MobSF", description: "Mobile Security Framework — automated static and dynamic analysis.", useCase: "Analyze APK/IPA files for vulnerabilities, hardcoded secrets, misconfigs", tags: ["static-analysis", "android", "ios"], difficulty: "intermediate", url: "https://github.com/MobSF/Mobile-Security-Framework-MobSF" },
      { name: "Objection", description: "Runtime mobile exploration toolkit powered by Frida.", useCase: "Bypass root detection, SSL pinning, explore app internals on device", tags: ["frida", "bypass", "exploration"], difficulty: "advanced", url: "https://github.com/sensepost/objection" },
    ],
  },
  {
    id: "osint",
    label: "OSINT & Social",
    icon: Eye,
    description: "Open-source intelligence gathering and social engineering tools",
    tools: [
      { name: "Maltego", description: "Visual link analysis and data mining tool.", useCase: "Map relationships between people, domains, IPs, emails visually", tags: ["visualization", "link-analysis", "graph"], difficulty: "intermediate", url: "https://maltego.com" },
      { name: "SpiderFoot", description: "Automated OSINT collection tool.", useCase: "Collect intel from 200+ data sources automatically", tags: ["automation", "multi-source", "intel"], difficulty: "beginner", url: "https://spiderfoot.net" },
      { name: "Sherlock", description: "Hunt usernames across social networks.", useCase: "Find a target's accounts across 300+ platforms by username", tags: ["username", "social-media", "enumeration"], difficulty: "beginner", url: "https://github.com/sherlock-project/sherlock" },
      { name: "GHunt", description: "Google account OSINT tool.", useCase: "Extract information from Google accounts (reviews, maps, calendar)", tags: ["google", "osint", "account"], difficulty: "intermediate" },
    ],
  },
  {
    id: "post-exploit",
    label: "Post-Exploitation",
    icon: Terminal,
    description: "Persistence, privilege escalation, lateral movement, and data exfiltration",
    tools: [
      { name: "LinPEAS / WinPEAS", description: "Privilege escalation scripts for Linux and Windows.", useCase: "Enumerate privesc vectors: SUID, cron, kernel exploits, misconfigs", tags: ["privesc", "enumeration", "local"], difficulty: "intermediate", url: "https://github.com/carlospolop/PEASS-ng" },
      { name: "BloodHound", description: "Active Directory attack path mapping.", useCase: "Visualize AD relationships and find shortest path to domain admin", tags: ["active-directory", "graph", "privesc"], difficulty: "advanced", url: "https://github.com/BloodHoundAD/BloodHound" },
      { name: "Mimikatz", description: "Windows credential extraction tool.", useCase: "Dump passwords, hashes, Kerberos tickets from Windows memory", tags: ["credentials", "windows", "kerberos"], difficulty: "advanced", url: "https://github.com/gentilkiwi/mimikatz" },
      { name: "Chisel", description: "Fast TCP/UDP tunnel over HTTP.", useCase: "Pivot through compromised hosts, create reverse tunnels", tags: ["tunneling", "pivoting", "http"], difficulty: "intermediate", url: "https://github.com/jpillora/chisel" },
    ],
  },
  {
    id: "reporting",
    label: "Reporting & Workflow",
    icon: FileSearch,
    description: "Documentation, report generation, and bug bounty workflow tools",
    tools: [
      { name: "Notion / Obsidian", description: "Knowledge management and note-taking.", useCase: "Document findings, build recon playbooks, maintain target notes", tags: ["notes", "documentation", "workflow"], difficulty: "beginner" },
      { name: "SRT (Simple Report Template)", description: "Bug bounty report templates.", useCase: "Standardize vulnerability reports with impact, steps to reproduce, PoC", tags: ["templates", "reports", "bounty"], difficulty: "beginner" },
      { name: "Updog", description: "Simple HTTP file server.", useCase: "Quickly serve files for exfiltration PoC or payload hosting", tags: ["file-server", "utility", "quick"], difficulty: "beginner", url: "https://github.com/sc0tfree/updog" },
    ],
  },
];

const difficultyColors = {
  beginner: "bg-primary/15 text-primary border-primary/20",
  intermediate: "bg-primary/10 text-primary/80 border-primary/15",
  advanced: "bg-primary/5 text-primary/60 border-primary/10",
};

export default function SecondBrain() {
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(categories.map(c => c.id)));
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    categories.forEach(c => c.tools.forEach(t => t.tags.forEach(tag => tagSet.add(tag))));
    return Array.from(tagSet).sort();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return categories.map(cat => ({
      ...cat,
      tools: cat.tools.filter(t => {
        const matchesSearch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.includes(q));
        const matchesTag = !selectedTag || t.tags.includes(selectedTag);
        return matchesSearch && matchesTag;
      }),
    })).filter(cat => cat.tools.length > 0);
  }, [search, selectedTag]);

  const totalTools = categories.reduce((sum, c) => sum + c.tools.length, 0);
  const toggleCat = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
              {totalTools} TOOLS • {categories.length} CATEGORIES
            </span>
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
              <button onClick={() => setSearch("")} className="mr-2 text-[10px] font-mono text-muted-foreground hover:text-foreground">
                CLEAR
              </button>
            )}
          </div>
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="text-[10px] font-mono px-2 py-1 rounded bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
            >
              #{selectedTag} ✕
            </button>
          )}
        </div>

        {/* Tag Bar */}
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
        {filtered.map(cat => {
          const Icon = cat.icon;
          const isExpanded = expandedCats.has(cat.id);
          return (
            <motion.section key={cat.id} layout>
              {/* Category Header */}
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center gap-3 mb-2 group"
              >
                <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center neon-gold-box shrink-0">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <span className="font-mono text-xs font-bold text-primary tracking-wider neon-gold">
                    {cat.label.toUpperCase()}
                  </span>
                  <span className="ml-2 text-[10px] font-mono text-muted-foreground">
                    ({cat.tools.length})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>

              {!isExpanded && (
                <p className="text-[10px] font-mono text-muted-foreground ml-10 mb-2">{cat.description}</p>
              )}

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-[10px] font-mono text-muted-foreground ml-10 mb-3">{cat.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-10">
                      {cat.tools.map(tool => (
                        <ToolCard key={tool.name} tool={tool} onTagClick={setSelectedTag} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm font-mono text-muted-foreground">No tools found matching your search.</p>
            <button onClick={() => { setSearch(""); setSelectedTag(null); }} className="mt-2 text-xs font-mono text-primary hover:underline">
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCard({ tool, onTagClick }: { tool: Tool; onTagClick: (tag: string) => void }) {
  return (
    <div className="group rounded-lg border border-border bg-surface-1 hover:border-primary/20 hover:neon-gold-box transition-all p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground group-hover:text-primary transition-colors">
              {tool.name}
            </span>
            <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full border ${difficultyColors[tool.difficulty]}`}>
              {tool.difficulty.toUpperCase()}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{tool.description}</p>
        </div>
        {tool.url && (
          <a href={tool.url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 rounded hover:bg-surface-2 text-muted-foreground hover:text-primary transition-colors">
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="bg-surface-2/50 rounded-md px-2 py-1.5 border border-border">
        <div className="flex items-center gap-1 mb-0.5">
          <Layers className="w-2.5 h-2.5 text-primary" />
          <span className="text-[8px] font-mono font-bold text-primary uppercase">Use Case</span>
        </div>
        <p className="text-[10px] text-foreground/75 leading-relaxed">{tool.useCase}</p>
      </div>

      <div className="flex flex-wrap gap-1">
        {tool.tags.map(tag => (
          <button
            key={tag}
            onClick={() => onTagClick(tag)}
            className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border hover:text-primary hover:border-primary/20 transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
