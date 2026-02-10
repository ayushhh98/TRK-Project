"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
    value: number[];
    onValueChange: (value: number[]) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
}

export function Slider({
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    className,
}: SliderProps) {
    const sliderRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const calculateValue = (clientX: number) => {
        if (!sliderRef.current) return value[0];
        const rect = sliderRef.current.getBoundingClientRect();
        const percentage = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        const rawValue = min + percentage * (max - min);
        const steppedValue = Math.round(rawValue / step) * step;
        return Math.min(Math.max(steppedValue, min), max); // Clamp
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        const newValue = calculateValue(e.clientX);
        onValueChange([newValue]);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const newValue = calculateValue(e.clientX);
        onValueChange([newValue]);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const percentage = ((value[0] - min) / (max - min)) * 100;

    return (
        <div
            ref={sliderRef}
            className={cn("relative flex w-full touch-none select-none items-center h-6 cursor-pointer group", className)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/20">
                <div
                    className="absolute h-full bg-white transition-all"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <div
                className={cn(
                    "absolute block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 active:scale-95 shadow-lg",
                    // Use `className` children selectors to style the thumb if needed, or rely on passing specific classes
                    "bg-white border-white transition-transform"
                )}
                style={{ left: `calc(${percentage}% - 10px)` }}
            />
        </div>
    );
}
