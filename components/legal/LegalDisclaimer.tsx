'use client';

export default function LegalDisclaimer() {
    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-900/90 to-orange-900/90 backdrop-blur-sm border-b border-yellow-700/50">
            <div className="container mx-auto px-4 py-2">
                <div className="flex items-center justify-center gap-3 text-sm">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-yellow-100 font-medium">
                        <span className="font-bold">Legal Notice:</span> This is NOT a gambling or betting platform.
                        Games are for entertainment purposes only. 18+ only.
                        <a href="/legal/sweepstakes" className="underline ml-2 hover:text-white">
                            Learn More
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
