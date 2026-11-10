import React from 'react';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface APIKey {
    id: string;
    name: string;
    key_prefix: string;
    status: string;
    created_at: string;
}

interface APIKeyRowProps {
    apiKey: APIKey;
    handleViewLogs: (id: string, name: string, type: 'app' | 'key') => void;
    handleRevokeKey: (id: string) => void;
}

export const APIKeyRow: React.FC<APIKeyRowProps> = ({
    apiKey,
    handleViewLogs,
    handleRevokeKey
}) => {
    return (
        <div className="flex items-center justify-between p-4 hover:bg-surface-container/20 transition-[color,background-color,border-color,opacity,transform] group">
            <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-surface-container ring-1 ring-on-surface/5 group-hover:bg-primary/10 group-hover:ring-primary/20 transition-[color,background-color,border-color,opacity,transform]">
                    <Fingerprint className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-0.5">
                    <div className="text-[13px] font-medium tracking-tight text-on-surface group-hover:text-primary transition-colors leading-none ">{apiKey.name}</div>
                    <div className="flex items-center gap-3 text-xs font-medium tracking-tight text-muted-foreground ">
                        <span className="font-mono bg-surface-container px-1.5 py-0.5 rounded text-xs">{apiKey.key_prefix}...</span>
                        <span>• {new Date(apiKey.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" className="h-7 rounded-lg bg-surface-container font-medium text-xs tracking-tight hover:bg-primary hover:text-primary-foreground px-3 transition-[color,background-color,border-color,opacity,transform] " onClick={() => handleViewLogs(apiKey.id, apiKey.name, 'key')}>
                    Logs
                </Button>
                <Button variant="ghost" className="h-7 rounded-lg bg-surface-container font-medium text-xs tracking-tight hover:bg-destructive/100 hover:text-destructive-foreground px-3 text-destructive transition-[color,background-color,border-color,opacity,transform] " onClick={() => handleRevokeKey(apiKey.id)}>
                    Revoke
                </Button>
            </div>
        </div>
    );
};
