"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/components/providers/Web3Provider";
import { Lock, AlertTriangle, RefreshCcw } from "lucide-react";
import { usePathname } from "next/navigation";

interface SystemStatus {
    maintenanceMode: boolean;
    pauseRegistrations: boolean;
    pauseDeposits: boolean;
    pauseWithdrawals: boolean;
    pauseLuckyDraw: boolean;
}

export default function MaintenanceOverlay() {
    const socket = useSocket();
    const pathname = usePathname();
    const [isActive, setIsActive] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [status, setStatus] = useState<SystemStatus | null>(null);

    // Check initial status via API
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/content/system-status`);
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                const text = await res.text();
                // Check if the response is actually JSON before parsing
                if (text && text.startsWith('{')) {
                    const json = JSON.parse(text);
                    if (json.status === 'success') {
                        setStatus(json.data);
                        setIsActive(json.data.maintenanceMode);
                    }
                }
            } catch (err) {
                console.warn("Soft fail checking system status:", err);
                // Fail open so we don't accidentally block the entire site permanently if the DB is down or returning a bad proxy response.
            }
        };

        checkStatus();

        // Check if user is admin (simple local check for bypass, real auth happens on backend)
        // In a real app, you'd check a robust auth hook or cookie
        const token = typeof window !== 'undefined' ? localStorage.getItem('trk_token') : null;
        if (token) {
            try {
                // Simple decode to check role (not secure for sensitive data, but fine for UI bypass)
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (['admin', 'superadmin'].includes(payload.role)) {
                    setIsAdmin(true);
                }
            } catch (e) { }
        }

    }, []);

    // Listen for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleSystemUpdate = (data: any) => {
            if (data && typeof data.maintenanceMode !== 'undefined') {
                setIsActive(data.maintenanceMode);
            }
        };

        // Listen to both event types for robustness
        socket.on('system:config_updated', handleSystemUpdate);
        socket.on('system:maintenance_mode', (enabled: boolean) => setIsActive(enabled));

        return () => {
            socket.off('system:config_updated', handleSystemUpdate);
            socket.off('system:maintenance_mode');
        };
    }, [socket]);

    // Admin Bypass: If admin, show a small indicator instead of full block
    if (isActive && isAdmin) {
        return (
            <div className="fixed bottom-4 right-4 z-[9999] bg-red-900/90 border border-red-500 text-red-100 px-4 py-2 rounded-lg shadow-2xl flex items-center gap-3 backdrop-blur-md">
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                <div className="flex flex-col">
                    <span className="font-bold text-sm">Maintenance Active</span>
                    <span className="text-xs text-red-300">You have bypass access</span>
                </div>
            </div>
        );
    }

    // Regular User: Full blocking overlay
    if (isActive) {
        return (
            <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                <div className="max-w-md w-full relative">
                    {/* Animated Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-red-500/20 rounded-full blur-3xl animate-pulse"></div>

                    <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mb-2">
                            <Lock className="w-10 h-10 text-red-500" />
                        </div>

                        <h1 className="text-3xl font-bold text-white tracking-tight">System Maintenance</h1>

                        <p className="text-zinc-400 text-lg leading-relaxed">
                            We are currently performing scheduled upgrades to improve your experience. Access is temporarily restricted.
                        </p>

                        <div className="w-full h-px bg-zinc-800 my-2"></div>

                        <div className="flex flex-col gap-2 text-sm text-zinc-500">
                            <div className="flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span>Funds are safe on-chain</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                <span>Smart contracts operational</span>
                            </div>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Check Status
                        </button>
                    </div>

                    <p className="mt-8 text-zinc-600 text-sm">
                        Expected duration: ~15-30 minutes
                    </p>
                </div>
            </div>
        );
    }

    // Always allow access to admin routes (checked here after all hooks)
    if (pathname?.startsWith('/admin')) {
        return null;
    }

    return null;
}
