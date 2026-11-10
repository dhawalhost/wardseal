import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, ChevronRight, Code2, ExternalLink, Webhook } from 'lucide-react';
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
}

const navSections: { key: string; label: string; items: NavItem[] }[] = [
    {
        key: 'build',
        label: 'Build',
        items: [
            { path: '/developer', label: 'Documentation', icon: BookOpen },
            { path: '/apps', label: 'Applications', icon: Code2 },
            { path: '/webhooks', label: 'Webhooks', icon: Webhook },
        ],
    },
    {
        key: 'observe',
        label: 'Observe',
        items: [{ path: '/developer/analytics', label: 'Analytics', icon: BarChart3 }],
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
        localStorage.getItem('userName') || localStorage.getItem('userId') || 'Developer'
    );
    const tenantId = localStorage.getItem('tenantID') || 'Default tenant';
    const policyBaseUrl = window.location.hostname.endsWith('.local') ? 'http://wardseal.local' : 'https://wardseal.com';

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

    // Longest matching path wins, so /developer/analytics doesn't also light up /developer.
    const activePath = useMemo(() => {
        const all = navSections.flatMap((s) => s.items);
        const matches = all.filter((i) => location.pathname === i.path || location.pathname.startsWith(`${i.path}/`));
        return matches.sort((a, b) => b.path.length - a.path.length)[0]?.path;
    }, [location.pathname]);

    const navigation: NavigationGroup[] = useMemo(
        () =>
            navSections.map((section) => ({
                key: section.key,
                title: section.label,
                items: section.items.map(({ path, label, icon: Icon }) => ({
                    href: path,
                    label,
                    icon: <Icon strokeWidth={1.5} />,
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
                brandName="WardSeal"
                brandSubtitle="Developers"
                brandHref="/developer"
                user={{ name: userName, subtitle: tenantId }}
                onLogout={handleLogout}
                mainClassName="overflow-y-auto custom-scrollbar"
                headerStart={
                    <p className="flex min-w-0 items-center gap-1.5 text-sm">
                        <span className="hidden truncate text-on-surface-variant sm:inline">{activeSection?.label ?? 'Build'}</span>
                        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-on-surface-subtle sm:block" aria-hidden />
                        <span className="truncate font-medium text-on-surface">{activeItem?.label ?? 'Documentation'}</span>
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
                        <span className="font-mono">API v1</span>
                        <nav aria-label="Legal">
                            <ul className="flex items-center gap-5">
                                <li>
                                    <a href={`${policyBaseUrl}/policies`} target="_blank" rel="noreferrer" className="hover:text-on-surface">
                                        Policies<span className="sr-only"> (opens in a new tab)</span>
                                    </a>
                                </li>
                                <li>
                                    <a href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-on-surface">
                                        GitHub <ExternalLink className="h-3 w-3" strokeWidth={1.5} aria-hidden />
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
