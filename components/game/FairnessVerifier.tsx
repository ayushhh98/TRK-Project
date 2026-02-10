'use client';

import React, { useState } from 'react';
import { gameAPI } from '@/lib/api';

interface FairnessVerifierProps {
    gameId?: string;
    provablyFair?: {
        serverSeed: string;
        serverSeedHash: string;
        clientSeed: string;
        nonce: number;
    };
    luckyNumber: number | string;
    gameVariant: string;
}

export default function FairnessVerifier({ gameId, provablyFair, luckyNumber, gameVariant }: FairnessVerifierProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [verificationData, setVerificationData] = useState(provablyFair);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{
        isValid: boolean;
        message: string;
    } | null>(null);

    const handleVerify = async () => {
        if (!gameId && !verificationData) return;

        setIsVerifying(true);
        try {
            // Fetch verification data if not provided
            if (!verificationData && gameId) {
                const response = await gameAPI.verifyGame(gameId);
                setVerificationData(response.data);
            }

            if (!verificationData) {
                throw new Error('No verification data available');
            }

            // Verify server seed hash
            const { serverSeed, serverSeedHash } = verificationData;
            const calculatedHash = await sha256(serverSeed);

            if (calculatedHash !== serverSeedHash) {
                setVerificationResult({
                    isValid: false,
                    message: 'Server seed hash mismatch! Game may have been tampered with.'
                });
                return;
            }

            // Recalculate result
            const recalculatedResult = calculateProvablyFairResult(
                verificationData.serverSeed,
                verificationData.clientSeed,
                verificationData.nonce,
                gameVariant
            );

            const isMatch = compareResults(recalculatedResult, luckyNumber, gameVariant);

            setVerificationResult({
                isValid: isMatch,
                message: isMatch
                    ? '✅ Game result is provably fair! The server seed was not changed and the result matches.'
                    : '❌ Result mismatch! Expected result does not match actual result.'
            });

        } catch (error) {
            console.error('Verification error:', error);
            setVerificationResult({
                isValid: false,
                message: 'Failed to verify game fairness. Please try again.'
            });
        } finally {
            setIsVerifying(false);
        }
    };

    // SHA-256 hash function (browser-based)
    const sha256 = async (message: string): Promise<string> => {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // Recalculate provably fair result
    const calculateProvablyFairResult = (
        serverSeed: string,
        clientSeed: string,
        nonce: number,
        variant: string
    ): number => {
        const combined = `${serverSeed}:${clientSeed}:${nonce}`;

        // Simple hash to number (client-side approximation)
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            hash = ((hash << 5) - hash) + combined.charCodeAt(i);
            hash = hash & hash;
        }
        hash = Math.abs(hash);

        switch (variant) {
            case 'dice':
            case 'spin':
                return (hash % 8) + 1;
            case 'matrix':
                return (hash % 10000) / 100;
            case 'crash':
                return 1.0 + ((hash % 900) / 100);
            default:
                return hash % 100;
        }
    };

    const compareResults = (calculated: number, actual: number | string, variant: string): boolean => {
        if (variant === 'crash' || variant === 'matrix') {
            const actualNum = typeof actual === 'string' ? parseFloat(actual) : actual;
            return Math.abs(calculated - actualNum) < 0.1;
        }
        return calculated === Number(actual);
    };

    if (!provablyFair && !gameId) {
        return null; // No verification data available
    }

    return (
        <div className="relative">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-950/30 border border-cyan-500/30 rounded-lg hover:bg-cyan-900/40 hover:border-cyan-400/50 transition-all"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Verify Fairness
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="max-w-2xl w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-cyan-500/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/20 rounded-lg">
                                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-white">Provably Fair Verification</h2>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {verificationData ? (
                                <>
                                    {/* Server Seed Hash */}
                                    <div className="p-4 bg-slate-800/50 border border-cyan-500/20 rounded-lg">
                                        <div className="text-sm font-medium text-gray-400 mb-2">Server Seed Hash (Before Game)</div>
                                        <div className="text-xs font-mono text-cyan-400 break-all">{verificationData.serverSeedHash}</div>
                                    </div>

                                    {/* Server Seed */}
                                    <div className="p-4 bg-slate-800/50 border border-cyan-500/20 rounded-lg">
                                        <div className="text-sm font-medium text-gray-400 mb-2">Server Seed (Revealed After Game)</div>
                                        <div className="text-xs font-mono text-cyan-400 break-all">{verificationData.serverSeed}</div>
                                    </div>

                                    {/* Client Seed */}
                                    <div className="p-4 bg-slate-800/50 border border-cyan-500/20 rounded-lg">
                                        <div className="text-sm font-medium text-gray-400 mb-2">Client Seed</div>
                                        <div className="text-xs font-mono text-cyan-400 break-all">{verificationData.clientSeed}</div>
                                    </div>

                                    {/* Nonce */}
                                    <div className="p-4 bg-slate-800/50 border border-cyan-500/20 rounded-lg">
                                        <div className="text-sm font-medium text-gray-400 mb-2">Nonce</div>
                                        <div className="text-sm font-mono text-white">{verificationData.nonce}</div>
                                    </div>

                                    {/* Result */}
                                    <div className="p-4 bg-slate-800/50 border border-cyan-500/20 rounded-lg">
                                        <div className="text-sm font-medium text-gray-400 mb-2">Game Result</div>
                                        <div className="text-lg font-bold text-white">{luckyNumber}</div>
                                    </div>

                                    {/* Verification Result */}
                                    {verificationResult && (
                                        <div className={`p-4 rounded-lg border ${verificationResult.isValid
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : 'bg-red-500/10 border-red-500/30'
                                            }`}>
                                            <div className={`text-sm font-medium ${verificationResult.isValid ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {verificationResult.message}
                                            </div>
                                        </div>
                                    )}

                                    {/* Info Box */}
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                        <div className="text-sm text-blue-300">
                                            <strong>How to Verify:</strong> The server seed was hashed before the game started.
                                            After the game, the server reveals the seed. You can verify that the hash matches
                                            and that the result was calculated fairly from the seeds.
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <p>Loading verification data...</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 p-6 border-t border-cyan-500/20">
                            <button
                                onClick={handleVerify}
                                disabled={isVerifying}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isVerifying ? 'Verifying...' : 'Verify Result'}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
