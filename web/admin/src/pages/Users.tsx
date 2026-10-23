import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSCIMUsers, deleteSCIMUser, requestPasswordSetupLink, updateSCIMUser } from '../api';
import { Button } from "@/components/ui/button";
import {
    Search,
    Loader2,
    UserPlus,
    Key,
    Mail,
    Lock,
    X,
    ChevronRight,
    Trash2,
    Edit,
    Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

const Users: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const navigate = useNavigate();

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await getSCIMUsers();
            setUsers(data.Resources || []);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                await deleteSCIMUser(id);
                if (selectedUser?.id === id) setSelectedUser(null);
                await loadUsers();
            } catch (error) {
                console.error("Failed to delete user", error);
            }
        }
    };

    const handleSendResetLink = async (id: string) => {
        try {
            await requestPasswordSetupLink(id, 'reset', 72, true);
            alert("Password reset link sent successfully.");
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to send reset link");
        }
    };

    const handleSetPassword = async () => {
        if (!selectedUser || !newPassword || newPassword.length < 8) return;
        try {
            setLoading(true);
            await updateSCIMUser(selectedUser.id, { password: newPassword });
            alert(`Password updated successfully.`);
            setIsPasswordDialogOpen(false);
            setNewPassword('');
        } catch (error: any) {
            alert(error.response?.data?.error || "Failed to set password");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    const filteredUsers = users.filter(user =>
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.emails?.[0]?.value?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-full gap-0 animate-in fade-in duration-300">
            <div className={cn(
                "flex flex-col transition-all duration-300",
                selectedUser ? "w-[420px] min-w-[420px]" : "flex-1"
            )}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-on-surface">Users</h1>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                            {users.length} total accounts
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-secondary transition-colors" />
                            <Input
                                placeholder="Search users..."
                                className="h-8 w-44 rounded-lg text-xs pl-8 border border-border bg-card focus-visible:ring-secondary/20 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button
                            onClick={() => navigate('/users/new')}
                            className="h-8 rounded-lg bg-secondary text-secondary-foreground font-semibold text-xs px-3 shadow-sm"
                        >
                            <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add user
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-muted/30">
                    {loading && users.length === 0 ? (
                        <div className="h-48 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="py-20 text-center text-sm text-muted-foreground font-medium">
                            No users found
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredUsers.map((user) => {
                                const email = user.emails?.[0]?.value || user.userName || '';
                                const isSelected = selectedUser?.id === user.id;
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => setSelectedUser(isSelected ? null : user)}
                                        className={cn(
                                            "flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors group",
                                            isSelected
                                                ? "bg-secondary/5 border-l-2 border-secondary"
                                                : "hover:bg-muted/50 border-l-2 border-transparent"
                                        )}
                                    >
                                        <Avatar name={email} size={32} className="h-8 w-8 rounded-lg border border-border overflow-hidden shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-semibold truncate transition-colors",
                                                isSelected ? "text-secondary" : "text-on-surface"
                                            )}>
                                                {user.displayName || user.userName}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate font-medium">
                                                {email}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge className={cn(
                                                "text-[10px] font-semibold px-1.5 py-0 rounded-md border-none",
                                                user.active
                                                    ? "bg-success-subtle text-success"
                                                    : "bg-destructive/10 text-destructive"
                                            )}>
                                                {user.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                            <ChevronRight className={cn(
                                                "w-3.5 h-3.5 transition-all",
                                                isSelected ? "text-secondary rotate-90" : "text-muted-foreground"
                                            )} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {selectedUser && (
                <div className="flex-1 border-l border-border bg-card flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-secondary px-6 py-5 text-secondary-foreground shrink-0">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar name={selectedUser.emails?.[0]?.value || selectedUser.userName} size={48} className="h-12 w-12 rounded-xl border border-secondary-foreground/20 overflow-hidden" />
                                <div>
                                    <h2 className="text-base font-bold tracking-tight text-secondary-foreground">
                                        {selectedUser.displayName || selectedUser.userName}
                                    </h2>
                                    <p className="text-secondary-foreground/80 text-xs font-medium mt-0.5">
                                        {selectedUser.emails?.[0]?.value || 'No email'}
                                    </p>
                                    <Badge className={cn(
                                        "mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-md border-none",
                                        selectedUser.active
                                            ? "bg-secondary-foreground/10 text-secondary-foreground"
                                            : "bg-secondary-foreground/20 text-secondary-foreground/80"
                                    )}>
                                        {selectedUser.active ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground"
                                onClick={() => setSelectedUser(null)}
                            >
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-card space-y-4">
                        <section>
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">Identity</h3>
                            <div className="bg-muted/50 rounded-xl divide-y divide-border border border-border">
                                {[
                                    { label: 'Username', value: selectedUser.userName },
                                    { label: 'User ID', value: selectedUser.id },
                                    { label: 'Display name', value: selectedUser.displayName || '—' },
                                    { label: 'External ID', value: selectedUser.externalId || '—' },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex items-center justify-between px-3 py-2.5">
                                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                                        <span className="text-sm font-semibold text-on-surface truncate max-w-[180px]">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">
                                Groups ({(selectedUser.groups || []).length})
                            </h3>
                            {(selectedUser.groups || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground font-medium px-1">Not assigned to any groups</p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {(selectedUser.groups || []).map((g: any) => (
                                        <Badge key={g.value} className="bg-secondary/10 text-secondary border border-border rounded-lg text-xs font-semibold px-2 py-0.5">
                                            {g.display}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section>
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-2">Actions</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(`/users/edit/${selectedUser.id}`)}
                                    className="h-8 rounded-lg text-xs font-semibold border-border hover:bg-muted transition-colors"
                                >
                                    <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit profile
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setIsPasswordDialogOpen(true); }}
                                    className="h-8 rounded-lg text-xs font-semibold border-border hover:bg-muted transition-colors"
                                >
                                    <Key className="w-3.5 h-3.5 mr-1.5" /> Set password
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSendResetLink(selectedUser.id)}
                                    className="h-8 rounded-lg text-xs font-semibold border-border hover:bg-muted transition-colors"
                                >
                                    <Mail className="w-3.5 h-3.5 mr-1.5" /> Reset link
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/groups')}
                                    className="h-8 rounded-lg text-xs font-semibold border-border hover:bg-muted transition-colors"
                                >
                                    <Shield className="w-3.5 h-3.5 mr-1.5" /> Manage groups
                                </Button>
                            </div>
                        </section>

                        <section className="pt-2 border-t border-border">
                            <h3 className="text-xs font-semibold tracking-wide text-destructive uppercase mb-2">Danger zone</h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteUser(selectedUser.id)}
                                className="w-full h-8 rounded-lg text-xs font-semibold border-destructive/20 text-destructive hover:bg-destructive/5 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete user account
                            </Button>
                        </section>
                    </div>
                </div>
            )}

            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-[360px] rounded-xl border border-border bg-card shadow-sm p-card">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold tracking-tight text-on-surface flex items-center gap-2.5">
                            <div className="p-1.5 bg-secondary/10 rounded-lg">
                                <Lock className="w-3.5 h-3.5 text-secondary" />
                            </div>
                            Set password
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-muted-foreground mt-1">
                            Set a new password for <span className="text-on-surface font-semibold">{selectedUser?.displayName || selectedUser?.userName}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3 space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide text-muted-foreground ml-1 uppercase">New password</Label>
                            <Input
                                type="password"
                                placeholder="At least 8 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="h-9 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 font-medium text-sm px-3"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setIsPasswordDialogOpen(false)} className="rounded-lg font-semibold text-xs h-8">Cancel</Button>
                        <Button
                            onClick={handleSetPassword}
                            disabled={!newPassword || newPassword.length < 8 || loading}
                            className="rounded-lg bg-secondary text-secondary-foreground font-semibold text-xs px-4 h-8 shadow-sm"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Update password"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Users;
