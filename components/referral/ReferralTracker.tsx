"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * ReferralTracker Component
 * 
 * Captures the 'ref' parameter from the URL and stores it in localStorage
 * so it can be used during registration/login.
 */
export function ReferralTracker() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const refCode = searchParams.get("ref");
        if (refCode) {
            console.log(`[ReferralTracker] Captured referral code: ${refCode}`);
            localStorage.setItem("trk_referrer_code", refCode);
        }
    }, [searchParams]);

    return null; // This component doesn't render anything
}
