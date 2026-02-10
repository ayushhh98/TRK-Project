"use client";

import { ReactNode, Suspense } from "react";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { WalletProvider } from "@/components/providers/WalletProvider";
import { ReferralTracker } from "@/components/referral/ReferralTracker";
import { Toaster } from "sonner";

export default function AppProviders({ children }: { children: ReactNode }) {
    return (
        <Web3Provider>
            <WalletProvider>
                <Suspense fallback={null}>
                    <ReferralTracker />
                </Suspense>
                {children}
                <Toaster
                    position="top-right"
                    richColors
                    expand={true}
                    duration={4000}
                    closeButton
                    toastOptions={{
                        unstyled: false,
                        classNames: {
                            toast: 'group toast group-[.toaster]:bg-black/90 group-[.toaster]:backdrop-blur-xl group-[.toaster]:border group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_0_40px_rgba(0,0,0,0.5)] group-[.toaster]:rounded-2xl group-[.toaster]:p-4',
                            title: 'group-[.toast]:text-white group-[.toast]:font-bold group-[.toast]:text-sm group-[.toast]:tracking-wide',
                            description: 'group-[.toast]:text-white/60 group-[.toast]:text-xs',
                            actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-black group-[.toast]:font-bold group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:text-xs group-[.toast]:uppercase group-[.toast]:tracking-widest',
                            cancelButton: 'group-[.toast]:bg-white/10 group-[.toast]:text-white group-[.toast]:font-bold group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:text-xs',
                            closeButton: 'group-[.toast]:bg-white/5 group-[.toast]:border-white/10 group-[.toast]:text-white/60 group-[.toast]:hover:bg-white/10 group-[.toast]:hover:text-white group-[.toast]:rounded-lg',
                            success: 'group-[.toast]:border-emerald-500/30 group-[.toast]:bg-emerald-500/10 group-[.toast]:shadow-[0_0_40px_rgba(16,185,129,0.2)]',
                            error: 'group-[.toast]:border-red-500/30 group-[.toast]:bg-red-500/10 group-[.toast]:shadow-[0_0_40px_rgba(239,68,68,0.2)]',
                            warning: 'group-[.toast]:border-amber-500/30 group-[.toast]:bg-amber-500/10 group-[.toast]:shadow-[0_0_40px_rgba(245,158,11,0.2)]',
                            info: 'group-[.toast]:border-blue-500/30 group-[.toast]:bg-blue-500/10 group-[.toast]:shadow-[0_0_40px_rgba(59,130,246,0.2)]',
                            loading: 'group-[.toast]:border-purple-500/30 group-[.toast]:bg-purple-500/10 group-[.toast]:shadow-[0_0_40px_rgba(168,85,247,0.2)]',
                        },
                    }}
                />
            </WalletProvider>
        </Web3Provider>
    );
}
