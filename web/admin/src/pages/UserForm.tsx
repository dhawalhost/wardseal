import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    getSCIMUser, 
    createSCIMUser, 
    updateSCIMUser, 
    getGroups, 
    getOrganizations,
    requestPasswordSetupLink
} from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    Save, 
    X, 
    User, 
    Users, 
    Building2, 
    Mail, 
    ShieldCheck, 
    Globe, 
    ArrowLeft,
    CheckCircle2,
    Info,
    Layout,
    KeyRound
} from 'lucide-react';
import { PageHeader, GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent, GlassCardDescription, PageLayout
} from '@/components/layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function UserForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const isEdit = !!id;

    const [loading, setLoading] = useState(isEdit);
    const [submitting, setSubmitting] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    const [orgs, setOrgs] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        userName: '',
        displayName: '',
        active: true,
        primaryEmail: '',
        externalId: '',
        department: '',
        title: '',
        timezone: '',
        primaryPhone: '',
        organizationId: '',
        groups: [] as string[],
        password: '',
        sendInvite: true
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [groupsData, orgsData] = await Promise.all([
                    getGroups(),
                    getOrganizations()
                ]);
                setGroups(groupsData.groups || groupsData.Resources || []);
                setOrgs(orgsData.organizations || []);

                if (isEdit) {
                    const user = await getSCIMUser(id);
                    setFormData(prev => ({
                        ...prev,
                        userName: user.userName || '',
                        displayName: user.displayName || '',
                        active: user.active ?? true,
                        primaryEmail: user.emails?.[0]?.value || '',
                        externalId: user.externalId || '',
                        department: user.department || '',
                        title: user.title || '',
                        timezone: user.timezone || '',
                        primaryPhone: user.phoneNumbers?.[0]?.value || '',
                        organizationId: user['urn:ietf:params:scim:schemas:extension:wardseal:2.0:User']?.organizationId || '',
                        groups: user.groups?.map((g: any) => g.value) || []
                    }));
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load identity metadata.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, isEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const payload = {
            schemas: ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:wardseal:2.0:User"],
            userName: formData.userName,
            displayName: formData.displayName,
            externalId: formData.externalId,
            active: formData.active,
            emails: [{ value: formData.primaryEmail, primary: true }],
            phoneNumbers: formData.primaryPhone ? [{ value: formData.primaryPhone, primary: true, type: 'work' }] : [],
            title: formData.title,
            timezone: formData.timezone,
            groups: formData.groups.map(gid => ({ value: gid })),
            "urn:ietf:params:scim:schemas:extension:wardseal:2.0:User": {
                organizationId: formData.organizationId,
                department: formData.department
            }
        };

        try {
            let user;
            if (isEdit) {
                user = await updateSCIMUser(id, {
                    ...payload,
                    password: formData.password || undefined
                });
            } else {
                user = await createSCIMUser({
                    ...payload,
                    password: formData.password || undefined
                });
                
                if (formData.sendInvite && user?.id) {
                    await requestPasswordSetupLink(user.id, 'invite', 72, true);
                }
            }
            navigate('/users');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to persist identity state.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendSetupLink = async () => {
        if (!id) return;
        setLoading(true);
        try {
            await requestPasswordSetupLink(id, 'invite', 72, true);
            toast({
                title: "Invitation Sent",
                description: `Password setup link has been sent to ${formData.primaryEmail}`,
            });
        } catch (error) {
            console.error('Error sending setup link:', error);
            toast({
                title: "Error",
                description: "Failed to send password setup link.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (groupId: string) => {
        setFormData(prev => ({
            ...prev,
            groups: prev.groups.includes(groupId)
                ? prev.groups.filter(id => id !== groupId)
                : [...prev.groups, groupId]
        }));
    };

    if (loading) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>;

    return (
        <PageLayout>
        <div className="max-w-5xl mx-auto space-y-page animate-in fade-in duration-300">
            <PageHeader
                icon={<User className="w-6 h-6 text-secondary" />}
                title={isEdit ? "Edit User" : "Add User"}
                description={isEdit ? "Update user details and their group memberships." : "Add a new user to your organization."}
                actions={
                    <Button 
                        variant="outline" 
                        onClick={() => navigate('/users')}
                        className="h-9 rounded-lg bg-card border border-border font-semibold text-[13px] px-6 shadow-sm transition-all hover:bg-muted/50"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                }
            />

            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <Alert variant="destructive" className="rounded-lg border border-destructive/20 bg-destructive/5 text-destructive animate-in slide-in-from-top-2">
                        <AlertDescription className="font-semibold text-sm flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4" />
                            Error: {error}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-card">
                    <div className="lg:col-span-12 space-y-page">
                        <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                            <GlassCardHeader className="py-5 px-6 border-b border-border">
                                <div className="flex items-center gap-6">
                                    <div className="p-2.5 bg-secondary/10 rounded-lg text-secondary">
                                        <Layout className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <GlassCardTitle className="text-xl font-bold tracking-tight text-on-surface">Core Information</GlassCardTitle>
                                        <p className="text-muted-foreground font-medium text-[10px] tracking-tight mt-1">Basic user details.</p>
                                    </div>
                                </div>
                            </GlassCardHeader>
                            <GlassCardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                            <Mail className="w-3 h-3" />
                                            Username (Email)
                                        </Label>
                                        <Input
                                            value={formData.userName}
                                            onChange={e => setFormData({ ...formData, userName: e.target.value })}
                                            placeholder="e.g. j.doe@wardseal.io"
                                            className="h-10 rounded-lg bg-muted/30 border border-border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-[13px] px-4"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                            <User className="w-3 h-3" />
                                            Display Name
                                        </Label>
                                        <Input
                                            value={formData.displayName}
                                            onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                            placeholder="e.g. John Doe"
                                            className="h-10 rounded-lg bg-muted/30 border border-border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-[13px] px-4"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                            <Globe className="w-3 h-3" />
                                            Contact Email
                                        </Label>
                                        <Input
                                            type="email"
                                            value={formData.primaryEmail}
                                            onChange={e => setFormData({ ...formData, primaryEmail: e.target.value })}
                                            placeholder="e.g. john.doe@provider.com"
                                            className="h-10 rounded-lg bg-muted/30 border border-border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-[13px] px-4"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                            <ShieldCheck className="w-3 h-3" />
                                            External ID (IdP Reference)
                                        </Label>
                                        <Input
                                            value={formData.externalId}
                                            onChange={e => setFormData({ ...formData, externalId: e.target.value })}
                                            placeholder="e.g. OKTA-12345"
                                            className="h-10 rounded-lg bg-muted/30 border border-border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-[13px] px-4"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                            <Building2 className="w-3 h-3" />
                                            Department
                                        </Label>
                                        <Input
                                            value={formData.department}
                                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                                            placeholder="e.g. Engineering"
                                            className="h-10 rounded-lg bg-muted/30 border border-border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-[13px] px-4"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                            <Info className="w-3 h-3" />
                                            Job Title
                                        </Label>
                                        <Input
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="e.g. Senior Architect"
                                            className="h-10 rounded-lg bg-muted/30 border border-border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-[13px] px-4"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                            <Globe className="w-3 h-3" />
                                            Timezone
                                        </Label>
                                        <Input
                                            value={formData.timezone}
                                            onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                                            placeholder="e.g. America/Los_Angeles"
                                            className="h-10 rounded-lg bg-muted/30 border border-border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-[13px] px-4"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                            <Globe className="w-3 h-3" />
                                            Work Phone
                                        </Label>
                                        <Input
                                            value={formData.primaryPhone}
                                            onChange={e => setFormData({ ...formData, primaryPhone: e.target.value })}
                                            placeholder="e.g. +1-555-010-999"
                                            className="h-10 rounded-lg bg-muted/30 border border-border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-[13px] px-4"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                            <ShieldCheck className="w-3 h-3" />
                                            Account Status
                                        </Label>
                                        <div className="h-10 rounded-lg bg-muted/30 border border-border px-4 flex items-center justify-between group">
                                            <span className="text-[13px] font-bold tracking-tight text-muted-foreground">Active Account</span>
                                            <Switch
                                                checked={formData.active}
                                                onCheckedChange={checked => setFormData({ ...formData, active: checked })}
                                                className="data-[state=checked]:bg-success scale-75"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                            <ShieldCheck className="w-3 h-3" />
                                            {isEdit ? 'Change Password (Optional)' : 'Initial Password (Optional)'}
                                        </Label>
                                        <Input
                                            type="password"
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            placeholder={isEdit ? "Leave blank to keep current" : "Leave blank for random"}
                                            className="h-10 rounded-lg bg-muted/30 border border-border focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold text-[13px] px-4"
                                        />
                                    </div>
                                    {!isEdit && (
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                                <Mail className="w-3 h-3" />
                                                Setup Workflow
                                            </Label>
                                            <div className="h-10 rounded-lg bg-muted/30 border border-border px-4 flex items-center justify-between group">
                                                <span className="text-[13px] font-bold tracking-tight text-muted-foreground">Send Invitation Email</span>
                                                <Switch
                                                    checked={formData.sendInvite}
                                                    onCheckedChange={checked => setFormData({ ...formData, sendInvite: checked })}
                                                    className="data-[state=checked]:bg-primary scale-75"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {isEdit && (
                                        <div className="space-y-2 pt-4 border-t border-border">
                                            <Label className="text-[10px] font-bold tracking-tight text-muted-foreground ml-1 flex items-center gap-2">
                                                <KeyRound className="w-3 h-3" />
                                                Password Management
                                            </Label>
                                            <div className="flex gap-4">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="flex-1 h-10 rounded-lg bg-muted/30 border border-border hover:bg-primary/5 hover:ring-primary/20 transition-all font-bold text-[13px]"
                                                    onClick={handleSendSetupLink}
                                                    disabled={loading}
                                                >
                                                    <Mail className="w-4 h-4 mr-2" />
                                                    Send Setup Email
                                                </Button>
                                            </div>
                                            <p className="text-[9px] text-muted-foreground font-medium ml-1">
                                                This will send a secure link to the user's email to set their own password.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </GlassCardContent>
                        </GlassCard>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-card">
                            <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                                <GlassCardHeader className="py-5 px-6 border-b border-border">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-secondary/10 rounded-lg text-secondary">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <GlassCardTitle className="text-lg font-bold tracking-tight text-on-surface">Organization</GlassCardTitle>
                                            <p className="text-muted-foreground font-medium text-[10px] tracking-tight mt-0.5">Assign user to an organization.</p>
                                        </div>
                                    </div>
                                </GlassCardHeader>
                                <GlassCardContent className="p-6 space-y-3">
                                    {orgs.map(org => (
                                        <div 
                                            key={org.id} 
                                            onClick={() => setFormData({ ...formData, organizationId: org.id })}
                                            className={`p-3 rounded-lg cursor-pointer transition-all border flex items-center justify-between group ${formData.organizationId === org.id 
                                                ? 'bg-primary/5 border-primary/20 shadow-sm' 
                                                : 'bg-card border-border hover:border-primary/10'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2.5 h-2.5 rounded-full transition-all ${formData.organizationId === org.id ? 'bg-primary scale-110' : 'bg-on-surface/10'}`} />
                                                <div className="flex flex-col">
                                                    <span className={`text-[13px] font-bold tracking-tight transition-colors ${formData.organizationId === org.id ? 'text-primary' : 'text-on-surface'}`}>{org.name}</span>
                                                    <span className="text-[9px] font-mono text-muted-foreground tracking-tight">ID: {org.id.substring(0, 10)}</span>
                                                </div>
                                            </div>
                                            {formData.organizationId === org.id && <CheckCircle2 className="w-4 h-4 text-primary animate-in zoom-in-50" />}
                                        </div>
                                    ))}
                                    {orgs.length === 0 && (
                                        <div className="py-8 text-center text-muted-foreground italic text-xs font-medium">No organizations registered.</div>
                                    )}
                                </GlassCardContent>
                            </GlassCard>

                            <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                                <GlassCardHeader className="py-5 px-6 border-b border-border">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-secondary/10 rounded-lg text-secondary">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <GlassCardTitle className="text-lg font-bold tracking-tight text-on-surface">Group Memberships</GlassCardTitle>
                                            <p className="text-muted-foreground font-medium text-[10px] tracking-tight mt-0.5">Assign user to security groups.</p>
                                        </div>
                                    </div>
                                </GlassCardHeader>
                                <GlassCardContent className="p-6">
                                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {groups.map(group => (
                                            <div 
                                                key={group.id} 
                                                onClick={() => toggleGroup(group.id)}
                                                className={`p-3 rounded-lg cursor-pointer transition-all border flex items-center justify-between group ${formData.groups.includes(group.id) 
                                                    ? 'bg-primary/5 border-primary/20 shadow-sm' 
                                                    : 'bg-card border-border hover:border-primary/10'}`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className={`text-[13px] font-bold tracking-tight transition-colors ${formData.groups.includes(group.id) ? 'text-primary' : 'text-on-surface'}`}>{group.displayName}</span>
                                                    <span className="text-[9px] font-medium text-muted-foreground tracking-tight mt-0.5">{group.members?.length || 0} members</span>
                                                </div>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${formData.groups.includes(group.id) 
                                                    ? 'bg-primary border-primary text-primary-foreground' 
                                                    : 'bg-card border-on-surface/10 group-hover:border-primary/30'}`}>
                                                    {formData.groups.includes(group.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </div>
                                            </div>
                                        ))}
                                        {groups.length === 0 && (
                                            <div className="py-8 text-center text-muted-foreground italic text-xs font-medium">No authorization groups defined.</div>
                                        )}
                                    </div>
                                </GlassCardContent>
                            </GlassCard>
                        </div>

                        <div className="pt-6 flex gap-4">
                            <Button 
                                type="submit" 
                                disabled={submitting} 
                                className="flex-1 h-10 rounded-lg font-semibold text-sm bg-secondary text-secondary-foreground shadow-sm"
                            >
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                {isEdit ? "Save Changes" : "Create User"}
                            </Button>
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => navigate('/users')}
                                className="h-10 w-10 p-0 rounded-lg border border-border hover:bg-muted/50 transition-all"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
        </PageLayout>
    );
}
