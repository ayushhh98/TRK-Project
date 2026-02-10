// Example: How to integrate CaptchaChallenge into your game betting flow

import { useState } from 'react';
import CaptchaChallenge from '@/components/game/CaptchaChallenge';

export default function GameExample() {
    const [showCaptcha, setShowCaptcha] = useState(false);
    const [captchaData, setCaptchaData] = useState<{
        riskScore?: number;
        reasons?: string[];
        pendingBet?: any;
    }>({});

    async function placeBet(betData: any) {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/game/bet/commit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ betData })
            });

            // Handle CAPTCHA requirement
            if (response.status === 403) {
                const error = await response.json();

                if (error.code === 'CAPTCHA_REQUIRED') {
                    // Show CAPTCHA challenge
                    setCaptchaData({
                        riskScore: error.riskScore,
                        reasons: error.reasons,
                        pendingBet: betData
                    });
                    setShowCaptcha(true);
                    return;
                }

                // Handle other errors
                throw new Error(error.message);
            }

            const result = await response.json();
            console.log('Bet placed:', result);

            // Continue with reveal step...

        } catch (error) {
            console.error('Bet failed:', error);
        }
    }

    async function handleCaptchaVerify(token: string) {
        if (!captchaData.pendingBet) return;

        try {
            // Retry bet with CAPTCHA token
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/game/bet/commit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                    'X-Captcha-Token': token
                },
                body: JSON.stringify({
                    betData: captchaData.pendingBet,
                    captchaToken: token
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Bet placed after CAPTCHA:', result);

                // Clear CAPTCHA state
                setShowCaptcha(false);
                setCaptchaData({});

                // Continue with game flow...
            } else {
                const error = await response.json();
                console.error('CAPTCHA verification failed:', error);
                alert('Verification failed. Please try again.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    return (
        <div>
            {/* CAPTCHA Modal */}
            {showCaptcha && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="relative">
                        <button
                            onClick={() => setShowCaptcha(false)}
                            className="absolute -top-4 -right-4 bg-gray-800 hover:bg-gray-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
                        >
                            ×
                        </button>
                        <CaptchaChallenge
                            onVerify={handleCaptchaVerify}
                            onError={() => {
                                alert('CAPTCHA error. Please try again.');
                            }}
                            onExpire={() => {
                                alert('CAPTCHA expired. Please try again.');
                                setShowCaptcha(false);
                            }}
                            riskScore={captchaData.riskScore}
                            reasons={captchaData.reasons}
                        />
                    </div>
                </div>
            )}

            {/* Your game UI */}
            <button onClick={() => placeBet({ /* bet data */ })}>
                Place Bet
            </button>
        </div>
    );
}
