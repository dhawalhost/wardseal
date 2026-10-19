import React, { useState } from 'react';
import { createAccessRequest } from '../api';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, GitPullRequest, ShieldCheck, Clock, MessageSquare, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    PageHeader,
    GlassCard,
    GlassCardHeader,
    GlassCardTitle,
    GlassCardContent,
    GlassCardDescription,
} from '@/components/layout';

const RequestAccess: React.FC = () => {
    const [resourceType, setResourceType] = useState('group');
    const [resourceID, setResourceID] = useState('');
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState('4h');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await createAccessRequest(
                resourceType,
                resourceID,
                reason,
                duration === 'indefinite' ? undefined : duration
            );
            navigate('/requests');
        } catch (err: any) {
            console.error(err);
            setError('Failed to submit request. Please verify the resource identifier and try again.');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-page animate-in fade-in duration-500 py-8">
            <PageHeader
                icon={<GitPullRequest className="w-8 h-8 text-primary" />}
                title="Request access"
                description="Submit a request for temporary access to organizational resources."
            />

            <GlassCard className="shadow-sm border-border bg-card overflow-hidden rounded-xl">
                <GlassCardHeader className="py-6 px-6 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg text-primary">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <GlassCardTitle className="text-xl font-bold tracking-tight text-on-surface">
                                New access request
                            </GlassCardTitle>
                            <GlassCardDescription className="mt-1">
                                Provide the resource details and a business justification.
                            </GlassCardDescription>
                        </div>
                    </div>
                </GlassCardHeader>

                <GlassCardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <Alert
                                variant="destructive"
                                className="rounded-lg border border-destructive/20 bg-destructive/10 text-destructive"
                            >
                                <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5" />
                                    Resource type
                                </Label>
                                <Select value={resourceType} onValueChange={setResourceType}>
                                    <SelectTrigger className="h-11 rounded-lg border-border bg-background shadow-xs text-sm">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg border-border shadow-sm text-sm">
                                        <SelectItem value="group">Group</SelectItem>
                                        <SelectItem value="role">Role (RBAC)</SelectItem>
                                        <SelectItem value="app">Application</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-muted-foreground">Resource ID</Label>
                                <Input
                                    value={resourceID}
                                    onChange={(e) => setResourceID(e.target.value)}
                                    placeholder={resourceType === 'group' ? 'e.g. engineering' : 'e.g. salesforce'}
                                    className="h-11 rounded-lg border-border bg-background shadow-xs text-sm"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter the exact system identifier for the resource.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                Access duration
                            </Label>
                            <Select value={duration} onValueChange={setDuration}>
                                <SelectTrigger className="h-11 rounded-lg border-border bg-background shadow-xs text-sm">
                                    <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg border-border shadow-sm text-sm">
                                    <SelectItem value="1h">1 hour</SelectItem>
                                    <SelectItem value="4h">4 hours</SelectItem>
                                    <SelectItem value="24h">24 hours</SelectItem>
                                    <SelectItem value="indefinite">Indefinite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                <MessageSquare className="w-3.5 h-3.5" />
                                Business justification
                            </Label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Explain why you need this access…"
                                required
                                rows={4}
                                className="rounded-lg border-border bg-background shadow-xs text-sm p-4 resize-none"
                            />
                        </div>

                        <div className="pt-2 flex flex-col gap-3">
                            <Button
                                type="submit"
                                className="w-full h-11 rounded-lg font-semibold text-sm shadow-sm bg-secondary text-secondary-foreground"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" /> Submit request
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                type="button"
                                className="w-full h-10 font-semibold text-sm text-muted-foreground hover:text-on-surface rounded-lg"
                                onClick={() => navigate('/requests')}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </GlassCardContent>
            </GlassCard>
        </div>
    );
};

export default RequestAccess;
