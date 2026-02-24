"use client";

import { useEffect, useState } from "react";
import {
    FileText, Save, RefreshCw, AlertCircle, Eye,
    CheckCircle2, Lock, Globe, Settings, ChevronRight,
    Info, Users, Scale, FileCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/api";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function LegalManagement() {
    const [content, setContent] = useState<any>({});
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('terms');
    const [saving, setSaving] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    const docLabels: any = {
        terms: 'Terms of Service',
        privacy_policy: 'Privacy Policy',
        cookie_policy: 'Cookie Policy',
        risk_disclaimer: 'Risk Disclaimer',
        aml_notice: 'AML Notice',
        no_guarantee: 'No Guarantee'
    };

    useAdminSocket({
        onLegalUpdate: ({ type, section }: { type: string, section: any }) => {
            setContent((prev: any) => ({ ...prev, [type]: section.content }));
        },
        onLegalStatsUpdate: (data) => {
            setStats(data);
            setLastSync(new Date());
        }
    });

    useEffect(() => {
        fetchLegal();
    }, []);

    const fetchLegal = async () => {
        try {
            const res = await fetch('/api/admin/legal', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (res.status === 401) {
                window.location.href = '/admin/login';
                return;
            }

            const data = await res.json();
            if (data.status === 'success') {
                const map: any = {};
                Object.keys(data.data).forEach(type => {
                    map[type] = data.data[type].content;
                });
                setContent(map);
            }
        } catch (err) {
            console.error('Legal fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setSaving(true);
        try {
            await fetch(`/api/admin/legal/${activeTab}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ content: content[activeTab] })
            });
        } catch (err) {
            console.error('Update error', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading && !stats) return <div>Synchronizing legal directives...</div>;

    const compliance = stats?.compliance || { totalUsers: 0, acceptedLatest: 0, pendingAcceptance: 0 };
    const versions = stats?.versions || {};

    return (
        <div className="space-y-8 pb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <Badge variant="outline" className="border-cyan-500/20 bg-cyan-500/10 text-cyan-400 uppercase tracking-[0.2em] text-[10px] font-black">
                        Governance & Compliance
                    </Badge>
                    <h1 className="text-4xl font-display font-black text-white tracking-tight italic uppercase">
                        Legal<span className="text-cyan-500 italic">Manager</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#050505] border border-white/5 rounded-xl">
                        <Globe className={cn("h-4 w-4", lastSync ? "text-cyan-500" : "text-neutral-500")} />
                        <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">{lastSync ? `Sync: ${lastSync.toLocaleTimeString()}` : 'Awaiting..'}</span>
                    </div>
                    <Button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="bg-cyan-600 text-white font-black h-10 rounded-xl px-8 hover:bg-cyan-500"
                    >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        PUBLISH
                    </Button>
                </div>
            </div>

            {/* Compliance Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="bg-[#0f0f0f] border-white/5">
                    <CardContent className="p-6 flex items-center justify-between border-t border-t-blue-500">
                        <div>
                            <div className="text-[9px] font-black uppercase text-white/40 tracking-widest">Network Coverage</div>
                            <div className="text-2xl font-black italic text-white mt-1">{compliance.totalUsers.toLocaleString()}</div>
                        </div>
                        <Users className="h-6 w-6 text-blue-500" />
                    </CardContent>
                </Card>
                <Card className="bg-[#0f0f0f] border-white/5">
                    <CardContent className="p-6 flex items-center justify-between border-t border-t-emerald-500">
                        <div>
                            <div className="text-[9px] font-black uppercase text-white/40 tracking-widest">Latest Sign-offs</div>
                            <div className="text-2xl font-black italic text-emerald-400 mt-1">{compliance.acceptedLatest.toLocaleString()}</div>
                        </div>
                        <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    </CardContent>
                </Card>
                <Card className="bg-[#0f0f0f] border-white/5">
                    <CardContent className="p-6 flex items-center justify-between border-t border-t-amber-500">
                        <div>
                            <div className="text-[9px] font-black uppercase text-white/40 tracking-widest">Pending Acceptance</div>
                            <div className="text-2xl font-black italic text-amber-500 mt-1">{compliance.pendingAcceptance.toLocaleString()}</div>
                        </div>
                        <Scale className="h-6 w-6 text-amber-500" />
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-[#0f0f0f] border-white/5 shadow-2xl">
                        <CardHeader className="border-b border-white/5 pb-4 bg-cyan-500/5">
                            <CardTitle className="text-sm font-black italic text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                <FileCheck className="h-4 w-4" /> Policy Matrix
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            {Object.keys(docLabels).map((docId) => {
                                const vData = versions[docId] || { version: 1 };
                                return (
                                    <button
                                        key={docId}
                                        onClick={() => setActiveTab(docId)}
                                        className={cn(
                                            "w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all group border text-left",
                                            activeTab === docId ? "bg-cyan-500/10 border-cyan-500/30" : "bg-black/20 border-white/5 hover:bg-white/5"
                                        )}
                                    >
                                        <div className="space-y-1">
                                            <div className={cn("text-xs font-black uppercase tracking-widest", activeTab === docId ? "text-cyan-400" : "text-white/70 group-hover:text-white")}>
                                                {docLabels[docId]}
                                            </div>
                                            <div className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold">
                                                Ver {vData.version}
                                            </div>
                                        </div>
                                        <ChevronRight className={cn("h-4 w-4 transition-transform", activeTab === docId ? "text-cyan-400 translate-x-1" : "text-white/20")} />
                                    </button>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <Card className="bg-[#050505] border border-white/5">
                        <CardContent className="p-5 flex items-start gap-4">
                            <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                                <Info className="h-4 w-4 text-cyan-500" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-[10px] uppercase font-black tracking-widest text-white/50">Versioning Engine</h4>
                                <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                                    Publishing an update invokes a strict version bump. Users with older agreement signatures will be gated globally until they re-acknowledge via cryptographic prompt.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-3">
                    <Card className="bg-[#0f0f0f] border-white/5 h-[650px] flex flex-col shadow-2xl">
                        <CardHeader className="bg-black/40 border-b border-white/5 p-5 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Settings className="h-4 w-4 text-white/40" />
                                <CardTitle className="text-sm font-black italic uppercase text-white/80">
                                    EDITING: <span className="text-cyan-400">{docLabels[activeTab]}</span>
                                </CardTitle>
                            </div>
                            <Badge className="bg-cyan-500/10 text-cyan-400 border-none font-black text-[9px] uppercase tracking-widest">
                                Markdown Mode Active
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 flex flex-col">
                            <Textarea
                                className="flex-1 bg-transparent border-none p-6 font-mono text-xs md:text-sm text-emerald-400/80 leading-relaxed focus:ring-0 resize-none h-full custom-scrollbar selection:bg-cyan-500/30"
                                value={content[activeTab] || ""}
                                onChange={(e) => setContent({ ...content, [activeTab]: e.target.value })}
                                placeholder={`Enter ${docLabels[activeTab]} content here using Markdown formatting...`}
                            />
                            <div className="bg-[#050505] p-4 flex items-center justify-between border-t border-white/5">
                                <p className="text-[9px] uppercase font-black tracking-widest text-white/30 hidden md:block">
                                    Local draft preserved. Network persistence requires explicit PUBLISH command.
                                </p>
                                <p className="text-[9px] text-white/20 uppercase font-black">
                                    Current Length: {(content[activeTab] || "").length} Chars
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
