"use client";

import React from 'react';
import { HistoryTable } from "@/components/history/HistoryTable";

export default function HistoryPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-display font-bold text-white tracking-tight italic uppercase">Transaction Archive</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">Complete immutable ledger of all your gaming activities.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-1">
                <HistoryTable />
            </div>
        </div>
    );
}
