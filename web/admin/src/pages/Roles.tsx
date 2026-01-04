import { useState, useEffect } from 'react';
import { getRoles, createRole, deleteRole, getPermissions, createPermission, getRolePermissions, assignPermissionToRole } from '../api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Loader2, Plus, Trash2, Shield, Lock, ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Role {
    id: string;
    name: string;
    description: string;
    created_at: string;
}

interface Permission {
    id: string;
    resource: string;
    action: string;
    description: string;
}

export default function Roles() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
    const [newRole, setNewRole] = useState({ name: '', description: '' });
    const [newPermission, setNewPermission] = useState({ resource: '', action: '', description: '' });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedRole) {
            loadRolePermissions(selectedRole.id);
        }
    }, [selectedRole]);

    const loadData = async () => {
        try {
            const [rolesRes, permsRes] = await Promise.all([getRoles(), getPermissions()]);
            setRoles(rolesRes.roles || []);
            setPermissions(permsRes.permissions || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRolePermissions = async (roleId: string) => {
        try {
            const res = await getRolePermissions(roleId);
            setRolePermissions(res.permissions || []);
        } catch (error) {
            console.error('Failed to load role permissions:', error);
        }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createRole(newRole.name, newRole.description);
            setNewRole({ name: '', description: '' });
            loadData();
        } catch (error) {
            console.error('Failed to create role:', error);
        }
    };

    const handleDeleteRole = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this role?')) {
            try {
                await deleteRole(id);
                if (selectedRole?.id === id) setSelectedRole(null);
                loadData();
            } catch (error) {
                console.error('Failed to delete role:', error);
            }
        }
    };

    const handleCreatePermission = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createPermission(newPermission.resource, newPermission.action, newPermission.description);
            setNewPermission({ resource: '', action: '', description: '' });
            loadData();
        } catch (error) {
            console.error('Failed to create permission:', error);
        }
    };

    const handleAssignPermission = async (permissionId: string) => {
        if (!selectedRole) return;
        try {
            await assignPermissionToRole(selectedRole.id, permissionId);
            loadRolePermissions(selectedRole.id);
        } catch (error) {
            console.error('Failed to assign permission:', error);
        }
    };

    if (loading) return <div className="p-8 flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
                    <p className="text-muted-foreground mt-1">
                        Define roles and assign fine-grained permissions.
                    </p>
                </div>
                <div className="flex bg-muted p-1 rounded-lg">
                    <Button
                        variant={activeTab === 'roles' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('roles')}
                        className="rounded-md"
                    >
                        <Shield className="mr-2 h-4 w-4" />
                        Roles
                    </Button>
                    <Button
                        variant={activeTab === 'permissions' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('permissions')}
                        className="rounded-md"
                    >
                        <Lock className="mr-2 h-4 w-4" />
                        Permissions
                    </Button>
                </div>
            </div>

            <Separator />

            {activeTab === 'roles' ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

                    {/* LEFT: ROLES LIST */}
                    <div className="md:col-span-4 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Create Role</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateRole} className="space-y-4">
                                    <div className="space-y-2">
                                        <Input
                                            placeholder="Role Name"
                                            value={newRole.name}
                                            onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                            required
                                        />
                                        <Input
                                            placeholder="Description"
                                            value={newRole.description}
                                            onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                                        />
                                        <Button type="submit" className="w-full">
                                            <Plus className="mr-2 h-4 w-4" /> Add Role
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="h-[calc(100vh-400px)] flex flex-col">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-lg">Roles</CardTitle>
                            </CardHeader>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {roles.map(role => (
                                    <div
                                        key={role.id}
                                        onClick={() => setSelectedRole(role)}
                                        className={`
                                            group flex items-center justify-between p-3 rounded-md cursor-pointer transition-all border
                                            ${selectedRole?.id === role.id
                                                ? 'bg-primary/5 border-primary/20 shadow-sm'
                                                : 'hover:bg-muted border-transparent hover:border-border'}
                                        `}
                                    >
                                        <div className="min-w-0 flex-1 mr-2">
                                            <div className="font-medium truncate flex items-center gap-2">
                                                <Shield className="h-3 w-3 text-muted-foreground" />
                                                {role.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate mt-1">
                                                {role.description || 'No description'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {selectedRole?.id === role.id && <ChevronRight className="h-4 w-4 text-primary animate-in fade-in slide-in-from-left-2" />}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => handleDeleteRole(role.id, e)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT: DETAILS */}
                    <div className="md:col-span-8">
                        {selectedRole ? (
                            <Card className="h-full">
                                <CardHeader className="border-b">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>{selectedRole.name}</CardTitle>
                                            <CardDescription>{selectedRole.description}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-8 p-6">
                                    {/* ASSIGNED */}
                                    <div>
                                        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                                            <Badge variant="default">{rolePermissions.length}</Badge> Assigned Permissions
                                        </h3>
                                        <div className="bg-muted/10 rounded-md border p-1 min-h-[100px] flex flex-wrap content-start gap-2">
                                            {rolePermissions.length === 0 ? (
                                                <p className="w-full text-center text-sm text-muted-foreground py-8 italic">No permissions assigned yet.</p>
                                            ) : (
                                                rolePermissions.map(p => (
                                                    <Badge key={p.id} variant="secondary" className="px-3 py-1 bg-background border shadow-sm">
                                                        <span className="font-mono text-xs">{p.resource}</span>
                                                        <span className="mx-1 text-muted-foreground">:</span>
                                                        <span className="font-semibold text-xs">{p.action}</span>
                                                    </Badge>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* AVAILABLE */}
                                    <div>
                                        <h3 className="text-sm font-medium mb-3">Available Permissions</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
                                            {permissions
                                                .filter(p => !rolePermissions.find(rp => rp.id === p.id))
                                                .map(p => (
                                                    <div key={p.id} className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-muted/50 transition-colors">
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="text-sm font-medium font-mono">
                                                                {p.resource}<span className="text-muted-foreground">:</span>{p.action}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground truncate" title={p.description}>
                                                                {p.description}
                                                            </div>
                                                        </div>
                                                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 ml-2 shrink-0" onClick={() => handleAssignPermission(p.id)}>
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))
                                            }
                                            {permissions.length === 0 && <p className="text-sm text-muted-foreground">No permissions available to assign.</p>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 text-muted-foreground bg-muted/20">
                                <Shield className="h-12 w-12 mb-4 opacity-20" />
                                <p>Select a role to manage permissions</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // PERMISSIONS TAB
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    <div className="md:col-span-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Define Permission</CardTitle>
                                <CardDescription>Create a new system permission.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreatePermission} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Resource</Label>
                                        <Input
                                            placeholder="e.g. users, reports"
                                            value={newPermission.resource}
                                            onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Action</Label>
                                        <Input
                                            placeholder="e.g. read, write, delete"
                                            value={newPermission.action}
                                            onChange={(e) => setNewPermission({ ...newPermission, action: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Input
                                            placeholder="What does this permission allow?"
                                            value={newPermission.description}
                                            onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full">
                                        <Plus className="mr-2 h-4 w-4" /> Create Permission
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="md:col-span-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>All Permissions</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Resource</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Description</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {permissions.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-mono">{p.resource}</TableCell>
                                                <TableCell className="font-mono text-xs uppercase bg-muted/50 px-2 py-1 rounded inline-block m-2">{p.action}</TableCell>
                                                <TableCell className="text-muted-foreground">{p.description}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
