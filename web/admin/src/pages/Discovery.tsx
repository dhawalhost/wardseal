import React, { useEffect, useState, useCallback } from 'react';
import { 
    getDiscoveredResources, 
    triggerDiscoveryScan, 
    getDiscoveryJobStatus,
    DiscoveredResource,
    DiscoveryJobStatus 
} from '../api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableBody, TableCell } from '@/components/ui/table';
import { 
    Loader2, 
    Activity, 
    Search, 
    RefreshCcw, 
    CheckCircle2, 
    Clock, 
    Database, 
    Globe, 
    Server, 
    ShieldPlus, 
    AlertCircle,
    Fingerprint
} from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow, PageLayout
} from '@/components/layout';
import { Alert, AlertDescription } from "@/components/ui/alert";

const Discovery: React.FC = () => {
    const [resources, setResources] = useState<DiscoveredResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentJob, setCurrentJob] = useState<DiscoveryJobStatus | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const fetchResources = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getDiscoveredResources();
            setResources(data || []);
        } catch (err) {
            console.error(err);
            setMessage({ text: "Failed to load discovered resources.", type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    // Polling logic for discovery jobs
    useEffect(() => {
        let pollInterval: NodeJS.Timeout;

        if (currentJob && (currentJob.status === 'queued' || currentJob.status === 'processing')) {
            pollInterval = setInterval(async () => {
                try {
                    const status = await getDiscoveryJobStatus(currentJob.id);
                    setCurrentJob(status);
                    
                    if (status.status === 'completed') {
                        setMessage({ text: "Network scan completed successfully.", type: 'success' });
                        fetchResources();
                        clearInterval(pollInterval);
                    } else if (status.status === 'failed') {
                        setMessage({ text: `Scan failed: ${status.message || 'Unknown error'}`, type: 'error' });
                        clearInterval(pollInterval);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                    clearInterval(pollInterval);
                }
            }, 2000); 
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [currentJob, fetchResources]);

    const handleRunScan = async () => {
        try {
            setMessage(null);
            const response = await triggerDiscoveryScan();
            if (response.job_id) {
                setCurrentJob({
                    id: response.job_id,
                    tenant_id: '',
                    status: 'processing',
                    progress: 0,
                    message: 'Initializing scan…',
                    started_at: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error(err);
            setMessage({ text: "Could not start network scan.", type: 'error' });
        }
    };

    const getSourceIcon = (source: string) => {
        if (source.toLowerCase().includes('ldap') || source.toLowerCase().includes('ad')) {
            return <Database className="w-4 h-4" />;
        }
        return <Globe className="w-4 h-4" />;
    };

    const isScanning = currentJob?.status === 'queued' || currentJob?.status === 'processing';

    if (loading && resources.length === 0) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<Search className="w-6 h-6 text-secondary" />}
                title="Discovery"
                description="Scan your network for users, groups, and applications to bring them under WardSeal protection."
                actions={
                    <Button 
                        onClick={handleRunScan} 
                        disabled={isScanning}
                        className="h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm px-4 shadow-sm"
                    >
                        {isScanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                        {isScanning ? 'Scanning...' : 'Start Scan'}
                    </Button>
                }
            />

            {currentJob && isScanning && (
                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg relative">
                    <div 
                        className="absolute top-0 left-0 h-1 bg-secondary transition-all duration-1000" 
                        style={{ width: `${currentJob.progress}%` }}
                    />
                    <GlassCardContent className="p-card flex flex-col md:flex-row items-center justify-between gap-card">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                                <Activity className="w-5 h-5 text-secondary" />
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-xs font-semibold text-secondary">Scan in Progress</span>
                                <h3 className="text-base font-bold tracking-tight text-on-surface">{currentJob.message || 'Scanning network...'}</h3>
                                <span className="text-xs font-medium text-muted-foreground">Job ID: {currentJob.id?.substring(0, 8).toLowerCase()}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-bold tracking-tight tabular-nums text-on-surface">{currentJob.progress}<span className="text-lg ml-1 text-muted-foreground">%</span></span>
                        </div>
                    </GlassCardContent>
                </GlassCard>
            )}

            {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={`border rounded-lg p-4 flex items-center gap-3 ${message.type === 'error' ? 'bg-destructive/5 text-destructive border-destructive/20' : 'bg-success-subtle text-success border-success/20'}`}>
                    <div className={`p-2 rounded-lg ${message.type === 'error' ? 'bg-destructive/10' : 'bg-success/10'}`}>
                        {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <ShieldPlus className="h-4 w-4" />}
                    </div>
                    <AlertDescription className="font-semibold text-sm">{message.text}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-card">
                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <GlassCardContent className="p-card">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Total Found</span>
                            <span className="text-3xl font-bold tracking-tight tabular-nums text-on-surface">{resources.length}</span>
                        </div>
                    </GlassCardContent>
                </GlassCard>
                
                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <GlassCardContent className="p-card">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Unmanaged</span>
                            <span className="text-3xl font-bold tracking-tight tabular-nums text-on-surface">
                                {Math.round((resources.filter(r => r.status === 'discovered').length / (resources.length || 1)) * 100)}<span className="text-lg text-muted-foreground ml-1">%</span>
                            </span>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <GlassCardContent className="p-card">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Managed</span>
                            <span className="text-3xl font-bold tracking-tight tabular-nums text-success">
                                {resources.filter(r => r.status === 'promoted').length}
                            </span>
                        </div>
                    </GlassCardContent>
                </GlassCard>
            </div>

            <div className="space-y-page">
                <div className="flex items-center gap-4">
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex-shrink-0">Asset List</h2>
                    <div className="h-px flex-1 bg-border" />
                </div>

                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <GlassCardHeader className="py-card px-card border-b border-border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary/10 rounded-lg">
                                <Search className="w-4 h-4 text-secondary" />
                            </div>
                            <div>
                                <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Discovered Assets</GlassCardTitle>
                                <p className="text-muted-foreground text-sm mt-0.5">Users and resources found on your network.</p>
                            </div>
                        </div>
                    </GlassCardHeader>
                    <GlassCardContent className="p-0">
                        {resources.length === 0 ? (
                            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-lg bg-muted/50 flex items-center justify-center">
                                    <Server className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <span className="max-w-xs font-medium text-sm leading-relaxed">No assets found. Run a scan to find users and applications.</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <GlassTable>
                                    <GlassTableHeader>
                                        <GlassTableRow className="hover:bg-transparent border-b border-border">
                                            <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Name</GlassTableHead>
                                            <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground uppercase">Source</GlassTableHead>
                                            <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground uppercase">Type</GlassTableHead>
                                            <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground uppercase">Status</GlassTableHead>
                                            <GlassTableHead className="py-3 text-right pr-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Actions</GlassTableHead>
                                        </GlassTableRow>
                                    </GlassTableHeader>
                                    <TableBody>
                                        {resources.map(resource => (
                                            <GlassTableRow key={resource.id} className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group">
                                                <TableCell className="py-card pl-card">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-muted/50 text-muted-foreground flex items-center justify-center">
                                                            <Fingerprint className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 min-w-0">
                                                            <span className="text-sm font-semibold tracking-tight text-on-surface truncate">{resource.name}</span>
                                                            <span className="text-xs font-mono text-muted-foreground truncate max-w-[150px]">{resource.external_id}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-card">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground">
                                                            {getSourceIcon(resource.source)}
                                                        </div>
                                                        <span className="text-sm font-medium text-on-surface">{resource.source}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-card">
                                                    <Badge className="bg-muted/50 text-muted-foreground border-none rounded-md font-semibold text-xs px-2 py-0.5 shadow-none">
                                                        {resource.resource_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-card">
                                                    {resource.status === 'promoted' ? (
                                                        <Badge className="bg-success-subtle text-success border-none rounded-md font-semibold text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit shadow-none">
                                                            <CheckCircle2 className="w-3 h-3" /> Managed
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-muted/50 text-muted-foreground border-none rounded-md font-semibold text-xs px-2 py-0.5 flex items-center gap-1.5 w-fit shadow-none">
                                                            <Clock className="w-3 h-3" /> Discovered
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-card text-right pr-card">
                                                    <Button 
                                                        size="sm" 
                                                        variant={resource.status === 'promoted' ? "ghost" : "outline"} 
                                                        disabled={resource.status === 'promoted'}
                                                        className={`h-8 rounded-lg font-semibold text-xs px-3 ${resource.status === 'promoted' ? 'text-success' : 'border border-border hover:bg-muted/50'}`}
                                                    >
                                                        {resource.status === 'promoted' ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Secured
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5">
                                                                <ShieldPlus className="w-3.5 h-3.5" /> 
                                                                Protect
                                                            </div>
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </GlassTableRow>
                                        ))}
                                    </TableBody>
                                </GlassTable>
                            </div>
                        )}
                    </GlassCardContent>
                </GlassCard>
            </div>
        </div>
        </PageLayout>
    );
};

export default Discovery;
