"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShieldAlert, Activity, Save, AlertTriangle, Lock, Unlock, Database } from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function MasterKeySettings() {
    const { user } = useWallet();
    const router = useRouter();
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.role !== 'superadmin') {
            toast.error("UNAUTHORIZED: Super Admin access required.");
            router.push('/admin/dashboard');
            return;
        }

        if (user?.role === 'superadmin') {
            fetchConfig();
        }
    }, [user, router]);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/system/config', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (data.status === 'success') {
                setConfig(data.data);
            }
        } catch (e) {
            console.error("Config fetch error", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (section: 'economics' | 'roi', payload: any) => {
        try {
            const res = await fetch(`/api/admin/system/config/${section}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === 'success') {
                toast.success(`${section.toUpperCase()} Protocol Updated Successfully`);
                fetchConfig();
            } else {
                toast.error(data.message || "Update sequence failed");
            }
        } catch (e) {
            toast.error("Network error during Master Key override");
        }
    };

    const triggerEmergency = async (action: 'pause' | 'resume', type: 'economics' | 'withdrawals') => {
        try {
            const res = await fetch(`/api/admin/${type}/${action}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nodes: ['CORE'], reason: 'Super Admin Master Override', pause: true }) // Adjust depending on the specific backend route requirements
            });
            const data = await res.json();
            if (data.status === 'success') {
                toast.success(`Emergency Override: ${action.toUpperCase()} ${type.toUpperCase()}`);
            } else {
                toast.error(data.message || "Override failed");
            }
        } catch (e) {
            toast.error("Critical failure during override");
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center font-black uppercase tracking-widest text-primary/50">Establishing Secure Uplink...</div>;

    return (
        <div className="min-h-screen bg-black text-white/90 p-8 space-y-10 pb-32">
            <div className="relative group overflow-hidden rounded-[40px] border border-amber-500/10 bg-amber-500/5 p-12 transition-all duration-700 shadow-[0_0_50px_rgba(245,158,11,0.05)]">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 bg-amber-500/5" />
                <div className="relative flex flex-col items-center justify-center text-center gap-6">
                    <div className="flex items-center gap-4">
                        <Activity className="h-8 w-8 text-amber-500 animate-pulse" />
                        <h1 className="text-6xl font-display font-black tracking-tighter italic uppercase text-white">
                            MASTER <span className="text-amber-500">KEY</span>
                        </h1>
                    </div>
                    <p className="text-amber-500/50 font-mono text-xs uppercase tracking-[0.5em] max-w-xl border-t border-amber-500/10 pt-6">
                        CRITICAL PROTOCOL CONFIGURATION // SUPER ADMIN ONLY
                    </p>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Economy Settings */}
                <Card className="bg-[#0a0a0a] border-white/5 p-8 relative overflow-hidden group hover:border-amber-500/20 transition-all duration-500 shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Database className="h-32 w-32 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase text-amber-500 mb-8 relative z-10 flex items-center gap-3">
                        <Database className="h-5 w-5" /> Economics Engine
                    </h2>
                    
                    <div className="space-y-6 relative z-10">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black tracking-widest uppercase text-white/40">Sustainability Fee (%)</label>
                                <input 
                                    type="number" 
                                    defaultValue={config?.system?.withdrawal?.sustainabilityFee || 10}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-amber-500 transition-colors"
                                    id="sust-fee"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black tracking-widest uppercase text-white/40">Referral Multiple Cap</label>
                                <input 
                                    type="number" 
                                    defaultValue={config?.system?.economics?.referralMultiplierCap || 3}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-amber-500 transition-colors"
                                    id="ref-cap"
                                />
                            </div>
                        </div>
                        <Button 
                            className="w-full mt-4 bg-amber-500 text-black hover:bg-amber-400 font-black uppercase tracking-widest rounded-xl transition-all"
                            onClick={() => {
                                const fee = parseFloat((document.getElementById('sust-fee') as HTMLInputElement).value);
                                const cap = parseFloat((document.getElementById('ref-cap') as HTMLInputElement).value);
                                handleSave('economics', { "withdrawal.sustainabilityFee": fee, "economics.referralMultiplierCap": cap });
                            }}
                        >
                            <Save className="h-4 w-4 mr-2" /> Commit Economic Override
                        </Button>
                    </div>
                </Card>

                {/* Emergency Controls */}
                <Card className="bg-[#0a0a0a] border-red-500/20 p-8 relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <AlertTriangle className="h-32 w-32 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black italic uppercase text-red-500 mb-8 relative z-10 flex items-center gap-3">
                        <ShieldAlert className="h-5 w-5" /> DEFCON / Killswitch
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        <div className="space-y-4 p-4 border border-red-500/10 bg-red-500/5 rounded-2xl">
                            <h3 className="text-xs font-black uppercase text-red-400">Withdrawal Operations</h3>
                            <div className="flex gap-2">
                                <Button onClick={() => triggerEmergency('pause', 'withdrawals')} className="flex-1 bg-red-950 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white text-[10px] font-black uppercase"><Lock className="mr-2 h-3 w-3" /> Pause</Button>
                                <Button onClick={() => triggerEmergency('resume', 'withdrawals')} className="flex-1 bg-emerald-950 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white text-[10px] font-black uppercase"><Unlock className="mr-2 h-3 w-3" /> Resume</Button>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 border border-red-500/10 bg-red-500/5 rounded-2xl">
                            <h3 className="text-xs font-black uppercase text-red-400">Yield / ROI Distribution</h3>
                            <div className="flex gap-2">
                                <Button onClick={() => triggerEmergency('pause', 'economics')} className="flex-1 bg-red-950 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white text-[10px] font-black uppercase"><Lock className="mr-2 h-3 w-3" /> Pause</Button>
                                <Button onClick={() => triggerEmergency('resume', 'economics')} className="flex-1 bg-emerald-950 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white text-[10px] font-black uppercase"><Unlock className="mr-2 h-3 w-3" /> Resume</Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
