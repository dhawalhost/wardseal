import React, { useState, useEffect } from 'react';
import { getRoles, createRole, deleteRole, getPermissions, createPermission, getRolePermissions, assignPermissionToRole } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TableBody } from '@/components/ui/table';
import {
    Loader2, Plus, Trash2, Shield, Lock, ShieldCheck, X,
    Search, Key
} from 'lucide-react';
import {
    GlassTable, GlassTableHeader, GlassTableHead, GlassTableRow
} from '@/components/layout';
import { PermissionTableRow } from '../components/PermissionTableRow';
import { cn } from '@/lib/utils';

interface Role { id: string; name: string; description: string; created_at: string; }
interface Permission { id: string; resource: string; action: string; description: string; }

const Roles: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
    const [newRole, setNewRole] = useState({ name: '', description: '' });
    const [newPermission, setNewPermission] = useState({ resource: '', action: '', description: '' });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { loadData(); }, []);
    useEffect(() => { if (selectedRole) loadRolePermissions(selectedRole.id); }, [selectedRole]);

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
        if (window.confirm('Delete this role?')) {
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

    const filteredRoles = roles.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="h-[400px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-xs font-semibold tracking-tight transition-colors",
                            activeTab === 'roles'
                                ? "bg-card text-secondary shadow-sm"
                                : "text-muted-foreground hover:text-on-surface"
                        )}
                    >
                        <Shield className="w-3 h-3 inline mr-1.5 mb-0.5" />
                        Roles
                    </button>
                    <button
                        onClick={() => setActiveTab('permissions')}
                        className={cn(
                            "px-4 py-1.5 rounded-md text-xs font-semibold tracking-tight transition-colors",
                            activeTab === 'permissions'
                                ? "bg-card text-secondary shadow-sm"
                                : "text-muted-foreground hover:text-on-surface"
                        )}
                    >
                        <Key className="w-3 h-3 inline mr-1.5 mb-0.5" />
                        Permissions
                    </button>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                    {activeTab === 'roles' ? `${roles.length} roles` : `${permissions.length} permissions`}
                </p>
            </div>

            {activeTab === 'roles' ? (
                <div className="flex flex-1 overflow-hidden">
                    <div className="flex flex-col border-r border-border w-[340px] min-w-[340px]">
                        <div className="p-card border-b border-border bg-card">
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">Create new role</p>
                            <form onSubmit={handleCreateRole} className="space-y-2">
                                <Input
                                    placeholder="Role name (e.g. Operator)"
                                    value={newRole.name}
                                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                    className="h-8 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 text-xs font-medium"
                                    required
                                />
                                <Input
                                    placeholder="Description (optional)"
                                    value={newRole.description}
                                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                                    className="h-8 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 text-xs font-medium"
                                />
                                <Button type="submit" className="w-full h-8 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold shadow-sm">
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create role
                                </Button>
                            </form>
                        </div>

                        <div className="px-4 py-2 border-b border-border">
                            <div className="relative group">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-secondary transition-colors" />
                                <Input
                                    placeholder="Filter roles..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-7 pl-7 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 text-xs font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
                            {filteredRoles.length === 0 ? (
                                <div className="py-12 text-center text-sm text-muted-foreground font-medium">No roles found</div>
                            ) : filteredRoles.map(role => {
                                const isSelected = selectedRole?.id === role.id;
                                return (
                                    <div
                                        key={role.id}
                                        onClick={() => setSelectedRole(isSelected ? null : role)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group",
                                            isSelected
                                                ? "bg-secondary/5 border-l-2 border-secondary"
                                                : "hover:bg-muted/50 border-l-2 border-transparent"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                            isSelected ? "bg-secondary/15" : "bg-muted group-hover:bg-secondary/10"
                                        )}>
                                            <Shield className={cn("w-3.5 h-3.5 transition-colors", isSelected ? "text-secondary" : "text-muted-foreground")} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn("text-sm font-semibold truncate", isSelected ? "text-secondary" : "text-on-surface")}>{role.name}</p>
                                            <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">{role.description || 'No description'}</p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteRole(role.id, e)}
                                            className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
                        {selectedRole ? (
                            <>
                                <div className="bg-secondary px-6 py-4 text-secondary-foreground shrink-0 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-secondary-foreground/10 rounded-lg flex items-center justify-center">
                                            <Shield className="w-4 h-4 text-secondary-foreground" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-secondary-foreground">{selectedRole.name}</h2>
                                            <p className="text-secondary-foreground/80 text-xs mt-0.5">
                                                {rolePermissions.length} permission{rolePermissions.length !== 1 ? 's' : ''} assigned
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground" onClick={() => setSelectedRole(null)}>
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-card space-y-5">
                                    <section>
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-2">
                                                <ShieldCheck className="w-3.5 h-3.5 text-success" /> Assigned permissions
                                            </h3>
                                            <Badge className="bg-success-subtle text-success border-none text-[10px] font-semibold px-2 rounded-md">{rolePermissions.length}</Badge>
                                        </div>
                                        {rolePermissions.length === 0 ? (
                                            <div className="py-8 border border-dashed border-border rounded-xl text-center">
                                                <Lock className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                                                <p className="text-sm text-muted-foreground font-medium">No permissions assigned</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-card">
                                                {rolePermissions.map(p => (
                                                    <div key={p.id} className="p-2.5 bg-card border border-border rounded-lg flex items-center justify-between shadow-sm">
                                                        <div>
                                                            <p className="font-mono text-xs font-semibold text-on-surface">{p.resource}</p>
                                                            <Badge className="mt-1 bg-secondary/10 text-secondary border-none rounded text-[10px] font-semibold px-1.5">{p.action}</Badge>
                                                        </div>
                                                        <div className="w-6 h-6 bg-success-subtle rounded flex items-center justify-center">
                                                            <ShieldCheck className="w-3 h-3 text-success" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    <section className="border-t border-border pt-5">
                                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3 flex items-center gap-2">
                                            <Plus className="w-3.5 h-3.5" /> Available to assign
                                        </h3>
                                        <div className="grid grid-cols-2 gap-card">
                                            {permissions
                                                .filter(p => !rolePermissions.find(rp => rp.id === p.id))
                                                .map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => handleAssignPermission(p.id)}
                                                        className="p-2.5 bg-card border border-border rounded-lg cursor-pointer group hover:border-secondary/40 hover:bg-secondary/5 transition-colors flex items-center justify-between shadow-sm"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="font-mono text-xs font-semibold text-on-surface truncate">{p.resource}</p>
                                                            <p className="text-[10px] text-secondary font-semibold mt-0.5">{p.action}</p>
                                                        </div>
                                                        <div className="w-6 h-6 rounded bg-muted group-hover:bg-secondary group-hover:text-secondary-foreground flex items-center justify-center transition-colors shrink-0 ml-2">
                                                            <Plus className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                            {permissions.filter(p => !rolePermissions.find(rp => rp.id === p.id)).length === 0 && (
                                                <p className="col-span-2 text-sm text-muted-foreground font-medium text-center py-4">All permissions are assigned</p>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mb-4">
                                    <Shield className="h-6 w-6 text-secondary" />
                                </div>
                                <h3 className="text-sm font-bold text-on-surface mb-1">Select a role</h3>
                                <p className="text-sm text-muted-foreground font-medium max-w-xs">
                                    Click a role on the left to view and manage its assigned permissions.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 overflow-hidden">
                    <div className="w-[320px] min-w-[320px] border-r border-border p-card space-y-4 bg-card">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Add permission</p>
                        <form onSubmit={handleCreatePermission} className="space-y-2.5">
                            <div>
                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-1 block">Resource</Label>
                                <Input
                                    placeholder="e.g. applications"
                                    value={newPermission.resource}
                                    onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
                                    className="h-8 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 text-xs font-medium"
                                    required
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-1 block">Action</Label>
                                <Input
                                    placeholder="e.g. READ, WRITE"
                                    value={newPermission.action}
                                    onChange={(e) => setNewPermission({ ...newPermission, action: e.target.value })}
                                    className="h-8 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 text-xs font-medium"
                                    required
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-1 block">Description</Label>
                                <Input
                                    placeholder="Brief description..."
                                    value={newPermission.description}
                                    onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                                    className="h-8 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 text-xs font-medium"
                                />
                            </div>
                            <Button type="submit" className="w-full h-8 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold shadow-sm">
                                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create permission
                            </Button>
                        </form>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <GlassTable>
                            <GlassTableHeader>
                                <GlassTableRow className="hover:bg-transparent border-b border-border">
                                    <GlassTableHead className="py-3 pl-5 font-semibold text-xs tracking-wide text-muted-foreground uppercase">Resource</GlassTableHead>
                                    <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground uppercase">Action</GlassTableHead>
                                    <GlassTableHead className="py-3 font-semibold text-xs tracking-wide text-muted-foreground pr-5 uppercase">Description</GlassTableHead>
                                </GlassTableRow>
                            </GlassTableHeader>
                            <TableBody>
                                {permissions.map(p => (
                                    <PermissionTableRow key={p.id} permission={p} />
                                ))}
                                {permissions.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-20 text-center text-sm text-muted-foreground font-medium">No permissions defined</td>
                                    </tr>
                                )}
                            </TableBody>
                        </GlassTable>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Roles;
