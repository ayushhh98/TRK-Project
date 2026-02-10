"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/components/providers/WalletProvider';
import { Play, RotateCcw, Award, AlertCircle, HelpCircle } from 'lucide-react';

export default function NumberGuessGame() {
    const { user, refreshUser } = useWallet();
    const [guess, setGuess] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const PLAY_COST = 10;
    const REWARD = 50;

    const handlePlay = async () => {
        if (!guess) {
            setError("Please select a number first");
            return;
        }
        if ((user?.credits || 0) < PLAY_COST) {
            setError("Insufficient Credits");
            return;
        }

        setIsPlaying(true);
        setError(null);
        setResult(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/game/number-guess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ guess })
            });

            const data = await res.json();

            if (data.status === 'success') {
                setResult(data);
                refreshUser(); // Update balance
            } else {
                setError(data.message || 'Game failed');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setIsPlaying(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <div className="bg-[#0f1219] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.05)]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-cyan-900/10 to-transparent">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <span className="text-cyan-400">🔮</span> Number Guess
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">Guess the number (1-10) to win rewards</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                            <span className="text-zinc-500">Cost:</span>
                            <span className="text-yellow-400 font-bold">{PLAY_COST} GC</span>
                        </div>
                        <div className="bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                            <span className="text-zinc-500">Win:</span>
                            <span className="text-cyan-400 font-bold">{REWARD} SC</span>
                        </div>
                    </div>
                </div>

                {/* Game Area */}
                <div className="p-8 relative min-h-[400px] flex flex-col items-center justify-center">

                    {/* Number Selection */}
                    <div className="grid grid-cols-5 gap-3 w-full max-w-lg mb-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                                key={num}
                                onClick={() => { setGuess(num); setError(null); setResult(null); }}
                                disabled={isPlaying}
                                className={`
                                    h-16 rounded-xl text-xl font-bold transition-all relative overflow-hidden group
                                    ${guess === num
                                        ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-105'
                                        : 'bg-white/5 text-white hover:bg-white/10 hover:border-cyan-500/50 border border-white/5'
                                    }
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            >
                                <span className="relative z-10">{num}</span>
                                {guess === num && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent mix-blend-overlay" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Result Display */}
                    <AnimatePresence>
                        {result && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`
                                    absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-full max-w-md
                                    p-6 rounded-2xl border backdrop-blur-xl z-20 text-center shadow-2xl
                                    ${result.result === 'correct'
                                        ? 'bg-emerald-900/90 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.2)]'
                                        : 'bg-red-900/90 border-red-500/50'
                                    }
                                `}
                            >
                                <div className="text-4xl mb-2">
                                    {result.result === 'correct' ? '🎉' : '❌'}
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    {result.result === 'correct' ? 'Correct Guess!' : 'Wrong Guess'}
                                </h3>
                                <p className="text-lg text-white/90 mb-4">
                                    The number was <span className="font-bold text-2xl mx-1">{result.data.systemNumber}</span>
                                </p>
                                {result.result === 'correct' && (
                                    <div className="bg-black/30 rounded-lg p-3 mb-4 inline-block">
                                        <span className="text-zinc-400 text-sm">You Won: </span>
                                        <span className="text-cyan-400 font-bold ml-2">+{result.data.rewardPointsEarned} SC</span>
                                    </div>
                                )}
                                <div>
                                    <button
                                        onClick={() => setResult(null)}
                                        className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
                                    >
                                        Play Again
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Controls */}
                    <div className="flex flex-col items-center gap-4 relative z-10">
                        {error && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/20">
                                <AlertCircle size={16} />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <button
                            onClick={handlePlay}
                            disabled={isPlaying || !guess || !!result}
                            className={`
                                px-12 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all
                                ${isPlaying || !guess || !!result
                                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                    : 'bg-cyan-500 text-black hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95'
                                }
                            `}
                        >
                            {isPlaying ? (
                                <RotateCcw className="animate-spin" />
                            ) : (
                                <Play fill="currentColor" />
                            )}
                            {isPlaying ? 'Processing...' : 'Play Now (10 GC)'}
                        </button>

                        <p className="text-zinc-500 text-xs mt-4">
                            Ensure you have enough Game Credits (GC). Winnings are paid in Reward Points (SC).
                        </p>
                    </div>

                </div>

                {/* Footer / Legal */}
                <div className="bg-black/20 p-4 border-t border-white/5 flex items-start gap-3">
                    <HelpCircle className="text-zinc-600 shrink-0 mt-0.5" size={16} />
                    <div className="text-xs text-zinc-500 leading-relaxed">
                        <strong className="text-zinc-400 block mb-1">Sweepstakes Rules</strong>
                        This is a sweepstakes-based entertainment game. No purchase is necessary to play.
                        Free credits are available via daily login. Rewards (SC) collected can be redeemed for prizes
                        but have no direct cash value until redeemed. Void where prohibited. Must be 18+.
                    </div>
                </div>

            </div>
        </div>
    );
}
