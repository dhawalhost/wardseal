import React from 'react';
import { Button } from "@/components/ui/button";
import { ExternalLink, Sparkles } from "lucide-react";
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from '@/components/layout';

export interface Application {
    id: string;
    name: string;
    description: string;
    icon_url?: string;
    launch_url: string;
}

interface RegistryAppCardProps {
    app: Application;
    onLaunch: (app: Application) => void;
}

export const RegistryAppCard: React.FC<RegistryAppCardProps> = ({ app, onLaunch }) => {
    return (
        <GlassCard className="group border border-border shadow-sm hover:border-secondary/40 transition-colors overflow-hidden flex flex-col bg-card rounded-xl">
            <GlassCardHeader className="p-card pb-2">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center border border-border">
                            {app.icon_url ? (
                                <img src={app.icon_url} alt={app.name} className="w-6 h-6 object-contain" />
                            ) : (
                                <Sparkles className="w-5 h-5 text-secondary" />
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-success rounded-full" />
                                <span className="font-semibold text-xs tracking-wide text-success uppercase">Active</span>
                            </div>
                            <GlassCardTitle className="text-base font-bold tracking-tight text-on-surface leading-none">{app.name}</GlassCardTitle>
                        </div>
                    </div>
                </div>
            </GlassCardHeader>
            <GlassCardContent className="p-card pt-0 space-y-3 flex-1 flex flex-col justify-between">
                <p className="text-sm text-muted-foreground leading-snug line-clamp-2">
                    {app.description || 'Enterprise application'}
                </p>

                <div className="space-y-2">
                    <div className="px-2 py-1.5 bg-muted rounded-md font-mono text-xs truncate text-muted-foreground border border-border">
                        {app.launch_url}
                    </div>
                    <Button
                        onClick={() => onLaunch(app)}
                        variant="outline"
                        className="w-full h-9 rounded-lg font-semibold text-sm"
                    >
                        Launch
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-50" />
                    </Button>
                </div>
            </GlassCardContent>
        </GlassCard>
    );
};
