import { useState, useEffect } from 'react';
import { resolveManageConsoleUrl } from '@wardseal/shared';
import { ArrowUpRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getUserApps } from '../api';

interface Application {
    id: string;
    name: string;
    description: string;
    icon_url?: string;
    launch_url: string;
}

const hostOf = (url: string) => {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
};

/** One launcher tile: monogram or logo, name, host, quiet open affordance. */
const AppTile = ({ app }: { app: Application }) => (
    <a
        href={app.launch_url}
        target="_blank"
        rel="noreferrer"
        className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-colors duration-fast hover:border-on-surface/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-container-low text-sm font-medium text-on-surface-variant">
            {app.icon_url ? <img src={app.icon_url} alt="" className="h-6 w-6 object-contain" /> : app.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
                <span className="truncate text-heading text-on-surface">{app.name}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-on-surface-subtle transition-colors group-hover:text-on-surface" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="mt-0.5 block truncate font-mono text-xs text-on-surface-subtle">{hostOf(app.launch_url)}</span>
            {app.description && <span className="mt-2 line-clamp-2 block text-sm text-on-surface-variant">{app.description}</span>}
        </span>
        <span className="sr-only">(opens in a new tab)</span>
    </a>
);

const PortalDashboard = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

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

    const q = searchQuery.toLowerCase();
    const filteredApps = applications.filter(
        (app) => app.name.toLowerCase().includes(q) || (app.description || '').toLowerCase().includes(q)
    );

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-title-lg text-on-surface">Applications</h1>
                    <p className="mt-1 text-body text-on-surface-subtle">
                        {loading
                            ? 'Loading your applications'
                            : `${applications.length} ${applications.length === 1 ? 'app' : 'apps'} assigned to you`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-full sm:w-72">
                        <Input
                            icon={<Search />}
                            placeholder="Search"
                            aria-label="Search applications"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {isAdmin && (
                        <Button variant="outline" onClick={() => window.location.assign(`${resolveManageConsoleUrl()}/dashboard`)}>
                            Admin console
                        </Button>
                    )}
                </div>
            </header>

            {loading ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-[92px] animate-pulse rounded-xl border border-border bg-card" />
                    ))}
                </div>
            ) : filteredApps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
                    <p className="text-heading text-on-surface">{searchQuery ? 'No matching applications' : 'No applications yet'}</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-on-surface-subtle">
                        {searchQuery
                            ? `Nothing matches “${searchQuery}”`
                            : 'Apps your administrator assigns to you will appear here'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredApps.map((app) => (
                        <AppTile key={app.id} app={app} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PortalDashboard;
