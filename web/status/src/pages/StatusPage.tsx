import React, { useState, useEffect } from 'react';
import { BrandMark } from '@dhawalhost/wardseal-ui-kit';

type Health = 'checking' | 'operational' | 'down';

interface ServiceStatus {
    name: string;
    detail: string;
    status: Health;
    latencyMs?: number;
}

const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('.local') || window.location.hostname === 'localhost');
const domain = isLocal ? 'wardseal.local' : 'wardseal.com';
const protocol = isLocal ? 'http' : 'https';

const authUrl = `${protocol}://auth.${domain}/healthz`;
const apiUrl = `${protocol}://api.${domain}`;

const SERVICE_ENDPOINTS = [
    { name: 'Authentication', detail: 'OAuth 2.1, OIDC and SAML sign-in', url: authUrl },
    { name: 'Governance API', detail: 'Roles, policies, reviews and audit', url: `${apiUrl}/gov/healthz` },
    { name: 'Provisioning', detail: 'Outbound connectors and SCIM push', url: `${apiUrl}/provisioning/healthz` },
    { name: 'Policy engine', detail: 'Access decisions at request time', url: `${apiUrl}/policy/healthz` },
    { name: 'Directory sync', detail: 'Inbound SCIM 2.0 users and groups', url: `${apiUrl}/scim/healthz` },
];

const dot: Record<Health, string> = {
    checking: 'bg-on-surface-subtle',
    operational: 'bg-success',
    down: 'bg-error',
};
const label: Record<Health, string> = { checking: 'Checking', operational: 'Operational', down: 'Unreachable' };

const StatusPage: React.FC = () => {
    const [services, setServices] = useState<ServiceStatus[]>(
        SERVICE_ENDPOINTS.map(({ name, detail }) => ({ name, detail, status: 'checking' }))
    );
    const [checkedAt, setCheckedAt] = useState<Date | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            const results = await Promise.all(
                SERVICE_ENDPOINTS.map(async ({ name, detail, url }): Promise<ServiceStatus> => {
                    const start = performance.now();
                    try {
                        const res = await fetch(url);
                        return { name, detail, status: res.ok ? 'operational' : 'down', latencyMs: Math.round(performance.now() - start) };
                    } catch {
                        return { name, detail, status: 'down' };
                    }
                })
            );
            setServices(results);
            setCheckedAt(new Date());
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const down = services.filter((s) => s.status === 'down').length;
    const checking = services.some((s) => s.status === 'checking');
    const overall: Health = checking ? 'checking' : down ? 'down' : 'operational';
    const headline = checking
        ? 'Checking services'
        : down
          ? `${down} of ${services.length} services unreachable`
          : 'All services operational';

    return (
        <div className="min-h-dvh bg-background text-on-surface">
            <div className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
                <header className="flex h-16 items-center justify-between">
                    <BrandMark name="WardSeal" subtitle="Status" />
                    {checkedAt && (
                        <span className="font-mono text-xs text-on-surface-subtle tabular-nums">
                            Checked {checkedAt.toLocaleTimeString('en-GB')}
                        </span>
                    )}
                </header>

                <section className="mt-10" aria-live="polite">
                    <p className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                        <span className={`h-2 w-2 rounded-full ${dot[overall]}`} aria-hidden />
                        {label[overall]}
                    </p>
                    <h1 className="mt-3 text-display text-on-surface">{headline}</h1>
                    <p className="mt-3 text-body text-on-surface-subtle">Live health checks from your browser, refreshed every 30 seconds</p>
                </section>

                <section className="mt-12" aria-labelledby="services-title">
                    <h2 id="services-title" className="mb-3 text-sm text-on-surface-variant">Services</h2>
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
                        {services.map((s) => (
                            <li key={s.name} className="flex items-center justify-between gap-4 px-5 py-4">
                                <div className="min-w-0">
                                    <p className="text-heading text-on-surface">{s.name}</p>
                                    <p className="mt-0.5 truncate text-sm text-on-surface-subtle">{s.detail}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-6">
                                    <span className="hidden w-16 text-right font-mono text-xs text-on-surface-subtle tabular-nums sm:inline">
                                        {s.latencyMs !== undefined ? `${s.latencyMs} ms` : '—'}
                                    </span>
                                    <span className="flex w-28 items-center justify-end gap-2 text-sm text-on-surface-variant">
                                        <span className={`h-1.5 w-1.5 rounded-full ${dot[s.status]}`} aria-hidden />
                                        {label[s.status]}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                <footer className="mt-10 text-xs text-on-surface-subtle">© {new Date().getFullYear()} WardSeal</footer>
            </div>
        </div>
    );
};

export default StatusPage;
