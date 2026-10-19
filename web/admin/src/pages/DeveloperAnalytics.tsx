import React, { useState, useEffect } from 'react';
import { getDeveloperAnalytics } from '../api';
import { Activity, BarChart2, Clock, Terminal, AlertCircle, RefreshCw, Loader2, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, PageLayout
} from '@/components/layout';

interface AnalyticPoint {
    date: string;
    total_calls: number;
    avg_latency: number;
    errors: number;
}

export function DeveloperAnalytics() {
    const [analytics, setAnalytics] = useState<AnalyticPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getDeveloperAnalytics();
            setAnalytics(data.analytics || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to load API analytics.');
        } finally {
            setLoading(false);
        }
    };

    const totalCalls = analytics.reduce((sum, p) => sum + p.total_calls, 0);
    const totalErrors = analytics.reduce((sum, p) => sum + p.errors, 0);
    const avgLatency = analytics.length
        ? (analytics.reduce((sum, p) => sum + p.avg_latency, 0) / analytics.length).toFixed(0)
        : 0;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    };

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<BarChart2 className="w-6 h-6 text-secondary" />}
                title="API Analytics"
                description="Monitor your API usage, latency, and error rates across the platform over the last 7 days."
                actions={
                    <Button
                        onClick={fetchAnalytics}
                        variant="outline"
                        className="h-9 rounded-lg font-semibold text-sm px-4 border border-border hover:bg-muted/50 shadow-sm"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Refresh
                    </Button>
                }
            />

            {error && (
                <div className="bg-destructive/5 text-destructive px-5 py-3 rounded-lg border border-destructive/20 flex items-center gap-3 font-semibold text-sm">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-card">
                <GlassCard className="border border-border shadow-sm bg-card rounded-lg overflow-hidden">
                    <GlassCardContent className="p-card flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary/10 rounded-lg">
                                <Activity className="h-4 w-4 text-secondary" />
                            </div>
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Total Calls (7d)</span>
                        </div>
                        <p className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">{loading ? '—' : totalCalls.toLocaleString()}</p>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="border border-border shadow-sm bg-card rounded-lg overflow-hidden">
                    <GlassCardContent className="p-card flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary/10 rounded-lg">
                                <Clock className="h-4 w-4 text-secondary" />
                            </div>
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Avg Latency</span>
                        </div>
                        <p className="text-3xl font-bold tracking-tight text-on-surface tabular-nums">
                            {loading ? '—' : <>{avgLatency}<span className="text-lg ml-1 text-muted-foreground">ms</span></>}
                        </p>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="border border-border shadow-sm bg-card rounded-lg overflow-hidden">
                    <GlassCardContent className="p-card flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-destructive/10 rounded-lg">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                            </div>
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Total Errors (7d)</span>
                        </div>
                        <p className={`text-3xl font-bold tracking-tight tabular-nums ${totalErrors > 0 ? 'text-destructive' : 'text-on-surface'}`}>
                            {loading ? '—' : totalErrors.toLocaleString()}
                        </p>
                    </GlassCardContent>
                </GlassCard>
            </div>

            <GlassCard className="border border-border shadow-sm bg-card rounded-lg overflow-hidden">
                <GlassCardHeader className="py-card px-card border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                            <Zap className="w-4 h-4 text-secondary" />
                        </div>
                        <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">API Traffic</GlassCardTitle>
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="p-card">
                    {loading ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                        </div>
                    ) : analytics.length === 0 ? (
                        <div className="h-[300px] flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <BarChart2 className="h-12 w-12" />
                            <p className="text-sm font-medium text-center">No API traffic recorded yet.</p>
                        </div>
                    ) : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics}>
                                    <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} fontWeight={600} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                    <YAxis fontSize={12} fontWeight={600} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v: any) => `${v}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', borderWidth: 1 }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                                        labelFormatter={(label: any) => `Date: ${formatDate(label)}`}
                                    />
                                    <Line type="monotone" dataKey="total_calls" name="Total Calls" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    <Line type="monotone" dataKey="errors" name="Errors" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </GlassCardContent>
            </GlassCard>

            <GlassCard className="border border-border shadow-sm bg-card rounded-lg overflow-hidden">
                <GlassCardContent className="p-card flex gap-4 items-start">
                    <div className="p-2 bg-secondary/10 rounded-lg shrink-0">
                        <Terminal className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                        <h4 className="font-bold text-base tracking-tight text-on-surface">Interactive API Logs</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            Looking for specific request payloads? Go to{' '}
                            <a href="/developer/apps" className="text-secondary hover:underline font-semibold">OAuth Apps</a>{' '}
                            or your API Keys to view detailed logs for each credential.
                        </p>
                    </div>
                </GlassCardContent>
            </GlassCard>
        </div>
        </PageLayout>
    );
}

export default DeveloperAnalytics;
