import React, { useEffect, useMemo, useState } from 'react';
import { getSCIMUsers, getGovernanceStats, DashboardStats } from '../api';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, ChevronRight, Copy, RefreshCw, Search, UserPlus } from 'lucide-react';
import { ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import {
    PageLayout,
    GlassCard,
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
} from '@dhawalhost/wardseal-ui-kit';
import { cn } from '@/lib/utils';
import { chartTooltipStyle } from '@/components/theme';

const RISK_LEVELS = [
    { key: 'High', color: 'hsl(var(--error))' },
    { key: 'Medium', color: 'hsl(var(--warning))' },
    { key: 'Low', color: 'hsl(var(--on-surface-subtle))' },
] as const;

interface UserRow {
    id: string;
    userName?: string;
    active?: boolean;
    meta?: { created?: string };
}

const fmt = (n: number | undefined) => (n === undefined ? '—' : n.toLocaleString('en-US'));

/** Compact figure: label, number, one line of context. Numbers only, no decoration. */
const Stat: React.FC<{ label: string; value: string; note: string; onClick?: () => void }> = ({ label, value, note, onClick }) => {
    const body = (
        <>
            <p className="text-sm text-on-surface-variant">{label}</p>
            <p className="mt-3 text-[1.75rem] font-medium leading-none tracking-[-0.01em] text-on-surface tabular-nums">{value}</p>
            <p className="mt-2 text-xs text-on-surface-subtle">{note}</p>
        </>
    );
    const base = 'rounded-xl border border-border bg-card p-5 text-left';
    return onClick ? (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                base,
                'transition-colors duration-fast hover:border-on-surface/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
        >
            {body}
        </button>
    ) : (
        <div className={base}>{body}</div>
    );
};

export const Dashboard: React.FC = () => {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
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
            const [usersResult, statsResult] = await Promise.allSettled([getSCIMUsers(), getGovernanceStats()]);
            if (usersResult.status === 'fulfilled') {
                setUsers(usersResult.value?.Resources || []);
            }
            if (statsResult.status === 'fulfilled') {
                setStats(statsResult.value);
            }
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

    const identities = stats?.active_users ?? (users.length || undefined);

    const riskRows = useMemo(() => {
        const profile = stats?.risk_profile ?? {};
        const lookup = Object.fromEntries(Object.entries(profile).map(([k, v]) => [k.toLowerCase(), Number(v) || 0]));
        const total = Object.values(lookup).reduce((s, v) => s + v, 0);
        return RISK_LEVELS.map((l) => {
            const value = lookup[l.key.toLowerCase()] ?? 0;
            return { ...l, value, pct: total > 0 ? Math.round((value / total) * 100) : 0 };
        });
    }, [stats]);

    const compositionData = useMemo(
        () => [
            { name: 'Identities', value: identities ?? 0 },
            { name: 'Groups', value: stats?.total_groups ?? 0 },
            { name: 'Workloads', value: stats?.active_workloads ?? 0 },
            { name: 'IP policies', value: stats?.active_ip_policies ?? 0 },
            { name: 'Organizations', value: stats?.connected_orgs ?? 0 },
        ],
        [stats, identities]
    );

    const hygiene = stats?.hygiene_score;
    const hygieneNote =
        hygiene === undefined ? 'No posture data yet' : hygiene >= 80 ? 'Healthy' : hygiene >= 50 ? 'Needs attention' : 'At risk';

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredUsers = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return users.filter((u) => {
            const matchesQuery = !q || (u.userName || '').toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
            const matchesStatus =
                statusFilter === 'all' || (statusFilter === 'active' && u.active) || (statusFilter === 'inactive' && !u.active);
            return matchesQuery && matchesStatus;
        });
    }, [users, searchQuery, statusFilter]);

    const shortcuts = [
        { title: 'Access requests', desc: 'Approve or deny pending elevation', link: '/requests', meta: stats ? `${fmt(stats.pending_requests)} pending` : '' },
        { title: 'IP access rules', desc: 'Network ranges allowed per resource', link: '/policies/ip', meta: stats ? `${fmt(stats.active_ip_policies)} active` : '' },
        { title: 'Machine accounts', desc: 'SPIFFE and mTLS service identities', link: '/workloads', meta: stats ? `${fmt(stats.active_workloads)} active` : '' },
        { title: 'Identity connectors', desc: 'SCIM, Okta and Entra ID sync', link: '/connectors', meta: '' },
    ];

    return (
        <PageLayout maxWidthClassName="max-w-[1440px]" className="gap-6 lg:gap-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-medium leading-tight tracking-[-0.015em] text-on-surface">Overview</h1>
                    <p className="mt-1 text-sm text-on-surface-variant">Directory, access and posture for this tenant</p>
                </div>
                <div className="flex items-center gap-2">
                    {lastUpdated && (
                        <span className="mr-2 hidden items-center gap-2 font-mono text-xs text-on-surface-subtle tabular-nums md:inline-flex">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                            Updated {lastUpdated.toLocaleTimeString('en-GB')}
                        </span>
                    )}
                    <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading} className="gap-2">
                        <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} strokeWidth={1.5} aria-hidden />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={() => navigate('/users/new')} className="gap-2">
                        <UserPlus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                        Add user
                    </Button>
                </div>
            </header>

            {!loading && !stats && (
                <div
                    role="alert"
                    className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning-subtle-foreground"
                >
                    <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    Governance stats are unavailable, so some figures are missing
                </div>
            )}

            <section aria-label="Key figures" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Active identities" value={loading && !stats ? '—' : fmt(identities)} note="Provisioned through SCIM" />
                <Stat
                    label="Pending requests"
                    value={loading && !stats ? '—' : fmt(stats?.pending_requests)}
                    note={(stats?.pending_requests ?? 0) > 0 ? 'Waiting for a reviewer' : 'Queue is clear'}
                    onClick={() => navigate('/requests')}
                />
                <Stat label="Groups" value={loading && !stats ? '—' : fmt(stats?.total_groups)} note="Security and directory groups" onClick={() => navigate('/groups')} />
                <Stat label="IP access rules" value={loading && !stats ? '—' : fmt(stats?.active_ip_policies)} note="Enforced at sign-in" onClick={() => navigate('/policies/ip')} />
            </section>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between gap-4">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="posture">Posture</TabsTrigger>
                        <TabsTrigger value="directory">
                            Directory
                            <span className="font-mono text-xs text-on-surface-subtle tabular-nums">{users.length}</span>
                        </TabsTrigger>
                    </TabsList>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/audit')} className="gap-1">
                        Audit trail
                        <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </Button>
                </div>

                <TabsContent value="overview" className="mt-6 space-y-6 focus-visible:outline-none">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <GlassCard className="border-border shadow-none lg:col-span-8">
                            <GlassCardContent className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-base font-medium text-on-surface">Directory composition</h2>
                                        <p className="mt-1 text-sm text-on-surface-subtle">What this control plane is governing right now</p>
                                    </div>
                                    <p className="font-mono text-xs text-on-surface-subtle tabular-nums">
                                        {compositionData.reduce((s, d) => s + d.value, 0).toLocaleString('en-US')} objects
                                    </p>
                                </div>
                                <div className="mt-6 h-[300px] w-full" role="img" aria-label="Bar chart of identities, groups, workloads, IP policies and organizations">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={compositionData} barCategoryGap="32%" margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                                            <CartesianGrid vertical={false} stroke="hsl(var(--on-surface) / 0.06)" />
                                            <XAxis
                                                dataKey="name"
                                                tickLine={false}
                                                axisLine={false}
                                                dy={8}
                                                tick={{ fill: 'hsl(var(--on-surface-subtle))', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
                                            />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                allowDecimals={false}
                                                width={48}
                                                tickFormatter={(v: number) => v.toLocaleString("en-US")}
                                                tick={{ fill: 'hsl(var(--on-surface-subtle))', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}
                                            />
                                            <Tooltip {...chartTooltipStyle} cursor={{ fill: 'hsl(var(--on-surface) / 0.04)' }} />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                                                {compositionData.map((d, i) => (
                                                    <Cell
                                                        key={d.name}
                                                        fill={i === 0 ? 'hsl(var(--secondary))' : 'hsl(var(--surface-container-highest))'}
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </GlassCardContent>
                        </GlassCard>

                        <GlassCard className="border-border shadow-none lg:col-span-4">
                            <GlassCardContent className="flex h-full flex-col p-6">
                                <h2 className="text-base font-medium text-on-surface">Posture</h2>
                                <div className="mt-6 flex items-baseline gap-2">
                                    <span className="text-5xl font-medium leading-none tracking-[-0.02em] text-on-surface tabular-nums">
                                        {hygiene === undefined ? '—' : hygiene}
                                    </span>
                                    {hygiene !== undefined && <span className="text-sm text-on-surface-subtle">/ 100</span>}
                                </div>
                                <p className="mt-2 text-sm text-on-surface-variant">{hygieneNote}</p>
                                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${hygiene ?? 0}%` }} />
                                </div>

                                <h3 className="mt-8 text-sm text-on-surface-variant">Identities by privilege risk</h3>
                                <ul className="mt-3 divide-y divide-border">
                                    {riskRows.map((r) => (
                                        <li key={r.key} className="grid grid-cols-[72px_1fr_96px] items-center gap-3 py-2.5">
                                            <span className="text-sm text-on-surface">{r.key}</span>
                                            <span className="h-1 overflow-hidden rounded-full bg-surface-container-high">
                                                <span className="block h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                                            </span>
                                            <span className="text-right font-mono text-xs text-on-surface-subtle tabular-nums">
                                                {r.value.toLocaleString("en-US")} · {r.pct}%
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </GlassCardContent>
                        </GlassCard>
                    </div>

                    <GlassCard className="border-border shadow-none">
                        <ul className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
                            {shortcuts.map((s) => (
                                <li key={s.title}>
                                    <button
                                        type="button"
                                        onClick={() => navigate(s.link)}
                                        className="group flex h-full w-full items-start justify-between gap-3 p-5 text-left transition-colors duration-fast hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                    >
                                        <span>
                                            <span className="block text-sm font-medium text-on-surface">{s.title}</span>
                                            <span className="mt-1 block text-xs text-on-surface-subtle">{s.desc}</span>
                                            {s.meta && <span className="mt-3 block font-mono text-xs text-on-surface-variant tabular-nums">{s.meta}</span>}
                                        </span>
                                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-subtle transition-colors group-hover:text-on-surface" strokeWidth={1.5} aria-hidden />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </GlassCard>
                </TabsContent>

                <TabsContent value="posture" className="mt-6 focus-visible:outline-none">
                    <GlassCard className="border-border shadow-none">
                        <ul className="divide-y divide-border">
                            {[
                                { title: 'Adaptive MFA', desc: 'Passkeys, WebAuthn and TOTP requirements per group', link: '/mfa' },
                                {
                                    title: 'IP access rules',
                                    desc: 'Network ranges checked before a session is issued',
                                    link: '/policies/ip',
                                    meta: stats ? `${fmt(stats.active_ip_policies)} active` : undefined,
                                },
                                {
                                    title: 'Machine accounts',
                                    desc: 'Short-lived mTLS identities for services',
                                    link: '/workloads',
                                    meta: stats ? `${fmt(stats.active_workloads)} active` : undefined,
                                },
                                { title: 'Audit trail', desc: 'Signed record of sign-ins, tokens and admin changes', link: '/audit' },
                            ].map((row) => (
                                <li key={row.title}>
                                    <button
                                        type="button"
                                        onClick={() => navigate(row.link)}
                                        className="group flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors duration-fast hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                    >
                                        <span>
                                            <span className="block text-sm font-medium text-on-surface">{row.title}</span>
                                            <span className="mt-0.5 block text-sm text-on-surface-subtle">{row.desc}</span>
                                        </span>
                                        <span className="flex items-center gap-4">
                                            {row.meta && <span className="font-mono text-xs text-on-surface-variant tabular-nums">{row.meta}</span>}
                                            <ChevronRight className="h-4 w-4 text-on-surface-subtle group-hover:text-on-surface" strokeWidth={1.5} aria-hidden />
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </GlassCard>
                </TabsContent>

                <TabsContent value="directory" className="mt-6 focus-visible:outline-none">
                    <GlassCard className="overflow-hidden border-border shadow-none">
                        <div className="flex flex-col gap-4 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-base font-medium text-on-surface">Directory</h2>
                                <p className="mt-0.5 text-sm text-on-surface-subtle">Identities synced from your SCIM providers</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative w-60">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-on-surface-subtle" strokeWidth={1.5} aria-hidden />
                                    <Input
                                        placeholder="Search name or ID"
                                        aria-label="Search directory"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-8 pl-9 text-sm"
                                    />
                                </div>
                                <div className="inline-flex h-8 items-center rounded-md border border-border bg-surface-container p-0.5" role="group" aria-label="Filter by status">
                                    {(['all', 'active', 'inactive'] as const).map((filter) => (
                                        <button
                                            key={filter}
                                            type="button"
                                            aria-pressed={statusFilter === filter}
                                            onClick={() => setStatusFilter(filter)}
                                            className={cn(
                                                'h-7 rounded px-2.5 text-xs font-medium capitalize transition-colors duration-fast',
                                                statusFilter === filter
                                                    ? 'bg-card text-on-surface shadow-[0_0_0_1px_hsl(var(--on-surface)/0.08)]'
                                                    : 'text-on-surface-subtle hover:text-on-surface'
                                            )}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <GlassTable>
                                <GlassTableHeader>
                                    <GlassTableRow className="border-b border-border hover:bg-transparent">
                                        <GlassTableHead className="h-10 pl-6 text-xs font-medium text-on-surface-subtle">Identity</GlassTableHead>
                                        <GlassTableHead className="h-10 text-xs font-medium text-on-surface-subtle">Status</GlassTableHead>
                                        <GlassTableHead className="h-10 text-xs font-medium text-on-surface-subtle">Provisioned</GlassTableHead>
                                        <GlassTableHead className="h-10 pr-6 text-right text-xs font-medium text-on-surface-subtle">
                                            <span className="sr-only">Actions</span>
                                        </GlassTableHead>
                                    </GlassTableRow>
                                </GlassTableHeader>
                                <TableBody>
                                    {filteredUsers.length === 0 ? (
                                        <GlassTableRow className="hover:bg-transparent">
                                            <TableCell colSpan={4} className="py-16 text-center">
                                                <p className="text-sm font-medium text-on-surface">No identities</p>
                                                <p className="mt-1 text-sm text-on-surface-subtle">
                                                    {searchQuery ? `Nothing matches “${searchQuery}”` : 'Connect a SCIM provider or add a user to get started'}
                                                </p>
                                            </TableCell>
                                        </GlassTableRow>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <GlassTableRow key={user.id} className="border-b border-border transition-colors last:border-none hover:bg-surface-container">
                                                <TableCell className="py-3 pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={user.userName || user.id} size={32} />
                                                        <div className="flex min-w-0 flex-col">
                                                            <span className="truncate text-sm font-medium text-on-surface">{user.userName || 'Unnamed identity'}</span>
                                                            <span className="truncate font-mono text-xs text-on-surface-subtle">{user.id}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <Badge
                                                        className={cn(
                                                            'rounded border-none px-2 py-0.5 text-xs font-medium',
                                                            user.active
                                                                ? 'bg-success-subtle text-success-subtle-foreground'
                                                                : 'bg-surface-container-high text-on-surface-variant'
                                                        )}
                                                    >
                                                        {user.active ? 'Active' : 'Suspended'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-3 font-mono text-xs text-on-surface-subtle tabular-nums">
                                                    {user.meta?.created ? new Date(user.meta.created).toLocaleDateString('en-GB') : '—'}
                                                </TableCell>
                                                <TableCell className="py-3 pr-6 text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleCopyId(user.id)} className="gap-1.5 text-on-surface-subtle">
                                                        {copiedId === user.id ? (
                                                            <>
                                                                <Check className="h-4 w-4 text-success" strokeWidth={1.5} aria-hidden />
                                                                Copied
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden />
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
                    </GlassCard>
                </TabsContent>
            </Tabs>
        </PageLayout>
    );
};

export default Dashboard;
