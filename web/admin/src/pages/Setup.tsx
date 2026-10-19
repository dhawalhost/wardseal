import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { performSetup, getSetupStatus } from '../api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ShieldCheck, Loader2, Key } from "lucide-react";
import { 
    GlassCard, 
    GlassCardHeader, 
    GlassCardTitle, 
    GlassCardContent,
    GlassCardDescription
} from '@/components/layout';

const Setup: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const status = await getSetupStatus();
                if (!status.setup_required) {
                    navigate('/login');
                }
            } catch (err) {
                console.error("Failed to check setup status", err);
            } finally {
                setChecking(false);
            }
        };
        checkStatus();
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setLoading(true);
        try {
            const resp = await performSetup(email, password);
            localStorage.setItem('token', resp.token);
            localStorage.setItem('tenantID', resp.tenant_id || 'admin-system');
            localStorage.setItem('tenantSlug', resp.tenant_slug || 'admin');

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.error || "Setup failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-in fade-in duration-300 flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Checking setup status…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background px-6 py-12">
            <div className="w-full max-w-[420px] space-y-page animate-in fade-in duration-300">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="w-14 h-14 bg-secondary rounded-lg flex items-center justify-center shadow-sm">
                            <ShieldCheck className="w-7 h-7 text-secondary-foreground" />
                        </div>
                    </div>
                </div>

                <GlassCard className="border border-border shadow-sm bg-card overflow-hidden rounded-lg">
                    <GlassCardHeader className="pt-card pb-4 px-card text-center">
                        <GlassCardTitle className="text-2xl font-bold tracking-tight">Initial Setup</GlassCardTitle>
                        <div className="h-1 w-10 bg-secondary mx-auto mt-4 mb-3 rounded-full" />
                        <GlassCardDescription className="text-sm text-muted-foreground">Create the first administrator account</GlassCardDescription>
                    </GlassCardHeader>
                    <form onSubmit={handleSubmit}>
                        <GlassCardContent className="px-card pb-card space-y-6">
                            {error && (
                                <div className="p-4 bg-destructive/5 text-destructive rounded-lg flex items-center gap-3 border border-destructive/20">
                                    <AlertCircle className="h-5 w-5 shrink-0" />
                                    <span className="text-sm font-semibold">{error}</span>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@company.com"
                                    className="h-11 rounded-lg border border-border bg-card font-medium text-sm focus-visible:ring-2 focus-visible:ring-secondary/20"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Password</Label>
                                <div className="relative group">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-secondary transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="At least 8 characters"
                                        className="h-11 pl-10 rounded-lg border border-border bg-card font-medium text-sm focus-visible:ring-2 focus-visible:ring-secondary/20"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirm password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Re-enter password"
                                    className="h-11 rounded-lg border border-border bg-card font-medium text-sm focus-visible:ring-2 focus-visible:ring-secondary/20"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="pt-2 space-y-4">
                                <Button type="submit" className="w-full h-11 rounded-lg font-semibold text-sm bg-secondary text-secondary-foreground shadow-sm" disabled={loading}>
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete setup"}
                                </Button>
                                
                                <p className="text-xs text-center font-medium text-muted-foreground leading-relaxed">
                                    This account will have full administrative access.
                                </p>
                            </div>
                        </GlassCardContent>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};

export default Setup;
