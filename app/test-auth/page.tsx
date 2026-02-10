"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, Lock } from "lucide-react";

export default function TestAuthPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <div className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-2xl">
                <h1 className="text-2xl font-bold text-white mb-6">Login Form Test</h1>

                <form className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Email Address"
                            className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                            type="email"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Password"
                            className="pl-10 h-12 bg-white/5 border-white/10 text-white"
                            type="password"
                        />
                    </div>

                    <Button className="w-full h-12 font-bold text-lg" type="submit">
                        Sign In
                    </Button>
                </form>
            </div>
        </div>
    );
}
