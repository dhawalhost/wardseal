import { useState, useEffect } from 'react';
import { getAuditLogs, exportAuditLogs } from '../api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Search, Filter, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface AuditEvent {
    id: string;
    timestamp: string;
    actor_id: string;
    actor_type: string;
    action: string;
    resource_type: string;
    resource_id: string;
    resource_name: string;
    outcome: string;
    details: Record<string, unknown>;
}

export default function AuditLogs() {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        action: '',
        resource_type: '',
        limit: 50,
        offset: 0
    });

    useEffect(() => {
        loadLogs();
    }, [filters.limit, filters.offset]); // Trigger on pagination

    // Trigger explicit refresh for filter changes to avoid debounce complexity for now, or just simple effect
    const handleFilterSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setFilters(f => ({ ...f, offset: 0 })); // Reset to page 1
        loadLogs();
    };

    const loadLogs = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = { limit: filters.limit, offset: filters.offset };
            if (filters.action) params.action = filters.action;
            if (filters.resource_type) params.resource_type = filters.resource_type;

            const res = await getAuditLogs(params);
            setEvents(res.events || []);
            setTotal(res.total || 0);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const getOutcomeVariant = (outcome: string) => {
        return outcome === 'success' ? 'default' : 'destructive'; // default is primary/black, destructive is red
    };

    const handlePageChange = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && filters.offset > 0) {
            setFilters({ ...filters, offset: filters.offset - filters.limit });
        } else if (direction === 'next' && filters.offset + filters.limit < total) {
            setFilters({ ...filters, offset: filters.offset + filters.limit });
        }
    };

    const handleExport = async () => {
        try {
            const params: Record<string, unknown> = {};
            if (filters.action) params.action = filters.action;
            if (filters.resource_type) params.resource_type = filters.resource_type;

            const blob = await exportAuditLogs(params);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            console.error('Failed to export logs:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground mt-1">Comprehensive record of system activities and events.</p>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3 border-b bg-muted/20">
                    <form onSubmit={handleFilterSubmit} className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 max-w-sm relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter by action..."
                                className="pl-9 bg-background"
                                value={filters.action}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            />
                        </div>
                        <div className="w-full md:w-[200px]">
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={filters.resource_type}
                                onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
                            >
                                <option value="">All Resources</option>
                                <option value="user">Users</option>
                                <option value="group">Groups</option>
                                <option value="role">Roles</option>
                                <option value="campaign">Campaigns</option>
                                <option value="access_request">Access Requests</option>
                            </select>
                        </div>
                        <Button type="submit" variant="secondary">
                            <Filter className="mr-2 h-4 w-4" /> Apply Filters
                        </Button>
                    </form>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <>
                            {events.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                                    No audit events found matching your criteria.
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[180px]">Timestamp</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Resource</TableHead>
                                            <TableHead>Actor</TableHead>
                                            <TableHead>Outcome</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {events.map(event => (
                                            <TableRow key={event.id}>
                                                <TableCell className="text-xs text-muted-foreground font-mono">
                                                    {formatDate(event.timestamp)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-sm">{event.action}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">{event.resource_type}</span>
                                                        <span className="text-sm truncate max-w-[200px]" title={event.resource_name || event.resource_id}>
                                                            {event.resource_name || event.resource_id}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-normal text-xs bg-muted/50">
                                                        {event.actor_type}: {event.actor_id.substring(0, 8)}...
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getOutcomeVariant(event.outcome) as any}>
                                                        {event.outcome}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </>
                    )}
                </CardContent>
                <div className="border-t p-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, total)} of {total} events
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange('prev')}
                            disabled={filters.offset === 0}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange('next')}
                            disabled={filters.offset + filters.limit >= total}
                        >
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
