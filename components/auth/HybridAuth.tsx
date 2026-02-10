"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authAPI } from "@/lib/api";
import { toast } from "sonner";
import { Mail, Lock, Shield, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { GoogleLogin } from "./GoogleLogin";

export const HybridAuth = ({ onAuthSuccess }: { onAuthSuccess?: () => void }) => {
    const [showForm, setShowForm] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [resetMode, setResetMode] = useState(false);
    const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
    const [resetOtp, setResetOtp] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFormError(null);
        try {
            const res = await authAPI.loginEmail(email, password);
            if (res.status === 'success') {
                toast.success("Welcome to TRK!");
                if (onAuthSuccess) onAuthSuccess();
            } else {
                const message = res?.message || "Login failed";
                setFormError(message);
                toast.error(message);
            }
        } catch (err: any) {
            const message = err?.message || "Login failed";
            setFormError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFormError(null);
        try {
            const res = await authAPI.register(email, password);
            if (res.status === 'success') {
                toast.success("OTP sent to your email!");
                setShowOtp(true);
            } else {
                const message = res?.message || "Registration failed";
                setFormError(message);
                toast.error(message);
            }
        } catch (err: any) {
            const message = err?.message || "Registration failed";
            setFormError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFormError(null);
        try {
            const res = await authAPI.verifyOtp(email, otp);
            if (res.status === 'success') {
                toast.success("Verified! You can now log in.");
                setShowOtp(false);
                setIsRegister(false);
            } else {
                const message = res?.message || "Verification failed";
                setFormError(message);
                toast.error(message);
            }
        } catch (err: any) {
            const message = err?.message || "Verification failed";
            setFormError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFormError(null);
        try {
            const res = await authAPI.requestPasswordReset(email);
            if (res.status === 'success') {
                toast.success("OTP sent to your email!");
                setResetStep('confirm');
            } else {
                const message = res?.message || "Failed to send OTP";
                setFormError(message);
                toast.error(message);
            }
        } catch (err: any) {
            const message = err?.message || "Failed to send OTP";
            setFormError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFormError(null);
        try {
            if (resetPassword !== resetPasswordConfirm) {
                const message = "Passwords do not match";
                setFormError(message);
                toast.error(message);
                setIsLoading(false);
                return;
            }
            const res = await authAPI.resetPassword(email, resetOtp, resetPassword);
            if (res.status === 'success') {
                toast.success("Password reset successful. Please log in.");
                setResetMode(false);
                setShowForm(true);
                setIsRegister(false);
                setResetStep('request');
                setResetOtp('');
                setResetPassword('');
                setResetPasswordConfirm('');
            } else {
                const message = res?.message || "Password reset failed";
                setFormError(message);
                toast.error(message);
            }
        } catch (err: any) {
            const message = err?.message || "Password reset failed";
            setFormError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    // Show password reset
    if (resetMode) {
        return (
            <div className="w-full">
                <form onSubmit={resetStep === 'request' ? handleRequestReset : handleResetPassword} className="space-y-4">
                    {formError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {formError}
                        </div>
                    )}
                    <div className="space-y-2 text-center">
                        <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-2">
                            <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Reset Password</h3>
                        <p className="text-muted-foreground text-sm">
                            {resetStep === 'request'
                                ? "Enter your email to receive an OTP."
                                : "Enter the OTP and your new password."}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Email Address"
                                className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={resetStep === 'confirm'}
                            />
                        </div>

                        {resetStep === 'confirm' && (
                            <>
                                <Input
                                    placeholder="Enter 6-digit OTP"
                                    className="h-12 text-center font-mono bg-white/5 border-white/10 text-white"
                                    maxLength={6}
                                    value={resetOtp}
                                    onChange={(e) => setResetOtp(e.target.value)}
                                    required
                                />
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        placeholder="New Password"
                                        className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                                        type="password"
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        placeholder="Confirm New Password"
                                        className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                                        type="password"
                                        value={resetPasswordConfirm}
                                        onChange={(e) => setResetPasswordConfirm(e.target.value)}
                                        required
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <Button className="w-full h-12 font-bold" disabled={isLoading} type="submit">
                        {isLoading ? <Loader2 className="animate-spin" /> : (resetStep === 'request' ? "Send OTP" : "Reset Password")}
                    </Button>

                    <div className="flex justify-between text-sm">
                        <button
                            type="button"
                            className="text-muted-foreground hover:text-white flex items-center gap-1"
                            onClick={() => {
                                setResetMode(false);
                                setResetStep('request');
                                setResetOtp('');
                                setResetPassword('');
                                setResetPasswordConfirm('');
                            }}
                        >
                            <ArrowLeft size={14} /> Back to login
                        </button>
                        <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => setResetStep(resetStep === 'request' ? 'confirm' : 'request')}
                        >
                            {resetStep === 'request' ? "Already have OTP?" : "Resend OTP"}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Show OTP verification
    if (showOtp) {
        return (
            <div className="w-full">
                <form onSubmit={handleVerifyOtp} className="space-y-6 text-center">
                    {formError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {formError}
                        </div>
                    )}
                    <div className="space-y-2">
                        <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Verify Your Email</h3>
                        <p className="text-muted-foreground text-sm">Code sent to <b>{email}</b></p>
                    </div>
                    <Input
                        placeholder="Enter 6-digit OTP"
                        className="h-14 text-center text-2xl font-mono bg-white/5 border-white/10 text-white"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                    />
                    <Button className="w-full h-12 font-bold" disabled={isLoading} type="submit">
                        {isLoading ? <Loader2 className="animate-spin" /> : "Verify & Continue"}
                    </Button>
                    <button
                        type="button"
                        className="text-sm text-muted-foreground hover:text-white"
                        onClick={() => { setShowOtp(false); setIsRegister(true); }}
                    >
                        Try a different email
                    </button>
                </form>
            </div>
        );
    }

    // Show login/register form
    if (showForm) {
        return (
            <div className="w-full">
                <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
                    {formError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {formError}
                        </div>
                    )}
                    <div className="space-y-3">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Email Address"
                                className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Password"
                                className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    {!isRegister && (
                        <div className="text-right">
                            <button
                                type="button"
                                className="text-sm text-primary hover:underline"
                                onClick={() => {
                                    setResetMode(true);
                                    setResetStep('request');
                                    setShowOtp(false);
                                    setFormError(null);
                                }}
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}
                    <Button className="w-full h-12 font-bold text-lg" disabled={isLoading} type="submit">
                        {isLoading ? <Loader2 className="animate-spin" /> : (isRegister ? 'Create Account' : 'Sign In')}
                    </Button>
                    <div className="flex justify-between text-sm">
                        <button
                            type="button"
                            className="text-muted-foreground hover:text-primary flex items-center gap-1"
                            onClick={() => setShowForm(false)}
                        >
                            <ArrowLeft size={14} /> Back
                        </button>
                        <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => setIsRegister(!isRegister)}
                        >
                            {isRegister ? "Have an account? Login" : "New here? Register"}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Show type selection (default)
    return (
        <div className="w-full space-y-4">
            <button
                type="button"
                className="w-full h-16 text-lg font-bold border border-primary/20 bg-primary/5 hover:bg-primary/10 flex justify-between items-center px-6 rounded-lg transition-colors"
                onClick={() => setShowForm(true)}
            >
                <span className="flex items-center gap-3">
                    <Mail className="text-primary" />
                    <span className="text-white">Email & Password</span>
                </span>
                <ArrowRight size={20} className="text-white" />
            </button>
            <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/5"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-black px-2 text-muted-foreground">Or continue with</span>
                </div>
            </div>
            <GoogleLogin onAuthSuccess={onAuthSuccess} />
        </div>
    );
};
