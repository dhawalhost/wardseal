import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Terminal } from 'lucide-react';

const Developer: React.FC = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">API Reference</h1>
                <p className="text-muted-foreground mt-1">Explore the REST API documentation and integration resources.</p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-6">
                <Card className="bg-slate-900 text-white border-none shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" /> Quick Start: Go SDK</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-black/50 p-4 rounded-md font-mono text-sm border border-white/10 flex justify-between items-center">
                            <code>go get github.com/dhawalhost/wardseal/pkg/client</code>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <div className="swagger-wrapper bg-white">
                        <SwaggerUI url="/openapi.yaml" />
                    </div>
                </Card>
            </div>

            <style>{`
                /* Simple override to make Swagger UI fit better in the card context if needed */
                .swagger-ui .wrapper { padding: 0; }
            `}</style>
        </div>
    );
};

export default Developer;
