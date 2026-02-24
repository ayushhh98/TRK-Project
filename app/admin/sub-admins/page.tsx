"use client";

import { useEffect, useState } from "react";
import {
    ShieldAlert,
    Users,
    Activity,
    Lock,
    Eye,
    CheckCircle2,
    XCircle,
    Database,
    ShieldCheck,
    AlertCircle,
    TerminalSquare
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/api";

type RoleMatrix = {
    id: string;
    title: string;
    purpose: string;
    allowed: string[];
    denied: string[];
};

type RosterItem = {
    wallet: string;
    email: string;
    roleSpan: string[];
    since: string;
    lastActive: string;
};

type AuditLog = {
    time: string;
    role: string;
    action: string;
};

interface SubAdminData {
    roster: RosterItem[];
    matrix: RoleMatrix[];
    auditTrail: AuditLog[];
    totalAdmins: number;
}

export default function SubAdminManagement() {
    const [data, setData] = useState<SubAdminData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/admin/sub-admins/roles', {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });

                if (res.status === 401) {
                    window.location.href = '/admin/login';
                    return;
                }

                const json = await res.json();
                if (json.status === 'success') {
                    setData(json.data);
                    setError(null);
                } else {
                    setError(json.message || 'Failed to sync with Authority Node.');
                }
            } catch (err) {
                console.error('Fetch error', err);
                setError('CONNECTION_FAULT: Unable to calculate real-time authority metrics.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const findMatrixMatch = (id: string, matrixList: RoleMatrix[]) => {
        return matrixList.find(m => m.id === id)?.title || id.toUpperCase();
    };

    if (loading && !data) {
        return (
            <div className="h-96 flex flex-col items-center justify-center gap-4 text-white/20 italic font-black uppercase tracking-widest animate-pulse">
                <Database className="h-8 w-8 text-neutral-500/50" />
                Validating Permission Matrices...
            </div>
        );
    }

    const { roster, matrix, auditTrail, totalAdmins } = data || {};

    return (
        <div className="space-y-8 pb-32">
            {/* Header section with explicit constraints */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/5 pb-6">
                <div className="space-y-1">
                    <Badge variant="outline" className="border-purple-500/20 bg-purple-500/10 text-purple-400 uppercase tracking-[0.2em] text-[10px] font-black">
                        Authority Management
                    </Badge>
                    <h1 className="text-4xl font-display font-black text-white tracking-tight italic">
                        SUB-ADMIN<span className="text-purple-500 italic">SYSTEM</span>
                    </h1>
                    <p className="text-white/40 font-medium uppercase tracking-widest text-xs mt-2 max-w-xl">
                        Allocate isolated, read-only functional roles. Sub-Admins observe, verify, support, and protect. They hold ZERO capability to edit smart-contract logic, ROI percentages, jackpot outcomes, or access user funds.
                    </p>
                </div>

                <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-center gap-4 w-full md:w-auto">
                    <ShieldAlert className="h-8 w-8 text-red-500" />
                    <div>
                        <div className="text-xs font-black uppercase tracking-widest text-red-500">System Hard-Locked</div>
                        <div className="text-[10px] font-medium text-red-400/80">No manual interference possible.<br />Actions are permanently auditable.</div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-sm flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
                {/* 1. Sub-Admin Directory (Roster) */}
                <Card className="bg-[#0f0f0f] border-white/5 h-fit">
                    <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-purple-400" />
                            <div>
                                <CardTitle className="text-sm font-black italic uppercase">Active Roster</CardTitle>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Total Assigned: {totalAdmins || 0}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {roster?.map((admin, i) => (
                            <div key={i} className="p-5 border-b border-white/5 hover:bg-white/[0.02] transition-colors relative">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                            <ShieldCheck className="h-4 w-4 text-purple-400" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-mono text-white/80">{admin.wallet ? `${admin.wallet.slice(0, 6)}...${admin.wallet.slice(-4)}` : admin.email}</div>
                                            <div className="text-[9px] uppercase tracking-widest text-white/30">ID {i + 1}</div>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-black text-[9px] uppercase">Active Tracker</Badge>
                                </div>
                                <div className="space-y-2 mt-4 pl-10 border-l border-white/5 ml-4">
                                    {admin.roleSpan.map((spanId, idx) => (
                                        <div key={idx} className="flex flex-wrap items-center gap-2">
                                            <Badge className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-none uppercase tracking-wider text-[9px] font-black h-5">
                                                {matrix && findMatrixMatch(spanId, matrix)}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute right-5 bottom-4 text-[9px] font-black uppercase text-white/20 tracking-widest">
                                    Online: {admin.lastActive ? new Date(admin.lastActive).toLocaleTimeString() : 'Unknown'}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* 2. Accountability Audit Trail */}
                <Card className="bg-[#0f0f0f] border-white/5 h-fit">
                    <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <TerminalSquare className="h-5 w-5 text-emerald-400" />
                            <div>
                                <CardTitle className="text-sm font-black italic uppercase">Irreversible Action Log</CardTitle>
                                <p className="text-[10px] text-emerald-400/50 uppercase tracking-widest mt-1">Live tracking / No-Delete</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 min-h-[500px] overflow-y-auto custom-scrollbar font-mono">
                        {auditTrail?.map((log, i) => (
                            <div key={i} className="p-4 border-b border-white/5 flex gap-4 text-xs hover:bg-white/[0.01]">
                                <div className="text-white/30 whitespace-nowrap">
                                    [{new Date(log.time).toLocaleTimeString([], { hour12: false })}]
                                </div>
                                <div>
                                    <span className="text-purple-400 font-black">[{log.role}]</span>
                                    <span className="text-white ml-2">{log.action}</span>
                                </div>
                            </div>
                        ))}
                        <div className="p-8 text-center text-white/20 uppercase tracking-[0.2em] font-black text-[10px] animate-pulse">
                            Listening for network authority actions...
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. The 7-Role Permission Matrix Blueprint */}
            <div className="pt-8">
                <div className="flex items-center gap-3 mb-6">
                    <Database className="h-6 w-6 text-white/60" />
                    <div>
                        <h2 className="text-xl font-black italic uppercase text-white tracking-tight">Access Control Topologies</h2>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Hardcoded Rules Extracted from Business Protocol</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {matrix?.map((role, i) => (
                        <Card key={i} className="bg-[#0a0a0a] border-white/5 hover:border-white/10 transition-colors relative group">
                            <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Lock className="h-10 w-10 text-white" />
                            </div>
                            <CardHeader className="pb-4 border-b border-white/5">
                                <CardTitle className="text-sm font-black italic tracking-wide text-white">{role.title}</CardTitle>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest h-6 mt-1 flex items-center">{role.purpose}</p>
                            </CardHeader>
                            <CardContent className="p-5 space-y-6">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-2">
                                        <Eye className="h-3 w-3" /> Monitor (Allowed)
                                    </div>
                                    <ul className="space-y-2">
                                        {role.allowed.map((item, id) => (
                                            <li key={id} className="text-[11px] text-white/60 flex items-start gap-2">
                                                <CheckCircle2 className="h-3 w-3 text-emerald-500/50 mt-0.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3 flex items-center gap-2">
                                        <Lock className="h-3 w-3" /> Hard Locked (Denied)
                                    </div>
                                    <ul className="space-y-2">
                                        {role.denied.map((item, id) => (
                                            <li key={id} className="text-[11px] text-white/60 flex items-start gap-2 line-through opacity-70">
                                                <XCircle className="h-3 w-3 text-red-500/50 mt-0.5 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

        </div>
    );
}
