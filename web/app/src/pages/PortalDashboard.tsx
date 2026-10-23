import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ExternalLink, LayoutGrid, Search, Loader2, Sparkles, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getUserApps } from '../api';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/layout';
import { RegistryAppCard, Application } from '../components/RegistryAppCard';
import { MetricCard } from '../components/MetricCard';

const PortalDashboard = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplications = async () => {
            setLoading(true);
            try {
                const data = await getUserApps();
                setApplications(data.apps || []);
            } catch (error) {
                console.error('Failed to fetch applications:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchApplications();
    }, []);

    const filteredApps = applications.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLaunch = (app: Application) => {
        window.open(app.launch_url, '_blank');
    };

    return (
        <div className="space-y-page animate-in fade-in duration-700">
            {/* Header: Standard Modernist */}
            <div className="flex flex-col gap-card">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border pb-8">
                    <div className="space-y-3 max-w-xl">
                        <p className="text-xs font-semibold text-secondary">User portal</p>
                        <h1 className="text-3xl font-bold tracking-tight text-on-surface">Your applications</h1>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Launch assigned apps and manage access from one place.
                        </p>
                        {localStorage.getItem('isAdmin') === 'true' && (
                            <Button
                                onClick={() => { window.location.href = '/dashboard'; }}
                                className="h-9 px-4 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm flex items-center gap-2"
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Admin console
                            </Button>
                        )}
                    </div>

                    <div className="relative w-full max-w-md self-end">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search applications..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-10 pl-10 pr-4 rounded-lg border-border bg-card shadow-xs"
                        />
                    </div>
                </div>

                {/* Applications Grid */}
                <div className="min-h-[400px]">
                    {loading ? (
                        <div className="h-[280px] flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-muted/40">
                            <Loader2 className="h-8 w-8 animate-spin mb-3 text-secondary" />
                            <span className="text-sm text-muted-foreground">Loading applications…</span>
                        </div>
                    ) : filteredApps.length === 0 ? (
                        <GlassCard className="py-16 text-center border border-dashed border-border bg-card shadow-none rounded-xl">
                            <Box className="h-10 w-10 text-muted-foreground mb-4 mx-auto" />
                            <h3 className="text-lg font-bold text-on-surface tracking-tight">No applications yet</h3>
                            <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
                                {searchQuery ? `No matches for “${searchQuery}”.` : 'When your admin assigns apps, they will appear here.'}
                            </p>
                        </GlassCard>
                    ) : (
                        <div className="grid gap-card md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredApps.map((app) => (
                                <RegistryAppCard key={app.id} app={app} onLaunch={handleLaunch} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <MetricCard
                        label="Showing"
                        value={filteredApps.length.toString()}
                        detail={<span className="text-xs text-muted-foreground">Matching search</span>}
                    />
                    <MetricCard
                        label="Assigned"
                        value={applications.length.toString()}
                        detail={<span className="text-xs text-muted-foreground">Total applications</span>}
                    />
                    <MetricCard label="Session" value="Active">
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 rounded-full bg-success" />
                            <p className="text-sm font-semibold text-on-surface">Signed in</p>
                        </div>
                    </MetricCard>
                </div>
            </div>
        </div>
    );
};

export default PortalDashboard;
