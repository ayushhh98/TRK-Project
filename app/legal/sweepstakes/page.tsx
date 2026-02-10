import { ShieldCheck, Scale, FileText, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function SweepstakesTermsPage() {
    return (
        <div className="min-h-screen bg-black text-gray-300 relative overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Background FX */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            <div className="container mx-auto px-4 py-10 relative z-10 max-w-5xl">
                {/* Back to Home */}
                <div className="mb-10">
                    <Link href="/">
                        <Button variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 gap-2 pl-0">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Home
                        </Button>
                    </Link>
                </div>

                {/* Header Section */}
                <div className="text-center mb-16 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-sm font-bold tracking-widest uppercase backdrop-blur-md">
                        <Scale className="h-4 w-4" />
                        Official Rules & Regulations
                    </div>

                    <h1 className="text-5xl md:text-7xl font-display font-black text-white tracking-tight">
                        Sweepstakes <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Model</span>
                    </h1>

                    <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                        Transparency is our core value. Review the official rules governing our promotional sweepstakes and virtual currency system.
                    </p>

                    <div className="flex items-center justify-center gap-4 text-sm font-mono text-white/40">
                        <span>Ver: 2.1.0</span>
                        <span>•</span>
                        <span>Updated: Feb 8, 2026</span>
                    </div>
                </div>

                {/* Critical Notice Card */}
                <div className="relative group mb-16">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000" />
                    <div className="relative bg-black/80 border border-amber-500/30 rounded-xl p-8 backdrop-blur-xl">
                        <div className="flex items-start gap-6">
                            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
                                <AlertTriangle className="h-6 w-6 text-amber-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    Legal Disposition
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-black uppercase tracking-wider">Important</span>
                                </h3>
                                <p className="text-gray-300 leading-relaxed">
                                    This platform operates as a **Social Sweepstakes Casino**. No purchase is necessary to participate.
                                    WE ARE NOT A REAL MONEY GAMBLING SITE. Participation is void where prohibited by law.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-[1fr_300px] gap-10">
                    <div className="space-y-12">
                        {/* Section 1 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 font-black text-lg">01</div>
                                <h2 className="text-3xl font-bold text-white">Platform Structure</h2>
                            </div>
                            <div className="prose prose-invert max-w-none text-gray-400 space-y-4 leading-relaxed bg-white/5 p-8 rounded-2xl border border-white/5">
                                <p>
                                    <strong className="text-white">1.1 Nature of Service:</strong> This platform allows users to participate in promotional games using virtual currencies. It implies NO obligation to purchase.
                                </p>
                                <p>
                                    <strong className="text-white">1.2 Compliance:</strong> The model strictly adheres to sweepstakes laws in eligible jurisdictions, differentiating entirely from traditional gambling.
                                </p>
                                <p>
                                    <strong className="text-white">1.3 Gameplay:</strong> Outcomes are determined by a provably fair Random Number Generator (RNG), ensuring transparency and fairness.
                                </p>
                            </div>
                        </section>

                        {/* Section 2 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 font-black text-lg">02</div>
                                <h2 className="text-3xl font-bold text-white">Free Entry Policy</h2>
                            </div>
                            <div className="prose prose-invert max-w-none text-gray-400 space-y-4 leading-relaxed bg-white/5 p-8 rounded-2xl border border-white/5">
                                <div className="flex items-start gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl mb-4">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-white font-bold mb-1">Alternative Method of Entry (AMOE)</h4>
                                        <p className="text-sm">Users may claim 100 Free Credits daily via the dashboard without any financial transaction.</p>
                                    </div>
                                </div>
                                <p>
                                    <strong className="text-white">2.1 Equality:</strong> Free players have equal chances of winning as those who purchase membership packages.
                                </p>
                                <p>
                                    <strong className="text-white">2.2 Non-Discrimination:</strong> Promotional play features are accessible to all verified users in eligible regions.
                                </p>
                            </div>
                        </section>

                        {/* Section 3 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 font-black text-lg">03</div>
                                <h2 className="text-3xl font-bold text-white">Virtual Economy</h2>
                            </div>
                            <div className="bg-white/5 p-8 rounded-2xl border border-white/5 grid md:grid-cols-2 gap-6">
                                <div className="bg-black/40 p-6 rounded-xl border border-yellow-500/20">
                                    <div className="text-yellow-400 font-black text-lg mb-2">Gold Coins (GC)</div>
                                    <p className="text-sm text-gray-400 mb-4">For Standard Play & Entertainment.</p>
                                    <ul className="text-xs space-y-2 text-gray-500">
                                        <li className="flex gap-2"><span className="text-red-500">✕</span> No Monetary Value</li>
                                        <li className="flex gap-2"><span className="text-red-500">✕</span> Cannot be Redeemed</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">✓</span> Unlimited Fun</li>
                                    </ul>
                                </div>
                                <div className="bg-black/40 p-6 rounded-xl border border-purple-500/20">
                                    <div className="text-purple-400 font-black text-lg mb-2">Sweepstakes Coins (SC)</div>
                                    <p className="text-sm text-gray-400 mb-4">For Promotional Play.</p>
                                    <ul className="text-xs space-y-2 text-gray-500">
                                        <li className="flex gap-2"><span className="text-emerald-500">✓</span> Redeemable for Prizes</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">✓</span> 1 SC = 1 USDT Value</li>
                                        <li className="flex gap-2"><span className="text-emerald-500">✓</span> Earned via Bonus/Free</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 font-black text-lg">04</div>
                                <h2 className="text-3xl font-bold text-white">Redemption Rules</h2>
                            </div>
                            <div className="prose prose-invert max-w-none text-gray-400 space-y-4 leading-relaxed bg-white/5 p-8 rounded-2xl border border-white/5">
                                <p>
                                    <strong className="text-white">4.1 Verification:</strong> All redemptions are subject to strict KYC (Know Your Customer) and anti-fraud checks.
                                </p>
                                <p>
                                    <strong className="text-white">4.2 Thresholds:</strong> Minimum redemption is 50 SC. Maximum daily redemption may be capped for security.
                                </p>
                                <p>
                                    <strong className="text-white">4.3 Processing:</strong> Allow 24-48 hours for crypto prize distribution to your connected wallet.
                                </p>
                            </div>
                        </section>

                        {/* Additional Sections Collapsed/Summarized */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 text-cyan-400 font-black text-lg">05</div>
                                <h2 className="text-3xl font-bold text-white">Eligibility & Liability</h2>
                            </div>
                            <div className="prose prose-invert max-w-none text-gray-400 space-y-4 leading-relaxed bg-white/5 p-8 rounded-2xl border border-white/5">
                                <p>
                                    <strong className="text-white">5.1 Age Restriction:</strong> You must be at least 18 years of age (or the minimum legal age in your jurisdiction) to participate.
                                </p>
                                <p>
                                    <strong className="text-white">5.2 Restricted Territories:</strong> Service is void in Washington, Idaho, Nevada, and where prohibited by law.
                                </p>
                                <p>
                                    <strong className="text-white">5.3 Liability:</strong> The platform is not liable for technical malfunctions, internet failures, or unauthorized account access.
                                </p>
                            </div>
                        </section>

                    </div>

                    {/* Sidebar Navigation */}
                    <div className="hidden lg:block">
                        <div className="sticky top-32 space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-cyan-400" />
                                    Quick Navigation
                                </h4>
                                <nav className="space-y-2 text-sm">
                                    {['Platform Structure', 'Free Entry Policy', 'Virtual Economy', 'Redemption Rules'].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors cursor-pointer group">
                                            <div className="h-1.5 w-1.5 rounded-full bg-white/20 group-hover:bg-cyan-400 transition-colors" />
                                            {item}
                                        </div>
                                    ))}
                                </nav>
                            </div>

                            <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-2xl p-6">
                                <h4 className="text-white font-bold mb-2">Need Help?</h4>
                                <p className="text-xs text-white/60 mb-4">Our compliance team is available 24/7 to answer your questions.</p>
                                <Link href="/support">
                                    <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
                                        Contact Support
                                    </Button>
                                </Link>
                            </div>

                            {/* Promotional Poster Card */}
                            <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group cursor-pointer border border-white/10 shadow-2xl">
                                <Link href="/login">
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-600 transition-all duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mixed-blend-overlay" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                    <div className="relative h-full p-6 flex flex-col justify-between text-white z-10">
                                        <div>
                                            <div className="inline-flex px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black tracking-widest uppercase border border-white/30 mb-4 shadow-lg">
                                                Sweepstakes
                                            </div>
                                            <h3 className="text-4xl font-display font-black leading-[0.9] mb-3 drop-shadow-lg">
                                                WIN<br />REAL<br />PRIZES
                                            </h3>
                                            <p className="text-white/90 text-sm font-medium leading-snug max-w-[80%] drop-shadow-md">
                                                Play with Sweepstakes Coins and redeem winnings for crypto.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 text-sm font-bold bg-black/40 p-3 rounded-xl backdrop-blur-md border border-white/10">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black shadow-lg">
                                                    <ShieldCheck className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-white/70 uppercase tracking-wider font-bold">Legal & Verified</div>
                                                    <div className="text-white">1 SC = 1 USDT</div>
                                                </div>
                                            </div>

                                            <Button className="w-full h-12 bg-white text-blue-600 hover:bg-white/90 font-black tracking-wide shadow-xl transition-transform active:scale-95">
                                                PLAY NOW
                                            </Button>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="mt-20 pt-8 border-t border-white/5 text-center text-xs text-white/30">
                    <p>
                        Copyright © 2026 TRK Platform. All rights reserved. This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
                    </p>
                </div>
            </div>
        </div>
    );
}

