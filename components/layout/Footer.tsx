"use client";

import Link from "next/link";
import {
    Twitter,
    MessageCircle,
    Send,
    Github,
    Mail,
    ShieldCheck,
    Globe,
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const footerLinks = {
    ecosystem: [
        { name: "Live Game", href: "/login" },
        { name: "Lucky Draw", href: "/dashboard/lucky-draw" },
        { name: "Club Income", href: "/dashboard/club" },
        { name: "Protection", href: "/dashboard/cashback" },
    ],
    support: [
        { name: "Documentation", href: "#doc" },
        { name: "How to Play", href: "#how-it-works" },
        { name: "Safety Audit", href: "#safety" },
        { name: "Media Kit", href: "#" },
    ],
    legal: [
        { name: "Terms of Service", href: "#" },
        { name: "Privacy Policy", href: "#" },
        { name: "Risk Disclosure", href: "#" },
        { name: "Cookie Policy", href: "#" },
    ]
};

const socialLinks = [
    { icon: Twitter, href: "#", color: "hover:text-sky-400" },
    { icon: Send, href: "#", color: "hover:text-blue-500" },
    { icon: MessageCircle, href: "#", color: "hover:text-green-500" },
    { icon: Github, href: "#", color: "hover:text-white" },
];

export function Footer() {
    return (
        <footer className="bg-black border-t border-white/5 pt-12 pb-6 overflow-hidden relative">
            {/* Background Accent */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
                    {/* Brand Section */}
                    <div className="space-y-6">
                        <Link href="/" className="group inline-block">
                            <Logo withText className="h-10 w-auto group-hover:scale-105 transition-transform duration-300" />
                        </Link>
                        <p className="text-muted-foreground leading-relaxed max-w-xs">
                            The first decentralized, no-loss blockchain gaming ecosystem designed for sustainable earning and community growth.
                        </p>
                        <div className="flex gap-4">
                            {socialLinks.map((social, i) => (
                                <Link
                                    key={i}
                                    href={social.href}
                                    className={`h-10 w-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center transition-all ${social.color} hover:bg-white/10 hover:border-white/20`}
                                >
                                    <social.icon className="h-5 w-5" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Column 1 */}
                    <div className="space-y-6">
                        <h4 className="text-white font-bold tracking-wider uppercase text-xs">Protocol</h4>
                        <ul className="space-y-4">
                            {footerLinks.ecosystem.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group">
                                        {link.name}
                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-6">
                        <h4 className="text-white font-bold tracking-wider uppercase text-xs">Knowledge Base</h4>
                        <ul className="space-y-4">
                            {footerLinks.support.map((link) => (
                                <li key={link.name}>
                                    <Link href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter / CTA */}
                    <div className="space-y-6">
                        <h4 className="text-white font-bold tracking-wider uppercase text-xs">Stay Connected</h4>
                        <div className="p-1 rounded-xl bg-white/5 border border-white/5 flex">
                            <input
                                type="email"
                                placeholder="Your Email..."
                                className="bg-transparent border-none focus:ring-0 text-sm px-4 flex-1 text-white"
                            />
                            <Button size="sm" className="bg-primary text-black font-bold px-4">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
                            <div className="flex items-center gap-3 text-primary mb-2">
                                <ShieldCheck className="h-5 w-5" />
                                <span className="font-bold text-sm">Audited & Verified</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Smart contracts verified by leading security firms. Play with confidence.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        {footerLinks.legal.map((link) => (
                            <Link key={link.name} href={link.href} className="hover:text-white transition-colors">
                                {link.name}
                            </Link>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span>v2.4.0 (Mainnet)</span>
                        </div>
                        <span>© 2026 TRK. All Rights Reserved.</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
