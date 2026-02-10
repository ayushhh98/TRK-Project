"use client";

import { Logo } from "@/components/ui/Logo";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl">
            <div className="relative h-24 w-24">
                <Logo className="h-full w-full animate-pulse" />
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
            <div className="mt-8 flex flex-col items-center gap-2">
                <h2 className="text-2xl font-display font-bold text-white tracking-widest uppercase">
                    Initializing
                </h2>
                <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                </div>
            </div>
        </div>
    );
}
