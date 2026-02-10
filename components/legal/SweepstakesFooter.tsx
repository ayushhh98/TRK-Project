export default function SweepstakesFooter() {
    return (
        <footer className="bg-gray-900 border-t border-gray-800 mt-20">
            <div className="container mx-auto px-4 py-8">
                {/* Legal Disclaimers */}
                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-6 mb-6">
                    <h3 className="text-yellow-400 font-bold text-lg mb-3">⚠️ Important Legal Information</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                        <div>
                            <p className="font-semibold text-white mb-1">Not a Gambling Platform</p>
                            <p>This is a sweepstakes and rewards entertainment platform, NOT a casino or betting site.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white mb-1">No Purchase Necessary</p>
                            <p>Free entry available daily. See "Free Credits" page for details.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white mb-1">Entertainment Only</p>
                            <p>Gold Coins (GC) have no monetary value. Games are played for entertainment.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white mb-1">Promotional Rewards</p>
                            <p>Sweepstakes Coins (SC) winnings can be redeemed for crypto prizes (1 SC = 1 USDT).</p>
                        </div>
                    </div>
                </div>

                {/* Standard Footer */}
                <div className="grid md:grid-cols-4 gap-8 mb-6">
                    <div>
                        <h4 className="text-white font-bold mb-3">Platform</h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><a href="/free-credits" className="hover:text-white">Free Credits (No Purchase)</a></li>
                            <li><a href="/membership" className="hover:text-white">Membership Packages</a></li>
                            <li><a href="/dashboard/cash" className="hover:text-white">Reward Redemption</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-3">Legal</h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><a href="/legal/terms" className="hover:text-white">Terms & Conditions</a></li>
                            <li><a href="/legal/privacy" className="hover:text-white">Privacy Policy</a></li>
                            <li><a href="/legal/sweepstakes" className="hover:text-white">Sweepstakes Rules</a></li>
                            <li><a href="/legal/disclaimers" className="hover:text-white">Disclaimers</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-3">Support</h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><a href="/support" className="hover:text-white">Help Center</a></li>
                            <li><a href="/faq" className="hover:text-white">FAQ</a></li>
                            <li><a href="/contact" className="hover:text-white">Contact Us</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-3">Responsible Gaming</h4>
                        <ul className="space-y-2 text-gray-400 text-sm">
                            <li><a href="/responsible-gaming" className="hover:text-white">18+ Only</a></li>
                            <li><a href="/responsible-gaming#limits" className="hover:text-white">Set Limits</a></li>
                            <li><a href="/responsible-gaming#self-exclusion" className="hover:text-white">Self-Exclusion</a></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800 pt-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                        <p>© 2026 TRK Platform - Sweepstakes Gaming Platform</p>
                        <div className="flex gap-4">
                            <span className="text-yellow-400 font-semibold">18+ Only</span>
                            <span>|</span>
                            <span>Void Where Prohibited</span>
                            <span>|</span>
                            <span>Not a Gambling Site</span>
                            <span>|</span>
                            <span>Entertainment Purpose</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
