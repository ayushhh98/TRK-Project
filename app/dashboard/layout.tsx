"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useWallet } from "@/components/providers/WalletProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Footer } from "@/components/layout/Footer";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isConnected, isLoading, isSwitchingWallet } = useWallet();
    const router = useRouter();

    // Redirect to auth if not connected
    useEffect(() => {
        if (isLoading || isSwitchingWallet) return;
        if (typeof window !== "undefined") {
            const hasToken = !!localStorage.getItem("trk_token");
            if (hasToken) return;
        }
        if (!isConnected) {
            router.push("/auth");
        }
    }, [isConnected, isLoading, isSwitchingWallet, router]);

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <div className="lg:pl-[248px] min-h-screen flex flex-col overflow-x-hidden">
                <div className="flex-1">
                    {children}
                </div>
                <Footer />
            </div>
        </div>
    );
}
