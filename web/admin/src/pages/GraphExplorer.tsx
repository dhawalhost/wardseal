import React, { useState, useEffect } from 'react';
import { getGraphTraversal, getRelationships } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Network,
    ArrowRight,
    Shield,
    User,
    Globe,
    Loader2,
    Search,
    Maximize2,
    Database,
    Activity,
    RefreshCcw,
    Share2
} from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow, PageLayout
} from '@/components/layout';

const GraphExplorer: React.FC = () => {
    const [subjectID, setSubjectID] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subjectID) return;

        setLoading(true);
        setError('');
        try {
            const data = await getGraphTraversal(subjectID);
            setResults(data || []);
        } catch (err: any) {
            console.error(err);
            setError('Search failed. Subject not found in the access graph.');
        } finally {
            setLoading(false);
        }
    };

    const syncGraph = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getRelationships();
            setResults(data || []);
        } catch (err: any) {
            setError('Failed to load relationship graph. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        syncGraph();
    }, []);

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<Share2 className="w-6 h-6 text-secondary" />}
                title="Access Map"
                description="Visualize how users, groups, and roles are connected to resources. Understand access paths across your organization."
                actions={
                    <Button onClick={syncGraph} className="h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm px-4 shadow-sm">
                        <RefreshCcw className="w-4 h-4 mr-2" /> Refresh Map
                    </Button>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-card">
                <div className="lg:col-span-4 space-y-page">
                    <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 rounded-lg">
                                    <Activity className="w-4 h-4 text-secondary" />
                                </div>
                                <div>
                                    <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Current View</GlassCardTitle>
                                    <p className="text-sm font-medium text-muted-foreground mt-0.5">Active access relationship map</p>
                                </div>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-card">
                            <form onSubmit={handleSearch} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="subject" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Subject</Label>
                                    <div className="relative group">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-secondary transition-colors">
                                            <Search className="h-4 w-4" />
                                        </div>
                                        <Input
                                            id="subject"
                                            value={subjectID}
                                            onChange={e => setSubjectID(e.target.value)}
                                            placeholder="e.g. j.doe@wardseal.io"
                                            className="h-11 border border-border rounded-lg bg-card focus-visible:ring-2 focus-visible:ring-secondary/20 font-medium pl-10"
                                            required
                                        />
                                    </div>
                                    <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                        Enter a user or entity ID to explore its access relationships.
                                    </p>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-11 rounded-lg font-semibold text-sm bg-secondary text-secondary-foreground shadow-sm"
                                >
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                    Search relationships
                                </Button>
                            </form>
                        </GlassCardContent>
                    </GlassCard>

                    <div className="bg-secondary text-secondary-foreground p-card rounded-lg space-y-4 shadow-sm border border-secondary/20">
                        <div className="flex items-center gap-3 text-secondary-foreground">
                            <Database className="w-5 h-5" />
                            <span className="text-sm font-semibold">Graph metadata</span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-secondary-foreground/80">
                            Shows relationships between subjects, roles, and resources in your organization.
                        </p>
                        <div className="pt-3 border-t border-secondary-foreground/10 flex items-center justify-between">
                            <span className="text-xs font-semibold text-secondary-foreground/80">Consistency</span>
                            <Badge className="bg-success/20 text-success border-none rounded-md font-semibold text-xs px-2 py-0.5 shadow-none">Synchronized</Badge>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8">
                    <div className="flex items-center gap-4 mb-4">
                        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex-shrink-0">Relationships</h2>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                        <GlassCardContent className="p-0">
                            <div className="overflow-x-auto min-h-[400px]">
                                <GlassTable>
                                    <GlassTableHeader>
                                        <GlassTableRow className="hover:bg-transparent border-b border-border">
                                            <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Subject</GlassTableHead>
                                            <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Relation</GlassTableHead>
                                            <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Object</GlassTableHead>
                                            <GlassTableHead className="text-right pr-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Actions</GlassTableHead>
                                        </GlassTableRow>
                                    </GlassTableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <GlassTableRow>
                                                <TableCell colSpan={4} className="py-16 text-center">
                                                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                                        <Loader2 className="h-8 w-8 animate-spin" />
                                                        <span className="text-sm font-medium">Loading map…</span>
                                                    </div>
                                                </TableCell>
                                            </GlassTableRow>
                                        ) : results.length === 0 ? (
                                            <GlassTableRow>
                                                <TableCell colSpan={4} className="py-16 text-center">
                                                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                                        <Network className="h-12 w-12" />
                                                        <span className="text-sm font-medium">{error || 'Search to view access relationships.'}</span>
                                                    </div>
                                                </TableCell>
                                            </GlassTableRow>
                                        ) : (
                                            results.map((res, i) => (
                                                <GlassTableRow key={i} className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group">
                                                    <TableCell className="py-card pl-card">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                                                                <User className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-semibold tracking-tight text-on-surface truncate">{res.subject_name || res.subject_id}</span>
                                                                <span className="text-xs font-medium text-muted-foreground mt-0.5">{res.subject_type}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-card">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-secondary/10 rounded-md">
                                                                <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                                                            </div>
                                                            <Badge className="bg-card border border-border text-on-surface font-semibold text-xs px-2 py-0.5 shadow-none">
                                                                {res.relation}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-card">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                                                                <Shield className="w-4 h-4" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-sm font-semibold tracking-tight text-on-surface truncate">{res.object_name || res.object_id}</span>
                                                                <span className="text-xs font-medium text-muted-foreground mt-0.5">{res.namespace || 'node'}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-card text-right pr-card">
                                                        <Button variant="ghost" size="icon" className="rounded-lg hover:bg-muted text-muted-foreground h-8 w-8">
                                                            <Maximize2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </GlassTableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </GlassTable>
                            </div>
                        </GlassCardContent>
                        {results.length > 0 && (
                            <div className="p-card border-t border-border">
                                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <Globe className="h-4 w-4" />
                                    Showing {results.length} relationship{results.length === 1 ? '' : 's'}.
                                </div>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
        </PageLayout>
    );
};

export default GraphExplorer;
