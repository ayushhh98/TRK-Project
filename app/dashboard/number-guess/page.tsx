"use client";

import NumberGuessGame from '@/components/game/NumberGuessGame';

export default function NumberGuessPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
                Number Guess
            </h1>
            <p className="text-zinc-400">
                Predict the number between 1 and 10 correctly to multiply your rewards!
            </p>

            <NumberGuessGame />
        </div>
    );
}
