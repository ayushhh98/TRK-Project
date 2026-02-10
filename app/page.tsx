"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/Card";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useWallet } from "@/components/providers/WalletProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Trophy,
  Wallet,
  Repeat,
  Gift,
  ChevronRight,
  CheckCircle2,
  PlayCircle,
  UserPlus,
  Flame,
  Gem,
  TrendingUp,
  Dices,
  Activity,
  Lock
} from "lucide-react";
import Link from "next/link";
import { SweepstakesExplainer } from "@/components/home/SweepstakesExplainer";

const steps = [
  {
    icon: UserPlus,
    title: "Connect Wallet",
    desc: "Link your MetaMask or Trust Wallet to create your secure, decentralized account instantly.",
    color: "from-blue-500 to-indigo-600"
  },
  {
    icon: PlayCircle,
    title: "Practice & Master",
    desc: "Start with 100 Practice USDT. Learn the Ludo-style Dice 6X mechanics without any risk.",
    color: "from-purple-500 to-pink-600"
  },
  {
    icon: Wallet,
    title: "Activate for Real",
    desc: "Deposit 10 USDT to unlock real earnings, live jackpots, and your referral network.",
    color: "from-orange-500 to-amber-600"
  },
  {
    icon: Flame,
    title: "Passive Compounding",
    desc: "Earn daily from cashback, lucky draws, and ROI on ROI through your expanding network.",
    color: "from-green-500 to-emerald-600"
  }
];

const incomePosters = [
  {
    title: "Dice 6X Wins",
    subtitle: "Active Game Income",
    desc: "Multiply your capital up to 6X in every single roll. Ludo-style mechanics with lightning-fast payouts.",
    icon: Dices,
    tag: "High Multiplier",
    color: "bg-gradient-to-br from-blue-600/20 to-indigo-900/40",
    border: "border-blue-500/30",
    iconColor: "text-blue-400"
  },
  {
    title: "$70,000 Jackpot",
    subtitle: "Lucky Draw System",
    desc: "1 in 10 players win! Automatic funding system buys your tickets using daily profits.",
    icon: Gift,
    tag: "10% Odds",
    color: "bg-gradient-to-br from-purple-600/20 to-pink-900/40",
    border: "border-purple-500/30",
    iconColor: "text-purple-400"
  },
  {
    title: "Global Share",
    subtitle: "Club Leadership Income",
    desc: "Become a leader and earn a share of 8% global daily company turnover. Paid every 24 hours.",
    icon: Trophy,
    tag: "Passive Pool",
    color: "bg-gradient-to-br from-amber-600/20 to-orange-900/40",
    border: "border-amber-500/30",
    iconColor: "text-amber-400"
  },
  {
    title: "No-Loss Guard",
    subtitle: "Cashback Protection",
    desc: "Every loss is recorded and returned to you via daily 0.5% distributions until 100% recovered.",
    icon: ShieldCheck,
    tag: "100% Secure",
    color: "bg-gradient-to-br from-emerald-600/20 to-green-900/40",
    border: "border-emerald-500/30",
    iconColor: "text-emerald-400"
  },
  {
    title: "Network Leverage",
    subtitle: "ROI on ROI Income",
    desc: "Earn up to 15 levels of commissions on the cashback distributions of your entire team.",
    icon: Users,
    tag: "Infinity Growth",
    color: "bg-gradient-to-br from-rose-600/20 to-red-900/40",
    border: "border-rose-500/30",
    iconColor: "text-rose-400"
  }
];

