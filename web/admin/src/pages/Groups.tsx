import React, { useState, useEffect } from 'react';
import {
    getGroups, createGroup, deleteGroup,
    getGroupMembers, addUserToGroup, removeUserFromGroup,
    getSCIMUsers, Group
} from '../api';

interface User {
    id: string;
    userName?: string;
    email?: string;
    emails?: { value: string }[];
    status?: string;
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import {
    Users, UserPlus, Trash2, Search, Plus,
    Loader2, X, ChevronRight, Layers, UserMinus
} from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

const Groups: React.FC = () => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [showCreate, setShowCreate] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [creating, setCreating] = useState(false);

    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [searchUser, setSearchUser] = useState('');

    const fetchGroupsData = async () => {
        setLoading(true);
        try {
            const data = await getGroups();
            setGroups(data.groups || []);
        } catch {
            setError('Failed to load groups.');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const data = await getSCIMUsers();
            setAllUsers(data.Resources || []);
        } catch { }
    };

    useEffect(() => {
        fetchGroupsData();
        fetchAllUsers();
    }, []);

    const handleSelectGroup = async (group: Group) => {
        if (selectedGroup?.id === group.id) { setSelectedGroup(null); return; }
        setSelectedGroup(group);
        setLoadingMembers(true);
        try {
            const list = await getGroupMembers(group.id);
            setMembers(list || []);
        } catch { } finally {
            setLoadingMembers(false);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await createGroup({ name: newGroupName, description: newGroupDesc });
            setShowCreate(false);
            setNewGroupName('');
            setNewGroupDesc('');
            fetchGroupsData();
        } catch {
            setError('Failed to create group.');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!window.confirm('Delete this group?')) return;
        try {
            await deleteGroup(id);
            if (selectedGroup?.id === id) setSelectedGroup(null);
            fetchGroupsData();
        } catch {
            setError('Failed to delete group.');
        }
    };

    const handleAddUser = async (user: User) => {
        if (!selectedGroup) return;
        try {
            await addUserToGroup(selectedGroup.id, user.id);
            const list = await getGroupMembers(selectedGroup.id);
            setMembers(list || []);
        } catch {
            alert('Failed to add user.');
        }
    };

