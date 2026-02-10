"use client";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface BetControlsProps {
    amount: number;
    setAmount: (val: number) => void;
    disabled: boolean;
    currencyLabel?: string;
}

export function BetControls({ amount, setAmount, disabled, currencyLabel = "SC" }: BetControlsProps) {
    const options = [1, 10, 50];
    const [inputValue, setInputValue] = useState(amount.toString());

    // Sync internal input state when parent prop changes
    useEffect(() => {
        setInputValue(amount.toString());
    }, [amount]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0.1) {
            setAmount(num);
        }
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-12">
            <div className="space-y-3 w-full md:w-auto">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center md:text-left">Quick Entry</div>
                <div className="flex items-center p-1.5 bg-white/[0.03] backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl">
                    {options.map((opt) => (
                        <button
                            key={opt}
                            onClick={() => setAmount(opt)}
                            disabled={disabled}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                                amount === opt
                                    ? "bg-primary text-black shadow-[0_10px_20px_rgba(251,191,36,0.3)]"
                                    : "text-white/40 hover:text-white hover:bg-white/5",
                                disabled && "opacity-50 pointer-events-none"
                            )}
                        >
                            {opt}
                        </button>
                    ))}
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <button
                        onClick={() => setAmount(0.1)}
                        disabled={disabled}
                        className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all"
                    >
                        Min
                    </button>
                    <button
                        onClick={() => setAmount(100)}
                        disabled={disabled}
                        className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all"
                    >
                        Max
                    </button>
                </div>
            </div>

            <div className="space-y-3 w-full md:w-auto">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center md:text-left">Custom Entry</div>
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-all" />
                    <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        disabled={disabled}
                        value={inputValue}
                        onChange={handleInputChange}
                        className="relative bg-white/[0.03] border-white/10 rounded-2xl text-center text-xl font-mono font-bold text-white pr-16 h-14 w-full md:w-[200px] focus:border-primary/50 focus:ring-0 transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase tracking-widest pointer-events-none group-focus-within:text-primary transition-colors">
                        {currencyLabel}
                    </div>
                </div>
            </div>
        </div>
    );
}