export default function Home() {
  const { isConnected, isLoading, user } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (typeof window !== "undefined") {
      const lockHome = sessionStorage.getItem("trk_home_override");
      if (lockHome === "1") return;
    }
    if (!isConnected) return;
    if (user?.role === "admin" || user?.role === "superadmin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }, [isLoading, isConnected, user, router]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen flex flex-col bg-black selection:bg-primary/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32 min-h-screen flex items-center">
        {/* Background FX */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center space-y-8"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-primary text-sm font-bold backdrop-blur-md"
            >
              <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
              Next-Gen No-Loss Ecosystem is Live
            </motion.div>

            <h1 className="text-6xl md:text-8xl font-display font-black text-white leading-tight tracking-tighter">
              Play Fearless. <br />
              <span className="bg-gradient-to-r from-primary via-yellow-400 to-amber-500 bg-clip-text text-transparent italic">
                Earn Sustainably.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              The first decentralized platform where your losses are protected, and your earnings are compounding through 5 high-yield streams.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link href="/login">
                <Button size="lg" className="h-16 px-10 text-xl font-black bg-primary text-black rounded-2xl shadow-[0_0_30px_rgba(255,193,7,0.3)] hover:scale-105 transition-transform group">
                  Start Earning Now
                  <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="h-16 px-10 text-xl font-bold border-white/10 hover:bg-white/5 bg-white/5 backdrop-blur-md text-white rounded-2xl">
                  Learn Mechanics
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it Works - The Visual Roadmap */}
      <section id="how-it-works" className="py-32 relative bg-black/80 overflow-hidden">
        {/* Background Decorative Line (Static) */}
        <div className="absolute top-[45%] left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent hidden lg:block" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-24 space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-[10px] font-black tracking-[0.2em] uppercase"
            >
              The TRK Blueprint
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-display font-black text-white">How it Works</h2>
            <p className="text-xl text-muted-foreground leading-relaxed italic">
              From zero to <span className="text-primary font-bold">$152K+</span> sustainable earnings in 4 professional stages.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-10"
          >
            {steps.map((step, i) => (
              <motion.div key={i} variants={itemVariants} className="group relative">
                {/* Visual Step Marker */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
                  <div className={`h-8 w-8 rounded-full border-2 border-white/10 flex items-center justify-center font-black text-xs transition-colors duration-500 group-hover:border-primary group-hover:bg-primary group-hover:text-black ${i === 0 ? 'bg-primary text-black border-primary' : 'bg-black text-white'}`}>
                    0{i + 1}
                  </div>
                  <div className="h-4 w-px bg-white/10 group-hover:bg-primary transition-colors" />
                </div>

                <Card className="relative h-full bg-white/5 border-white/10 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden group-hover:border-primary/30 group-hover:bg-white/[0.08] transition-all duration-500 hover:translate-y--2 shadow-2xl">
                  {/* Glassmorphism Inner Glow */}
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.03] to-transparent" />

                  <CardContent className="p-10 space-y-8 relative z-10">
                    <div className={`h-20 w-20 rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-2xl shadow-black/50 group-hover:scale-110 transition-transform duration-500`}>
                      <step.icon className="h-10 w-10 text-white" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-black uppercase text-white/40 tracking-widest">
                          Stage 0{i + 1}
                        </div>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      <h3 className="text-2xl font-bold text-white tracking-tight leading-snug group-hover:text-primary transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                        {step.desc}
                      </p>
                    </div>

                    {/* Feature Checklist */}
                    <div className="pt-4 space-y-2 border-t border-white/5">
                      {[1, 2].map((_, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase group-hover:text-primary/50 transition-colors">
                          <CheckCircle2 className="h-3 w-3" />
                          {idx === 0 ? "Verified Protocol" : "Instant Execution"}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Connected CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="mt-20 text-center"
          >
            <div className="inline-flex flex-col items-center gap-6 p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md">
              <p className="text-white/60 font-medium max-w-sm">
                The path is clear. From 100 Practice USDT to your first real withdrawal takes less than 10 minutes.
              </p>
              <Link href="/login">
                <Button size="lg" className="h-14 px-8 bg-white text-black font-black hover:bg-primary transition-colors rounded-xl shadow-xl">
                  Follow the Roadmap
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sweepstakes Explainer */}
      <SweepstakesExplainer />

      {/* Ecosystem Rewards Section */}
      <section id="ecosystem" className="py-32 bg-black/50 border-y border-white/5">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center mb-20 space-y-6"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-black tracking-widest uppercase"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🚀 Ecosystem Rewards
            </motion.div>
            <h2 className="text-5xl md:text-7xl font-display font-black text-white leading-tight">
              Lead the Network. <br />
              <span className="text-primary italic">Share the Turnover.</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Instead of just referrals, earn a direct share of the entire platform's daily success through our automated Club Pool.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            {/* Club Income Poster Detail */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-amber-600/10 via-amber-900/10 to-transparent border border-amber-500/20 rounded-[3rem] p-10 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                <Trophy className="h-64 w-64 text-amber-500" />
              </div>

              <div className="relative z-10 space-y-8">
                <div className="space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-amber-400" />
                  </div>
                  <h3 className="text-4xl font-display font-black text-white">6️⃣ 🏢 Club Income</h3>
                  <p className="text-lg text-white/70">
                    Designed for leaders. Receive a daily share of the <span className="text-amber-400 font-bold">8% Global Daily Turnover</span>.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                    <div className="text-amber-400 font-black text-sm uppercase tracking-widest">Pool Allocation</div>
                    <div className="text-3xl font-black text-white">8% Daily</div>
                    <p className="text-xs text-muted-foreground italic">Bigger Growth → Bigger Rewards</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                    <div className="text-amber-400 font-black text-sm uppercase tracking-widest">Balanced Rule</div>
                    <div className="text-3xl font-black text-white">50/50 Proof</div>
                    <p className="text-xs text-muted-foreground italic">Ensures Fair Team Growth</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-sm font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    Qualification Criteria
                  </div>
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <div className="text-xs text-white/60 font-bold uppercase">Strong Leg (Max)</div>
                        <div className="text-white font-black">50% Volume</div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-xs text-white/60 font-bold uppercase">Other Legs (Min)</div>
                        <div className="text-white font-black">50% Volume</div>
                      </div>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                      <div className="h-full w-1/2 bg-amber-400" />
                      <div className="h-full w-1/2 bg-amber-600/50" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-white/40 uppercase text-center">
                      <div>Fair Expansion</div>
                      <div>Zero Stacking</div>
                      <div>Leader Driven</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Rank Structure Table */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white/5 border border-white/10 rounded-[3rem] p-10 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <h3 className="text-3xl font-display font-black text-white">🏅 Rank Structure</h3>
                <div className="overflow-hidden rounded-2xl border border-white/5">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5">
                        <th className="px-6 py-4 text-xs font-black uppercase text-white/50">Rank</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-white/50">Share</th>
                        <th className="px-6 py-4 text-xs font-black uppercase text-white/50">Target (USDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        { rank: "Rank 1", share: "2%", target: "10,000" },
                        { rank: "Rank 2", share: "2%", target: "50,000" },
                        { rank: "Rank 3", share: "1%", target: "2.5 Lakh" },
                        { rank: "Rank 4", share: "1%", target: "10 Lakh" },
                        { rank: "Rank 5", share: "1%", target: "50 Lakh" },
                        { rank: "Rank 6", share: "1%", target: "1 Crore" },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 font-bold text-white group-hover:text-amber-400 transition-colors">{row.rank}</td>
                          <td className="px-6 py-4 font-mono font-bold text-primary">{row.share}</td>
                          <td className="px-6 py-4 font-mono text-white/70">{row.target}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8 p-6 rounded-2xl bg-primary/10 border border-primary/20 space-y-3">
                <div className="text-primary font-black text-sm tracking-wide">💡 Turn Potential Into Real Cash</div>
                <p className="text-sm text-white/80 leading-relaxed italic">
                  Example: If daily turnover is $1,000,000, the 8% pool = $80,000. <br />
                  Rank 1 members earn a share of $1,600 daily.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Lucky Draw detail */}
          <div className="mt-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-r from-purple-900/20 via-black to-black border border-purple-500/20 rounded-[3rem] p-8 md:p-12 flex flex-col md:flex-row items-center gap-12 group"
            >
              <div className="flex-1 space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-black tracking-widest uppercase border border-purple-500/20">
                    7️⃣ 🎰 Lucky Draw Income
                  </div>
                  <h3 className="text-4xl md:text-5xl font-display font-black text-white leading-tight">
                    Turn 10 USDT <br />
                    Into <span className="text-purple-400 font-italic">10,000 USDT</span>
                  </h3>
                  <p className="text-lg text-white/70 leading-relaxed">
                    Automatic jackpot pools with guaranteed winners. Play once, win automatically through our auto-ticket funding system.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Chance", value: "1 in 10" },
                    { label: "Tickets", value: "10,000" },
                    { label: "Winners", value: "1,000" },
                    { label: "Draws", value: "Daily" },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <div className="text-[10px] text-white/40 font-black uppercase mb-1">{stat.label}</div>
                      <div className="text-xl font-black text-white">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <Link href="/login">
                  <Button size="lg" className="h-16 px-10 text-xl font-black bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-600/20 hover:scale-105 transition-transform group">
                    Buy Tickets Now
                    <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[400px]">
                <div className="absolute inset-0 bg-purple-500/20 blur-[100px] animate-pulse" />
                <div className="relative h-full w-full bg-white/5 border border-white/10 rounded-[2rem] flex items-center justify-center p-8 overflow-hidden">
                  <div className="text-[120px] transition-all duration-700 animate-pulse">🎰</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Safe & Secure - Trust Center */}
      <section id="safety" className="py-32 bg-black relative overflow-hidden">
        {/* Security Background FX */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-20 space-y-4">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-black tracking-widest uppercase"
              >
                <ShieldCheck className="h-4 w-4" />
                Security & Transparency
              </motion.div>
              <h2 className="text-5xl md:text-6xl font-display font-black text-white">The Trust Center</h2>
              <p className="text-xl text-muted-foreground">Built on the foundation of mathematical certainty and decentralized governance.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-stretch">
              {/* Security Health Score */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="text-xs text-white/50 font-black uppercase tracking-widest">Security Health</div>
                      <div className="text-3xl font-black text-white">Hardened 🛡️</div>
                    </div>
                    <div className="h-12 w-12 rounded-full border-4 border-green-500/20 border-t-green-500 animate-spin" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-white/70">Audit Status</span>
                      <span className="text-green-400">PASSED</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: "98%" }}
                        className="h-full bg-green-500"
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Our smart contracts have undergone rigorous testing and third-party audits to ensure maximum protection for your digital assets.
                    </p>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-white/40 font-black uppercase">Liquidity</div>
                    <div className="text-lg font-black text-white">Locked</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-[10px] text-white/40 font-black uppercase">Contract</div>
                    <div className="text-lg font-black text-white">Immutable</div>
                  </div>
                </div>
              </motion.div>

              {/* Technical Badges Grid */}
              <div className="grid grid-cols-1 gap-4">
                {[
                  {
                    icon: Zap,
                    title: "Chainlink VRF",
                    desc: "Verifiable Random Function ensures 100% fair dice rolls and jackpots. Completely tamper-proof.",
                    color: "text-blue-400",
                    bg: "bg-blue-400/10"
                  },
                  {
                    icon: Lock,
                    title: "Multisig Execution",
                    desc: "Crucial treasury actions require multiple cryptographic approvals. No single point of failure.",
                    color: "text-purple-400",
                    bg: "bg-purple-400/10"
                  },
                  {
                    icon: Activity,
                    title: "Real-time Monitoring",
                    desc: "24/7 on-chain surveillance tracks every movement, ensuring ecosystem health and stability.",
                    color: "text-orange-400",
                    bg: "bg-orange-400/10"
                  }
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group bg-white/5 border border-white/10 hover:border-white/20 p-6 rounded-3xl flex gap-6 transition-all"
                  >
                    <div className={`h-12 w-12 rounded-2xl ${feature.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-white tracking-tight">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Verification Proofs */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="mt-12 p-8 rounded-[2.5rem] bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 flex flex-col md:flex-row items-center justify-between gap-8"
            >
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center text-black shadow-lg shadow-green-500/20">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <div className="space-y-1 text-center md:text-left">
                  <h4 className="text-2xl font-display font-black text-white">Open Source & Verified</h4>
                  <p className="text-white/60">Inspect our code on BscScan. Transparency is our core value.</p>
                </div>
              </div>
              <Link href={`https://bscscan.com/address/0xe17e3350493864455246714E4F8cf738A5633677`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-white/10 text-white font-bold h-14 px-8 rounded-2xl hover:bg-white/5">
                  View Smart Contracts
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

