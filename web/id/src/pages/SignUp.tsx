import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { resolveManageConsoleUrl, seedSessionFromAuthResponse } from '@wardseal/shared';
import { signup } from '../api';
import Config from '../config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ArrowRight, Building, Lock, Mail, Loader2, Fingerprint, Activity } from 'lucide-react';
import {
    GlassCard,
    GlassCardTitle,
    GlassCardDescription
} from '@/components/layout';

const SignUp: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const policyBaseUrl = window.location.hostname.endsWith('.local')
        ? 'http://wardseal.local'
        : 'https://wardseal.com';
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const plan = searchParams.get('plan') || 'free';

    if (!Config.features.publicSignup) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <GlassCard className="w-full max-w-md shadow-sm border-border bg-card text-center p-10 rounded-xl">
                    <div className="mx-auto w-10 h-10 flex items-center justify-center bg-muted rounded-xl mb-6">
                        <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <GlassCardTitle className="mb-3 text-2xl font-bold tracking-tight">Registration disabled</GlassCardTitle>
                    <GlassCardDescription className="mb-8">
                        Public registration is currently disabled on this server.
                    </GlassCardDescription>
                    <Button variant="outline" className="h-11 px-6 rounded-lg font-semibold text-sm border-border" onClick={() => navigate('/login')}>
                        Return to login
                    </Button>
                </GlassCard>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await signup(email, password, companyName, plan);
            // Org founder is minted as super-admin; JWT roles aren't in the JSON body.
            seedSessionFromAuthResponse(
                { ...data, roles: data.roles ?? ['super-admin'] },
                email
            );
            // Founder next step is admin console (portal app launcher starts empty).
            window.location.assign(resolveManageConsoleUrl());
            return;
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 409) {
                setError("Domain segment already assigned.");
            } else {
                setError(err.response?.data?.error_description || err.response?.data?.error || 'Initialization failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-card font-sans selection:bg-primary/10">
            {/* Left Side: Brand & Visual — explicit white text for WCAG contrast on navy */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 xl:p-16 bg-[#0F172A] text-white">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] rounded-full bg-[#0369A1]/25 blur-[100px]" />
                </div>

                <div className="relative z-10">
                    <Link to="/" className="flex items-center gap-3 text-white hover:opacity-90 transition-opacity">
                        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 border border-white/10">
                            <img src="/wardseal.svg" alt="" className="w-6 h-6 object-contain brightness-0 invert" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">WardSeal</span>
                    </Link>
                </div>

                <div className="relative z-10 space-y-8">
                    <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.15] text-white">
                        The foundation for modern identity trust
                    </h1>
                    <div className="space-y-5">
                        {[
                            { icon: <ShieldCheck className="w-5 h-5" />, text: "Enterprise SSO with OIDC & SAML 2.0" },
                            { icon: <Fingerprint className="w-5 h-5" />, text: "Passkey & biometric authentication" },
                            { icon: <Activity className="w-5 h-5" />, text: "Automated governance & access reviews" }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 text-slate-200">
                                <div className="p-2.5 rounded-lg border border-white/20 bg-white/5 text-sky-300">{item.icon}</div>
                                <span className="text-base font-medium text-slate-200">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 flex flex-wrap gap-3 text-xs font-semibold text-slate-300">
                    <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5">Free org signup</span>
                    <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5">Admin console included</span>
                </div>
            </div>

            {/* Right Side: Signup Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 xl:px-32 py-12">
                <div className="w-full max-w-md mx-auto">
                    {/* Mobile Logo Only */}
                    <div className="lg:hidden mb-12 flex justify-center">
                        <img src="/wardseal.svg" alt="WardSeal" className="w-12 h-12" />
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-on-surface">Create your account</h2>
                        <p className="text-sm text-muted-foreground mt-2">Get started with your free organization</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="companyName" className="text-sm font-semibold text-on-surface ml-1">Company name</Label>
                            <div className="relative group">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="companyName"
                                    placeholder="Acme Corp"
                                    className="h-14 pl-12 rounded-xl border-border bg-background/50 focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-base"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-semibold text-on-surface ml-1">Work email</Label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    className="h-14 pl-12 rounded-xl border-border bg-background/50 focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-base"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold text-on-surface ml-1">Create password</Label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••••••"
                                    minLength={12}
                                    className="h-14 pl-12 rounded-xl border-border bg-background/50 focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-base"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <p className="text-xs text-muted-foreground ml-1">
                                At least 12 characters, with upper, lower, number, and special character.
                            </p>
                        </div>

                        <Button type="submit" className="w-full h-12 rounded-lg bg-secondary text-secondary-foreground font-semibold text-base shadow-sm hover:opacity-90 transition-opacity group" disabled={loading}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>Create organization <ArrowRight className="ml-2 w-5 h-5" /></>
                            )}
                        </Button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-sm font-medium text-on-surface-variant">
                            Already have an account? <Link to="/login" className="text-primary font-bold hover:underline decoration-2 underline-offset-4">Sign in</Link>
                        </p>
                    </div>

                    <div className="mt-16 pt-8 border-t border-border flex justify-center gap-8">
                        <a href="#" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
                        <a href="#" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">Terms of Service</a>
                        <a href="#" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">Support</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
