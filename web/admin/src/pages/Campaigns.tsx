import React, { useState, useEffect } from 'react';
import { getCampaigns, createCampaign, startCampaign, completeCampaign, getCampaignItems, addCampaignItem, approveItem, revokeItem, getReviewItems, getSCIMUsers } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TableBody, TableCell } from '@/components/ui/table';
import {
    Loader2,
    Plus,
    Play,
    XCircle,
    Search,
    Target,
    Square,
    Award,
    Filter,
    ShieldCheck,
    ChevronRight,
} from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow, PageLayout
} from '@/components/layout';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

interface Campaign {
    id: string;
    name: string;
    description: string;
    status: string;
    reviewer_id: string;
    created_at: string;
}

interface CertificationItem {
    id: string;
    campaign_id?: string;
    user_id: string;
    resource_type: string;
    resource_id: string;
    resource_name: string;
    decision: string | null;
}

export default function Campaigns() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [items, setItems] = useState<CertificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCampaign, setNewCampaign] = useState({ name: '', description: '', reviewerId: '' });
    const [statusFilter, setStatusFilter] = useState('');
    const [allUsers, setAllUsers] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState<'all' | 'reviews'>('all');
    const [reviewerId, setReviewerId] = useState('');
    const [myReviewItems, setMyReviewItems] = useState<CertificationItem[]>([]);

    const [showAddItem, setShowAddItem] = useState(false);
    const [newItem, setNewItem] = useState({ user_id: '', resource_type: 'role', resource_id: '', resource_name: '' });

    useEffect(() => { loadCampaigns(); }, [statusFilter]);
    useEffect(() => {
        getSCIMUsers().then(d => setAllUsers(d.Resources || [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (selectedCampaign) {
            loadItems(selectedCampaign.id);
        }
    }, [selectedCampaign]);

    const loadCampaigns = async () => {
        try {
            const res = await getCampaigns(statusFilter);
            setCampaigns(res.campaigns || []);
        } catch (error) {
            console.error('Failed to load campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadItems = async (campaignId: string) => {
        try {
            const res = await getCampaignItems(campaignId);
            setItems(res.items || []);
        } catch (error) {
            console.error('Failed to load items:', error);
        }
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createCampaign(newCampaign.name, newCampaign.description, newCampaign.reviewerId);
            setNewCampaign({ name: '', description: '', reviewerId: '' });
            loadCampaigns();
        } catch (error) {
            console.error('Failed to create campaign:', error);
        }
    };

    const handleStartCampaign = async (id: string) => {
        try {
            await startCampaign(id);
            loadCampaigns();
        } catch (error) {
            console.error('Failed to start campaign:', error);
        }
    };

    const handleCompleteCampaign = async (id: string) => {
        try {
            await completeCampaign(id);
            loadCampaigns();
            if (selectedCampaign?.id === id) {
                setSelectedCampaign(null);
            }
        } catch (error) {
            console.error('Failed to complete campaign:', error);
        }
    };

    const handleAction = async (itemId: string, action: 'approve' | 'revoke') => {
        if (!selectedCampaign) return;
        try {
            if (action === 'approve') {
                await approveItem(selectedCampaign.id, itemId, 'Approved via Admin UI');
            } else {
                await revokeItem(selectedCampaign.id, itemId, 'Revoked via Admin UI');
            }
            loadItems(selectedCampaign.id);
        } catch (error) {
            console.error('Action failed:', error);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCampaign) return;
        try {
            await addCampaignItem(selectedCampaign.id, newItem);
            setNewItem({ user_id: '', resource_type: 'role', resource_id: '', resource_name: '' });
            setShowAddItem(false);
            loadItems(selectedCampaign.id);
        } catch (error) {
            console.error('Failed to add item:', error);
        }
    };

    const loadMyReviews = async (id: string) => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getReviewItems(id);
            setMyReviewItems(res.items || []);
        } catch (error) {
            console.error('Failed to load reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMyReviewAction = async (item: CertificationItem, action: 'approve' | 'revoke') => {
        if (!item.campaign_id) return;
        try {
            if (action === 'approve') {
                await approveItem(item.campaign_id, item.id, 'Approved by reviewer');
            } else {
                await revokeItem(item.campaign_id, item.id, 'Revoked by reviewer');
            }
            loadMyReviews(reviewerId);
        } catch (error) {
            console.error('Action failed:', error);
        }
    };

    if (loading && campaigns.length === 0) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<Award className="w-6 h-6 text-secondary" />}
                title="Access Reviews"
                description="Run periodic reviews to certify user access to critical resources and maintain security compliance."
                actions={
                    <div className="flex bg-muted p-0.5 rounded-lg border border-border">
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('all')}
                            className={cn("rounded-md font-semibold text-xs h-8 px-4", activeTab === 'all' ? 'bg-card text-secondary shadow-sm' : 'text-muted-foreground')}
                        >
                            All campaigns
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('reviews')}
                            className={cn("rounded-md font-semibold text-xs h-8 px-4", activeTab === 'reviews' ? 'bg-card text-secondary shadow-sm' : 'text-muted-foreground')}
                        >
                            My reviews
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-card items-start">
                {activeTab === 'all' ? (
                    <>
                        <div className="md:col-span-4 space-y-page">
                            <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                                <GlassCardHeader className="bg-secondary p-card text-secondary-foreground">
                                     <div className="flex items-center gap-3">
                                        <div className="p-2 bg-secondary-foreground/10 rounded-lg">
                                            <Plus className="w-4 h-4 text-secondary-foreground" />
                                        </div>
                                        <GlassCardTitle className="text-base font-bold tracking-tight text-secondary-foreground">New campaign</GlassCardTitle>
                                    </div>
                                </GlassCardHeader>
                                <GlassCardContent className="p-card">
                                    <form onSubmit={handleCreateCampaign} className="space-y-4">
                                         <div className="space-y-2">
                                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Campaign name</Label>
                                            <Input
                                                placeholder="e.g. Q3 privilege audit"
                                                className="h-10 border border-border rounded-lg bg-card focus-visible:ring-secondary/20 font-medium"
                                                value={newCampaign.name}
                                                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                         <div className="space-y-2">
                                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Reviewer</Label>
                                            <Select
                                                value={newCampaign.reviewerId}
                                                onValueChange={(v) => setNewCampaign({ ...newCampaign, reviewerId: v })}
                                                required
                                            >
                                                <SelectTrigger className="h-10 border border-border rounded-lg bg-card focus:ring-secondary/20 font-medium text-sm">
                                                    <SelectValue placeholder="Select a reviewer..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-lg border border-border shadow-sm">
                                                    {allUsers.map((u: any) => {
                                                        const email = u.emails?.[0]?.value || u.userName || u.id;
                                                        return (
                                                            <SelectItem key={u.id} value={u.id} className="font-medium text-sm">
                                                                {email}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <Button type="submit" className="w-full h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm">
                                            Create campaign
                                        </Button>
                                    </form>
                                </GlassCardContent>
                            </GlassCard>

                            <GlassCard className="border border-border shadow-sm bg-card overflow-hidden flex flex-col h-[560px] rounded-xl">
                                <GlassCardHeader className="py-card px-card border-b border-border">
                                         <div className="flex items-center justify-between">
                                        <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface">Campaigns</GlassCardTitle>
                                        <div className="flex items-center gap-2 bg-muted px-2 py-1 rounded-lg border border-border">
                                            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                                            <select
                                                className="text-xs font-semibold bg-transparent border-none p-0 h-4 focus:ring-0 cursor-pointer text-muted-foreground"
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                            >
                                                <option value="">All status</option>
                                                <option value="draft">draft</option>
                                                <option value="active">active</option>
                                                <option value="completed">complete</option>
                                            </select>
                                        </div>
                                    </div>
                                </GlassCardHeader>
                                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                                    {campaigns.map(campaign => (
                                        <div
                                            key={campaign.id}
                                            onClick={() => setSelectedCampaign(campaign)}
                                            className={cn(
                                                "group flex items-center justify-between p-3 cursor-pointer transition-colors rounded-lg",
                                                selectedCampaign?.id === campaign.id
                                                    ? 'bg-secondary/5 border border-secondary/30'
                                                    : 'bg-card hover:bg-muted/50 border border-transparent'
                                            )}
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className={cn("font-semibold text-sm tracking-tight truncate flex items-center gap-2", selectedCampaign?.id === campaign.id ? 'text-secondary' : 'text-on-surface')}>
                                                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {campaign.name}
                                                </div>
                                                 <div className="flex items-center gap-2 mt-1">
                                                    <Badge className={cn(
                                                        "rounded-md font-semibold text-[10px] px-2 py-0.5 border-none",
                                                        campaign.status === 'active' ? 'bg-success-subtle text-success' :
                                                        campaign.status === 'completed' ? 'bg-muted text-muted-foreground' :
                                                            'bg-warning/10 text-warning'
                                                    )}>
                                                        {campaign.status}
                                                    </Badge>
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {campaign.status === 'draft' && (
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-success hover:bg-success-subtle" onClick={(e) => { e.stopPropagation(); handleStartCampaign(campaign.id); }}>
                                                        <Play className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {campaign.status === 'active' && (
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleCompleteCampaign(campaign.id); }}>
                                                        <Square className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {selectedCampaign?.id === campaign.id && <ChevronRight className="h-4 w-4 text-secondary" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </GlassCard>
                        </div>

                        <div className="md:col-span-8">
                            {selectedCampaign ? (
                                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden min-h-[700px] flex flex-col rounded-xl">
                                    <GlassCardHeader className="bg-muted/50 p-card border-b border-border">
                                        <div className="flex items-center justify-between gap-card">
                                            <div className="space-y-2 min-w-0">
                                                <div className="flex items-center gap-3">
                                                     <div className="p-2 bg-secondary/10 rounded-lg shrink-0">
                                                        <Target className="w-5 h-5 text-secondary" />
                                                    </div>
                                                    <h2 className="text-xl font-bold tracking-tight text-on-surface truncate">{selectedCampaign.name}</h2>
                                                </div>
                                                <p className="text-sm font-medium text-muted-foreground">Reviewer: <span className="text-secondary">{selectedCampaign.reviewer_id}</span></p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                 <Badge className="bg-card text-muted-foreground border border-border rounded-md h-7 px-3 text-xs font-semibold">
                                                    {selectedCampaign.status}
                                                </Badge>
                                                {selectedCampaign.status === 'draft' && (
                                                    <Button
                                                        onClick={() => setShowAddItem(!showAddItem)}
                                                        className="h-9 rounded-lg font-semibold text-sm shadow-sm px-4 bg-secondary text-secondary-foreground"
                                                        variant={showAddItem ? "ghost" : "default"}
                                                    >
                                                        {showAddItem ? <XCircle className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                                                        {showAddItem ? 'Cancel' : 'Add items'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </GlassCardHeader>

                                    {showAddItem && selectedCampaign.status === 'draft' && (
                                        <div className="bg-muted/30 border-b border-border p-card">
                                            <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-card items-end">
                                                 <div className="space-y-2">
                                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">User ID</Label>
                                                    <Input
                                                        placeholder="User ID"
                                                        className="h-10 border border-border rounded-lg bg-card focus-visible:ring-secondary/20 font-medium"
                                                        value={newItem.user_id}
                                                        onChange={(e) => setNewItem({ ...newItem, user_id: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                 <div className="space-y-2">
                                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Resource type</Label>
                                                    <select
                                                        className="flex h-10 w-full border border-border rounded-lg bg-card focus:ring-secondary/20 font-medium text-sm px-3"
                                                        value={newItem.resource_type}
                                                        onChange={(e) => setNewItem({ ...newItem, resource_type: e.target.value })}
                                                    >
                                                        <option value="role">Role</option>
                                                        <option value="group">Group</option>
                                                        <option value="application">Application</option>
                                                        <option value="permission">Permission</option>
                                                    </select>
                                                </div>
                                                 <div className="space-y-2">
                                                    <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Resource ID</Label>
                                                    <Input
                                                        placeholder="Resource ID"
                                                        className="h-10 border border-border rounded-lg bg-card focus-visible:ring-secondary/20 font-medium"
                                                        value={newItem.resource_id}
                                                        onChange={(e) => setNewItem({ ...newItem, resource_id: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <Button type="submit" className="h-10 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm">
                                                    Add to review
                                                </Button>
                                            </form>
                                        </div>
                                    )}

                                    <GlassCardContent className="p-0 flex-1 overflow-y-auto bg-card">
                                        {items.length === 0 ? (
                                             <div className="py-16 text-center text-sm font-medium text-muted-foreground">
                                                No items in this campaign.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                 <GlassTable>
                                                    <GlassTableHeader>
                                                        <GlassTableRow className="hover:bg-transparent border-b border-border">
                                                            <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">User</GlassTableHead>
                                                            <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Resource</GlassTableHead>
                                                            <GlassTableHead className="font-semibold text-xs tracking-wide text-muted-foreground uppercase">Status</GlassTableHead>
                                                            <GlassTableHead className="text-right font-semibold text-xs tracking-wide text-muted-foreground pr-card uppercase">Actions</GlassTableHead>
                                                        </GlassTableRow>
                                                    </GlassTableHeader>
                                                    <TableBody>
                                                        {items.map(item => (
                                                            <GlassTableRow key={item.id} className="hover:bg-muted/50 transition-colors border-b border-border last:border-0 group">
                                                                <TableCell className="py-card pl-card">
                                                                    <span className="text-sm font-semibold text-on-surface">{item.user_id}</span>
                                                                </TableCell>
                                                                <TableCell className="py-card">
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge className="bg-muted text-muted-foreground border-none rounded-md font-semibold text-[10px] px-2 py-0.5 uppercase">{item.resource_type}</Badge>
                                                                        <span className="text-sm font-medium text-on-surface">{item.resource_name || item.resource_id}</span>
                                                                    </div>
                                                                </TableCell>
                                                                 <TableCell className="py-card">
                                                                    {item.decision ? (
                                                                        <Badge className={cn(
                                                                            "rounded-md font-semibold text-xs px-2 py-0.5 border-none",
                                                                            item.decision === 'approve' ? 'bg-success-subtle text-success' : 'bg-destructive/10 text-destructive'
                                                                        )}>
                                                                            {item.decision}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs font-semibold text-warning">Pending</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-card text-right pr-card">
                                                                     {!item.decision && selectedCampaign.status === 'active' && (
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <Button size="sm" onClick={() => handleAction(item.id, 'approve')} className="h-8 rounded-lg bg-success text-secondary-foreground hover:opacity-90 font-semibold text-xs px-3 shadow-sm border-none">
                                                                                Approve
                                                                            </Button>
                                                                            <Button size="sm" variant="ghost" onClick={() => handleAction(item.id, 'revoke')} className="h-8 rounded-lg text-destructive hover:bg-destructive/10 font-semibold text-xs px-3">
                                                                                Revoke
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                            </GlassTableRow>
                                                        ))}
                                                    </TableBody>
                                                </GlassTable>
                                            </div>
                                        )}
                                    </GlassCardContent>
                                </GlassCard>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-xl border-border bg-muted/30 min-h-[700px]">
                                    <div className="p-card bg-card rounded-xl shadow-sm border border-border flex flex-col items-center text-center max-w-md mx-auto">
                                         <div className="w-14 h-14 bg-secondary/10 rounded-xl flex items-center justify-center mb-4">
                                            <Target className="h-6 w-6 text-secondary" />
                                        </div>
                                        <h3 className="text-base font-bold tracking-tight text-on-surface mb-2">Select a campaign</h3>
                                        <p className="text-sm font-medium text-muted-foreground leading-relaxed max-w-xs">Choose a campaign from the list to view its details and items.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="col-span-full max-w-4xl mx-auto w-full space-y-page">
                        <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                            <GlassCardHeader className="bg-secondary p-card text-secondary-foreground">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-secondary-foreground/10 rounded-lg">
                                        <ShieldCheck className="w-5 h-5 text-secondary-foreground" />
                                    </div>
                                     <div>
                                        <GlassCardTitle className="text-lg font-bold tracking-tight text-secondary-foreground">Review portal</GlassCardTitle>
                                        <p className="text-secondary-foreground/80 text-sm mt-0.5">Review and certify access for users assigned to you.</p>
                                    </div>
                                </div>
                            </GlassCardHeader>
                            <GlassCardContent className="p-card space-y-page">
                                 <div className="flex flex-col md:flex-row gap-card max-w-2xl">
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-xs font-semibold tracking-wide text-muted-foreground">Your user ID</Label>
                                        <Input
                                            placeholder="Enter user ID"
                                            className="h-10 font-mono text-sm border border-border rounded-lg bg-card px-4 focus:ring-secondary/20"
                                            value={reviewerId}
                                            onChange={(e) => setReviewerId(e.target.value)}
                                        />
                                    </div>
                                     <Button
                                        className="h-10 rounded-lg px-6 bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm self-end"
                                        onClick={() => loadMyReviews(reviewerId)}
                                    >
                                        <Search className="mr-1.5 h-4 w-4" /> View my reviews
                                    </Button>
                                </div>

                                <div className="border border-border rounded-xl overflow-hidden shadow-sm">
                                    {myReviewItems.length === 0 ? (
                                         <div className="py-16 text-center text-sm font-medium text-muted-foreground">
                                            No reviews assigned to this user ID.
                                        </div>
                                    ) : (
                                        <GlassTable>
                                             <GlassTableHeader>
                                                <GlassTableRow className="hover:bg-transparent border-b border-border">
                                                    <GlassTableHead className="py-3 pl-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Resource</GlassTableHead>
                                                    <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground uppercase">User</GlassTableHead>
                                                    <GlassTableHead className="py-3 text-right pr-card font-semibold text-xs tracking-wide text-muted-foreground uppercase">Decisions</GlassTableHead>
                                                </GlassTableRow>
                                            </GlassTableHeader>
                                            <TableBody>
                                                {myReviewItems.map(item => (
                                                    <GlassTableRow key={item.id} className="border-b border-border last:border-0 group hover:bg-muted/50 transition-colors">
                                                        <TableCell className="py-card pl-card">
                                                             <div className="flex flex-col">
                                                                <span className="text-sm font-semibold tracking-tight text-on-surface">{item.resource_name || item.resource_id}</span>
                                                                <span className="text-xs font-medium text-muted-foreground mt-0.5">{item.resource_type}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-card font-mono text-sm text-muted-foreground">
                                                            {item.user_id}
                                                        </TableCell>
                                                         <TableCell className="py-card pr-card text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button className="h-8 rounded-lg bg-success text-secondary-foreground font-semibold text-xs px-4 shadow-sm border-none" onClick={() => handleMyReviewAction(item, 'approve')}>
                                                                    Approve
                                                                </Button>
                                                                <Button className="h-8 rounded-lg bg-destructive text-secondary-foreground font-semibold text-xs px-4 shadow-sm border-none" onClick={() => handleMyReviewAction(item, 'revoke')}>
                                                                    Revoke
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </GlassTableRow>
                                                ))}
                                            </TableBody>
                                        </GlassTable>
                                    )}
                                </div>
                            </GlassCardContent>
                        </GlassCard>
                    </div>
                )}
            </div>
        </div>
        </PageLayout>
    );
}
