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
            <span className="text-sm font-semibold text-on-surface">
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
                        <p className="text-xs font-semibold text-muted-foreground tracking-wide ml-1">Resources</p>
                        <div className="space-y-1">
                            {[
                                { label: 'Go SDK Client', icon: <Cpu className="w-4 h-4" /> },
                                { label: 'CLI Reference', icon: <Terminal className="w-4 h-4" /> },
                                { label: 'OpenAPI Spec', icon: <Code2 className="w-4 h-4" /> },
                            ].map(link => (
                                <SidebarLink key={link.label} label={link.label} icon={link.icon} />
                            ))}
                        </div>
                    </div>

                    <GlassCard className="bg-secondary text-secondary-foreground border border-secondary/20 shadow-sm overflow-hidden relative rounded-xl">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Terminal className="w-12 h-12 rotate-12" />
                        </div>
                        <GlassCardContent className="p-card space-y-3 relative z-10">
                            <div className="space-y-0.5">
                                <p className="text-xs font-semibold tracking-wide opacity-70">SDK</p>
                                <h4 className="text-lg font-bold tracking-tight">WardSeal Go</h4>
                            </div>
                            <div className="bg-secondary-foreground/10 p-2 rounded-lg font-mono text-xs border border-secondary-foreground/10">
                                <code>go get github.com/...</code>
                            </div>
                        </GlassCardContent>
                    </GlassCard>
                </div>

                <div className="lg:col-span-3">
                    <GlassCard className="overflow-hidden border border-border shadow-sm bg-card min-h-[600px] rounded-xl">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-2.5">
                                <Code2 className="w-4 h-4 text-secondary" />
                                <GlassCardTitle className="text-base font-bold tracking-tight">API reference</GlassCardTitle>
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
