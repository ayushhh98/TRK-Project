"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
    Network,
    Search,
    RefreshCw,
    Minus,
    Plus,
    Layers,
    Trophy,
    User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/api";
import { cn } from "@/lib/utils";

interface TreeNode {
    id: string;
    wallet: string;
    tier?: string;
    rank?: number;
    earnings: number;
    children: TreeNode[];
}

export default function NetworkTree() {
    const [rootId, setRootId] = useState("");
    const [treeData, setTreeData] = useState<TreeNode | null>(null);
    const [loading, setLoading] = useState(false);
    const [depth, setDepth] = useState(5);
    const searchParams = useSearchParams();

    useEffect(() => {
        const rootParam = searchParams.get('root');
        if (rootParam) {
            setRootId(rootParam);
            fetchTree(rootParam);
        }
    }, [searchParams]);

    const fetchTree = async (id?: string) => {
        const targetId = id || rootId;
        if (!targetId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/admin/network/tree/${targetId}?depth=${depth}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (res.status === 401) {
                window.dispatchEvent(new CustomEvent('admin-session-expired'));
                return;
            }

            const data = await res.json();
            if (data.status === 'success') {
                setTreeData(data.data);
            }
        } catch (err) {
            console.error('Tree fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-32 max-w-[1600px] mx-auto overflow-x-hidden">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Protocol_Visualizer_v2.1</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-black text-white tracking-tighter italic uppercase leading-[0.9]">
                        Network<span className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">Grid</span>
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-[2rem] backdrop-blur-md">
                    <div className="flex items-center gap-3 px-6 h-12 bg-white/5 border border-white/10 rounded-2xl group transition-all focus-within:border-blue-500/30">
                        <Search className="h-4 w-4 text-white/20 group-focus-within:text-blue-400" />
                        <input
                            placeholder="Root_Wallet_Address..."
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-white placeholder:text-white/10 w-full sm:w-64"
                            value={rootId}
                            onChange={(e) => setRootId(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchTree()}
                        />
                    </div>
                    <div className="flex items-center gap-3 px-6 h-12 bg-white/5 border border-white/10 rounded-2xl">
                        <Layers className="h-4 w-4 text-white/20" />
                        <span className="text-[10px] font-black text-white/20 uppercase">Depth:</span>
                        <input
                            type="number"
                            value={depth}
                            min={1}
                            max={10}
                            onChange={(e) => setDepth(parseInt(e.target.value))}
                            className="w-10 bg-transparent text-sm font-black text-blue-400 focus:outline-none text-center"
                        />
                    </div>
                    <Button onClick={() => fetchTree()} className="h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                        GENERATE TREE
                    </Button>
                </div>
            </div>

            <Card className="bg-black/40 border-white/5 min-h-[700px] rounded-[3rem] relative overflow-hidden backdrop-blur-sm shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />

                {loading && (
                    <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-6">
                        <div className="relative">
                            <RefreshCw className="h-16 w-16 text-blue-500 animate-spin" />
                            <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse" />
                        </div>
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] animate-pulse">Recursive_Mapping_Active</div>
                    </div>
                )}

                <CardContent className="p-10 md:p-20 overflow-auto scrollbar-hide">
                    {!treeData ? (
                        <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-8">
                            <div className="h-32 w-32 rounded-full border border-dashed border-white/10 flex items-center justify-center relative">
                                <Network className="h-12 w-12 text-white/10" />
                                <div className="absolute inset-0 border border-blue-500/10 rounded-full animate-spin-slow" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white/20 uppercase italic tracking-widest">Protocol Matrix Idle</h3>
                                <p className="text-[9px] font-bold text-white/10 tracking-[0.3em] uppercase">Initialize root node to visualize topological structure</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center min-w-max py-10">
                            <TreeNodeComponent node={treeData} depth={0} />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function TreeNodeComponent({ node, depth }: { node: TreeNode, depth: number }) {
    const [expanded, setExpanded] = useState(depth < 2);

    // Determine rank styling
    const getRankStyles = () => {
        const tierStr = node.tier?.toLowerCase() || '';
        if (tierStr.includes('bronze')) return { border: 'border-stone-500/30', bg: 'bg-stone-500/10', text: 'text-stone-400', icon: Trophy };
        if (tierStr.includes('silver')) return { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Trophy };
        if (tierStr.includes('gold')) return { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Trophy };
        if (tierStr.includes('platinum')) return { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: Trophy };
        if (tierStr.includes('diamond')) return { border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-400', icon: Trophy };
        if (tierStr.includes('crown')) return { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Trophy };

        // Tier 2 highligh
        if (node.tier?.includes('2')) return { border: 'border-amber-500/40', bg: 'bg-amber-500/5', text: 'text-amber-500', icon: User };

        return { border: 'border-white/5', bg: 'bg-white/[0.02]', text: 'text-white/40', icon: User };
    };

    const styles = getRankStyles();

    return (
        <div className="flex flex-col items-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className={cn(
                    "relative p-6 rounded-[2rem] bg-black/40 border-2 backdrop-blur-xl transition-all w-72 group",
                    styles.border,
                    node.tier?.includes('2') ? "shadow-[0_0_40px_rgba(245,158,11,0.1)]" : "shadow-xl"
                )}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent rounded-[2rem] pointer-events-none" />

                <div className="flex flex-col gap-4 relative z-10">
                    <div className="flex items-center justify-between">
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
                            styles.bg, styles.border, styles.text
                        )}>
                            <styles.icon className="h-6 w-6" />
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Total_Yield</div>
                            <div className="text-xl font-mono font-black text-white tracking-tighter">
                                ${(node.earnings || 0).toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[140px]">
                                {node.wallet.includes('0x') ? `${node.wallet.slice(0, 6)}...${node.wallet.slice(-4)}` : node.wallet}
                            </div>
                            <div className={cn("px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest", styles.bg, styles.border, styles.text)}>
                                {node.tier || 'INACTIVE'}
                            </div>
                        </div>

                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: node.tier?.includes('2') ? '100%' : '30%' }}
                                className={cn("h-full rounded-full", node.tier?.includes('2') ? "bg-amber-500" : "bg-white/20")}
                            />
                        </div>
                    </div>
                </div>

                {node.children.length > 0 && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-[#0a0a0a] border-2 border-white/5 flex items-center justify-center hover:border-blue-500/30 hover:scale-110 transition-all z-20 group/btn"
                    >
                        {expanded ? <Minus className="h-4 w-4 text-white/20 group-hover/btn:text-red-400" /> : <Plus className="h-4 w-4 text-white/20 group-hover/btn:text-blue-400" />}
                    </button>
                )}
            </motion.div>

            {expanded && node.children.length > 0 && (
                <div className="flex gap-20 mt-20 relative">
                    {/* High-tech Connector lines */}
                    <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 h-20 w-px bg-gradient-to-b from-blue-500/40 via-blue-500/10 to-transparent" />
                    <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent shadow-[0_0_10px_rgba(59,130,246,0.1)]" />

                    {node.children.map((child, i) => (
                        <div key={child.id} className="relative">
                            {/* Individual vertical branch line */}
                            <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 h-10 w-px bg-white/10" />
                            <TreeNodeComponent node={child} depth={depth + 1} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
