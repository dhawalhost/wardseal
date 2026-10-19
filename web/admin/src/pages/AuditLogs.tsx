import React, { useState, useEffect } from 'react';
import { getAuditLogs, exportAuditLogs, getAuditStats } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableBody, TableCell } from '@/components/ui/table';
import {
    Loader2,
    Download,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Activity,
    ShieldAlert,
    Database,
    FileText,
    RefreshCw,
} from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow, PageLayout
} from '@/components/layout';
import { AuditEventRow } from '../components/AuditEventRow';

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { chartTooltipStyle, chartGridStyle, chartAxisTickStyle } from '@/components/theme';

interface AuditEvent {
    id: string;
    timestamp: string;
    actor_id: string;
    actor_type: string;
    action: string;
    resource_type: string;
    resource_id: string;
    resource_name: string;
    outcome: string;
    details: Record<string, unknown>;
}

interface AuditStats {
    total_events: number;
    failure_count: number;
    activity_trend: { date: string; count: number }[];
    action_distribution: Record<string, number>;
    resource_distribution: Record<string, number>;
}

export default function AuditLogs() {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [stats, setStats] = useState<AuditStats | null>(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: '',
        resource_type: '',
        limit: 25,
        offset: 0
    });
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

    useEffect(() => {
        loadLogs();
        loadStats();
    }, [filters.limit, filters.offset]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { limit: filters.limit, offset: filters.offset };
            if (filters.action) params.action = filters.action;
            if (filters.resource_type) params.resource_type = filters.resource_type;

            const res = await getAuditLogs(params);
            setEvents(res.events || []);
            setTotal(res.total || 0);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        setStatsLoading(true);
        try {
            const data = await getAuditStats(14);
            setStats(data);
        } catch (error) {
            console.error('Failed to load audit stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleFilterSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setFilters(f => ({ ...f, offset: 0 }));
        loadLogs();
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const handlePageChange = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && filters.offset > 0) {
            setFilters({ ...filters, offset: filters.offset - filters.limit });
        } else if (direction === 'next' && filters.offset + filters.limit < total) {
            setFilters({ ...filters, offset: filters.offset + filters.limit });
        }
    };

    const handleExport = async () => {
        try {
            const params: Record<string, unknown> = {};
            if (filters.action) params.action = filters.action;
            if (filters.resource_type) params.resource_type = filters.resource_type;

            const blob = await exportAuditLogs(params);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error('Failed to export logs:', error);
        }
    };

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<FileText className="w-5 h-5 text-secondary" />}
                title="Audit Logs"
                description="Track and review all activities across your system for security and compliance."
                actions={
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadStats}
                            className="rounded-lg font-semibold text-xs h-9 px-4 border-border"
                        >
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleExport}
                            className="bg-secondary text-secondary-foreground rounded-lg h-9 px-4 font-semibold text-xs shadow-sm"
                        >
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-card md:grid-cols-2 lg:grid-cols-4">
                <GlassCard className="border border-border shadow-sm bg-card">
                    <GlassCardContent className="p-card">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Total events (14d)</span>
                            <div className="mt-1 flex items-end gap-2 leading-none">
                                <span className="text-2xl font-bold tracking-tight text-on-surface">{statsLoading ? '—' : stats?.total_events.toLocaleString()}</span>
                                <Database className="h-4 w-4 text-muted-foreground mb-1" />
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="border border-border shadow-sm bg-card">
                    <GlassCardContent className="p-card">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-destructive uppercase">Failures</span>
                            <div className="mt-1 flex items-end gap-2 leading-none">
                                <span className="text-2xl font-bold tracking-tight text-destructive">{statsLoading ? '—' : stats?.failure_count}</span>
                                <ShieldAlert className="h-4 w-4 text-destructive mb-1" />
                            </div>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="lg:col-span-2 border border-border shadow-sm bg-secondary text-secondary-foreground">
                    <GlassCardContent className="h-full flex items-center p-card">
                        <p className="text-sm font-medium text-secondary-foreground/80 leading-relaxed">
                            Audit logs provide visibility into system activity for compliance and security review.
                        </p>
                    </GlassCardContent>
                </GlassCard>
            </div>

            <GlassCard className="border border-border shadow-sm bg-card">
                <GlassCardHeader className="py-card px-card border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                            <Activity className="w-4 h-4 text-secondary" />
                        </div>
                        <div>
                            <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Activity trend</GlassCardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">System activity over the last 14 days</p>
                        </div>
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="p-card">
                    <div className="h-[180px] w-full">
                        {statsLoading ? (
                            <div className="h-full flex flex-col items-center justify-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Loading data…</span>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.activity_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid {...chartGridStyle} />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={chartAxisTickStyle}
                                        dy={15}
                                        interval={1}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={chartAxisTickStyle}
                                    />
                                    <Tooltip {...chartTooltipStyle} />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="hsl(var(--secondary))"
                                        fillOpacity={1}
                                        fill="url(#colorCount)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </GlassCardContent>
            </GlassCard>

            <GlassCard className="border border-border shadow-sm bg-card overflow-hidden">
                <GlassCardHeader className="py-card px-card border-b border-border">
                    <form onSubmit={handleFilterSubmit} className="flex flex-col md:flex-row gap-card w-full items-center">
                        <div className="relative w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-secondary transition-colors" />
                            <Input
                                placeholder="Filter by action..."
                                className="h-9 border border-border rounded-lg bg-card focus-visible:ring-secondary/20 font-medium text-sm pl-9"
                                value={filters.action}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            />
                        </div>
                        <Button type="submit" className="h-9 rounded-lg px-4 bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm">
                            <Filter className="mr-1.5 h-3.5 w-3.5" /> Filter
                        </Button>
                    </form>
                </GlassCardHeader>
                <GlassCardContent className="p-0">
                    {loading ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Loading logs…</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <GlassTable>
                                <GlassTableHeader>
                                    <GlassTableRow className="hover:bg-transparent border-b border-border">
                                        <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Timestamp</GlassTableHead>
                                        <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Action</GlassTableHead>
                                        <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Resource</GlassTableHead>
                                        <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Actor</GlassTableHead>
                                        <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Result</GlassTableHead>
                                        <GlassTableHead className="w-[80px] text-right pr-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Details</GlassTableHead>
                                    </GlassTableRow>
                                </GlassTableHeader>
                                <TableBody>
                                    {events.length === 0 ? (
                                        <GlassTableRow>
                                            <TableCell colSpan={6} className="py-16 text-center text-sm font-medium text-muted-foreground">
                                                No activities found.
                                            </TableCell>
                                        </GlassTableRow>
                                    ) : (
                                        events.map(event => (
                                            <AuditEventRow
                                                key={event.id}
                                                event={event}
                                                expandedEventId={expandedEventId}
                                                setExpandedEventId={setExpandedEventId}
                                                formatDate={formatDate}
                                            />
                                        ))
                                    )}
                                </TableBody>
                            </GlassTable>
                        </div>
                    )}
                </GlassCardContent>
                <div className="p-card flex flex-col md:flex-row items-center justify-between border-t border-border gap-3">
                    <div className="text-sm font-medium text-muted-foreground order-2 md:order-1">
                        Showing {filters.offset + 1}–{Math.min(filters.offset + filters.limit, total)} of {total}
                    </div>
                    <div className="flex gap-2 order-1 md:order-2">
                        <Button
                            variant="outline"
                            className="h-8 rounded-lg px-4 font-semibold text-xs border-border"
                            onClick={() => handlePageChange('prev')}
                            disabled={filters.offset === 0}
                        >
                            <ChevronLeft className="h-3.5 w-3.5 mr-1.5" /> Previous
                        </Button>
                        <Button
                            variant="outline"
                            className="h-8 rounded-lg px-4 font-semibold text-xs border-border"
                            onClick={() => handlePageChange('next')}
                            disabled={filters.offset + filters.limit >= total}
                        >
                            Next <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
                        </Button>
                    </div>
                </div>
            </GlassCard>
        </div>
        </PageLayout>
    );
}
