import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Terminal } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PortalLayout as KitPortalLayout, type RenderShellLink } from "@dhawalhost/wardseal-ui-kit";
import api, { getUserRoles } from '../api';
import { useAuth } from '../hooks/useAuth';

const ADMIN_ROLE = 'admin';

type TokenPayload = {
    sub?: string;
    user_id?: string;
    roles?: string[];
    role?: string;
};

type RBACRole = {
    id?: string;
    name?: string;
};

const decodeTokenPayload = (token: string | null): TokenPayload | null => {
    if (!token) return null;
    try {
        const [, payload] = token.split('.');
        if (!payload) return null;

        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
};

const getTokenUserID = (token: string | null): string => {
    const payload = decodeTokenPayload(token);
    if (!payload) return '';
    return payload.sub || payload.user_id || '';
};

/** Client-side navigation for kit shell links (no full page reloads). */
const renderRouterLink: RenderShellLink = ({ href, children, ...rest }) => (
    <Link to={href} {...rest}>
        {children}
    </Link>
);

const PortalLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [canAccessAdmin, setCanAccessAdmin] = useState(false);
    const [userName, setUserName] = useState(localStorage.getItem('userName') || "Authorized User");
    const policyBaseUrl = window.location.hostname.endsWith('.local')
        ? 'http://wardseal.local'
        : 'https://wardseal.com';

    useEffect(() => {
        let mounted = true;

        const loadAdminAccess = async () => {
            const token = localStorage.getItem('token');
            const userID = localStorage.getItem('userId') || getTokenUserID(token);
            if (!userID) {
                if (mounted) setCanAccessAdmin(false);
                return;
            }

            try {
                const profileRes = await api.get('/api/v1/user/profile');
                if (profileRes.data && profileRes.data.name) {
                    if (mounted) setUserName(profileRes.data.name);
                    localStorage.setItem('userName', profileRes.data.name);
                } else if (profileRes.data && profileRes.data.email) {
                    if (mounted) setUserName(profileRes.data.email);
                    localStorage.setItem('userName', profileRes.data.email);
                }
            } catch (e) {
                console.error("Failed to fetch profile in PortalLayout", e);
            }

            try {
                const response = await getUserRoles(userID);
                const roles = Array.isArray(response?.roles) ? response.roles : [];
                const roleNames = roles
                    .map((role: RBACRole | string) => (typeof role === 'string' ? role : role?.name))
                    .filter((name: any): name is string => typeof name === 'string');

                if (mounted) {
                    setCanAccessAdmin(roleNames.some((role: string) => role.toLowerCase() === ADMIN_ROLE));
                }
            } catch {
                if (mounted) {
                    setCanAccessAdmin(false);
                }
            }
        };

        loadAdminAccess();
        return () => {
            mounted = false;
        };
    }, [location.pathname]);

    const handleSignOut = () => {
        logout();
        navigate('/login');
    };

    return (
        <KitPortalLayout
            links={([['/dashboard','Applications'],['/requests','Access requests'],['/devices','Devices'],['/mfa','Two-step verification'],['/passkeys','Passkeys'],['/profile','Profile']] as const).map(([href, label]) => ({
                href,
                label,
                isActive: location.pathname === href || location.pathname.startsWith(`${href}/`),
            }))}
            renderLink={renderRouterLink}
            brandName="WardSeal"
            brandSubtitle="User portal"
            brandHref="/dashboard"
            user={{ name: userName, avatarSeed: localStorage.getItem('userId') || getTokenUserID(localStorage.getItem('token')) || userName }}
            userMenuLabel="Signed in as"
            profileLabel="Profile settings"
            onProfileSettings={() => navigate('/profile')}
            onLogout={handleSignOut}
            userMenuItems={
                canAccessAdmin ? (
                    <DropdownMenuItem onSelect={() => window.location.assign(window.location.hostname.endsWith('.local') ? 'http://manage.wardseal.local' : 'https://manage.wardseal.com')}>
                        <Terminal className="text-on-surface-subtle" aria-hidden />
                        Switch to admin console
                    </DropdownMenuItem>
                ) : null
            }
            headerActions={
                <>
                    {canAccessAdmin && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.assign(window.location.hostname.endsWith('.local') ? 'http://manage.wardseal.local' : 'https://manage.wardseal.com')}
                            className="hidden items-center gap-2 md:flex"
                        >
                            Admin console
                        </Button>
                    )}
                    <ModeToggle />
                </>
            }
            footerNote={<>&copy; {new Date().getFullYear()} WardSeal</>}
            footerLinks={[
                { label: 'Privacy', href: `${policyBaseUrl}/policies#privacy`, external: true },
                { label: 'Terms', href: `${policyBaseUrl}/policies#terms`, external: true },
                { label: 'Policies', href: `${policyBaseUrl}/policies`, external: true },
            ]}
        >
            <Outlet />
        </KitPortalLayout>
    );
};

export default PortalLayout;
