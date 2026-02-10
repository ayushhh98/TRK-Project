"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Copy, Users, CheckCheck } from "lucide-react";
import { useState } from "react";

export function ReferralCard() {
    const { address } = useWallet();
    const [copied, setCopied] = useState(false);

    // Generate mock referral link from address
    const referralLink = address
        ? `https://trk.game/ref/${address.slice(0, 6)}`
        : "Loading...";

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="border-green-500/20 bg-gradient-to-br from-green-900/10 to-transparent">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-400">
                    <Users className="h-5 w-5" />
                    Referral System
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Invite Link</p>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-black/40 border border-white/10 rounded-md px-3 py-2 text-sm font-mono text-white/80 truncate">
                            {referralLink}
                        </div>
                        <Button size="icon" variant="outline" onClick={handleCopy} className="hover:text-green-400 hover:border-green-500/50">
                            {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 py-4 border-t border-white/5">
                    <div>
                        <div className="text-2xl font-bold text-white">0</div>
                        <div className="text-xs text-muted-foreground">Total Invited</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-green-400">0.00</div>
                        <div className="text-xs text-muted-foreground">Earnings (SC)</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
