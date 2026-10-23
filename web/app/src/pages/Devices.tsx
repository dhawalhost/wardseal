import React, { useEffect, useState } from 'react';
import { getEndpoints, updateEndpointStatus } from '../api';
import { PortalDeviceRow, Device } from '@/components/PortalDeviceRow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    MonitorSmartphone,
    ShieldCheck,
    ShieldAlert,
    ShieldIcon,
    User,
    Info,
    CheckCircle2,
    XCircle,
    Activity,
    Lock,
    Smartphone,
    Cpu,
    Zap,
    ExternalLink,
    MoreHorizontal,
    Terminal,
    Binary
} from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow, GlassCardDescription } from '@/components/layout';
import { TableBody, TableCell } from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from '@/components/ui/alert';

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
                return (
                    <Badge className="bg-success/10 text-success border-none gap-2 rounded-lg font-semibold text-xs px-3 py-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </Badge>
                );
            case 'untrusted':
                return (
                    <Badge className="bg-destructive/10 text-destructive border-none gap-2 rounded-lg font-semibold text-xs px-3 py-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Blocked
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-amber-500/10 text-amber-700 border-none gap-2 rounded-lg font-semibold text-xs px-3 py-1">
                        <Activity className="w-3.5 h-3.5" /> Pending
                    </Badge>
                );
        }
    };

    if (loading && devices.length === 0) {
        return (
            <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-page animate-in fade-in duration-500">
            <PageHeader
                icon={<MonitorSmartphone className="w-8 h-8 text-primary" />}
                title="Devices"
                description="Manage and verify the security status of company devices."
                actions={
                    <div className="flex gap-card">
                        {[
                            {
                                label: 'Verified',
                                value: devices.filter((d) => d.trust_status === 'trusted').length,
                                color: 'text-success',
                            },
                            {
                                label: 'Pending',
                                value: devices.filter((d) => d.trust_status === 'pending').length,
                                color: 'text-amber-600',
                            },
                        ].map((stat, i) => (
                            <GlassCard key={i} className="min-w-[140px] shadow-sm border-border bg-card rounded-xl p-4">
                                <div className="flex flex-col items-center gap-1">
                                    <span className={`text-2xl font-bold tracking-tight ${stat.color}`}>{stat.value}</span>
                                    <span className="text-xs font-semibold text-muted-foreground">{stat.label}</span>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                }
            />

            {error && (
                <Alert
                    variant="destructive"
                    className="rounded-lg border border-destructive/20 bg-destructive/10 text-destructive"
                >
                    <AlertDescription className="text-sm font-medium flex items-center gap-3">
                        <ShieldAlert className="w-4 h-4" />
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            <GlassCard className="shadow-sm border-border bg-card overflow-hidden rounded-xl">
                <GlassCardHeader className="py-6 px-6 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg text-primary">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <GlassCardTitle className="text-xl font-bold tracking-tight text-on-surface">
                                Device directory
                            </GlassCardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Devices allowed to access company resources.
                            </p>
                        </div>
                    </div>
                </GlassCardHeader>
                <GlassCardContent className="p-0">
                    <div className="overflow-x-auto min-h-[400px]">
                        <GlassTable>
                            <GlassTableHeader>
                                <GlassTableRow className="hover:bg-transparent border-b border-border">
                                    <GlassTableHead className="py-4 pl-6">Serial number</GlassTableHead>
                                    <GlassTableHead>User</GlassTableHead>
                                    <GlassTableHead>Platform</GlassTableHead>
                                    <GlassTableHead>Security status</GlassTableHead>
                                    <GlassTableHead>Last seen</GlassTableHead>
                                    <GlassTableHead className="text-right pr-6">Actions</GlassTableHead>
                                </GlassTableRow>
                            </GlassTableHeader>
                            <TableBody>
                                {devices.length === 0 ? (
                                    <GlassTableRow>
                                        <TableCell colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Smartphone className="h-10 w-10 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">No devices found.</span>
                                            </div>
                                        </TableCell>
                                    </GlassTableRow>
                                ) : (
                                    devices.map((device) => (
                                        <PortalDeviceRow
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

            <div className="bg-secondary text-secondary-foreground p-6 rounded-xl shadow-sm border border-secondary/20 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center gap-5 relative z-10">
                    <div className="p-3 bg-secondary-foreground/10 rounded-lg border border-secondary-foreground/10">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 flex-1 text-center md:text-left">
                        <h3 className="text-lg font-bold tracking-tight">Device security policy</h3>
                        <p className="text-sm text-secondary-foreground/80 max-w-2xl leading-relaxed">
                            Devices must be verified to access company data. Unrecognized devices may be blocked by policy.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="h-10 px-5 rounded-lg border-secondary-foreground/20 bg-secondary-foreground/5 hover:bg-secondary-foreground/10 text-secondary-foreground font-semibold text-sm hidden lg:flex"
                    >
                        View policy
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Devices;
