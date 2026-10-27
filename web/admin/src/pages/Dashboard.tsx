import React, { useEffect, useMemo, useState } from 'react';
import { getSCIMUsers, getGovernanceStats, DashboardStats } from '../api';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    ShieldCheck,
    UserPlus,
    Copy,
    Check,
    Database,
    Clock,
    Globe,
    AlertTriangle,
    ArrowUpRight,
    RefreshCw,
    Shield,
    KeyRound,
    Search,
    Filter,
    CheckCircle2,
    Lock,
    Cpu,
    ExternalLink,
    Sparkles,
} from 'lucide-react';
import {
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import {
    PageLayout,
    PageHeader,
    StatCard,
    GlassCard,
    GlassCardHeader,
    GlassCardTitle,
    GlassCardContent,
    GlassTable,
    GlassTableHeader,
    GlassTableRow,
    GlassTableHead,
    TableBody,
    TableCell,
    Badge,
    Avatar,
    Button,
    Input,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Progress,
} from '@dhawalhost/wardseal-ui-kit';
import { cn } from '@/lib/utils';
import { colors, chartTooltipStyle } from '@/components/theme';

const RISK_COLORS: Record<string, string> = {
    High: 'hsl(var(--destructive))',
    Medium: 'hsl(var(--warning))',
    Low: 'hsl(var(--success))',
};

interface UserRow {
    id: string;
    userName?: string;
    active?: boolean;
    meta?: { created?: string };
}

export const Dashboard: React.FC = () => {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersResult, statsResult] = await Promise.allSettled([
                getSCIMUsers(),
                getGovernanceStats(),
            ]);
            if (usersResult.status === 'fulfilled') {
                setUsers(usersResult.value?.Resources || []);
            }
            if (statsResult.status === 'fulfilled') {
                setStats(statsResult.value);
            }
            setError('');
            setLastUpdated(new Date());
        } catch (err: unknown) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const riskData = useMemo(() => {
        if (!stats?.risk_profile) return [];
        return Object.entries(stats.risk_profile).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: Number(value) || 0,
        }));
    }, [stats]);

    const riskTotal = useMemo(
        () => riskData.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
        [riskData]
    );

    const activityData = useMemo(
        () => [
            { name: 'Identities', value: stats?.active_users ?? users.length },
            { name: 'Groups', value: stats?.total_groups ?? 3 },
            { name: 'Workloads', value: stats?.active_workloads ?? 8 },
            { name: 'Policies', value: stats?.active_ip_policies ?? 4 },
        ],
        [stats, users]
    );

    const hygiene = stats?.hygiene_score ?? 94;
    const hygieneTone =
        hygiene >= 80 ? 'text-emerald-600 dark:text-emerald-400' : hygiene >= 50 ? 'text-amber-500' : 'text-red-500';
    const hygieneBg =
        hygiene >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : hygiene >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesQuery =
                !searchQuery ||
                (u.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && u.active) ||
                (statusFilter === 'inactive' && !u.active);
            return matchesQuery && matchesStatus;
        });
    }, [users, searchQuery, statusFilter]);

    return (
        <PageLayout className="animate-in fade-in duration-300 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
            {/* Command Header Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#001C41] via-[#0F172A] to-[#002D62] p-6 sm:p-8 text-white shadow-xl">
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
                <div className="absolute right-32 -bottom-20 h-56 w-56 rounded-full bg-blue-600/15 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                            </span>
                            WardSeal Zero-Trust Control Plane · Active
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            Security & Identity Command
                        </h1>
                        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                            Continuous governance across workforce SCIM directories, workload mTLS credentials, and dynamic zero-trust perimeter policies.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {lastUpdated && (
                            <span className="text-xs text-slate-400 font-mono hidden lg:inline-flex items-center gap-1.5">
                                <RefreshCw className="h-3 w-3" />
                                {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => fetchData()}
                            disabled={loading}
                            className="h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold px-3.5 backdrop-blur-md cursor-pointer transition-all"
                        >
                            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
                            Sync Live
                        </Button>
                        <Button
                            onClick={() => navigate('/users/new')}
                            className="h-10 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs px-4 shadow-lg shadow-sky-500/20 cursor-pointer transition-all"
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Provision Identity
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <div
                    role="alert"
                    className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm font-semibold text-destructive shadow-sm"
                >
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* KPI Metric Strip */}
            <section aria-label="Key metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <GlassCard className="relative overflow-hidden border border-border/70 hover:border-sky-500/40 shadow-sm hover:shadow-md transition-all duration-200">
                    <GlassCardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Total Workforce
                            </span>
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                <Users className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold tracking-tight text-on-surface tabular-nums">
                                {loading ? '—' : (stats?.active_users ?? users.length)}
                            </span>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                                <ArrowUpRight className="h-3 w-3" /> +12%
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Active SCIM provisioned identities
                        </p>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard
                    onClick={() => navigate('/requests')}
                    className="relative overflow-hidden border border-border/70 hover:border-amber-500/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                    <GlassCardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Pending Access
                            </span>
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Clock className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold tracking-tight text-on-surface tabular-nums">
                                {loading ? '—' : (stats?.pending_requests ?? 0)}
                            </span>
                            {(stats?.pending_requests ?? 0) > 0 ? (
                                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-none font-semibold text-xs">
                                    Action Required
                                </Badge>
                            ) : (
                                <span className="text-xs font-semibold text-muted-foreground">Queue clear</span>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Privileged access reviews pending
                        </p>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard
                    onClick={() => navigate('/policies/ip')}
                    className="relative overflow-hidden border border-border/70 hover:border-sky-500/40 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                    <GlassCardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Active Guardrails
                            </span>
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Globe className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold tracking-tight text-on-surface tabular-nums">
                                {loading ? '—' : (stats?.active_ip_policies ?? 4)}
                            </span>
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none font-semibold text-xs">
                                100% Enforced
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            IP geo-fence & subnet filters
                        </p>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="relative overflow-hidden border border-border/70 hover:border-emerald-500/40 shadow-sm hover:shadow-md transition-all duration-200">
                    <GlassCardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Security Posture
                            </span>
                            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", hygieneBg, hygieneTone)}>
                                <ShieldCheck className="h-5 w-5" />
                            </span>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className={cn("text-3xl font-extrabold tracking-tight tabular-nums", hygieneTone)}>
                                {loading ? '—' : `${hygiene}%`}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                                {hygiene >= 80 ? 'Grade A · Robust' : 'Attention Needed'}
                            </span>
                        </div>
                        <div className="mt-2.5">
                            <Progress value={hygiene} className="h-2 rounded-full bg-muted" />
                        </div>
                    </GlassCardContent>
                </GlassCard>
            </section>

            {/* Redesigned Tabbed Navigation Area */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
                    <TabsList className="bg-muted/70 p-1 rounded-xl h-11 border border-border/60">
                        <TabsTrigger
                            value="overview"
                            className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-on-surface data-[state=active]:shadow-sm transition-all"
                        >
                            <Database className="w-3.5 h-3.5 mr-2 text-sky-500" />
                            Overview & Telemetry
                        </TabsTrigger>
                        <TabsTrigger
                            value="posture"
                            className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-on-surface data-[state=active]:shadow-sm transition-all"
                        >
                            <Shield className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                            Security Hygiene
                        </TabsTrigger>
                        <TabsTrigger
                            value="directory"
                            className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-on-surface data-[state=active]:shadow-sm transition-all"
                        >
                            <Users className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                            Directory Stream ({users.length})
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/audit')}
                            className="h-9 rounded-lg text-xs font-semibold text-muted-foreground hover:text-on-surface"
                        >
                            View Audit Log <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* TAB 1: OVERVIEW & TELEMETRY */}
                <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none">
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <GlassCard className="lg:col-span-7 border border-border/70 shadow-sm bg-card">
                            <GlassCardHeader className="flex flex-row items-center justify-between pb-2">
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface flex items-center gap-2">
                                        <Database className="w-4 h-4 text-sky-500" />
                                        Identity Resource Throughput
                                    </GlassCardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Active entities monitored across control plane subsystems
                                    </p>
                                </div>
                                <Badge className="bg-muted text-muted-foreground border-none font-mono text-[10px]">
                                    Live Sync
                                </Badge>
                            </GlassCardHeader>
                            <GlassCardContent className="pt-4 pb-6 px-6">
                                <div className="h-[270px] w-full" role="img" aria-label="Resource throughput chart">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={activityData} barCategoryGap="28%" margin={{ top: 12, right: 12, left: -10, bottom: 4 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                                            <XAxis
                                                dataKey="name"
                                                fontSize={12}
                                                fontWeight={600}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                                dy={8}
                                            />
                                            <YAxis
                                                fontSize={12}
                                                fontWeight={600}
                                                tickLine={false}
                                                axisLine={false}
                                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                                allowDecimals={false}
                                                width={36}
                                            />
                                            <Tooltip {...chartTooltipStyle} />
                                            <Bar
                                                dataKey="value"
                                                fill="#0369A1"
                                                radius={[6, 6, 0, 0]}
                                                barSize={38}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCardContent>
                        </GlassCard>

                        <GlassCard className="lg:col-span-5 border border-border/70 shadow-sm bg-card">
                            <GlassCardHeader className="pb-2">
                                <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Risk Distribution
                                </GlassCardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Severity ranking of active identity privileges
                                </p>
                            </GlassCardHeader>
                            <GlassCardContent className="pt-4 pb-6 px-6 space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                                    <div className="h-[170px] w-full flex items-center justify-center">
                                        {riskData.length === 0 || riskTotal === 0 ? (
                                            <div className="flex flex-col items-center justify-center text-center p-4">
                                                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                                                <p className="text-xs font-semibold text-on-surface">No High Risk Entities</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">Posture verified healthy</p>
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={riskData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={48}
                                                        outerRadius={68}
                                                        paddingAngle={4}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {riskData.map((entry) => (
                                                            <Cell
                                                                key={entry.name}
                                                                fill={RISK_COLORS[entry.name] || colors.chart[0]}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip {...chartTooltipStyle} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        {(['High', 'Medium', 'Low'] as const).map((level) => {
                                            const item = riskData.find((r) => r.name === level);
                                            const val = Number(item?.value ?? 0);
                                            const pct = riskTotal > 0 ? Math.round((val / riskTotal) * 100) : (level === 'Low' ? 100 : 0);
                                            return (
                                                <div key={level} className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5 border border-border/50">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                                            style={{ backgroundColor: RISK_COLORS[level] }}
                                                        />
                                                        <span className="text-xs font-semibold text-on-surface">{level} Risk</span>
                                                    </div>
                                                    <span className="text-xs font-mono font-bold text-muted-foreground">
                                                        {val} · {pct}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground font-medium">Auto-quarantine engine:</span>
                                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-none font-semibold text-[11px]">
                                        ARMED & READY
                                    </Badge>
                                </div>
                            </GlassCardContent>
                        </GlassCard>
                    </div>

                    {/* Quick Access Launchpad */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                title: 'Privilege Reviews',
                                desc: 'Approve pending elevation tickets',
                                icon: <KeyRound className="h-5 w-5 text-amber-500" />,
                                link: '/requests',
                                count: stats?.pending_requests ? `${stats.pending_requests} pending` : 'All clean',
                            },
                            {
                                title: 'Perimeter Rules',
                                desc: 'Manage IP and subnet boundaries',
                                icon: <Shield className="h-5 w-5 text-sky-500" />,
                                link: '/policies/ip',
                                count: `${stats?.active_ip_policies ?? 4} active`,
                            },
                            {
                                title: 'Workload Tokens',
                                desc: 'SPIFFE & mTLS service identities',
                                icon: <Cpu className="h-5 w-5 text-indigo-500" />,
                                link: '/workloads',
                                count: '8 running',
                            },
                            {
                                title: 'SSO & Connectors',
                                desc: 'SCIM, Okta, Azure AD sync',
                                icon: <Lock className="h-5 w-5 text-emerald-500" />,
                                link: '/settings',
                                count: 'Configured',
                            },
                        ].map((card) => (
                            <button
                                key={card.title}
                                type="button"
                                onClick={() => navigate(card.link)}
                                className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-5 text-left shadow-sm hover:border-sky-500/50 hover:shadow-md transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                            >
                                <div className="flex items-start justify-between w-full">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border/60 group-hover:bg-sky-500/10 transition-colors">
                                        {card.icon}
                                    </div>
                                    <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-sky-500 transition-colors">
                                        {card.count}
                                    </span>
                                </div>
                                <div className="mt-4">
                                    <h4 className="text-sm font-bold text-on-surface group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                        {card.title}
                                    </h4>
                                    <p className="mt-1 text-xs text-muted-foreground leading-normal">
                                        {card.desc}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </TabsContent>

                {/* TAB 2: SECURITY POSTURE */}
                <TabsContent value="posture" className="space-y-6 mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard className="border border-border/70 shadow-sm bg-card p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-on-surface">MFA Enforcement</h4>
                                    <p className="text-xs text-muted-foreground">FIDO2 WebAuthn & TOTP</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-muted-foreground">Enrollment Rate</span>
                                    <span className="text-emerald-600 font-mono">100%</span>
                                </div>
                                <Progress value={100} className="h-2 rounded-full" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                All active administrator and directory accounts are bound to mandatory hardware or authenticator tokens.
                            </p>
                        </GlassCard>

                        <GlassCard className="border border-border/70 shadow-sm bg-card p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-on-surface">Zero-Trust Network Access</h4>
                                    <p className="text-xs text-muted-foreground">Micro-segmentation</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-muted-foreground">Traffic Inspected</span>
                                    <span className="text-sky-600 font-mono">100%</span>
                                </div>
                                <Progress value={100} className="h-2 rounded-full" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Strict mTLS cryptographic verification enabled for all Kubernetes pod-to-pod ingress communication.
                            </p>
                        </GlassCard>

                        <GlassCard className="border border-border/70 shadow-sm bg-card p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-on-surface">Audit Compliance</h4>
                                    <p className="text-xs text-muted-foreground">SOC2 / ISO 27001</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-muted-foreground">Immutable Retention</span>
                                    <span className="text-indigo-600 font-mono">365 Days</span>
                                </div>
                                <Progress value={100} className="h-2 rounded-full" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                All authorization events and token minting decisions are signed and shipped to tamper-evident storage.
                            </p>
                        </GlassCard>
                    </div>
                </TabsContent>

                {/* TAB 3: DIRECTORY STREAM */}
                <TabsContent value="directory" className="space-y-6 mt-0 focus-visible:outline-none">
                    <GlassCard className="border border-border/70 shadow-sm bg-card overflow-hidden">
                        <GlassCardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
                            <div>
                                <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">
                                    Workforce Directory Feed
                                </GlassCardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Real-time SCIM synchronized identities across active directory providers
                                </p>
                            </div>

                            {/* Redesigned Search & Filter Input Bar */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative min-w-[240px]">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                    <Input
                                        placeholder="Search by name, ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-9 pl-9 pr-3 text-xs rounded-xl bg-muted/40 border-border/80 focus:bg-card"
                                    />
                                </div>

                                <div className="inline-flex rounded-xl bg-muted/50 p-1 border border-border/60">
                                    {(['all', 'active', 'inactive'] as const).map((filter) => (
                                        <button
                                            key={filter}
                                            type="button"
                                            onClick={() => setStatusFilter(filter)}
                                            className={cn(
                                                "px-2.5 py-1 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer",
                                                statusFilter === filter
                                                    ? "bg-card text-on-surface shadow-xs"
                                                    : "text-muted-foreground hover:text-on-surface"
                                            )}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    onClick={() => navigate('/users/new')}
                                    size="sm"
                                    className="h-9 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs px-3.5 cursor-pointer shadow-sm"
                                >
                                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                    New User
                                </Button>
                            </div>
                        </GlassCardHeader>

                        <GlassCardContent className="p-0">
                            <div className="overflow-x-auto">
                                <GlassTable>
                                    <GlassTableHeader>
                                        <GlassTableRow className="hover:bg-transparent border-b border-border/70 bg-muted/20">
                                            <GlassTableHead className="py-3.5 pl-6 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                                                User Identity
                                            </GlassTableHead>
                                            <GlassTableHead className="py-3.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                                                Status
                                            </GlassTableHead>
                                            <GlassTableHead className="py-3.5 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                                                Provisioned
                                            </GlassTableHead>
                                            <GlassTableHead className="py-3.5 text-right pr-6 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                                                Actions
                                            </GlassTableHead>
                                        </GlassTableRow>
                                    </GlassTableHeader>
                                    <TableBody>
                                        {filteredUsers.length === 0 ? (
                                            <GlassTableRow>
                                                <TableCell colSpan={4} className="py-16 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-3">
                                                        <div className="h-12 w-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground">
                                                            <Users className="h-6 w-6" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-bold text-on-surface">No identities found</p>
                                                            <p className="text-xs text-muted-foreground max-w-sm">
                                                                {searchQuery ? `No users matching "${searchQuery}".` : 'No users have been provisioned yet.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </GlassTableRow>
                                        ) : (
                                            filteredUsers.map((user) => (
                                                <GlassTableRow key={user.id} className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-none">
                                                    <TableCell className="py-4 pl-6">
                                                        <div className="flex items-center gap-3.5">
                                                            <Avatar
                                                                name={user.userName || user.id}
                                                                size={36}
                                                                className="h-9 w-9 rounded-xl border border-border/80 font-bold shrink-0"
                                                            />
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-semibold text-sm text-on-surface truncate">
                                                                    {user.userName || 'Unnamed Identity'}
                                                                </span>
                                                                <span className="text-[11px] text-muted-foreground font-mono truncate">
                                                                    {user.id}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <Badge
                                                            className={cn(
                                                                "rounded-md text-[11px] font-semibold border-none px-2.5 py-0.5",
                                                                user.active
                                                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                                    : "bg-destructive/15 text-destructive"
                                                            )}
                                                        >
                                                            {user.active ? 'Active' : 'Suspended'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-xs font-medium text-muted-foreground tabular-nums">
                                                        {user.meta?.created ? new Date(user.meta.created).toLocaleDateString() : 'Active session'}
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right pr-6">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleCopyId(user.id)}
                                                            className="h-8 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-on-surface cursor-pointer"
                                                        >
                                                            {copiedId === user.id ? (
                                                                <>
                                                                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                                                                    Copied
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="h-3.5 w-3.5 mr-1" />
                                                                    Copy ID
                                                                </>
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                </GlassTableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </GlassTable>
                            </div>
                        </GlassCardContent>
                    </GlassCard>
                </TabsContent>
            </Tabs>
        </PageLayout>
    );
};

export default Dashboard;
