"use client";

import { cn } from "@/lib/utils";

interface DiceFaceProps {
    value: number;
    className?: string;
}

export function DiceFace({ value, className }: DiceFaceProps) {
    // Dot positioning configurations for 1-6
    const dots = {
        1: ["col-start-2 row-start-2"],
        2: ["col-start-1 row-start-3", "col-start-3 row-start-1"],
        3: ["col-start-1 row-start-3", "col-start-2 row-start-2", "col-start-3 row-start-1"],
        4: ["col-start-1 row-start-1", "col-start-1 row-start-3", "col-start-3 row-start-1", "col-start-3 row-start-3"],
        5: ["col-start-1 row-start-1", "col-start-1 row-start-3", "col-start-2 row-start-2", "col-start-3 row-start-1", "col-start-3 row-start-3"],
        6: ["col-start-1 row-start-1", "col-start-1 row-start-2", "col-start-1 row-start-3", "col-start-3 row-start-1", "col-start-3 row-start-2", "col-start-3 row-start-3"],
    };

    const currentDots = dots[value as keyof typeof dots] || [];

    return (
        <div className={cn(
            "w-full h-full bg-white text-black rounded-lg shadow-inner",
            "grid grid-cols-3 grid-rows-3 p-3 gap-0.5",
            className
        )}>
            {currentDots.map((dotClass, i) => (
                <span key={i} className={cn("bg-black rounded-full h-full w-full shadow-sm", dotClass)} />
            ))}
        </div>
    );
}
