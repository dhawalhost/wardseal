import React, { useEffect, useMemo, useState } from 'react';
import { getSCIMUsers, getGovernanceStats, DashboardStats } from '../api';
import { useNavigate } from 'react-router-dom';
import { TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
    Users,
    ShieldCheck,
    UserPlus,
    MoreHorizontal,
    Database,
    Clock,
    Globe,
    AlertTriangle,
    ArrowRight,
    RefreshCw,
    Shield,
    KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';
import {
    PageHeader,
    PageLayout,
    StatCard,
    GlassCard,
    GlassCardHeader,
    GlassCardTitle,
    GlassCardContent,
    GlassTable,
    GlassTableHeader,
    GlassTableRow,
    GlassTableHead,
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

const UserTableRow: React.FC<{ user: UserRow; onCopyId: (id: string) => void }> = ({
    user,
    onCopyId,
}) => (
    <GlassTableRow className="hover:bg-muted/40 transition-colors border-b border-border last:border-0">
        <TableCell className="py-4 pl-6">
            <div className="flex items-center gap-3 min-w-0">
                <Avatar name={user.userName || user.id} size={36} className="h-9 w-9 border border-border rounded-lg overflow-hidden shrink-0" />
                <div className="flex flex-col min-w-0 gap-0.5">
                    <span className="font-semibold text-sm tracking-tight text-on-surface truncate">
                        {user.userName || 'Unnamed user'}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate">{user.id}</span>
                </div>
            </div>
        </TableCell>
        <TableCell className="py-4">
            <Badge
                className={cn(
                    'rounded-md font-semibold text-xs tracking-tight px-2.5 py-1 shadow-none border-none',
                    user.active ? 'bg-success-subtle text-success' : 'bg-destructive/10 text-destructive'
                )}
            >
                {user.active ? 'Active' : 'Inactive'}
            </Badge>
        </TableCell>
        <TableCell className="py-4 text-muted-foreground text-sm font-medium tabular-nums">
            {user.meta?.created ? new Date(user.meta.created).toLocaleDateString() : '—'}
        </TableCell>
        <TableCell className="py-4 text-right pr-6">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopyId(user.id)}
                aria-label={`Copy user id for ${user.userName || user.id}`}
                className="h-9 w-9 rounded-lg hover:bg-muted cursor-pointer"
            >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
        </TableCell>
    </GlassTableRow>
);

const Dashboard: React.FC = () => {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            const [usersData, statsData] = await Promise.all([getSCIMUsers(), getGovernanceStats()]);
            setUsers(usersData.Resources || []);
            setStats(statsData);
            setError('');
            setLastUpdated(new Date());
        } catch (err: unknown) {
            console.error(err);
            setError('Failed to refresh dashboard data. Check service health and try again.');
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
            value,
        }));
    }, [stats]);

    const riskTotal = useMemo(
        () => riskData.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
        [riskData]
    );

    const activityData = useMemo(
        () => [
            { name: 'Identities', value: stats?.active_users ?? 0 },
            { name: 'Groups', value: stats?.total_groups ?? 0 },
            { name: 'Workloads', value: stats?.active_workloads ?? 0 },
            { name: 'Policies', value: stats?.active_ip_policies ?? 0 },
        ],
        [stats]
    );

    const hygiene = stats?.hygiene_score ?? 0;
    const hygieneTone =
        hygiene >= 80 ? 'text-success' : hygiene >= 50 ? 'text-warning' : 'text-destructive';

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
    };

    return (
        <PageLayout className="animate-in fade-in duration-300">
            <PageHeader
                icon={<img src="/wardseal.svg" alt="" className="w-6 h-6" />}
                title="Dashboard"
                description="Monitor identities, pending access, policies, and overall security posture across your tenant."
                meta={
                    lastUpdated ? (
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <RefreshCw className="h-3 w-3" aria-hidden />
                            Updated {lastUpdated.toLocaleTimeString()}
                        </p>
                    ) : undefined
                }
                actions={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => fetchData()}
                            className="h-10 rounded-lg font-semibold text-sm px-4 cursor-pointer"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                        <Button
                            onClick={() => navigate('/users/new')}
                            className="h-10 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm px-5 shadow-sm cursor-pointer"
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add user
                        </Button>
                    </>
                }
            />

            {error && (
                <div
                    role="alert"
                    className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm font-semibold text-destructive"
                >
                    {error}
                </div>
            )}

            {/* KPI strip */}
            <section aria-label="Key metrics" className="grid gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Total users"
                    value={loading ? '—' : (stats?.active_users ?? users.length)}
                    subtext="Active accounts"
                    icon={<Users className="h-5 w-5" />}
                    loading={loading}
                />
                <StatCard
                    label="Pending approvals"
                    value={loading ? '—' : (stats?.pending_requests ?? 0)}
                    subtext="Needs attention"
                    variant={(stats?.pending_requests ?? 0) > 0 ? 'warning' : 'primary'}
                    icon={<Clock className="h-5 w-5" />}
                    loading={loading}
                    className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                    onClick={() => navigate('/requests')}
                />
                <StatCard
                    label="IP policies"
                    value={loading ? '—' : (stats?.active_ip_policies ?? 0)}
                    subtext="Security rules"
                    icon={<Globe className="h-5 w-5" />}
                    loading={loading}
                    className="cursor-pointer hover:shadow-md transition-shadow duration-200"
                    onClick={() => navigate('/policies/ip')}
                />
                <StatCard
                    label="Security score"
                    value={loading ? '—' : `${hygiene}%`}
                    subtext="Overall health"
                    variant={hygiene >= 80 ? 'success' : hygiene >= 50 ? 'warning' : 'danger'}
                    icon={<ShieldCheck className="h-5 w-5" />}
                    loading={loading}
                />
            </section>

            {/* Quick actions */}
            <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3">
                {[
                    {
                        label: 'Review access requests',
                        hint: 'Approve or deny pending access',
                        icon: <KeyRound className="h-4 w-4" />,
                        to: '/requests',
                    },
                    {
                        label: 'Manage policies',
                        hint: 'IP and security policy rules',
                        icon: <Shield className="h-4 w-4" />,
                        to: '/policies',
                    },
                    {
                        label: 'Browse directory',
                        hint: 'Users, groups, and roles',
                        icon: <Users className="h-4 w-4" />,
                        to: '/users',
                    },
                ].map((action) => (
                    <button
                        key={action.to}
                        type="button"
                        onClick={() => navigate(action.to)}
                        className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 text-left shadow-sm transition-all duration-200 hover:border-secondary/30 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                            {action.icon}
                        </span>
                        <span className="min-w-0 flex-1 space-y-0.5">
                            <span className="block text-sm font-semibold text-on-surface">{action.label}</span>
                            <span className="block text-xs text-muted-foreground">{action.hint}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                ))}
            </section>

            {/* Charts row */}
            <section aria-label="Activity and risk" className="grid gap-5 lg:grid-cols-12 lg:gap-6">
                <GlassCard className="lg:col-span-7 border border-border shadow-sm bg-card">
                    <GlassCardHeader className="flex flex-row items-center justify-between gap-4">
                        <div className="space-y-1">
                            <GlassCardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                                <Database className="w-4 h-4 text-secondary" aria-hidden />
                                System activity
                            </GlassCardTitle>
                            <p className="text-xs font-medium text-muted-foreground">
                                Live counts across core identity resources
                            </p>
                        </div>
                    </GlassCardHeader>
                    <GlassCardContent className="pt-2 pb-6 px-6">
                        <div className="h-[280px] w-full" role="img" aria-label="Bar chart of system activity">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={activityData} barCategoryGap="32%" margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="name"
                                        fontSize={12}
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        fontSize={12}
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                        allowDecimals={false}
                                        width={32}
                                    />
                                    <Tooltip {...chartTooltipStyle} />
                                    <Bar
                                        dataKey="value"
                                        fill="hsl(var(--secondary))"
                                        radius={[8, 8, 0, 0]}
                                        barSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="lg:col-span-5 border border-border shadow-sm bg-card">
                    <GlassCardHeader>
                        <div className="space-y-1">
                            <GlassCardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                                <AlertTriangle className="w-4 h-4 text-warning" aria-hidden />
                                Security posture
                            </GlassCardTitle>
                            <p className="text-xs font-medium text-muted-foreground">
                                Hygiene score and risk distribution
                            </p>
                        </div>
                    </GlassCardHeader>
                    <GlassCardContent className="space-y-6 pt-2 pb-6 px-6">
                        {/* Score with accessible text + progress */}
                        <div className="rounded-xl bg-muted/50 border border-border px-5 py-4 space-y-3">
                            <div className="flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Hygiene score
                                    </p>
                                    <p className={cn('text-3xl font-bold tracking-tight tabular-nums mt-1', hygieneTone)}>
                                        {loading ? '—' : `${hygiene}%`}
                                    </p>
                                </div>
                                <ShieldCheck className={cn('h-6 w-6 mb-1', hygieneTone)} aria-hidden />
                            </div>
                            <div
                                className="h-2 w-full rounded-full bg-border overflow-hidden"
                                role="progressbar"
                                aria-valuenow={hygiene}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Security hygiene score"
                            >
                                <div
                                    className={cn(
                                        'h-full rounded-full transition-all duration-500',
                                        hygiene >= 80
                                            ? 'bg-success'
                                            : hygiene >= 50
                                              ? 'bg-warning'
                                              : 'bg-destructive'
                                    )}
                                    style={{ width: `${Math.min(100, Math.max(0, hygiene))}%` }}
                                />
                            </div>
                        </div>

                        {/* Risk: donut + labeled list (not color-only) */}
                        <div className="grid gap-4 sm:grid-cols-2 items-center">
                            <div className="h-[160px] w-full" role="img" aria-label="Risk profile chart">
                                {riskData.length === 0 || riskTotal === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-4">
                                        <AlertTriangle className="h-5 w-5 text-muted-foreground/40" aria-hidden />
                                        <p className="text-sm font-medium text-muted-foreground">
                                            No risk profile yet
                                        </p>
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
                                                paddingAngle={3}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {riskData.map((entry) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={
                                                            RISK_COLORS[entry.name] ||
                                                            colors.chart[0]
                                                        }
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip {...chartTooltipStyle} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <ul className="space-y-3" aria-label="Risk breakdown">
                                {(['High', 'Medium', 'Low'] as const).map((level) => {
                                    const item = riskData.find((r) => r.name === level);
                                    const value = Number(item?.value ?? 0);
                                    const pct = riskTotal > 0 ? Math.round((value / riskTotal) * 100) : 0;
                                    return (
                                        <li key={level} className="flex items-center justify-between gap-3">
                                            <span className="flex items-center gap-2 text-sm font-medium text-on-surface">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                                    style={{
                                                        backgroundColor:
                                                            RISK_COLORS[level] || colors.chart[0],
                                                    }}
                                                    aria-hidden
                                                />
                                                {level}
                                            </span>
                                            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                                                {value} · {pct}%
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </GlassCardContent>
                </GlassCard>
            </section>

            {/* Recent users */}
            <GlassCard className="shadow-sm border border-border bg-card overflow-hidden">
                <GlassCardHeader className="flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10">
                            <Users className="w-4 h-4 text-secondary" aria-hidden />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                            <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">
                                Recent users
                            </GlassCardTitle>
                            <p className="text-xs font-medium text-muted-foreground">
                                Latest identity updates in this tenant
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/users')}
                        className="h-9 rounded-lg font-semibold text-sm cursor-pointer shrink-0"
                    >
                        View all
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                </GlassCardHeader>
                <GlassCardContent className="p-0">
                    <div className="overflow-x-auto">
                        <GlassTable>
                            <GlassTableHeader>
                                <GlassTableRow className="hover:bg-transparent border-b border-border">
                                    <GlassTableHead className="py-3.5 pl-6 font-semibold text-xs tracking-wide text-muted-foreground uppercase">
                                        User
                                    </GlassTableHead>
                                    <GlassTableHead className="py-3.5 font-semibold text-xs tracking-wide text-muted-foreground uppercase">
                                        Status
                                    </GlassTableHead>
                                    <GlassTableHead className="py-3.5 font-semibold text-xs tracking-wide text-muted-foreground uppercase">
                                        Date added
                                    </GlassTableHead>
                                    <GlassTableHead className="py-3.5 text-right pr-6 font-semibold text-xs tracking-wide text-muted-foreground uppercase">
                                        Actions
                                    </GlassTableHead>
                                </GlassTableRow>
                            </GlassTableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <GlassTableRow>
                                        <TableCell colSpan={4} className="p-0">
                                            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted border border-border">
                                                    <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
                                                </div>
                                                <div className="space-y-1.5 max-w-sm">
                                                    <p className="text-sm font-semibold text-on-surface">
                                                        {loading ? 'Loading users…' : 'No users yet'}
                                                    </p>
                                                    {!loading && (
                                                        <p className="text-sm text-muted-foreground">
                                                            Add your first identity to start monitoring directory
                                                            activity here.
                                                        </p>
                                                    )}
                                                </div>
                                                {!loading && (
                                                    <Button
                                                        onClick={() => navigate('/users/new')}
                                                        className="h-10 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm px-5 cursor-pointer"
                                                    >
                                                        <UserPlus className="mr-2 h-4 w-4" />
                                                        Add user
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </GlassTableRow>
                                ) : (
                                    users.slice(0, 8).map((user) => (
                                        <UserTableRow key={user.id} user={user} onCopyId={handleCopyId} />
                                    ))
                                )}
                            </TableBody>
                        </GlassTable>
                    </div>
                </GlassCardContent>
            </GlassCard>
        </PageLayout>
    );
};

export default Dashboard;
