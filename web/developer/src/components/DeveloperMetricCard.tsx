import React from 'react';
import { GlassCard, GlassCardContent } from '@/components/layout';

interface DeveloperMetricCardProps {
    icon: React.ReactNode;
    title: string;
    value: string | number | React.ReactNode;
    valueClassName?: string;
    loading?: boolean;
}

export const DeveloperMetricCard: React.FC<DeveloperMetricCardProps> = ({
    icon,
    title,
    value,
    valueClassName = "text-on-surface",
    loading = false
}) => {
    return (
        <GlassCard className="border-none shadow-overlay shadow-on-surface/5 bg-card rounded-xl overflow-hidden">
            <GlassCardContent className="p-3.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs font-medium tracking-tight text-muted-foreground ">{title}</span>
                </div>
                <div className={`text-xl font-medium tracking-tight tabular-nums ${valueClassName}`}>
                    {loading ? '—' : value}
                </div>
            </GlassCardContent>
        </GlassCard>
    );
};
