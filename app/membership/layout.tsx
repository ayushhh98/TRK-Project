"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { useWallet } from "@/components/providers/WalletProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MembershipLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isConnected, isLoading } = useWallet();
    const router = useRouter();

    // Redirect to auth if not connected
    useEffect(() => {
        if (isLoading) return;
        if (typeof window !== "undefined") {
            const hasToken = !!localStorage.getItem("trk_token");
            if (hasToken) return;
        }
        if (!isConnected) {
            router.push("/auth");
        }
    }, [isConnected, isLoading, router]);

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
