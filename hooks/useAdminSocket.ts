import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/components/providers/Web3Provider';

type AdminEventHandlers = {
    onStatsUpdate?: (data: any) => void;
    onConfigUpdate?: (data: any) => void;
    onUserUpdate?: (data: any) => void;
    onTransactionUpdate?: (data: any) => void;
    onLegalUpdate?: (data: any) => void;
    onJackpotUpdate?: (data: any) => void;
    onJackpotWinner?: (data: any) => void;
    onJackpotTicket?: (data: any) => void;
    onEliteUpdate?: (data: any) => void;
    onEliteLiveFeed?: (data: any) => void;
    onTeamUpdate?: (data: any) => void;
    onTeamLiveActivity?: (data: any) => void;
    onEconomicsUpdate?: (data: any) => void;
    onROIUpdate?: (data: any) => void;
    onGamesUpdate?: (data: any) => void;
    onAuditUpdate?: (data: any) => void;
    onLiveAudit?: (data: any) => void;
    onPracticeUpdate?: (data: any) => void;
    onEmergencyUpdate?: (data: any) => void;
    onLegalStatsUpdate?: (data: any) => void;
    onBDWalletUpdate?: (data: any) => void;
    onGameActivity?: (data: any) => void;
    onUserActivity?: (data: any) => void;
    onFinancialActivity?: (data: any) => void;
    onJackpotActivity?: (data: any) => void;
    onCommissionActivity?: (data: any) => void;
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export function useAdminSocket(handlers: AdminEventHandlers = {}) {
    const socket = useSocket();
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const handlersRef = useRef(handlers);

    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!socket) {
            setIsConnected(false);
            setConnectionStatus('disconnected');
            return;
        }

        const handleConnect = () => {
            setIsConnected(true);
            setConnectionStatus('connected');
        };

        const handleDisconnect = () => {
            setIsConnected(false);
            setConnectionStatus('disconnected');
        };

        setIsConnected(!!socket.connected);
        setConnectionStatus(socket.connected ? 'connected' : 'connecting');

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        const handleStatsUpdate = (data: any) => handlersRef.current.onStatsUpdate?.(data);
        const handleConfigUpdate = (data: any) => handlersRef.current.onConfigUpdate?.(data);
        const handleUserUpdate = (data: any) => handlersRef.current.onUserUpdate?.(data);
        const handleTransactionUpdate = (data: any) => handlersRef.current.onTransactionUpdate?.(data);
        const handleLegalUpdate = (data: any) => handlersRef.current.onLegalUpdate?.(data);
        const handleJackpotUpdate = (data: any) => handlersRef.current.onJackpotUpdate?.(data);
        const handleJackpotTicket = (data: any) => handlersRef.current.onJackpotTicket?.(data);
        const handleJackpotWinner = (data: any) => handlersRef.current.onJackpotWinner?.(data);
        const handleEliteUpdate = (data: any) => handlersRef.current.onEliteUpdate?.(data);
        const handleEliteLiveFeed = (data: any) => handlersRef.current.onEliteLiveFeed?.(data);
        const handleTeamUpdate = (data: any) => handlersRef.current.onTeamUpdate?.(data);
        const handleTeamLiveActivity = (data: any) => handlersRef.current.onTeamLiveActivity?.(data);
        const handleEconomicsUpdate = (data: any) => handlersRef.current.onEconomicsUpdate?.(data);
        const handleROIUpdate = (data: any) => handlersRef.current.onROIUpdate?.(data);
        const handleGamesUpdate = (data: any) => handlersRef.current.onGamesUpdate?.(data);
        const handleAuditUpdate = (data: any) => handlersRef.current.onAuditUpdate?.(data);
        const handleLiveAudit = (data: any) => handlersRef.current.onLiveAudit?.(data);
        const handlePracticeUpdate = (data: any) => handlersRef.current.onPracticeUpdate?.(data);
        const handleEmergencyUpdate = (data: any) => handlersRef.current.onEmergencyUpdate?.(data);
        const handleLegalStatsUpdate = (data: any) => handlersRef.current.onLegalStatsUpdate?.(data);
        const handleGameActivity = (data: any) => handlersRef.current.onGameActivity?.(data);
        const handleUserActivity = (data: any) => handlersRef.current.onUserActivity?.(data);
        const handleFinancialActivity = (data: any) => handlersRef.current.onFinancialActivity?.(data);
        const handleJackpotActivity = (data: any) => handlersRef.current.onJackpotActivity?.(data);
        const handleCommissionActivity = (data: any) => handlersRef.current.onCommissionActivity?.(data);
        const handleBDWalletUpdate = (data: any) => handlersRef.current.onBDWalletUpdate?.(data);

        socket.on('admin:stats_update', handleStatsUpdate);
        socket.on('config_updated', handleConfigUpdate);
        socket.on('emergency_flag_changed', handleConfigUpdate);
        socket.on('admin:user_updated', handleUserUpdate);
        socket.on('transaction_created', handleTransactionUpdate);
        socket.on('new_deposit', handleTransactionUpdate);
        socket.on('withdrawal_processed', handleTransactionUpdate);
        socket.on('admin:legal_updated', handleLegalUpdate);

        // Jackpot Specific Events
        socket.on('jackpot:status_update', handleJackpotUpdate);
        socket.on('jackpot:ticket_sold', handleJackpotTicket);
        socket.on('jackpot:draw_complete', handleJackpotUpdate); // Full refresh on draw
        socket.on('jackpot:new_round', handleJackpotUpdate);
        socket.on('jackpot:winner_announced', handleJackpotWinner);
        socket.on('admin:jackpot_stats_update', handleJackpotUpdate);
        socket.on('admin:elite_stats_update', handleEliteUpdate);
        socket.on('admin:elite_live_feed', handleEliteLiveFeed);
        socket.on('elite:update', handleEliteUpdate); // Legacy support
        socket.on('admin:team_stats_update', handleTeamUpdate);
        socket.on('admin:team_live_activity', handleTeamLiveActivity);
        socket.on('admin:economics_update', handleEconomicsUpdate);
        socket.on('admin:roi_update', handleROIUpdate);
        socket.on('admin:games_update', handleGamesUpdate);
        socket.on('admin:audit_stats_update', handleAuditUpdate);
        socket.on('admin:live_audit_log', handleLiveAudit);
        socket.on('admin:practice_stats_update', handlePracticeUpdate);
        socket.on('admin:emergency_update', handleEmergencyUpdate);
        socket.on('admin:legal_stats_update', handleLegalStatsUpdate);
        socket.on('admin:bd_wallet_stats', handleBDWalletUpdate);

        // Ops Feed Listeners
        socket.on('admin:game_activity', handleGameActivity);
        socket.on('admin:user_login', handleUserActivity);
        socket.on('admin:financial_activity', handleFinancialActivity);
        socket.on('admin:jackpot_activity', handleJackpotActivity);
        socket.on('admin:commission_activity', handleCommissionActivity);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('admin:stats_update', handleStatsUpdate);
            socket.off('config_updated', handleConfigUpdate);
            socket.off('emergency_flag_changed', handleConfigUpdate);
            socket.off('admin:user_updated', handleUserUpdate);
            socket.off('transaction_created', handleTransactionUpdate);
            socket.off('new_deposit', handleTransactionUpdate);
            socket.off('withdrawal_processed', handleTransactionUpdate);
            socket.off('admin:legal_updated', handleLegalUpdate);
            socket.off('jackpot:status_update', handleJackpotUpdate);
            socket.off('jackpot:ticket_sold', handleJackpotTicket);
            socket.off('jackpot:draw_complete', handleJackpotUpdate);
            socket.off('jackpot:new_round', handleJackpotUpdate);
            socket.off('jackpot:winner_announced', handleJackpotWinner);
            socket.off('admin:jackpot_stats_update', handleJackpotUpdate);
            socket.off('admin:elite_stats_update', handleEliteUpdate);
            socket.off('admin:elite_live_feed', handleEliteLiveFeed);
            socket.off('elite:update', handleEliteUpdate);
            socket.off('admin:team_stats_update', handleTeamUpdate);
            socket.off('admin:team_live_activity', handleTeamLiveActivity);
            socket.off('admin:economics_update', handleEconomicsUpdate);
            socket.off('admin:roi_update', handleROIUpdate);
            socket.off('admin:games_update', handleGamesUpdate);
            socket.off('admin:audit_stats_update', handleAuditUpdate);
            socket.off('admin:live_audit_log', handleLiveAudit);
            socket.off('admin:practice_stats_update', handlePracticeUpdate);
            socket.off('admin:emergency_update', handleEmergencyUpdate);
            socket.off('admin:legal_stats_update', handleLegalStatsUpdate);
            socket.off('admin:bd_wallet_stats', handleBDWalletUpdate);

            socket.off('admin:game_activity', handleGameActivity);
            socket.off('admin:user_login', handleUserActivity);
            socket.off('admin:financial_activity', handleFinancialActivity);
            socket.off('admin:jackpot_activity', handleJackpotActivity);
            socket.off('admin:commission_activity', handleCommissionActivity);
        };
    }, [socket]);

    return {
        isConnected,
        connectionStatus,
        reconnect: () => socket?.connect(),
        disconnect: () => socket?.disconnect()
    };
}
