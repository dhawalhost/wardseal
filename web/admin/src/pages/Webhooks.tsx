import React, { useEffect, useState } from 'react';
import { getWebhooks, createWebhook, deleteWebhook } from '../api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Webhook as WebhookIcon, Check } from 'lucide-react';

interface Webhook {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    created_at: string;
}

const Webhooks: React.FC = () => {
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [newUrl, setNewUrl] = useState('');
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const availableEvents = ['user.created', 'user.deleted', 'access.requested', 'access.approved'];

    const fetchData = async () => {
        try {
            const data = await getWebhooks();
            if (data && data.webhooks) {
                setWebhooks(data.webhooks);
            } else if (Array.isArray(data)) {
                setWebhooks(data);
            } else {
                setWebhooks([]);
            }
        } catch (err) {
            console.error("Failed to fetch webhooks", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async () => {
        if (!newUrl) {
            setError('URL is required');
            return;
        }
        if (selectedEvents.length === 0) {
            setError('Select at least one event');
            return;
        }
        setCreating(true);
        try {
            await createWebhook(newUrl, selectedEvents);
            setNewUrl('');
            setSelectedEvents([]);
            setError('');
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create webhook');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this webhook?")) return;
        try {
            await deleteWebhook(id);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const toggleEvent = (e: string) => {
        if (selectedEvents.includes(e)) {
            setSelectedEvents(selectedEvents.filter(ev => ev !== e));
        } else {
            setSelectedEvents([...selectedEvents, e]);
        }
    };

    if (loading && webhooks.length === 0) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
                    <p className="text-muted-foreground mt-1">Receive real-time notifications for system events.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Register Webhook</CardTitle>
                            <CardDescription>Add a new endpoint to receive events.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Endpoint URL</Label>
                                <Input
                                    placeholder="https://example.com/webhook"
                                    value={newUrl}
                                    onChange={(e) => setNewUrl(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Events to Subscribe</Label>
                                <div className="grid grid-cols-1 bg-muted/20 p-3 rounded-md gap-2">
                                    {availableEvents.map(ev => (
                                        <div key={ev} className="flex items-center space-x-2">
                                            <div
                                                className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${selectedEvents.includes(ev) ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'}`}
                                                onClick={() => toggleEvent(ev)}
                                            >
                                                {selectedEvents.includes(ev) && <Check className="h-3 w-3" />}
                                            </div>
                                            <span className="text-sm cursor-pointer select-none" onClick={() => toggleEvent(ev)}>{ev}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {error && <div className="text-sm text-destructive">{error}</div>}
                            <Button
                                onClick={handleCreate}
                                className="w-full"
                                disabled={creating}
                            >
                                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Register Webhook
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Webhooks</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {webhooks.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">No webhooks registered.</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>URL</TableHead>
                                            <TableHead>Events</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {webhooks.map(wh => (
                                            <TableRow key={wh.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 font-mono text-sm">
                                                        <WebhookIcon className="h-4 w-4 text-muted-foreground" />
                                                        {wh.url}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {wh.events.map(ev => (
                                                            <Badge key={ev} variant="secondary" className="text-xs">{ev}</Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {wh.active ? (
                                                        <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Inactive</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(wh.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Webhooks;
