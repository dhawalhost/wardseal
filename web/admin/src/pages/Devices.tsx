import React, { useEffect, useState } from 'react';
import { getDevices, deleteDevice } from '../api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MonitorSmartphone, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

interface Device {
    id: string;
    device_identifier: string;
    os: string;
    os_version: string;
    is_managed: boolean;
    is_compliant: boolean;
    last_seen_at: string;
    risk_score: number;
}

const Devices: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDevices = async () => {
        try {
            setLoading(true);
            const data = await getDevices();
            setDevices(data || []);
            setError('');
        } catch (err) {
            console.error("Failed to fetch devices", err);
            setError('Failed to load devices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleRevoke = async (id: string) => {
        if (!window.confirm("Are you sure you want to revoke/delete this device? It will be logged out.")) return;
        try {
            await deleteDevice(id);
            fetchDevices();
        } catch (err) {
            console.error(err);
            alert("Failed to delete device");
        }
    };

    if (loading && devices.length === 0) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Device Management</h1>
                <p className="text-muted-foreground mt-1">Monitor and control devices accessing your organization.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registered Devices</CardTitle>
                    <CardDescription>Devices that have signed in to your account.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {error && <div className="p-4 text-destructive">{error}</div>}

                    {devices.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                            <MonitorSmartphone className="h-12 w-12 mb-4 opacity-20" />
                            No devices registered yet.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Identifier</TableHead>
                                    <TableHead>OS / Version</TableHead>
                                    <TableHead>Security Status</TableHead>
                                    <TableHead>Risk Score</TableHead>
                                    <TableHead>Last Seen</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {devices.map(device => (
                                    <TableRow key={device.id}>
                                        <TableCell className="font-mono text-sm">
                                            {device.device_identifier.substring(0, 12)}...
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span>{device.os}</span>
                                                <Badge variant="outline" className="text-xs font-normal">{device.os_version}</Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex gap-1">
                                                    {device.is_managed && <Badge variant="secondary" className="text-xs">Managed</Badge>}
                                                    {device.is_compliant ? (
                                                        <Badge className="bg-green-600 hover:bg-green-700 text-xs gap-1"><ShieldCheck className="w-3 h-3" /> Compliant</Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="text-xs gap-1"><AlertCircle className="w-3 h-3" /> Non-Compliant</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className={`font-bold ${device.risk_score > 50 ? 'text-destructive' : 'text-green-600'}`}>
                                                {device.risk_score} <span className="text-muted-foreground text-xs font-normal">/ 100</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(device.last_seen_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleRevoke(device.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Devices;
