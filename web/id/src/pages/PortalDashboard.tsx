import { useState, useEffect } from 'react';
import { resolveManageConsoleUrl } from '@wardseal/shared';
import { Button } from "@/components/ui/button";
import { ExternalLink, LayoutGrid, Search, Loader2, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getUserApps } from '../api';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardDescription } from '@/components/layout';

interface Application {
    id: string;
    name: string;
    description: string;
    icon_url?: string;
    launch_url: string;
}

const PortalDashboard = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [canAccessAdmin, setCanAccessAdmin] = useState(
        () => localStorage.getItem('isAdmin') === 'true'
    );

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

        setCanAccessAdmin(localStorage.getItem('isAdmin') === 'true');
        fetchApplications();
    }, []);

    const filteredApps = applications.filter(app =>
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLaunch = (app: Application) => {
        window.open(app.launch_url, '_blank');
    };

    return (
        <div className="space-y-page animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-card border-b border-border pb-8">
                <div className="space-y-3 max-w-xl">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">User portal</p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
                        Your applications
                    </h1>
                    <p className="text-muted-foreground text-base leading-relaxed">
                        Launch assigned apps and manage your identity settings from one place.
                    </p>
                    {canAccessAdmin && (
                        <Button
                            onClick={() => window.location.assign(resolveManageConsoleUrl())}
                            className="mt-2 h-10 px-5 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm"
                        >
                            <LayoutGrid className="w-4 h-4 mr-2" />
                            Open admin console
                        </Button>
                    )}
                </div>

                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search applications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 pl-10 rounded-lg border-border bg-card shadow-xs"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Loading applications…
                </div>
            ) : filteredApps.length === 0 ? (
                <GlassCard className="border border-border bg-card shadow-sm">
                    <GlassCardContent className="py-16 flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                            <Box className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <GlassCardTitle className="text-lg">No applications yet</GlassCardTitle>
                        <GlassCardDescription className="max-w-sm">
                            When your admin assigns apps to you, they will appear here.
                        </GlassCardDescription>
                    </GlassCardContent>
                </GlassCard>
            ) : (
                <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
                    {filteredApps.map((app) => (
                        <GlassCard key={app.id} className="border border-border bg-card shadow-sm hover:border-secondary/40 transition-colors">
                            <GlassCardHeader className="pb-2">
                                <div className="flex items-start gap-3">
                                    {app.icon_url ? (
                                        <img src={app.icon_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                                            <Box className="w-5 h-5 text-secondary" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <GlassCardTitle className="text-base truncate">{app.name}</GlassCardTitle>
                                        <GlassCardDescription className="line-clamp-2 mt-1">
                                            {app.description || 'Enterprise application'}
                                        </GlassCardDescription>
                                    </div>
                                </div>
                            </GlassCardHeader>
                            <GlassCardContent>
                                <Button
                                    variant="outline"
                                    className="w-full h-9 rounded-lg font-semibold text-sm"
                                    onClick={() => handleLaunch(app)}
                                >
                                    Launch <ExternalLink className="w-3.5 h-3.5 ml-2" />
                                </Button>
                            </GlassCardContent>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PortalDashboard;
