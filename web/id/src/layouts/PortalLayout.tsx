import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Terminal } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { PortalLayout as KitPortalLayout, type RenderShellLink } from "@dhawalhost/wardseal-ui-kit";
import {
    resolveManageConsoleUrl,
    roleGrantsAdminConsole,
    rolesFromAccessToken,
    seedSessionFromProfile,
} from '@wardseal/shared';
import api, { getUserRoles } from '../api';
import { useAuth } from '../hooks/useAuth';

type RBACRole = {
    id?: string;
    name?: string;
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
            let userID = localStorage.getItem('userId') || '';

            try {
                const profileRes = await api.get('/api/v1/user/profile');
                seedSessionFromProfile(profileRes.data ?? {});
                if (profileRes.data?.name) {
                    if (mounted) setUserName(profileRes.data.name);
                } else if (profileRes.data?.email) {
                    if (mounted) setUserName(profileRes.data.email);
                }
                userID =
                    profileRes.data?.user_id ||
                    profileRes.data?.userID ||
                    profileRes.data?.id ||
                    userID;
            } catch (e) {
                console.error("Failed to fetch profile in PortalLayout", e);
            }

            if (!userID) {
                if (mounted) setCanAccessAdmin(false);
                return;
            }

            const applyAdmin = (names: string[]) => {
                const isAdmin = names.some((role) => roleGrantsAdminConsole(role));
                localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
                if (mounted) setCanAccessAdmin(isAdmin);
                return isAdmin;
            };

            // Prefer JWT roles (always available after signup/login) so Admin CTA
            // works even when /api/v1/users/... is shadowed by dirsvc ingress.
            const jwtRoles = rolesFromAccessToken(localStorage.getItem('token'));
            if (jwtRoles.length > 0 && applyAdmin(jwtRoles)) {
                return;
            }

            try {
                const response = await getUserRoles(userID);
                const roles = Array.isArray(response?.roles) ? response.roles : [];
                const roleNames = roles
                    .map((role: RBACRole | string) => (typeof role === 'string' ? role : role?.name))
                    .filter((name: any): name is string => typeof name === 'string');
                if (roleNames.length > 0) {
                    applyAdmin(roleNames);
                } else if (mounted) {
                    setCanAccessAdmin(localStorage.getItem('isAdmin') === 'true');
                }
            } catch {
                if (jwtRoles.length > 0) {
                    applyAdmin(jwtRoles);
                } else if (mounted) {
                    setCanAccessAdmin(localStorage.getItem('isAdmin') === 'true');
                }
            }
        };

        loadAdminAccess();
        return () => {
            mounted = false;
        };
    }, [location.pathname]);

    const handleSignOut = () => {
        navigate('/logout');
    };

    return (
        <KitPortalLayout
            links={([['/portal','Applications'],['/mfa','Two-step verification'],['/passkeys','Passkeys'],['/profile','Profile']] as const).map(([href, label]) => ({
                href,
                label,
                isActive: location.pathname === href || location.pathname.startsWith(`${href}/`),
            }))}
            renderLink={renderRouterLink}
            brandName="WardSeal"
            brandSubtitle="User portal"
            brandHref="/portal"
            user={{ name: userName, avatarSeed: localStorage.getItem('userId') || userName }}
            userMenuLabel="Signed in as"
            profileLabel="Profile settings"
            onProfileSettings={() => navigate('/profile')}
            onLogout={handleSignOut}
            userMenuItems={
                canAccessAdmin ? (
                    <DropdownMenuItem onSelect={() => window.location.assign(resolveManageConsoleUrl())}>
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
                            onClick={() => window.location.assign(resolveManageConsoleUrl())}
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
