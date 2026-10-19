import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Shield, Zap, Server, Database, Terminal } from 'lucide-react';
import { GlassCard } from '@/components/layout';

interface ServiceStatus {
    name: string;
    status: 'operational' | 'degraded' | 'down';
    latency: string;
    uptime: string;
    icon: any;
}

const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('.local') || window.location.hostname === 'localhost');
const domain = isLocal ? 'wardseal.local' : 'wardseal.com';
const protocol = isLocal ? 'http' : 'https';

const authUrl = `${protocol}://auth.${domain}/healthz`;
const apiUrl = `${protocol}://api.${domain}`;

const SERVICE_ENDPOINTS = [
    { name: 'OAuth/OIDC Authentication', url: authUrl, icon: Shield },
    { name: 'Core Governance API', url: `${apiUrl}/gov/healthz`, icon: Zap },
    { name: 'Provisioning Gateway', url: `${apiUrl}/provisioning/healthz`, icon: Server },
    { name: 'Access Policy Engine', url: `${apiUrl}/policy/healthz`, icon: Database },
    { name: 'Identity Sync Relay', url: `${apiUrl}/scim/healthz`, icon: Terminal },
];

interface ServiceStatusItemProps {
    name: string;
    status: 'operational' | 'degraded' | 'down';
    latency: string;
    uptime: string;
    icon: React.ComponentType<{ className?: string }>;
}

const ServiceStatusItem: React.FC<ServiceStatusItemProps> = ({
    name,
    status,
    latency,
    uptime,
    icon: Icon,
}) => {
    return (
        <GlassCard className="p-card flex items-center justify-between rounded-xl bg-card shadow-sm border-border">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center border border-border">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-semibold text-on-surface tracking-tight">{name}</span>
                    <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            Latency: <span className="text-on-surface font-medium">{latency}</span>
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            Uptime: <span className="text-on-surface font-medium">{uptime}</span>
                        </span>
                    </div>
                </div>
            </div>
            <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold text-xs ${
                    status === 'operational'
                        ? 'bg-success/10 border border-success/20 text-success'
                        : 'bg-destructive/10 border border-destructive/20 text-destructive'
                }`}
            >
                <div
                    className={`h-1.5 w-1.5 rounded-full ${
                        status === 'operational' ? 'bg-success' : 'bg-destructive'
                    }`}
                />
                {status === 'operational' ? 'Active' : 'Offline'}
            </div>
        </GlassCard>
    );
};

const StatusPage: React.FC = () => {
    const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded'>('operational');
    const [services, setServices] = useState<ServiceStatus[]>(
        SERVICE_ENDPOINTS.map((s) => ({
            ...s,
            status: 'operational',
            latency: '...',
            uptime: '...',
        }))
    );

    useEffect(() => {
        const fetchStatus = async () => {
            const results = await Promise.all(
                SERVICE_ENDPOINTS.map(async (svc) => {
                    const start = Date.now();
                    try {
                        const res = await fetch(svc.url);
                        const latency = `${Date.now() - start}ms`;
                        return {
                            name: svc.name,
                            status: (res.ok ? 'operational' : 'down') as any,
                            latency,
                            uptime: '99.9%',
                            icon: svc.icon,
                        };
                    } catch (e) {
                        return {
                            name: svc.name,
                            status: 'down' as any,
                            latency: 'N/A',
                            uptime: '0%',
                            icon: svc.icon,
                        };
                    }
                })
            );
            setServices(results);
            const isAnyDown = results.some((s) => s.status === 'down');
            setOverallStatus(isAnyDown ? 'degraded' : 'operational');
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-start p-4 animate-in fade-in duration-500">
            <div className="max-w-3xl w-full space-y-page pt-6">
                <div className="flex items-center justify-center gap-3">
                    <img src="/wardseal.svg" alt="WardSeal" className="w-7 h-7" />
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-base font-bold tracking-tight text-on-surface">WardSeal</span>
                        <span className="text-xs font-semibold text-secondary">System status</span>
                    </div>
                </div>

                <GlassCard className="p-8 bg-card border border-border shadow-sm rounded-xl flex flex-col items-center text-center space-y-3">
                    {overallStatus === 'operational' ? (
                        <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center border border-success/20">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                    ) : (
                        <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center border border-warning/20">
                            <AlertCircle className="h-5 w-5 text-warning" />
                        </div>
                    )}
                    <h2 className="text-2xl font-bold tracking-tight text-on-surface">
                        {overallStatus === 'operational' ? 'All systems operational' : 'Degraded performance'}
                    </h2>
                    <p className="text-muted-foreground text-sm">Live health checks across core services</p>
                </GlassCard>

                <div className="space-y-card">
                    <span className="text-xs font-semibold text-muted-foreground ml-1">Services</span>
                    <div className="space-y-2">
                        {services.map((service) => (
                            <ServiceStatusItem
                                key={service.name}
                                name={service.name}
                                status={service.status}
                                latency={service.latency}
                                uptime={service.uptime}
                                icon={service.icon}
                            />
                        ))}
                    </div>
                </div>

                <div className="text-center text-xs text-muted-foreground mt-6">
                    &copy; {new Date().getFullYear()} WardSeal. Status updates every 30 seconds.
                </div>
            </div>
        </div>
    );
};

export default StatusPage;
