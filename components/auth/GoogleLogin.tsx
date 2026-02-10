"use client";

import React, { useEffect, useRef, useState } from 'react';
import { authAPI } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

declare global {
    interface Window {
        google: any;
    }
}

export const GoogleLogin = ({ onAuthSuccess }: { onAuthSuccess?: () => void }) => {
    const [isLoading, setIsLoading] = useState(false);
    const buttonRef = useRef<HTMLDivElement | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        const initializeGoogle = () => {
            if (window.google && window.google.accounts) {
                if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
                    console.warn("Google Login disabled: NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing.");
                    return;
                }

                if (!initializedRef.current) {
                window.google.accounts.id.initialize({
                    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                    callback: handleGoogleLogin,
                });
                    initializedRef.current = true;
                }

                const renderButton = () => {
                    if (!buttonRef.current) return;
                    const width = Math.max(240, Math.min(420, buttonRef.current.offsetWidth || 0));
                    if (!width) return;

                    buttonRef.current.innerHTML = "";
                    window.google.accounts.id.renderButton(buttonRef.current, {
                        theme: "filled_black",
                        size: "large",
                        width,
                        text: "continue_with",
                        shape: "rectangular"
                    });
                };

                renderButton();
                const handleResize = () => renderButton();
                window.addEventListener("resize", handleResize);
                return () => window.removeEventListener("resize", handleResize);
            } else {
                // Retry if script not loaded yet
                setTimeout(initializeGoogle, 500);
            }
        };

        const cleanup = initializeGoogle();
        return () => {
            if (typeof cleanup === "function") cleanup();
        };
    }, []);

    async function handleGoogleLogin(response: any) {
        setIsLoading(true);
        try {
            const googleJWT = response.credential;
            const res = await authAPI.loginGoogle(googleJWT);

            if (res.status === 'success') {
                toast.success("Signed in with Google!");
                if (onAuthSuccess) onAuthSuccess();
            } else {
                toast.error(res.message || "Google login failed");
            }
        } catch (err: any) {
            console.error("Google Auth Error:", err);
            toast.error(err.message || "Failed to authenticate with Google");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="w-full relative min-h-[50px] flex items-center justify-center">
            {isLoading && (
                <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-md">
                    <Loader2 className="animate-spin text-primary" />
                </div>
            )}
            <div id="google-login-btn" ref={buttonRef} className="w-full"></div>
        </div>
    );
};
