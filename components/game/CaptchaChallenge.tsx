import { useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface CaptchaChallengeProps {
    onVerify: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
    riskScore?: number;
    reasons?: string[];
}

export default function CaptchaChallenge({
    onVerify,
    onError,
    onExpire,
    riskScore,
    reasons = []
}: CaptchaChallengeProps) {
    const captchaRef = useRef<HCaptcha>(null);

    return (
        <div className="flex flex-col items-center gap-4 p-8 bg-gray-900 rounded-lg border border-red-500/30 shadow-xl">
            {/* Warning Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-red-400">
                        Verification Required
                    </h3>
                    <p className="text-sm text-gray-500">
                        Risk Score: <span className="text-red-400 font-mono">{riskScore || 'N/A'}</span>
                    </p>
                </div>
            </div>

            {/* Description */}
            <div className="text-center space-y-2">
                <p className="text-gray-300 text-sm">
                    We detected unusual activity on your account.
                </p>
                <p className="text-gray-400 text-xs">
                    Please verify you're human to continue.
                </p>
            </div>

            {/* Reasons (if provided) */}
            {reasons.length > 0 && (
                <div className="w-full bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Suspicious patterns detected:</p>
                    <ul className="space-y-1">
                        {reasons.slice(0, 3).map((reason, index) => (
                            <li key={index} className="text-xs text-gray-500 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span>{reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* hCaptcha Widget */}
            <div className="mt-2">
                <HCaptcha
                    ref={captchaRef}
                    sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
                    onVerify={onVerify}
                    onError={() => {
                        console.error('hCaptcha error');
                        onError?.();
                    }}
                    onExpire={() => {
                        console.log('hCaptcha expired');
                        onExpire?.();
                    }}
                    theme="dark"
                />
            </div>

            {/* Help Text */}
            <p className="text-xs text-gray-500 text-center max-w-sm">
                Having trouble? Contact support if you believe this is an error.
            </p>
        </div>
    );
}
