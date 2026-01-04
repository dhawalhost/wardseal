import React, { useEffect, useState } from 'react';
import { getSCIMUsers } from '../api';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Users,
    ShieldCheck,
    Activity,
    UserPlus,
    MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Dashboard: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await getSCIMUsers();
                // SCIM returns { Resources: [...] }
                setUsers(data.Resources || []);
            } catch (err: any) {
                console.error(err);
                setError('Failed to fetch users');
                // Basic auth check
                if (err.response?.status === 401) {
                    navigate('/login');
                }
            }
        };
        fetchUsers();
    }, [navigate]);

    // Derived Stats
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.active).length;
    const inactiveUsers = totalUsers - activeUsers;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
                    <p className="text-muted-foreground mt-1">
                        Manage your directory and monitor system health.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => navigate('/users/new')}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md border border-destructive/20 text-sm font-medium">
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            +2.5% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Identities
                        </CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeUsers}</div>
                        <p className="text-xs text-muted-foreground">
                            {((activeUsers / (totalUsers || 1)) * 100).toFixed(0)}% are active
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            MFA Enrolled
                        </CardTitle>
                        <ShieldCheck className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">
                            MFA enrollment status
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Security Score
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">98%</div>
                        <p className="text-xs text-muted-foreground">
                            Based on current policies
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Content Table */}
            <Card className="shadow-sm border-muted/60">
                <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>
                        A list of users recently added to your directory.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[80px]">Avatar</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground h-32">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={`https://avatar.vercel.sh/${user.userName}`} />
                                                    <AvatarFallback>{user.userName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{user.userName}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{user.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.active ? "outline" : "secondary"} className={user.active ? "border-green-500 text-green-600 bg-green-50" : ""}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${user.active ? "bg-green-500" : "bg-gray-400"}`}></span>
                                                    {user.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {/* Mock date if not present, usually SCIM has meta.created */}
                                                {user.meta?.created ? new Date(user.meta.created).toLocaleDateString() : 'Just now'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigator.clipboard.writeText(user.id)}
                                                    title="Copy ID"
                                                >
                                                    Copy ID
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Dashboard;
