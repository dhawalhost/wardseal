import React from 'react';
import { RedocStandalone } from 'redoc';
import { Terminal, BookOpen, Code2, Cpu } from 'lucide-react';
import { 
    PageHeader, 
    GlassCard, 
    GlassCardHeader, 
    GlassCardTitle, 
    GlassCardContent, PageLayout
} from '@/components/layout';

const Developer: React.FC = () => {
    return (
        <PageLayout>
        <div className="space-y-page animate-in fade-in duration-300">
            <PageHeader 
                icon={<BookOpen className="w-6 h-6 text-secondary" />}
                title="API Documentation"
                description="Explore our API documentation and integration guides."
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-card">
                <div className="lg:col-span-1 space-y-6">
                    <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Developer Resources</p>
                        <div className="space-y-1">
                            {[
                                { label: 'Go SDK Client', icon: <Cpu className="w-4 h-4" /> },
                                { label: 'CLI Reference', icon: <Terminal className="w-4 h-4" /> },
                                { label: 'OpenAPI Spec', icon: <Code2 className="w-4 h-4" /> },
                            ].map(link => (
                                <button key={link.label} className="w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-center gap-3 group">
                                    <div className="text-muted-foreground group-hover:text-secondary transition-colors">{link.icon}</div>
                                    <span className="text-sm font-semibold text-on-surface">{link.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <GlassCard className="bg-secondary text-secondary-foreground border border-secondary/20 shadow-sm overflow-hidden relative rounded-lg">
                        <div className="absolute top-0 right-0 p-4 text-secondary-foreground/10">
                            <Terminal className="w-20 h-20 rotate-12" />
                        </div>
                        <GlassCardContent className="p-card space-y-4 relative z-10">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground/80">Go SDK</p>
                                <h4 className="text-lg font-bold tracking-tight">wardseal/pkg/client</h4>
                            </div>
                            <div className="bg-secondary-foreground/10 p-3 rounded-lg font-mono text-xs border border-secondary-foreground/10">
                                <code>go get github.com/dhawalhost/wardseal/pkg/client</code>
                            </div>
                        </GlassCardContent>
                    </GlassCard>
                </div>

                <div className="lg:col-span-3">
                    <GlassCard className="overflow-hidden border border-border shadow-sm bg-card min-h-[800px] rounded-lg">
                        <GlassCardHeader className="py-card px-card border-b border-border">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary/10 rounded-lg">
                                    <Code2 className="w-4 h-4 text-secondary" />
                                </div>
                                <GlassCardTitle className="text-base font-bold tracking-tight">API Reference</GlassCardTitle>
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
                .redoc-wrapper { overflow: hidden; border-radius: 0.5rem; }
                [role="main"] { padding: 0 !important; }
                .menu-content { background-color: transparent !important; }
                .sc-fzoLag { font-family: inherit !important; }
            `}</style>
        </div>
        </PageLayout>
    );
};

export default Developer;
