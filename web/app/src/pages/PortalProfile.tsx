import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Shield, Key, Save, Loader2, Fingerprint, Lock, Activity } from 'lucide-react';
import { api } from '../api';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/layout';

const PortalProfile = () => {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [saveMessage, setSaveMessage] = useState('');
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/v1/user/profile');
                const nameParts = (res.data.name || '').split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                setUserProfile({
                    email: res.data.email || '',
                    firstName,
                    lastName,
                });
            } catch (error) {
                console.error('Failed to fetch profile', error);
            }
        };
        fetchProfile();
    }, []);

    const handleSaveProfile = async () => {
        setSaveMessage('');
        if (!newPassword) {
            setSaveMessage('Please enter a new password');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/api/v1/user/profile', { password: newPassword });
            setNewPassword('');
            setSaveMessage('Profile security updated successfully');
        } catch (error: any) {
            setSaveMessage(`Update failed: ${error?.response?.data?.error || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-page max-w-4xl animate-in fade-in duration-500">
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Fingerprint className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">Profile</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-on-surface">Account settings</h1>
                <p className="text-sm text-muted-foreground max-w-xl">
                    Manage your profile details, password, and MFA settings.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-card items-start">
                <GlassCard className="shadow-sm border-border overflow-hidden rounded-xl bg-card">
                    <GlassCardHeader className="bg-muted/40 border-b border-border py-5 px-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary rounded-lg text-primary-foreground shadow-sm">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <GlassCardTitle className="text-lg font-bold tracking-tight text-on-surface leading-none">
                                    Profile
                                </GlassCardTitle>
                                <p className="text-sm text-muted-foreground mt-1.5">Your name and email address.</p>
                            </div>
                        </div>
                    </GlassCardHeader>
                    <GlassCardContent key={userProfile?.email || 'loading'} className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-muted-foreground">First name</Label>
                                <Input
                                    defaultValue={userProfile?.firstName || ''}
                                    className="h-10 rounded-lg border-border bg-background shadow-xs text-sm"
                                    placeholder="First name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-muted-foreground">Last name</Label>
                                <Input
                                    defaultValue={userProfile?.lastName || ''}
                                    className="h-10 rounded-lg border-border bg-background shadow-xs text-sm"
                                    placeholder="Last name"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-muted-foreground">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="email"
                                    className="h-10 pl-10 rounded-lg border-border bg-muted/40 text-sm cursor-not-allowed"
                                    defaultValue={userProfile?.email || ''}
                                    disabled
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Email is managed by your organization.</p>
                        </div>
                    </GlassCardContent>
                </GlassCard>

                <GlassCard className="shadow-sm border-border overflow-hidden rounded-xl bg-card">
                    <GlassCardHeader className="bg-secondary text-secondary-foreground py-5 px-6 relative overflow-hidden border-b-0">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Shield className="w-16 h-16" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="p-2 bg-secondary-foreground/10 rounded-lg border border-secondary-foreground/10">
                                <Lock className="w-5 h-5" />
                            </div>
                            <div>
                                <GlassCardTitle className="text-lg font-bold tracking-tight text-secondary-foreground leading-none">
                                    Security
                                </GlassCardTitle>
                                <p className="text-secondary-foreground/80 text-sm mt-1.5">Password and MFA settings</p>
                            </div>
                        </div>
                    </GlassCardHeader>
                    <GlassCardContent className="p-6 space-y-6">
                        <div className="flex flex-col md:flex-row items-center gap-4 p-5 rounded-lg bg-muted/40 border border-dashed border-border">
                            <div className="flex-1 space-y-2 w-full">
                                <Label className="text-sm font-semibold text-muted-foreground">New password</Label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="password"
                                        placeholder="Enter a new password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="h-10 pl-10 rounded-lg border-border bg-card shadow-xs text-sm"
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="h-10 bg-primary text-primary-foreground hover:opacity-90 rounded-lg px-6 font-semibold text-sm shadow-sm"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Update password
                            </Button>
                        </div>

                        {saveMessage && (
                            <div
                                className={`p-4 rounded-lg text-sm font-medium flex items-center gap-3 ${
                                    saveMessage.includes('successful')
                                        ? 'bg-success-subtle text-success border border-success/20'
                                        : 'bg-destructive/10 text-destructive border border-destructive/20'
                                }`}
                            >
                                <Activity className="h-4 w-4" />
                                {saveMessage}
                            </div>
                        )}

                        <Separator className="bg-border" />

                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-lg border border-dashed border-border">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-lg">
                                    <Shield className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-on-surface">Multi-factor authentication</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">Add a second verification step at sign-in</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="h-9 border-border font-semibold text-sm rounded-lg px-5"
                                onClick={() => navigate('/mfa')}
                            >
                                Configure MFA
                            </Button>
                        </div>
                    </GlassCardContent>
                </GlassCard>
            </div>
        </div>
    );
};

export default PortalProfile;
