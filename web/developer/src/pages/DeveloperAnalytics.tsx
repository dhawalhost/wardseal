import React, { useState, useEffect } from 'react';
import { getDeveloperAnalytics } from '../api';
import { Activity, BarChart2, Clock, Terminal, AlertCircle, RefreshCw, Loader2, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/layout';
import { DeveloperMetricCard } from '../components/DeveloperMetricCard';

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
        <div className="space-y-page animate-in fade-in duration-500">
            <PageHeader
                icon={<BarChart2 className="w-5 h-5 text-primary" />}
                title="API Analytics"
                description="Monitor your API usage, latency, and error rates across the platform over the last 7 days."
                actions={
                    <Button
                        onClick={fetchAnalytics}
                        variant="outline"
                        className="h-9 rounded-lg font-semibold text-sm px-4 border border-border hover:bg-muted/40 transition-colors"
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                        Refresh
                    </Button>
                }
            />

            {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-xl flex items-center gap-3 font-bold text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-card">
                <DeveloperMetricCard
                    icon={
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Activity className="h-3.5 w-3.5 text-primary" />
                        </div>
                    }
                    title="Total Calls (7d)"
                    value={totalCalls.toLocaleString()}
                    loading={loading}
                />

                <DeveloperMetricCard
                    icon={
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                        </div>
                    }
                    title="Avg Latency"
                    value={
                        <>
                            {avgLatency}
                            <span className="text-sm ml-1 text-muted-foreground">ms</span>
                        </>
                    }
                    loading={loading}
                />

                <DeveloperMetricCard
                    icon={
                        <div className="p-1.5 bg-destructive/10 rounded-lg">
                            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        </div>
                    }
                    title="Total Errors (7d)"
                    value={totalErrors.toLocaleString()}
                    valueClassName={totalErrors > 0 ? 'text-destructive' : 'text-on-surface'}
                    loading={loading}
                />
            </div>

            {/* Traffic Chart */}
            <GlassCard className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                <GlassCardHeader className="py-4 px-5 border-b border-border">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Zap className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <GlassCardTitle className="text-sm font-bold tracking-tight text-on-surface">API traffic</GlassCardTitle>
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="p-5">
                    {loading ? (
                        <div className="h-[300px] flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : analytics.length === 0 ? (
                        <div className="h-[300px] flex flex-col items-center justify-center gap-3">
                            <BarChart2 className="h-10 w-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground text-center">No API traffic recorded yet.</p>
                        </div>
                    ) : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analytics}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: any) => `${v}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                        labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                                        labelFormatter={(label: any) => `Date: ${formatDate(label)}`}
                                    />
                                    <Line type="monotone" dataKey="total_calls" name="Total Calls" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="errors" name="Errors" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </GlassCardContent>
            </GlassCard>

            {/* Guidance */}
            <GlassCard className="border border-border shadow-sm bg-muted/40 rounded-xl overflow-hidden">
                <GlassCardContent className="p-4 flex gap-3 items-start">
                    <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                        <Terminal className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm tracking-tight text-on-surface">Interactive API logs</h4>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            Looking for specific request payloads? Go to{' '}
                            <a href="/developer/apps" className="text-primary hover:underline font-semibold">OAuth Apps</a>{' '}
                            to view detailed logs tied to each credential.
                        </p>
                    </div>
                </GlassCardContent>
            </GlassCard>
        </div>
    );
}

export default DeveloperAnalytics;
