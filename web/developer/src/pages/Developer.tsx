import React from 'react';
import { RedocStandalone } from 'redoc';
import { Terminal, BookOpen, Code2, Cpu } from 'lucide-react';
import { 
    PageHeader, 
    GlassCard, 
    GlassCardHeader, 
    GlassCardTitle, 
    GlassCardContent 
} from '@/components/layout';

interface SidebarLinkProps {
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ label, icon, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className="w-full text-left p-2 rounded-lg hover:bg-muted/40 transition-colors flex items-center gap-2 group"
        >
            <div className="text-muted-foreground group-hover:text-primary transition-colors">
                {icon}
            </div>
            <span className="text-sm font-medium text-on-surface">
                {label}
            </span>
        </button>
    );
};

const Developer: React.FC = () => {
    return (
        <div className="space-y-page animate-in fade-in duration-700">
            <PageHeader 
                icon={<BookOpen className="w-5 h-5" />}
                title="API Documentation"
                description="Explore our API documentation and integration guides."
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-card">
                <div className="lg:col-span-1 space-y-card">
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground ml-1">Resources</p>
                        <div className="space-y-1">
                            {[
                                { label: 'Go client', icon: <Cpu className="w-4 h-4" /> },
                                { label: 'CLI reference', icon: <Terminal className="w-4 h-4" /> },
                                { label: 'OpenAPI spec', icon: <Code2 className="w-4 h-4" /> },
                            ].map(link => (
                                <SidebarLink key={link.label} label={link.label} icon={link.icon} />
                            ))}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
                        <div className="border-b border-border px-4 py-3">
                            <p className="text-heading text-on-surface">Go client</p>
                            <p className="mt-0.5 text-xs text-on-surface-subtle">Typed client for the management API</p>
                        </div>
                        <pre className="overflow-x-auto bg-[hsl(224_40%_8%)] px-4 py-3 font-mono text-xs leading-relaxed text-white/85">
                            <code>go get github.com/dhawalhost/wardseal/pkg/client</code>
                        </pre>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <GlassCard className="overflow-hidden border border-border shadow-sm bg-card min-h-[600px] rounded-xl">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-2.5">
                                <Code2 className="w-4 h-4 text-on-surface-subtle" strokeWidth={1.5} />
                                <GlassCardTitle className="text-base font-medium">API reference</GlassCardTitle>
                            </div>
                        </GlassCardHeader>
                        <GlassCardContent className="p-0">
                            <div className="redoc-wrapper bg-card">
                                <RedocStandalone specUrl="/openapi.yaml" />
                            </div>
                        </GlassCardContent>
                    </GlassCard>
                </div>
            </div>

            <style>{`
                /* ReDoc Modernist Refinement */
                .redoc-wrapper { overflow: hidden; border-radius: 0.75rem; }
                [role="main"] { padding: 0 !important; }
                .menu-content { background-color: transparent !important; }
                .sc-fzoLag { font-family: inherit !important; }
            `}</style>
        </div>
    );
};

export default Developer;
