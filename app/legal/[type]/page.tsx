"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ShieldCheck, FileText, Calendar, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getApiBase } from "@/lib/api";

const TYPE_MAP: Record<string, string> = {
    terms: "Terms of Service",
    privacy_policy: "Privacy Policy",
    risk_disclaimer: "Risk Disclaimer",
    cookie_policy: "Cookie Policy",
    aml_notice: "AML Notice",
    no_guarantee: "No Guarantee Notice"
};

export default function LegalPage() {
    const params = useParams();
    const router = useRouter();
    const type = params?.type as string;

    const [content, setContent] = useState<string | null>(null);
    const [meta, setMeta] = useState<{ version: number, lastUpdated: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!type) return;

        const fetchContent = async () => {
            try {
                // Determine API endpoint based on type
                // Mapping footer links to backend types if needed, but we try to keep them synced
                let apiType = type;
                if (type === 'privacy') apiType = 'privacy_policy';
                if (type === 'cookies') apiType = 'cookie_policy';
                if (type === 'risk') apiType = 'risk_disclaimer';

                const res = await fetch(`${getApiBase()}/api/content/legal/${apiType}`);
                if (!res.ok) throw new Error("Failed to fetch");

                const data = await res.json();
                if (data.status === 'success') {
                    setContent(data.data.content);
                    setMeta({
                        version: data.data.version,
                        lastUpdated: data.data.lastUpdated
                    });
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error(err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [type]);

    const title = TYPE_MAP[type] || TYPE_MAP[type === 'privacy' ? 'privacy_policy' : type === 'cookies' ? 'cookie_policy' : type === 'risk' ? 'risk_disclaimer' : type] || "Legal Document";

    return (
        <div className="min-h-screen bg-black relative selection:bg-primary/30 text-white">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_50%)]" />

            <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            <span className="font-bold tracking-wide">Legal Center</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-8">
                        <h1 className="text-4xl font-display font-black text-white tracking-tight mb-4">{title}</h1>
                        <div className="flex items-center gap-6 text-sm text-white/40">
                            {meta?.lastUpdated && (
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span>Last Updated: {new Date(meta.lastUpdated).toLocaleDateString()}</span>
                                </div>
                            )}
                            {meta?.version && (
                                <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
                                    v{meta.version}.0
                                </div>
                            )}
                        </div>
                    </div>

                    <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
                        <CardContent className="p-8 md:p-12">
                            {loading ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-4 bg-white/5 rounded w-3/4" />
                                    <div className="h-4 bg-white/5 rounded w-full" />
                                    <div className="h-4 bg-white/5 rounded w-5/6" />
                                    <div className="h-4 bg-white/5 rounded w-2/3" />
                                </div>
                            ) : error ? (
                                <div className="text-center py-12 text-white/40">
                                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Failed to load legal content.</p>
                                    <Button variant="ghost" onClick={() => window.location.reload()} className="mt-2 text-primary">Retry</Button>
                                </div>
                            ) : (
                                <div className="prose prose-invert prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-p:text-white/70 prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-white">
                                    {/* Simple markdown-like rendering for now, processing newlines */}
                                    {content?.split('\n').map((line, i) => {
                                        if (line.startsWith('## ')) return <h2 key={i} className="text-2xl mt-8 mb-4 text-white">{line.replace('## ', '')}</h2>;
                                        if (line.startsWith('# ')) return <h1 key={i} className="text-3xl mt-10 mb-6 text-white border-b border-white/10 pb-2">{line.replace('# ', '')}</h1>;
                                        if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc marker:text-primary">{line.replace('- ', '')}</li>;
                                        if (line.trim() === '') return <div key={i} className="h-4" />;
                                        return <p key={i} className="mb-4 leading-relaxed">{line}</p>;
                                    })}
                                    {!content && (
                                        <p className="text-center italic text-white/30 py-12">No content available for this section yet.</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </main>
        </div>
    );
}
