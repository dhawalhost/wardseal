import React, { useEffect, useState } from 'react';
import { getEndpoints, updateEndpointStatus, Device } from '../api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    MonitorSmartphone,
    ShieldCheck,
    ShieldAlert,
    Activity,
    Lock,
    Smartphone,
    Cpu,
} from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow, PageLayout
} from '@/components/layout';
import { TableBody, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DeviceRow } from '../components/DeviceRow';


const Devices: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDevices = async () => {
        try {
            setLoading(true);
            const data = await getEndpoints();
            setDevices(data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load devices.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await updateEndpointStatus(id, status);
            fetchDevices();
        } catch (err) {
            console.error(err);
            setError('Failed to update security status.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
             case 'trusted':
                return <Badge className="bg-success-subtle text-success border-none gap-2 rounded-md font-semibold text-xs px-2 py-0.5 shadow-none"><ShieldCheck className="w-3.5 h-3.5" /> Verified</Badge>;
            case 'untrusted':
                return <Badge className="bg-destructive/10 text-destructive border-none gap-2 rounded-md font-semibold text-xs px-2 py-0.5 shadow-none"><ShieldAlert className="w-3.5 h-3.5" /> Blocked</Badge>;
            default:
                return <Badge className="bg-amber-500/10 text-amber-600 border-none gap-2 rounded-md font-semibold text-xs px-2 py-0.5 shadow-none"><Activity className="w-3.5 h-3.5" /> Pending</Badge>;
        }
    };

    if (loading && devices.length === 0) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<MonitorSmartphone className="w-6 h-6 text-secondary" />}
                title="Devices"
                description="Manage and verify the security status of all company devices."
                actions={
                    <div className="flex gap-card">
                        {[
                            { label: 'Verified Devices', value: devices.filter(d => d.trust_status === 'trusted').length, color: 'text-success' },
                            { label: 'Pending Review', value: devices.filter(d => d.trust_status === 'pending').length, color: 'text-amber-600' },
                        ].map((stat, i) => (
                             <GlassCard key={i} className="min-w-[140px] border border-border shadow-sm bg-card rounded-lg p-card">
                                <div className="flex flex-col items-center gap-2">
                                    <span className={`text-2xl font-bold tracking-tight tabular-nums ${stat.color}`}>{stat.value}</span>
                                    <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                }
            />

             {error && (
                <Alert variant="destructive" className="rounded-lg border border-destructive/20 bg-destructive/5 text-destructive">
                    <AlertDescription className="font-semibold text-sm flex items-center gap-3">
                        <ShieldAlert className="w-4 h-4" />
                        Device error: {error}
                    </AlertDescription>
                </Alert>
            )}

            <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                <GlassCardHeader className="py-card px-card border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
                            <Lock className="w-4 h-4" />
                        </div>
                         <div>
                            <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Device Directory</GlassCardTitle>
                            <p className="text-muted-foreground text-sm mt-0.5">List of devices allowed to access company resources.</p>
                        </div>
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="p-0">
                    <div className="overflow-x-auto min-h-[400px]">
                        <GlassTable>
                            <GlassTableHeader>
                                 <GlassTableRow className="hover:bg-transparent border-b border-border">
                                    <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Serial Number</GlassTableHead>
                                    <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">User</GlassTableHead>
                                    <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Platform</GlassTableHead>
                                    <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Security Status</GlassTableHead>
                                    <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Last Seen</GlassTableHead>
                                    <GlassTableHead className="text-right pr-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Actions</GlassTableHead>
                                </GlassTableRow>
                            </GlassTableHeader>
                            <TableBody>
                                {devices.length === 0 ? (
                                    <GlassTableRow>
                                         <TableCell colSpan={6} className="py-16 text-center">
                                             <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                                 <Smartphone className="h-12 w-12" />
                                                 <span className="text-sm font-medium">No devices found.</span>
                                             </div>
                                        </TableCell>
                                    </GlassTableRow>
                                ) : (
                                    devices.map(device => (
                                        <DeviceRow
                                            key={device.id}
                                            device={device}
                                            getStatusBadge={getStatusBadge}
                                            handleUpdateStatus={handleUpdateStatus}
                                        />
                                    ))
                                )}
                            </TableBody>
                        </GlassTable>
                    </div>
                </GlassCardContent>
            </GlassCard>

            <div className="bg-secondary text-secondary-foreground p-card rounded-lg shadow-sm border border-secondary/20 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-card relative z-10">
                    <div className="p-3 bg-secondary-foreground/10 rounded-lg">
                        <Cpu className="w-8 h-8 text-secondary-foreground" />
                    </div>
                      <div className="space-y-2 flex-1 text-center md:text-left">
                         <h3 className="text-xl font-bold tracking-tight">Device Security Policy</h3>
                         <p className="text-sm font-medium text-secondary-foreground/80 max-w-2xl leading-relaxed">
                             All devices must be verified to access company data. Unrecognized devices will be blocked automatically according to global security policies.
                         </p>
                     </div>
                     <Button variant="outline" className="h-9 px-4 rounded-lg border-secondary-foreground/20 bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground font-semibold text-sm hidden lg:flex">
                         View Policy
                     </Button>
                </div>
            </div>
        </div>
        </PageLayout>
    );
};

export default Devices;
