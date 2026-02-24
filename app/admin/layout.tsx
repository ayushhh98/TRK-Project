"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, removeToken } from "@/lib/api";
import { Shield } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isConnected, isLoading } = useWallet();
    const router = useRouter();
    const pathname = usePathname();
    const [isAdminAuth, setAdminAuth] = useState(false);
    const isLoginPage = pathname === "/admin/login";

    useEffect(() => {
        if (isLoginPage) return;
        if (isLoading) return;

        const token = getToken();

        // Ensure user is logged in and has a token
        if (!user || !token) {
            router.replace('/admin/login');
            return;
        }

        // Role check
        const ALLOWED_ROLES = ['admin', 'superadmin', 'finance_admin', 'compliance_admin', 'support_admin', 'tech_admin'];
        if (!ALLOWED_ROLES.includes(user.role as string)) {
            router.replace('/dashboard');
        } else {
            setAdminAuth(true);
        }

        // Global session listener
        const handleSessionExpired = () => {
            removeToken();
            router.replace('/admin/login');
        };

        window.addEventListener('admin-session-expired', handleSessionExpired);
        return () => window.removeEventListener('admin-session-expired', handleSessionExpired);
    }, [user, router, isLoginPage, isLoading]);

    // Bypass layout for login page
    if (isLoginPage) return <>{children}</>;

    if (!isAdminAuth) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex">
            {/* Sidebar */}
            <AdminSidebar />

            {/* Main Content */}
            <main className="flex-1 ml-[260px] transition-all duration-300 min-h-screen flex flex-col">
                {/* Header */}
                <header className="h-20 bg-[#0a0a0a]/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                            Protocol Hub / <span className="text-primary italic">{pathname.split('/').pop()?.replace(/-/g, ' ')}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-black text-white italic tracking-tight">{user?.walletAddress?.slice(0, 6)}...{user?.walletAddress?.slice(-4)}</div>
                            <div className="text-[9px] font-black uppercase text-primary/60 tracking-[0.2em]">{user?.role?.replace('_', ' ')} NODE</div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner overflow-hidden">
                            <Shield className="h-5 w-5 text-primary" />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8 pb-20">
                    {children}
                </div>
            </main>
        </div>
    );
}
