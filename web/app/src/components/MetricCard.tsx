import React from 'react';
import { GlassCard } from '@/components/layout';

interface MetricCardProps {
    label: string;
    value: string;
    detail?: React.ReactNode;
    children?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, detail, children }) => {
    return (
        <GlassCard className="p-card flex flex-col justify-center bg-card hover:bg-card transition-[color,background-color,border-color,opacity,transform] duration-300 rounded-xl">
            <span className="text-xs font-medium text-primary opacity-40">{label}</span>
            {children ? children : (
                <div className="flex items-baseline gap-2 mt-0.5">
                    <p className="text-title font-medium text-on-surface tracking-tighter tabular-nums">{value}</p>
                    {detail}
                </div>
            )}
        </GlassCard>
    );
};
