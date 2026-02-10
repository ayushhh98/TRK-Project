"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { rewardsAPI } from "@/lib/api";
import { useWallet } from "@/components/providers/WalletProvider";
import { toast } from "sonner";
import { Mail, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RewardRedemptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface RewardBalance {
    rewardPoints: number;
    credits: number;
    pointsPerUSDT: number;
    conversionRate: string;
    estimatedValue: string;
    minimumRedemption: number;
    dailyLimit: number;
    processingWindowHours: number[];
}

export function RewardRedemptionModal({ isOpen, onClose }: RewardRedemptionModalProps) {
    const { user, refreshUser } = useWallet();
    const [balance, setBalance] = useState<RewardBalance | null>(null);
    const [points, setPoints] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isRedeeming, setIsRedeeming] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setOtpSent(false);
        setOtp("");
        setPoints("");
        const load = async () => {
            try {
                const res = await rewardsAPI.getBalance();
                if (res.status === "success") {
                    setBalance(res.data);
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to load reward balance");
            }
        };
        load();
    }, [isOpen]);

    const pointsNum = useMemo(() => {
        const val = parseFloat(points);
        return Number.isFinite(val) ? val : 0;
    }, [points]);

    const usdtEstimate = useMemo(() => {
        if (!balance?.pointsPerUSDT || !pointsNum) return "0.00";
        return (pointsNum / balance.pointsPerUSDT).toFixed(2);
    }, [balance, pointsNum]);

    const handleRequestOtp = async () => {
        if (!user?.email) {
            toast.error("Please add and verify your email to redeem rewards.");
            return;
        }
        setIsSendingOtp(true);
        try {
            const res = await rewardsAPI.requestOtp();
            if (res.status === "success") {
                setOtpSent(true);
                toast.success("OTP sent to your email.");
            } else {
                toast.error(res.message || "Failed to send OTP");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to send OTP");
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleRedeem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!balance) return;

        if (pointsNum < balance.minimumRedemption) {
            toast.error(`Minimum redemption is ${balance.minimumRedemption} points`);
            return;
        }

        if (pointsNum > balance.rewardPoints) {
            toast.error("Insufficient reward points");
            return;
        }

        if (!otp) {
            toast.error("OTP is required");
            return;
        }

        setIsRedeeming(true);
        try {
            const res = await rewardsAPI.redeem(pointsNum, otp);
            if (res.status === "success") {
                toast.success("Redemption initiated. Processing may take 24-48 hours.");
                await refreshUser();
                onClose();
            } else {
                toast.error(res.message || "Redemption failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Redemption failed");
        } finally {
            setIsRedeeming(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg relative z-10"
            >
                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl -z-10" />

                <Card className="border-0 bg-[#0A0A0A] ring-1 ring-white/10 rounded-[2rem] overflow-hidden">
                    <div className="relative border-b border-white/5 p-8 flex items-center justify-between overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />

                        <div className="relative z-10 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-1">Rewards_Redemption</h2>
                                <h3 className="text-xl font-display font-black tracking-tighter uppercase">PROMOTIONAL_REWARD</h3>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="h-10 w-10 border border-white/10 hover:bg-white/5 flex items-center justify-center transition-colors rounded-lg"
                        >
                            <X className="h-4 w-4 text-white/40" />
                        </button>
                    </div>

                    <CardContent className="p-8 space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Available_Points</div>
                                <div className="text-2xl font-mono font-black text-white">
                                    {(balance?.rewardPoints ?? 0).toLocaleString()}
                                </div>
                                <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">SC</div>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Estimated_Value</div>
                                <div className="text-2xl font-mono font-black text-white">${usdtEstimate}</div>
                                <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                                    {balance?.conversionRate || "100 points = 1 USDT"}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleRedeem} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Redeem_Points</label>
                                <Input
                                    type="number"
                                    min={balance?.minimumRedemption || 0}
                                    placeholder="Enter reward points"
                                    value={points}
                                    onChange={(e) => setPoints(e.target.value)}
                                    className="h-12 bg-white/5 border-white/10 text-white"
                                />
                                <div className="text-[10px] text-white/30">
                                    Min: {balance?.minimumRedemption ?? 0} points • Daily Limit: {balance?.dailyLimit ?? 0} points
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">OTP_Verification</label>
                                <div className="flex gap-3">
                                    <Input
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="h-12 bg-white/5 border-white/10 text-white flex-1"
                                        maxLength={6}
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleRequestOtp}
                                        disabled={isSendingOtp}
                                        className={cn(
                                            "h-12 px-4 font-black text-[10px] uppercase tracking-widest",
                                            otpSent ? "bg-emerald-500 text-black" : "bg-white/10 text-white"
                                        )}
                                    >
                                        <Mail className="h-3 w-3 mr-2" />
                                        {otpSent ? "OTP_SENT" : "SEND_OTP"}
                                    </Button>
                                </div>
                                <div className="text-[10px] text-white/30">
                                    Processing window: {balance?.processingWindowHours?.[0] ?? 24}-{balance?.processingWindowHours?.[1] ?? 48} hrs
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isRedeeming}
                                className="w-full h-12 bg-emerald-500 text-black font-black uppercase tracking-widest text-[10px]"
                            >
                                {isRedeeming ? "PROCESSING..." : "REDEEM_REWARDS"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
