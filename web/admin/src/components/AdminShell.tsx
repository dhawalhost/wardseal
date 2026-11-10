import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Building2,
    ChevronRight,
    ClipboardList,
    Code2,
    Database,
    ExternalLink,
    FileText,
    Fingerprint,
    Globe,
    KeyRound,
    Layers,
    LayoutDashboard,
    Lock,
    Palette,
    Plug,
    Search,
    Share2,
    ShieldAlert,
    ShieldCheck,
    Slack,
    Smartphone,
    MessagesSquare,
    Target,
    Users as UsersIcon,
    Webhook,
} from 'lucide-react';
import {
    AdminShell as KitAdminShell,
    type NavigationGroup,
    type RenderShellLink,
} from '@dhawalhost/wardseal-ui-kit';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { Toaster } from '@/components/ui/toaster';
import { resolveIdUrl } from '@wardseal/shared';
import CopilotWidget from './CopilotWidget';

interface NavItem {
    path: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
}

interface NavSection {
    key: string;
    label: string;
    items: NavItem[];
}

const navSections: NavSection[] = [
    {
        key: 'overview',
        label: 'Overview',
        items: [
            { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { path: '/copilot', label: 'Security copilot', icon: MessagesSquare },
        ],
    },
    {
        key: 'directory',
        label: 'Identity',
        items: [
            { path: '/users', label: 'Users', icon: UsersIcon },
            { path: '/groups', label: 'Groups', icon: Layers },
            { path: '/roles', label: 'Roles', icon: ShieldCheck },
            { path: '/organizations', label: 'Organizations', icon: Building2 },
            { path: '/requests', label: 'Access requests', icon: ClipboardList },
        ],
    },
    {
        key: 'security',
        label: 'Security',
        items: [
            { path: '/safety', label: 'Security inbox', icon: ShieldAlert },
            { path: '/discovery', label: 'Discovery', icon: Search },
            { path: '/policies', label: 'Policies', icon: Lock },
            { path: '/policies/ip', label: 'IP access rules', icon: Globe },
            { path: '/mfa', label: 'Adaptive MFA', icon: ShieldCheck },
            { path: '/passkeys', label: 'Passkeys', icon: Fingerprint },
            { path: '/devices', label: 'Devices', icon: Smartphone },
        ],
    },
    {
        key: 'apps_governance',
        label: 'Apps and governance',
        items: [
            { path: '/sso', label: 'SSO and federation', icon: KeyRound },
            { path: '/connectors', label: 'Connectors', icon: Plug },
            { path: '/apps', label: 'Applications', icon: Code2 },
            { path: '/campaigns', label: 'Access reviews', icon: Target },
            { path: '/workloads', label: 'Machine accounts', icon: Database },
            { path: '/graph-explorer', label: 'Access graph', icon: Share2 },
            { path: '/webhooks', label: 'Webhooks', icon: Webhook },
            { path: '/integrations/slack', label: 'Slack', icon: Slack },
        ],
    },
    {
        key: 'compliance',
        label: 'Audit',
        items: [
            { path: '/audit', label: 'Audit trail', icon: FileText },
            { path: '/branding', label: 'Branding', icon: Palette },
        ],
    },
];

/** Client-side navigation for kit shell links (no full page reloads). */
const renderRouterLink: RenderShellLink = ({ href, children, ...rest }) => (
    <Link to={href} {...rest}>
        {children}
    </Link>
);

const AdminShell: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [userName, setUserName] = useState(
        localStorage.getItem('userName') || localStorage.getItem('userId') || 'Administrator'
    );

    const tenantId = localStorage.getItem('tenantID') || 'Default Tenant';
    const policyBaseUrl = window.location.hostname.endsWith('.local')
        ? 'http://wardseal.local'
        : 'https://wardseal.com';

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/v1/user/profile');
                const name = res.data?.name || res.data?.email;
                if (name) {
                    setUserName(name);
                    localStorage.setItem('userName', name);
                }
            } catch (err) {
                console.error('Failed to fetch profile in AdminShell', err);
            }
        };
        void fetchProfile();
    }, []);

    const isItemActive = (path: string) =>
        location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));

    // Longest matching path wins, so /policies/ip doesn't also light up /policies.
    const activePath = useMemo(() => {
        const matches = navSections.flatMap((s) => s.items).filter((i) => isItemActive(i.path));
        return matches.sort((a, b) => b.path.length - a.path.length)[0]?.path;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    const navigation: NavigationGroup[] = useMemo(
        () =>
            navSections.map((section) => ({
                key: section.key,
                title: section.label,
                items: section.items.map(({ path, label, icon: Icon, badge }) => ({
                    href: path,
                    label,
                    icon: <Icon strokeWidth={1.5} />,
                    badge,
                    isActive: path === activePath,
                })),
            })),
        [activePath]
    );

    const activeSection = navSections.find((s) => s.items.some((i) => i.path === activePath));
    const activeItem = activeSection?.items.find((i) => i.path === activePath);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <>
            <KitAdminShell
                navigation={navigation}
                renderLink={renderRouterLink}
                collapsibleGroups
                navFilter
                brandName="WardSeal"
                brandSubtitle="Admin console"
                brandHref="/dashboard"
                user={{ name: userName, subtitle: 'Super admin' }}
                onLogout={handleLogout}
                sidebarClassName="md:w-64"
                mainClassName="overflow-y-auto custom-scrollbar"
                sidebarHeader={
                    <div className="flex items-center justify-between gap-2 px-2">
                        <span className="min-w-0">
                            <span className="block text-xs text-on-surface-subtle">Tenant</span>
                            <span className="block truncate font-mono text-sm text-on-surface">{tenantId}</span>
                        </span>
                        <span className="text-xs text-on-surface-subtle">SaaS</span>
                    </div>
                }
                headerStart={
                    <p className="flex min-w-0 items-center gap-1.5 text-sm">
                        <span className="hidden truncate text-on-surface-variant sm:inline">
                            {activeSection?.label ?? 'Overview'}
                        </span>
                        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-on-surface-subtle sm:block" aria-hidden />
                        <span className="truncate font-medium text-on-surface">{activeItem?.label ?? 'Dashboard'}</span>
                    </p>
                }
                topHeaderActions={
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.assign(`${resolveIdUrl()}/portal`)}
                            className="hidden items-center gap-1.5 lg:flex"
                        >
                            User portal
                            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        </Button>
                        <ModeToggle />
                    </>
                }
                footer={
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
                        <span className="font-mono text-on-surface-subtle">v4.2.0-rc3</span>
                        <nav aria-label="Legal">
                            <ul className="flex items-center gap-5">
                                <li>
                                    <a href={`${policyBaseUrl}/policies#privacy`} target="_blank" rel="noreferrer" className="hover:text-on-surface hover:underline">
                                        Privacy<span className="sr-only"> (opens in a new tab)</span>
                                    </a>
                                </li>
                                <li>
                                    <a href={`${policyBaseUrl}/policies#security`} target="_blank" rel="noreferrer" className="hover:text-on-surface hover:underline">
                                        Security<span className="sr-only"> (opens in a new tab)</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-on-surface hover:underline">
                                        Docs <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                                        <span className="sr-only"> (opens in a new tab)</span>
                                    </a>
                                </li>
                            </ul>
                        </nav>
                    </div>
                }
            >
                <Outlet />
            </KitAdminShell>
            <Toaster />
            <CopilotWidget />
        </>
    );
};

export default AdminShell;
