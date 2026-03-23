"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getToken } from "@/lib/api";
import { toast } from "sonner";
import { Settings, Save, AlertCircle } from "lucide-react";

export function RoiConfigModal() {
    const [open, setOpen] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) fetchConfig();
    }, [open]);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/roi/config', {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const d = await res.json();
            if (d.status === 'success') {
                setConfig(d.data);
            }
        } catch (e) {
            toast.error("Failed to load ROI config");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/roi/config', {
                method: 'PUT',
                headers: { 
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });
            const d = await res.json();
            if (d.status === 'success') {
                toast.success("Protocol configuration updated securely.");
                setOpen(false);
            } else {
                toast.error(d.message || "Failed to save");
            }
        } catch (e) {
            toast.error("Network error saving config");
        } finally {
            setSaving(false);
        }
    };

    const updateNested = (category: string, field: string, value: any) => {
        setConfig((prev: any) => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: Number(value)
            }
        }));
    };

    const updateBool = (category: string, field: string, value: boolean) => {
        setConfig((prev: any) => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: value
            }
        }));
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-rose-500/20 hover:bg-rose-500/10 text-rose-400 gap-2">
                    <Settings className="w-4 h-4" /> Configure Protocol
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-[#0a0a0a] border-rose-500/20 text-white max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-wider flex items-center gap-3">
                        <Settings className="text-rose-500" />
                        Yield Stabilizer Protocol Settings
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="p-8 text-center text-rose-400 animate-pulse font-mono tracking-widest text-xs uppercase">
                        Fetching Protocol Matrix...
                    </div>
                ) : config && (
                    <div className="space-y-8 py-4">
                        <div className="grid grid-cols-2 gap-6">
                            {/* Distribution Controls */}
                            <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/5">
                                <h3 className="font-bold text-rose-400 tracking-widest uppercase text-xs">Engine Control</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-mono text-white/70">Distribution Active</span>
                                    <input 
                                        type="checkbox" 
                                        checked={config.distribution?.isActive}
                                        onChange={(e) => updateBool('distribution', 'isActive', e.target.checked)}
                                        className="h-5 w-5 bg-black border-rose-500 accent-rose-500 rounded cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/50 uppercase tracking-widest">Min Loss Threshold (USDT)</label>
                                    <Input 
                                        type="number" 
                                        className="bg-black border-white/10 mt-1 font-mono"
                                        value={config.lossEngine?.minLossThreshold} 
                                        onChange={(e) => updateNested('lossEngine', 'minLossThreshold', e.target.value)} 
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-white/50 uppercase tracking-widest">Min Referral Volume (USDT)</label>
                                    <Input 
                                        type="number" 
                                        className="bg-black border-white/10 mt-1 font-mono"
                                        value={config.eligibility?.minReferralVolume} 
                                        onChange={(e) => updateNested('eligibility', 'minReferralVolume', e.target.value)} 
                                    />
                                </div>
                            </div>

                            {/* Phase Rates */}
                            <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/5">
                                <h3 className="font-bold text-amber-400 tracking-widest uppercase text-xs">Phase Yield Rates (%)</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="col-span-2">
                                        <label className="text-xs text-white/50 uppercase tracking-widest">Phase 1 (up to 100k nodes)</label>
                                        <Input type="number" step="0.01" value={config.rates?.phase1} onChange={(e) => updateNested('rates', 'phase1', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-white/50 uppercase tracking-widest">Phase 2 (up to 1M nodes)</label>
                                        <Input type="number" step="0.01" value={config.rates?.phase2} onChange={(e) => updateNested('rates', 'phase2', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-white/50 uppercase tracking-widest">Phase 3 (&gt; 1M nodes)</label>
                                        <Input type="number" step="0.01" value={config.rates?.phase3} onChange={(e) => updateNested('rates', 'phase3', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Recovery Caps */}
                            <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/5">
                                <h3 className="font-bold text-blue-400 tracking-widest uppercase text-xs">Recovery Caps (%)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-white/50 font-mono tracking-widest">Base (0 refs)</label>
                                        <Input type="number" value={config.caps?.base} onChange={(e) => updateNested('caps', 'base', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/50 font-mono tracking-widest">Tier 1 (5 refs)</label>
                                        <Input type="number" value={config.caps?.refs5} onChange={(e) => updateNested('caps', 'refs5', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/50 font-mono tracking-widest">Tier 2 (10 refs)</label>
                                        <Input type="number" value={config.caps?.refs10} onChange={(e) => updateNested('caps', 'refs10', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/50 font-mono tracking-widest">Max (20 refs)</label>
                                        <Input type="number" value={config.caps?.refs20} onChange={(e) => updateNested('caps', 'refs20', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                </div>
                            </div>

                            {/* ROI on ROI Map */}
                            <div className="space-y-4 p-4 rounded-xl border border-white/10 bg-white/5">
                                <h3 className="font-bold text-purple-400 tracking-widest uppercase text-xs">Network Flux Alloc (%)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-white/50 font-mono tracking-widest">Level 1</label>
                                        <Input type="number" value={config.roiOnRoi?.level1} onChange={(e) => updateNested('roiOnRoi', 'level1', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/50 font-mono tracking-widest">Level 2-5</label>
                                        <Input type="number" value={config.roiOnRoi?.level2to5} onChange={(e) => updateNested('roiOnRoi', 'level2to5', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/50 font-mono tracking-widest">Level 6-10</label>
                                        <Input type="number" value={config.roiOnRoi?.level6to10} onChange={(e) => updateNested('roiOnRoi', 'level6to10', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/50 font-mono tracking-widest">Level 11-15</label>
                                        <Input type="number" value={config.roiOnRoi?.level11to15} onChange={(e) => updateNested('roiOnRoi', 'level11to15', e.target.value)} className="bg-black border-white/10 mt-1 font-mono" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black tracking-widest uppercase py-6"
                        >
                            {saving ? 'Syncing Protocol Matrix...' : 'Commit Protocol Update Request'} <Save className="ml-2 w-5 h-5" />
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