    const handleRemoveUser = async (userID: string) => {
        if (!selectedGroup) return;
        try {
            await removeUserFromGroup(selectedGroup.id, userID);
            const list = await getGroupMembers(selectedGroup.id);
            setMembers(list || []);
        } catch {
            alert('Failed to remove user.');
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAvailableUsers = allUsers.filter(u => {
        const email = (u.email || u.emails?.[0]?.value || '').toLowerCase();
        return !members.find(m => m.id === u.id) && email.includes(searchUser.toLowerCase());
    });

    return (
        <div className="flex h-full gap-0 animate-in fade-in duration-300">
            <div className={cn(
                "flex flex-col transition-all duration-300",
                selectedGroup ? "w-[380px] min-w-[380px]" : "flex-1"
            )}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-on-surface">Groups</h1>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                            {groups.length} identity groups
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative group">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-secondary transition-colors" />
                            <Input
                                placeholder="Filter groups..."
                                className="h-8 w-40 rounded-lg text-xs pl-8 border border-border bg-card focus-visible:ring-secondary/20 font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Dialog open={showCreate} onOpenChange={setShowCreate}>
                            <DialogTrigger asChild>
                                <Button className="h-8 rounded-lg bg-secondary text-secondary-foreground font-semibold text-xs px-3 shadow-sm">
                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> New group
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[420px] p-0 border border-border rounded-xl shadow-sm bg-card overflow-hidden">
                                <div className="bg-secondary p-card text-secondary-foreground">
                                    <DialogHeader>
                                        <DialogTitle className="text-lg font-bold flex items-center gap-3 text-secondary-foreground">
                                            <div className="w-8 h-8 bg-secondary-foreground/10 rounded-lg flex items-center justify-center">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            Create group
                                        </DialogTitle>
                                        <DialogDescription className="text-secondary-foreground/80 text-sm mt-1">
                                            Group users together to manage shared access policies.
                                        </DialogDescription>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleCreateGroup} className="p-card space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Group name</Label>
                                        <Input
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            className="h-9 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 text-sm font-medium"
                                            placeholder="e.g. Engineering"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Description</Label>
                                        <Input
                                            value={newGroupDesc}
                                            onChange={(e) => setNewGroupDesc(e.target.value)}
                                            className="h-9 rounded-lg border border-border bg-card focus-visible:ring-secondary/20 text-sm font-medium"
                                            placeholder="Purpose of this group..."
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={creating} className="w-full h-9 rounded-lg bg-secondary text-secondary-foreground font-semibold text-sm shadow-sm">
                                            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create group'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {error && (
                    <div className="mx-4 mt-3 bg-destructive/5 text-destructive px-4 py-2 rounded-lg border border-destructive/20 text-sm font-semibold">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-muted/30">
                    {loading ? (
                        <div className="h-48 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="py-20 text-center">
                            <p className="text-sm text-muted-foreground font-medium">No groups found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {filteredGroups.map((group) => {
                                const isSelected = selectedGroup?.id === group.id;
                                return (
                                    <div
                                        key={group.id}
                                        onClick={() => handleSelectGroup(group)}
                                        className={cn(
                                            "flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors group",
                                            isSelected
                                                ? "bg-secondary/5 border-l-2 border-secondary"
                                                : "hover:bg-muted/50 border-l-2 border-transparent"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                            isSelected ? "bg-secondary/15" : "bg-muted group-hover:bg-secondary/10"
                                        )}>
                                            <Layers className={cn(
                                                "w-4 h-4 transition-colors",
                                                isSelected ? "text-secondary" : "text-muted-foreground group-hover:text-secondary"
                                            )} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-semibold truncate transition-colors",
                                                isSelected ? "text-secondary" : "text-on-surface"
                                            )}>
                                                {group.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">
                                                {group.description || 'No description'}
                                            </p>
                                        </div>
                                        <ChevronRight className={cn(
                                            "w-3.5 h-3.5 shrink-0 transition-all",
                                            isSelected ? "text-secondary rotate-90" : "text-muted-foreground"
                                        )} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {selectedGroup && (
                <div className="flex-1 border-l border-border bg-card flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-secondary px-6 py-5 text-secondary-foreground shrink-0">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-secondary-foreground/10 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5 text-secondary-foreground" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-secondary-foreground">{selectedGroup.name}</h2>
                                    <p className="text-secondary-foreground/80 text-xs font-medium mt-0.5">
                                        {members.length} member{members.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteGroup(selectedGroup.id)}
                                    className="h-7 px-2 rounded-lg bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground text-xs font-semibold"
                                >
                                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground"
                                    onClick={() => setSelectedGroup(null)}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-card space-y-5">
                        <section>
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">
                                Members ({members.length})
                            </h3>
                            {loadingMembers ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : members.length === 0 ? (
                                <div className="py-6 text-center bg-muted/50 rounded-xl border border-dashed border-border">
                                    <p className="text-sm font-medium text-muted-foreground">No members yet</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {members.map(member => {
                                        const email = member.email || member.emails?.[0]?.value || '';
                                        return (
                                            <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group transition-colors">
                                                <Avatar name={email} size={28} className="h-7 w-7 rounded-lg border border-border overflow-hidden shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-on-surface truncate">{email || member.userName}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveUser(member.id)}
                                                    className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive"
                                                >
                                                    <UserMinus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <section className="border-t border-border pt-5">
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase mb-3">Add members</h3>
                            <div className="relative group mb-3">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-secondary transition-colors" />
                                <Input
                                    placeholder="Search users to add..."
                                    className="h-8 pl-8 rounded-lg text-xs border border-border bg-card focus-visible:ring-secondary/20 font-medium"
                                    value={searchUser}
                                    onChange={(e) => setSearchUser(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1 max-h-[240px] overflow-y-auto custom-scrollbar">
                                {filteredAvailableUsers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground font-medium text-center py-4">No users available to add</p>
                                ) : filteredAvailableUsers.map(user => {
                                    const email = user.email || user.emails?.[0]?.value || '';
                                    return (
                                        <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group transition-colors">
                                            <Avatar name={email} size={28} className="h-7 w-7 rounded-lg border border-border overflow-hidden shrink-0" />
                                            <p className="flex-1 text-sm font-semibold text-on-surface truncate">{email || user.userName}</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleAddUser(user)}
                                                className="h-6 px-2 rounded-md text-xs font-semibold bg-secondary/10 text-secondary hover:bg-secondary hover:text-secondary-foreground transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <UserPlus className="w-3 h-3 mr-1" /> Add
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Groups;
