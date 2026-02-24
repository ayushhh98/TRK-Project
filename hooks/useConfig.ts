"use client";

import { useState, useEffect } from 'react';
import { useSocket } from '@/components/providers/Web3Provider';
import { adminAPI } from '@/lib/api';

export interface SystemConfig {
    emergencyFlags: {
        pauseRegistrations: boolean;
        pauseDeposits: boolean;
        pauseWithdrawals: boolean;
        pauseLuckyDraw: boolean;
        maintenanceMode: boolean;
    };
    economics: {
        cashbackPhase1: number;
        cashbackPhase2: number;
        cashbackPhase3: number;
        referralMultiplierCap: number;
        minReferralVolumeForMultiplier: number;
    };
    practice: {
        bonusAmount: number;
        maxUsers: number;
        expiryDays: number;
    };
    activation: {
        minTier1: number;
        minTier2: number;
    };
    withdrawal: {
        minAmount: number;
        maxDailyAmount: number;
        sustainabilityFee: number;
    };
    luckyDraw: {
        ticketPrice: number;
        maxTickets: number;
        autoEntryEnabled: boolean;
    };
    governance: {
        ecosystemPhase: string;
        tokenSupportEnabled: boolean;
    };
    lastUpdated?: string;
    updatedBy?: string;
}

export function useConfig() {
    const socket = useSocket();
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/config');
            const data = await res.json();
            if (data.status === 'success') {
                setConfig(data.data);
            }
        } catch (err) {
            console.error("Failed to fetch system config:", err);
            setError("Failed to load protocol settings");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();

        if (!socket) return;

        const handleConfigUpdate = (newConfig: SystemConfig) => {
            console.log("🔄 Protocol Configuration Synced:", newConfig);
            setConfig(newConfig);
        };

        const handleEmergencyUpdate = (data: any) => {
            console.log("⚠️ Emergency Protocol Update:", data);
            // If data is just partial emergency flags, we might want to merge or re-fetch
            // But usually 'config_updated' carries the full state.
            // If the event is 'emergency_flag_changed', we update just that part.
            setConfig(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    emergencyFlags: {
                        ...prev.emergencyFlags,
                        ...(data.emergencyFlags || data)
                    }
                };
            });
        };

        socket.on('config_updated', handleConfigUpdate);
        socket.on('emergency_flag_changed', handleEmergencyUpdate);

        return () => {
            socket.off('config_updated', handleConfigUpdate);
            socket.off('emergency_flag_changed', handleEmergencyUpdate);
        };
    }, [socket]);

    return {
        config,
        isLoading,
        error,
        refresh: fetchConfig,
        connectionStatus: socket?.connected ? 'connected' : 'disconnected'
    };
}
