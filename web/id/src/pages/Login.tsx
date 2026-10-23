import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { login, getBranding, completeMfaLogin, lookupUser, beginLogin, finishLogin, getSetupStatus, api, getPublicSSOProviders } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Fingerprint, ArrowRight, User as UserIcon, Lock, ShieldAlert, Loader2 } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { v4 as uuidv4 } from 'uuid';
import {
    GlassCard,
    GlassCardHeader,
    GlassCardTitle,
    GlassCardContent,
    GlassCardDescription,
} from '@dhawalhost/wardseal-ui-kit';
import { navigateSafeRedirect, resolveSafeRedirect, seedSessionFromAuthResponse } from '@wardseal/shared';

const Login: React.FC = () => {
    const policyBaseUrl = window.location.hostname.endsWith('.local')
        ? 'http://wardseal.local'
        : 'https://wardseal.com';

    const getDeviceID = () => {
        let deviceID = localStorage.getItem('deviceID');
        if (!deviceID) {
            deviceID = uuidv4();
            localStorage.setItem('deviceID', deviceID);
        }
        return deviceID;
    };

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { tenantID: pathTenantID } = useParams();

    // Config State
    const [tenantID, setTenantID] = useState(() => {
        return pathTenantID || searchParams.get('tenant') || '';
    });

    const [branding, setBranding] = useState<{
        logo_url?: string;
        primary_color?: string;
        background_color?: string;
        css_override?: string;
        tenant_name?: string;
        tenant_slug?: string;
    }>({});

    const [ssoProviders, setSsoProviders] = useState<any[]>([]);

    // Login Flow State
    const [step, setStep] = useState<'identifier' | 'challenge'>('identifier');
    const [email, setEmail] = useState('');
    const [userID, setUserID] = useState('');
    const [webAuthnEnabled, setWebAuthnEnabled] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // MFA State
    const [mfaRequired, setMfaRequired] = useState(false);
    const [pendingToken, setPendingToken] = useState('');
    const [mfaUserId, setMfaUserId] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [mfaEnrolled, setMfaEnrolled] = useState(true);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [enrolling, setEnrolling] = useState(false);

    const fetchBranding = async (tid: string) => {
        if (!tid) return;
        try {
            const config = await getBranding(tid);
            setBranding(config);
            if (config.css_override) {
                // Remove any existing dynamic style tags for this tenant to avoid duplicates
                const existingStyle = document.getElementById('tenant-css-override');
                if (existingStyle) {
                    existingStyle.remove();
                }
                const style = document.createElement('style');
                style.id = 'tenant-css-override';
                style.innerHTML = config.css_override;
                document.head.appendChild(style);
            }
        } catch (err) {
            console.log("Using default branding/tenant not found");
            setBranding({});
        }
    };

    const fetchSSOProviders = async (tid: string) => {
        if (!tid) return;
        try {
            const providers = await getPublicSSOProviders(tid);
            setSsoProviders(providers || []);
        } catch (err) {
            console.error("Failed to fetch SSO providers", err);
        }
    };

    const handleSocialLogin = (providerName: string) => {
        if (!tenantID) return;
        // Redirect to the backend authorize endpoint
        const authBase =
            import.meta.env.VITE_AUTH_URL ||
            import.meta.env.VITE_AUTHSVC_URL ||
            import.meta.env.VITE_API_URL ||
            '';
        window.location.href = `${authBase}/sso/login/${providerName}?tenant_id=${tenantID}`;
    };

    useEffect(() => {
        const bounceKey = 'wardseal_login_bounce';

        const checkSession = async () => {
            try {
                // Same-origin profile (id nginx → authsvc) so cookie Domain visibility
                // matches portal AuthGuard; avoids auth.*-only host cookie asymmetry.
                const { data: user } = await api.get('/api/v1/user/profile', {
                    baseURL: window.location.origin,
                });
                if (!(user && user.id)) {
                    return;
                }

                const redirectUri =
                    searchParams.get('redirect_uri') ||
                    localStorage.getItem('login_redirect_uri') ||
                    '';
                // Break AuthGuard ↔ login loops: if we already bounced to this
                // redirect_uri once this tab, stay on login for a fresh auth.
                if (redirectUri && sessionStorage.getItem(bounceKey) === redirectUri) {
                    sessionStorage.removeItem(bounceKey);
                    console.warn('Auth redirect loop detected; staying on login');
                    return;
                }
                if (redirectUri) {
                    sessionStorage.setItem(bounceKey, redirectUri);
                }

                console.log('Existing session found, redirecting...');
                await performRedirection();
            } catch {
                sessionStorage.removeItem(bounceKey);
                console.log('No active session found');
            }
        };

        const checkSetupStatus = async () => {
            try {
                const status = await getSetupStatus();
                if (status.setup_required) {
                    navigate('/setup');
                } else {
                    checkSession();
                }
            } catch (err) {
                console.error('Failed to check setup status', err);
            }
        };
        checkSetupStatus();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only session probe
    }, [navigate]);

    useEffect(() => {
        if (tenantID) {
            fetchBranding(tenantID);
            fetchSSOProviders(tenantID);
            localStorage.setItem('tenantID', tenantID);
            
            const searchParams = new URLSearchParams(location.search);
            const redirectUri = searchParams.get('redirect_uri');
            if (redirectUri && resolveSafeRedirect(redirectUri)) {
                localStorage.setItem('login_redirect_uri', redirectUri);
            }
        }
    }, [tenantID, location.search]);


    const performRedirection = async () => {
        const fromQuery = searchParams.get('redirect_uri');
        const fromStorage = localStorage.getItem('login_redirect_uri');
        localStorage.removeItem('login_redirect_uri');
        const redirectUri = fromQuery || fromStorage;
        if (resolveSafeRedirect(redirectUri)) {
            navigateSafeRedirect(redirectUri, '/portal');
            return;
        }
        navigate('/portal');
    };

    const handleIdentifierSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (tenantID) {
            localStorage.setItem('tenantID', tenantID);
        } else {
            localStorage.removeItem('tenantID');
        }

        if (!email) {
            setError('Email is required');
            setLoading(false);
            return;
        }

        try {
            const lookup = await lookupUser(email);
            setUserID(lookup.user_id);
            setWebAuthnEnabled(lookup.webauthn_enabled);

            if (lookup.tenant_id) {
                setTenantID(lookup.tenant_id);
                localStorage.setItem('tenantID', lookup.tenant_id);
            }
            if (lookup.tenant_slug) {
                localStorage.setItem('tenantSlug', lookup.tenant_slug);
            }

            setStep('challenge');

        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 404) {
                setError("Account not found");
            } else {
                setError('Failed to find account');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const deviceID = getDeviceID();
            let osVersion = undefined;
            if ((navigator as any).userAgentData && (navigator as any).userAgentData.getHighEntropyValues) {
                try {
                    const uaValues = await (navigator as any).userAgentData.getHighEntropyValues(['platformVersion']);
                    if (uaValues.platformVersion) {
                        osVersion = uaValues.platformVersion;
                    }
                } catch (e) {
                    console.warn("Failed to get high entropy values", e);
                }
            }

            const data = await login(email, password, deviceID, osVersion);

            if (data.mfa_required) {
                setMfaRequired(true);
                setPendingToken(data.pending_token);
                setMfaUserId(data.user_id);
                setMfaEnrolled(data.mfa_enrolled !== false);
                setLoading(false);
                
                if (data.mfa_enrolled === false) {
                    // Do not write pending/step-up JWT into localStorage.token —
                    // AuthGuard/API would prefer it over the real session cookie.
                    try {
                        const response = await api.post(
                            '/api/v1/mfa/totp/enroll',
                            { user_id: data.user_id },
                            { headers: { Authorization: `Bearer ${data.pending_token}` } }
                        );
                        setQrCode(response.data.qr_code);
                        setSecret(response.data.secret);
                    } catch (err) {
                        console.error("Failed to enroll MFA", err);
                        setError('Failed to initialize MFA setup');
                    }
                }
                return;
            }

            seedSessionFromAuthResponse(data, email);
            sessionStorage.removeItem('wardseal_login_bounce');

            await performRedirection();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error_description || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    const handlePasskeyLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const options = await beginLogin(userID);
            const creds = await startAuthentication(options);
            const data = await finishLogin(userID, creds);

            seedSessionFromAuthResponse(data, email);
            sessionStorage.removeItem('wardseal_login_bounce');

            await performRedirection();
        } catch (err: any) {
            console.error(err);
            setError('Passkey authentication failed');
            setLoading(false);
        }
    };

    const handleMfaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await completeMfaLogin(pendingToken, totpCode, mfaUserId);
            seedSessionFromAuthResponse(data, email);
            sessionStorage.removeItem('wardseal_login_bounce');

            await performRedirection();
        } catch (err: any) {
            console.error(err);
            setError('Invalid TOTP code');
            setLoading(false);
        }
    };
    const handleMfaSetupVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post(
                '/api/v1/mfa/totp/verify',
                { user_id: mfaUserId, code: totpCode },
                { headers: { Authorization: `Bearer ${pendingToken}` } }
            );
            const data = await completeMfaLogin(pendingToken, totpCode, mfaUserId);

            seedSessionFromAuthResponse(data, email);
            sessionStorage.removeItem('wardseal_login_bounce');

            await performRedirection();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Invalid TOTP code or setup failure');
            setLoading(false);
        }
    };
    if (mfaRequired) {
        if (!mfaEnrolled) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-background px-6">
                    <GlassCard className="w-full max-w-[450px] shadow-sm border-border bg-card overflow-hidden rounded-xl animate-in fade-in duration-500">
                        <GlassCardHeader className="pt-10 pb-4 px-8 text-center border-b border-border">
                            <div className="mx-auto w-10 h-10 bg-primary rounded-xl flex items-center justify-center mb-5 shadow-sm">
                                <ShieldCheck className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <GlassCardTitle className="text-2xl font-bold tracking-tight">Set up MFA</GlassCardTitle>
                            <GlassCardDescription className="mt-2">
                                Multi-factor authentication is required to access the platform
                            </GlassCardDescription>
                        </GlassCardHeader>
                        <GlassCardContent className="px-8 pb-10">
                            <form onSubmit={handleMfaSetupVerify} className="space-y-6">
                                <div className="flex flex-col items-center justify-center gap-5">
                                    {qrCode ? (
                                        <div className="bg-card p-4 rounded-xl border border-border flex justify-center shadow-sm max-w-[200px]">
                                            <img src={`data:image/png;base64,${qrCode}`} alt="TOTP QR Code" className="w-full aspect-square mix-blend-multiply" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-[200px]">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    )}
                                    {secret && (
                                        <div className="text-center space-y-2 w-full bg-muted/40 p-4 rounded-lg border border-border">
                                            <Label className="text-sm font-semibold text-muted-foreground">Manual setup key</Label>
                                            <div className="font-mono text-xs font-semibold tracking-wide select-all text-primary">{secret}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 text-center">
                                    <Label className="text-sm font-semibold text-muted-foreground">Authentication code</Label>
                                    <Input
                                        value={totpCode}
                                        onChange={(e) => setTotpCode(e.target.value)}
                                        placeholder="000000"
                                        className="h-14 text-center text-2xl font-semibold tracking-[0.15em] border-border bg-background rounded-lg shadow-xs"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3 border border-destructive/20">
                                        <ShieldAlert className="w-5 h-5 shrink-0" />
                                        <span className="text-sm font-medium">{error}</span>
                                    </div>
                                )}

                                <Button type="submit" className="w-full h-12 rounded-lg font-semibold text-sm shadow-sm bg-secondary text-secondary-foreground" disabled={loading}>
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify and continue'}
                                </Button>
                            </form>
                        </GlassCardContent>
                    </GlassCard>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-center min-h-screen bg-background px-6">
                <GlassCard className="w-full max-w-[400px] shadow-sm border-border bg-card overflow-hidden rounded-xl animate-in fade-in duration-500">
                    <GlassCardHeader className="pt-10 pb-4 px-8 text-center border-b border-border">
                        <div className="mx-auto w-10 h-10 bg-secondary rounded-xl flex items-center justify-center mb-5 shadow-sm">
                            <ShieldCheck className="w-5 h-5 text-secondary-foreground" />
                        </div>
                        <GlassCardTitle className="text-2xl font-bold tracking-tight">Enter verification code</GlassCardTitle>
                        <GlassCardDescription className="mt-2">
                            Multi-factor authentication is required to continue
                        </GlassCardDescription>
                    </GlassCardHeader>
                    <GlassCardContent className="px-8 pb-10">
                        <form onSubmit={handleMfaSubmit} className="space-y-6">
                            <div className="space-y-3 text-center">
                                <Label className="text-sm font-semibold text-muted-foreground">Authentication code</Label>
                                <Input
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value)}
                                    placeholder="000000"
                                    className="h-14 text-center text-2xl font-semibold tracking-[0.15em] border-border bg-background rounded-lg shadow-xs"
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3 border border-destructive/20">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            )}
                            <Button type="submit" className="w-full h-12 rounded-lg font-semibold text-sm shadow-sm bg-secondary text-secondary-foreground" disabled={loading}>
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
                            </Button>
                        </form>
                    </GlassCardContent>
                </GlassCard>
            </div>
        );
    }

    return (
        <div 
            className="min-h-screen flex flex-col lg:flex-row bg-background text-on-surface selection:bg-primary/20"
        >
            {/* Left Side: Brand & Visual — explicit white text for WCAG contrast on navy */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 xl:p-16 bg-[#0F172A] text-white">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute -top-[20%] -right-[10%] w-[55%] h-[55%] rounded-full bg-[#0369A1]/25 blur-[100px]" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 border border-white/10">
                            <img src={branding.logo_url || "/wardseal.svg"} alt="" className="w-6 h-6 object-contain brightness-0 invert" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">
                            {branding.tenant_name || "WardSeal"}
                        </span>
                    </div>
                </div>

                <div className="relative z-10 max-w-md space-y-5">
                    <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.15] text-white">
                        Enterprise identity for modern workspaces
                    </h1>
                    <p className="text-base text-slate-300 font-medium leading-relaxed">
                        OIDC, SAML, and adaptive MFA with directory sync — built for teams that take access seriously.
                    </p>
                </div>

                <div className="relative z-10 flex flex-wrap gap-3 text-xs font-semibold text-slate-300">
                    <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5">SOC 2 ready</span>
                    <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5">SCIM 2.0</span>
                    <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5">Passkeys + TOTP</span>
                </div>
            </div>

            {/* Right Side: Authentication Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-24 xl:px-32 py-12">
                <div className="w-full max-w-md mx-auto">
                    {/* Mobile Logo Only */}
                    <div className="lg:hidden mb-12 flex justify-center">
                        <img src={branding.logo_url || "/wardseal.svg"} alt="WardSeal" className="w-12 h-12" />
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-on-surface mb-2">
                            {branding.tenant_name ? `Sign in to ${branding.tenant_name}` : "Welcome back"}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {step === 'identifier' 
                                ? 'Enter your email to continue' 
                                : `Sign in as ${email}`}
                        </p>
                    </div>

                    {step === 'identifier' ? (
                        <form onSubmit={handleIdentifierSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-semibold text-on-surface ml-1">Email address</Label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@company.com"
                                        className="h-14 pl-12 rounded-xl border-border bg-background/50 focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-base"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-center gap-3 border border-destructive/20">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <span className="text-sm font-medium">{error}</span>
                                </div>
                            )}

                            <Button 
                                type="submit" 
                                className="w-full h-12 rounded-lg text-primary-foreground font-semibold text-base shadow-sm transition-opacity hover:opacity-90 group" 
                                style={{ backgroundColor: branding.primary_color }}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>Continue <ArrowRight className="ml-2 w-5 h-5" /></>
                                )}
                            </Button>

                            {ssoProviders.length > 0 && (
                                <>
                                    <div className="relative py-4">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-border" />
                                        </div>
                                        <div className="relative flex justify-center text-xs font-semibold">
                                            <span className="bg-background px-4 text-muted-foreground">Or sign in with</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {ssoProviders.map(provider => (
                                            <Button
                                                key={provider.id}
                                                type="button"
                                                variant="outline"
                                                className="w-full h-14 rounded-xl border-border bg-background/50 hover:bg-surface-container transition-all font-bold text-sm shadow-sm"
                                                onClick={() => handleSocialLogin(provider.name)}
                                            >
                                                Sign in with {provider.name}
                                            </Button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </form>
                    ) : (
                        <div className="space-y-6">
                            {webAuthnEnabled && (
                                <Button
                                    type="button"
                                    className="w-full h-14 rounded-xl border-none bg-primary/5 text-primary hover:bg-primary/10 transition-all font-bold flex items-center justify-center gap-3"
                                    onClick={handlePasskeyLogin}
                                    disabled={loading}
                                >
                                    <Fingerprint className="w-5 h-5" />
                                    Sign in with Passkey
                                </Button>
                            )}

                            {webAuthnEnabled && (
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border" />
                                    </div>
                                    <div className="relative flex justify-center text-xs font-semibold">
                                        <span className="bg-background px-4 text-muted-foreground">or use password</span>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handlePasswordLogin} className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <Label htmlFor="password" className="text-sm font-semibold text-on-surface">Password</Label>
                                        <button type="button" onClick={() => setStep('identifier')} className="text-xs font-semibold text-primary hover:opacity-70 transition-opacity">Change email</button>
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="h-14 pl-12 rounded-xl border-border bg-background/50 focus:bg-card focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-base"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoFocus={!webAuthnEnabled}
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-3 border border-destructive/20">
                                        <ShieldAlert className="w-5 h-5 shrink-0" />
                                        <span className="text-sm font-medium">{error}</span>
                                    </div>
                                )}

                                <Button type="submit" className="w-full h-12 rounded-lg bg-secondary text-secondary-foreground font-semibold text-base shadow-sm hover:opacity-90 transition-opacity" disabled={loading}>
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign in'}
                                </Button>
                            </form>
                        </div>
                    )}

                    <div className="mt-12 text-center">
                        <p className="text-sm font-medium text-on-surface-variant">
                            Don't have an account? <a href="/signup" className="text-primary font-bold hover:underline decoration-2 underline-offset-4">Get started</a>
                        </p>
                    </div>

                    <div className="mt-24 pt-8 border-t border-border flex justify-center gap-8">
                        <a href={`${policyBaseUrl}/policies#privacy`} target="_blank" rel="noreferrer" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">Privacy</a>
                        <a href={`${policyBaseUrl}/policies#terms`} target="_blank" rel="noreferrer" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">Terms</a>
                        <a href={`${policyBaseUrl}/support`} target="_blank" rel="noreferrer" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">Support</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
