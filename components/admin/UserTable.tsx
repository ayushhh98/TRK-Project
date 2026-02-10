"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, MoreVertical, Shield, Ban, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { adminAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
    _id: string;
    email: string;
    walletAddress?: string;
    role: string;
    isBanned: boolean;
    isActive: boolean;
    credits: number;
    rewardPoints: number;
}

export function UserTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await adminAPI.getUsers({ page, search, limit: 10 });
            if (res.status === 'success') {
                setUsers(res.data.users);
                setTotalPages(res.data.totalPages);
            }
        } catch (error) {
            toast.error("Failed to fetch users");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(fetchUsers, 500);
        return () => clearTimeout(debounce);
    }, [search, page]);

    const handleBan = async (id: string, currentStatus: boolean) => {
        try {
            if (currentStatus) {
                await adminAPI.unbanUser(id);
                toast.success("User unbanned");
            } else {
                await adminAPI.banUser(id, "Admin action");
                toast.success("User banned");
            }
            fetchUsers();
        } catch (error) {
            toast.error("Action failed");
        }
    };

    const handleRole = async (id: string, newRole: 'player' | 'admin') => {
        try {
            await adminAPI.updateRole(id, newRole);
            toast.success(`Role updated to ${newRole}`);
            fetchUsers();
        } catch (error) {
            toast.error("Role update failed");
        }
    };

    return (
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    User Management
                </CardTitle>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search email or wallet..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 bg-black/20 border-white/10 text-sm"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border border-white/5 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5 text-muted-foreground uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="p-4 font-medium">Identity</th>
                                <th className="p-4 font-medium">Balances</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        Loading records...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user._id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-white">{user.email || "No Email"}</div>
                                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                {user.walletAddress || "No Wallet Linked"}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-emerald-400 font-mono font-medium">
                                                {user.rewardPoints} SC
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono">
                                                {user.credits} GC
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                    user.isBanned ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                                                )}>
                                                    {user.isBanned ? "Banned" : "Active"}
                                                </span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                    user.role === 'admin' ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                                                )}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10 text-white">
                                                    <DropdownMenuItem onClick={() => handleBan(user._id, user.isBanned)}>
                                                        {user.isBanned ? <CheckCircle className="mr-2 h-4 w-4 text-green-400" /> : <Ban className="mr-2 h-4 w-4 text-red-400" />}
                                                        {user.isBanned ? "Unban User" : "Ban User"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleRole(user._id, user.role === 'admin' ? 'player' : 'admin')}>
                                                        <Shield className="mr-2 h-4 w-4 text-purple-400" />
                                                        {user.role === 'admin' ? "Demote to Player" : "Promote to Admin"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="text-xs bg-transparent border-white/10 hover:bg-white/5"
                        >
                            <ChevronLeft className="h-3 w-3 mr-1" /> Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="text-xs bg-transparent border-white/10 hover:bg-white/5"
                        >
                            Next <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card >
    );
}
