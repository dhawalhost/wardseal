import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { login, getBranding, completeMfaLogin, lookupUser, beginLogin, finishLogin, getSetupStatus, api, getPublicSSOProviders } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fingerprint, ArrowRight, User as UserIcon, Lock, ShieldAlert, Loader2 } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { v4 as uuidv4 } from 'uuid';
import { AuthLayout, AuthDivider } from '@dhawalhost/wardseal-ui-kit';
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
    const footerLinks = [
        { label: 'Privacy', href: `${policyBaseUrl}/policies#privacy` },
        { label: 'Terms', href: `${policyBaseUrl}/policies#terms` },
        { label: 'Support', href: `${policyBaseUrl}/support` },
    ];
    const tenantBrand = branding.logo_url ? (
        <img src={branding.logo_url} alt={branding.tenant_name || ''} className="h-9 w-9 object-contain" />
    ) : undefined;
    const errorBox = error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-error/20 bg-error-subtle px-3 py-2.5 text-sm text-error-subtle-foreground">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            <span>{error}</span>
        </div>
    );
    const codeInput = (
        <Input
            id="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="000000"
            className="h-12 text-center font-mono text-xl tracking-[0.4em] tabular-nums"
            maxLength={6}
            autoFocus
        />
    );

    if (mfaRequired) {
        if (!mfaEnrolled) {
            return (
                <AuthLayout
                    brand={tenantBrand}
                    title="Set up two-step verification"
                    description="Scan the code with an authenticator app, then enter the six digits it shows"
                    footerLinks={footerLinks}
                >
                    <form onSubmit={handleMfaSetupVerify} className="space-y-5">
                        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                            {qrCode ? (
                                <img src={`data:image/png;base64,${qrCode}`} alt="Authenticator QR code" className="h-32 w-32 shrink-0 rounded-md mix-blend-multiply" />
                            ) : (
                                <div className="flex h-32 w-32 shrink-0 items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-on-surface-subtle" aria-hidden />
                                </div>
                            )}
                            {secret && (
                                <div className="min-w-0 space-y-1.5">
                                    <p className="text-xs text-on-surface-subtle">Or enter this key</p>
                                    <p className="select-all break-all font-mono text-xs leading-relaxed text-on-surface">{secret}</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="totp">Authentication code</Label>
                            {codeInput}
                        </div>
                        {errorBox}
                        <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                            Verify and continue
                        </Button>
                    </form>
                </AuthLayout>
            );
        }

        return (
            <AuthLayout
                brand={tenantBrand}
                title="Enter verification code"
                description="Open your authenticator app and enter the current six-digit code"
                footerLinks={footerLinks}
            >
                <form onSubmit={handleMfaSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="totp">Authentication code</Label>
                        {codeInput}
                    </div>
                    {errorBox}
                    <Button type="submit" size="lg" className="w-full" isLoading={loading}>
                        Verify
                    </Button>
                </form>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            brand={tenantBrand}
            title={branding.tenant_name ? `Sign in to ${branding.tenant_name}` : 'Sign in to WardSeal'}
            description={step === 'identifier' ? 'Use your work email to continue' : undefined}
            footnote={
                <>
                    New to WardSeal?{' '}
                    <a href="/signup" className="font-medium text-on-surface underline-offset-4 hover:underline">
                        Create an organization
                    </a>
                </>
            }
            footerLinks={footerLinks}
        >
            {step === 'identifier' ? (
                <form onSubmit={handleIdentifierSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="email">Work email</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="username"
                            placeholder="name@company.com"
                            icon={<UserIcon />}
                            className="h-11"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    {errorBox}
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full gap-2"
                        style={branding.primary_color ? { backgroundColor: branding.primary_color } : undefined}
                        isLoading={loading}
                    >
                        Continue
                        {!loading && <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                    </Button>

                    {ssoProviders.length > 0 && (
                        <>
                            <AuthDivider>or</AuthDivider>
                            <div className="space-y-2">
                                {ssoProviders.map((provider) => (
                                    <Button
                                        key={provider.id}
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        className="w-full"
                                        onClick={() => handleSocialLogin(provider.name)}
                                    >
                                        Continue with {provider.name}
                                    </Button>
                                ))}
                            </div>
                        </>
                    )}
                </form>
            ) : (
                <div>
                    <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                        <span className="min-w-0 truncate text-sm text-on-surface">{email}</span>
                        <button
                            type="button"
                            onClick={() => setStep('identifier')}
                            className="shrink-0 rounded text-xs font-medium text-on-surface-subtle transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Change
                        </button>
                    </div>

                    {webAuthnEnabled && (
                        <>
                            <Button type="button" size="lg" className="w-full gap-2" onClick={handlePasskeyLogin} disabled={loading}>
                                <Fingerprint className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                                Sign in with a passkey
                            </Button>
                            <AuthDivider>or use your password</AuthDivider>
                        </>
                    )}

                    <form onSubmit={handlePasswordLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                icon={<Lock />}
                                className="h-11"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoFocus={!webAuthnEnabled}
                            />
                        </div>
                        {errorBox}
                        <Button type="submit" size="lg" variant={webAuthnEnabled ? 'outline' : 'secondary'} className="w-full" isLoading={loading}>
                            Sign in
                        </Button>
                    </form>
                </div>
            )}
        </AuthLayout>
    );
};

export default Login;
