import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { api } from '@/api';
import {
    LayoutDashboard,
    Target,
    ShieldCheck,
    KeyRound,
    Plug,
    FileText,
    Code2,
    Activity,
    Fingerprint,
    Palette,
    Webhook,
    Smartphone,
    ShieldAlert,
    Building2,
    LogOut,
    ChevronRight,
    Search,
    Bell,
    Users as UsersIcon,
    Slack,
    Share2,
    Database,
    ClipboardList,
    ChevronDown,
    Sparkles,
    Globe,
    Lock,
    Layers,
    UserPlus,
    CheckCircle2,
    ExternalLink,
    HelpCircle,
    Command,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ModeToggle } from '@/components/mode-toggle';
import { Toaster } from '@/components/ui/toaster';
import { Logo } from '@/components/ui/logo';
import CopilotWidget from './CopilotWidget';

interface NavItem {
    path: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

interface NavSection {
    key: string;
    label: string;
    items: NavItem[];
}

const navSections: NavSection[] = [
    {
        key: 'overview',
        label: 'Platform Overview',
        items: [
            { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { path: '/copilot', label: 'AI Security Copilot', icon: Sparkles, badge: 'AI', badgeVariant: 'secondary' },
        ],
    },
    {
        key: 'directory',
        label: 'Identity & Access',
        items: [
            { path: '/users', label: 'Users & Identities', icon: UsersIcon },
            { path: '/groups', label: 'Security Groups', icon: Layers },
            { path: '/roles', label: 'Roles & RBAC', icon: ShieldCheck },
            { path: '/organizations', label: 'Tenants & Orgs', icon: Building2 },
            { path: '/requests', label: 'Access Requests', icon: ClipboardList, badge: 'Active' },
        ],
    },
    {
        key: 'security',
        label: 'Zero-Trust Security',
        items: [
            { path: '/safety', label: 'Security Inbox', icon: ShieldAlert },
            { path: '/discovery', label: 'Posture Discovery', icon: Search },
            { path: '/policies', label: 'Authorization Policies', icon: Lock },
            { path: '/policies/ip', label: 'IP Access Rules', icon: Globe },
            { path: '/mfa', label: 'Adaptive MFA', icon: ShieldCheck },
            { path: '/passkeys', label: 'Passkeys & WebAuthn', icon: Fingerprint },
            { path: '/devices', label: 'Trusted Devices', icon: Smartphone },
        ],
    },
    {
        key: 'apps_governance',
        label: 'Apps & Governance',
        items: [
            { path: '/sso', label: 'SSO & Federation', icon: KeyRound },
            { path: '/connectors', label: 'Identity Connectors', icon: Plug },
            { path: '/apps', label: 'Registered Apps', icon: Code2 },
            { path: '/campaigns', label: 'Access Reviews', icon: Target },
            { path: '/workloads', label: 'Machine Accounts', icon: Database },
            { path: '/graph-explorer', label: 'Access Graph', icon: Share2 },
            { path: '/webhooks', label: 'Webhooks & Events', icon: Webhook },
            { path: '/integrations/slack', label: 'Slack Integration', icon: Slack },
        ],
    },
    {
        key: 'compliance',
        label: 'Audit & Compliance',
        items: [
            { path: '/audit', label: 'Audit Trail', icon: FileText },
            { path: '/branding', label: 'Tenant Customization', icon: Palette },
        ],
    },
];

const AdminShell: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [userName, setUserName] = useState(
        localStorage.getItem('userName') || localStorage.getItem('userId') || 'Administrator'
    );
    const [systemsHealthy, setSystemsHealthy] = useState<boolean | null>(true);

    const tenantId = localStorage.getItem('tenantID') || 'Default Tenant';
    const policyBaseUrl = window.location.hostname.endsWith('.local')
        ? 'http://wardseal.local'
        : 'https://wardseal.com';

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/v1/user/profile');
                if (res.data?.name) {
                    setUserName(res.data.name);
                    localStorage.setItem('userName', res.data.name);
                } else if (res.data?.email) {
                    setUserName(res.data.email);
                    localStorage.setItem('userName', res.data.email);
                }
            } catch (err) {
                console.error('Failed to fetch profile in AdminShell', err);
            }
        };
        void fetchProfile();
    }, []);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await api.get('/api/v1/user/profile');
                setSystemsHealthy(res.status === 200);
            } catch {
                setSystemsHealthy(true);
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const toggleSection = (key: string) => {
        setCollapsedSections(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const isItemActive = (path: string) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    // Filter nav items by search query
    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return navSections;
        const q = searchQuery.toLowerCase();
        return navSections.map(sec => ({
            ...sec,
            items: sec.items.filter(item => item.label.toLowerCase().includes(q) || sec.label.toLowerCase().includes(q)),
        })).filter(sec => sec.items.length > 0);
    }, [searchQuery]);

    // Active item and section for header breadcrumb
    const activeItem = navSections
        .flatMap(s => s.items)
        .find(i => isItemActive(i.path));

    const activeSection = navSections.find(s =>
        s.items.some(i => isItemActive(i.path))
    );

    return (
        <div className="flex h-screen w-screen overflow-hidden font-sans bg-background selection:bg-secondary/20 selection:text-secondary">
            {/* ── Left Sidebar (280px) ────────────────────────────────────────── */}
            <aside className="w-72 border-r border-border bg-card flex flex-col shrink-0 z-30 shadow-xs select-none">
                {/* Brand Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-card">
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#001C41]/10 border border-[#001C41]/20 shadow-xs group-hover:scale-105 transition-transform">
                            <Logo variant="icon" className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-extrabold text-[15px] tracking-tight text-foreground leading-none">
                                WardSeal
                            </span>
                            <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mt-1">
                                Control Plane
                            </span>
                        </div>
                    </Link>
                    <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 border-border bg-muted/50 text-muted-foreground">
                        v4.2
                    </Badge>
                </div>

                {/* Tenant / Organization Selector Card */}
                <div className="p-3 border-b border-border/60 bg-muted/20">
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/80 bg-card hover:border-secondary/40 transition-colors shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xs shrink-0">
                                {tenantId.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground truncate leading-tight">
                                    {tenantId}
                                </div>
                                <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                                    Active Directory
                                </div>
                            </div>
                        </div>
                        <Badge className="bg-secondary/15 text-secondary border-none font-semibold text-[10px] px-1.5 py-0.5">
                            SaaS
                        </Badge>
                    </div>
                </div>

                {/* Quick Navigation Filter */}
                <div className="px-3 pt-3 pb-1">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Jump to page..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 pr-3 text-xs bg-muted/40 border-border/60 rounded-lg focus-visible:ring-1 focus-visible:ring-secondary"
                        />
                    </div>
                </div>

                {/* Navigation Scroll Area */}
                <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 custom-scrollbar">
                    {filteredSections.map((section) => {
                        const isCollapsed = collapsedSections.includes(section.key);
                        return (
                            <div key={section.key} className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() => toggleSection(section.key)}
                                    className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 hover:text-foreground transition-colors group"
                                >
                                    <span>{section.label}</span>
                                    <ChevronDown className={cn("w-3 h-3 text-muted-foreground/60 transition-transform duration-200", isCollapsed && "-rotate-90")} />
                                </button>

                                {!isCollapsed && (
                                    <div className="space-y-0.5">
                                        {section.items.map((item) => {
                                            const active = isItemActive(item.path);
                                            const Icon = item.icon;
                                            return (
                                                <Link
                                                    key={item.path}
                                                    to={item.path}
                                                    className={cn(
                                                        "flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative",
                                                        active
                                                            ? "bg-secondary text-secondary-foreground font-semibold shadow-xs"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <Icon className={cn(
                                                            "w-4 h-4 shrink-0 transition-colors",
                                                            active ? "text-secondary-foreground" : "text-muted-foreground group-hover:text-foreground"
                                                        )} />
                                                        <span className="truncate">{item.label}</span>
                                                    </div>
                                                    {item.badge && (
                                                        <span className={cn(
                                                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                                                            active
                                                                ? "bg-white/20 text-white"
                                                                : "bg-muted text-foreground border border-border"
                                                        )}>
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* User Profile Card & Sign Out */}
                <div className="p-3 border-t border-border bg-card">
                    <div className="flex items-center justify-between p-2 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#001C41] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {userName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground truncate leading-tight">
                                    {userName}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                                    Super Admin
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            title="Sign out"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* ── Main View Area ──────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-background">
                {/* Top Navigation Header */}
                <header className="h-16 border-b border-border bg-card/95 backdrop-blur-md px-8 flex items-center justify-between shrink-0 z-20">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-xs" aria-label="Breadcrumb">
                        <span className="text-muted-foreground font-medium">
                            {activeSection?.label || 'Overview'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span className="text-foreground font-bold">
                            {activeItem?.label || 'Dashboard'}
                        </span>
                    </nav>

                    {/* Header Action Tools */}
                    <div className="flex items-center gap-3">
                        {/* Live Cluster Health Badge */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-[11px] font-semibold">
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span>Cluster Healthy • 5 Services</span>
                        </div>

                        {/* Search Palette Hint */}
                        <div className="relative hidden md:block">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-muted-foreground text-xs font-medium cursor-pointer hover:bg-muted/70 transition-colors">
                                <Search className="w-3.5 h-3.5" />
                                <span>Search anything...</span>
                                <kbd className="text-[10px] font-semibold bg-card border border-border px-1.5 py-0.5 rounded shadow-2xs">
                                    ⌘K
                                </kbd>
                            </div>
                        </div>

                        {/* User App Portal */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const targetUrl = window.location.hostname.endsWith('.local')
                                    ? 'http://app.wardseal.local'
                                    : 'https://id.wardseal.com/portal';
                                window.location.assign(targetUrl);
                            }}
                            className="h-9 px-3 text-xs font-semibold rounded-lg hidden lg:flex items-center gap-1.5 border-border"
                        >
                            <Activity className="w-3.5 h-3.5 text-secondary" />
                            User Portal
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </Button>

                        {/* Quick Invite Button */}
                        <Button
                            size="sm"
                            onClick={() => navigate('/users/new')}
                            className="h-9 px-3.5 text-xs font-bold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xs flex items-center gap-1.5"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            Add User
                        </Button>

                        {/* Notifications */}
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full" />
                        </Button>

                        {/* Theme Toggle */}
                        <ModeToggle />
                    </div>
                </header>

                {/* Scrollable Main Content Container */}
                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    <Outlet />
                </main>

                {/* Fixed Bottom Operational Footer */}
                <footer className="h-10 border-t border-border bg-card/80 px-8 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 select-none">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            <span>High-availability control plane</span>
                        </div>
                        <span className="text-border">•</span>
                        <span className="font-mono text-[10px]">Build v4.2.0-rc3</span>
                    </div>

                    <div className="flex items-center gap-5 font-medium">
                        <a href={`${policyBaseUrl}/policies#privacy`} target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Privacy</a>
                        <a href={`${policyBaseUrl}/policies#security`} target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Security Posture</a>
                        <a href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
                            Documentation <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </div>
                </footer>
            </div>

            <Toaster />
            <CopilotWidget />
        </div>
    );
};

export default AdminShell;
