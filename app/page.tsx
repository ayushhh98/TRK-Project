"use client";

import { motion, AnimatePresence } from "framer-motion";
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
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  Trophy,
  Wallet,
  Repeat,
  Gift,
  ChevronDown,
  CheckCircle2,
  PlayCircle,
  UserPlus,
  Flame,
  Gem,
  TrendingUp,
  Dices,
  Activity,
  Lock,
  Plus,
  Minus
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";


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

const faqs = [
  {
    q: "What is TRK Game?",
    a: "TRK Game is a Web3 reward ecosystem where you play, earn, and grow through on-chain transparency and multiple income streams."
  },
  {
    q: "How do I get started?",
    a: "Connect a wallet, explore the practice balance, then activate your account with a 10 USDT deposit to unlock real earnings."
  },
  {
    q: "What is a TRK code?",
    a: "A TRK code is your referral code. Share it to invite new players and track team growth in your dashboard."
  },
  {
    q: "How much does it cost to play?",
    a: "Practice mode is free. Real play requires activation and uses your deposited balance."
  },
  {
    q: "How do I win?",
    a: "Win by playing the TRK games (like Dice 6X) and following the published mechanics. Payouts are handled on-chain."
  },
  {
    q: "What are the income streams?",
    a: "Dice wins, cashback protection, jackpot draws, club pool rewards, and ROI-on-ROI team income."
  },
  {
    q: "How does the referral system work?",
    a: "Invite teammates with your TRK code. As they activate and play, you earn team-based rewards across multiple levels."
  },
  {
    q: "What are the referral percentages?",
    a: "Percentages vary by level and are shown in your dashboard. The system supports rewards across multiple tiers."
  },
  {
    q: "How do withdrawals work?",
    a: "Withdrawals are requested in the dashboard and sent on-chain. Processing time depends on network conditions."
  },
  {
    q: "Is my money safe?",
    a: "Your balances and game outcomes are recorded on-chain for full transparency and security."
  },
  {
    q: "What wallets are supported?",
    a: "MetaMask, Trust Wallet, and WalletConnect-compatible wallets (including Ready)."
  },
  {
    q: "How many games can I play per day?",
    a: "Daily limits depend on your activation tier and balance. Your current limits are shown in the app."
  },
  {
    q: "What happens if I lose?",
    a: "Our ecosystem focus on sustainable growth and transparent mechanics. Please play responsibly."
  },
  {
    q: "Can I play on mobile?",
    a: "Yes. Use a mobile wallet or scan via WalletConnect to play from your phone."
  },
  {
    q: "What is the practice account?",
    a: "A sandbox balance for learning the game mechanics. Practice funds are not withdrawable."
  }
];

export default function Home() {
  const { isConnected, user, connect, login, isRegisteredOnChain } = useWallet();
  const router = useRouter();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const lockHome = sessionStorage.getItem("trk_home_override");
    if (lockHome === "1") {
      sessionStorage.removeItem("trk_home_override");
    }
  }, []);


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  if (!mounted) {
    return <div className="min-h-screen bg-black" />;
  }

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
              <Link href={user ? "/dashboard" : "/auth"}>
                <Button size="lg" className="h-16 px-10 text-xl font-black bg-primary text-black rounded-2xl shadow-[0_0_30px_rgba(255,193,7,0.3)] hover:scale-105 transition-transform group">
                  {user ? "Go to Dashboard" : "Start Earning Now"}
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
      {/* Why TRK? Section */}
      <section id="why-trk" className="py-32 bg-black relative">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-20 space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-[0.2em] uppercase"
            >
              Core Advantages
            </motion.div>
            <h2 className="text-5xl md:text-7xl font-display font-black text-white italic uppercase tracking-tighter">
              Why <span className="text-primary italic">TRK Ecosystem?</span>
            </h2>
            <p className="text-lg text-white/40 max-w-2xl mx-auto uppercase tracking-widest leading-relaxed">
              Merging high-yield mechanics with institutional-grade security and transparency.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Free to Start",
                desc: "No upfront costs. Join and explore the ecosystem with zero barriers to entry.",
                color: "text-blue-400",
                bg: "bg-blue-400/10"
              },

              {
                icon: Trophy,
                title: "8X Win Potential",
                desc: "Maximize your capital with up to 8X multipliers through optimized game logic.",
                color: "text-amber-400",
                bg: "bg-amber-400/10"
              },
              {
                icon: ShieldCheck,
                title: "Daily Cashback",
                desc: "Industry-first losers protection. Recover up to 10% of losses automatically every midnight.",
                color: "text-emerald-400",
                bg: "bg-emerald-400/10"
              },
              {
                icon: TrendingUp,
                title: "7 Income Streams",
                desc: "Direct, Passive, Club, ROI, and more. A multifaceted approach to wealth building.",
                color: "text-rose-400",
                bg: "bg-rose-400/10"
              },
              {
                icon: Gem,
                title: "Lucky Jackpots",
                desc: "Continuous participation in automated draws with prize pools scaling to thousands.",
                color: "text-purple-400",
                bg: "bg-purple-400/10"
              },
              {
                icon: Users,
                title: "Passive Network",
                desc: "Earn deep referral commissions up to 15 levels. True leverage for community leaders.",
                color: "text-indigo-400",
                bg: "bg-indigo-400/10"
              },
              {
                icon: Lock,
                title: "Fully Decentralized",
                desc: "Non-custodial and transparent. Every transaction and outcome is verified on-chain.",
                color: "text-orange-400",
                bg: "bg-orange-400/10"
              },
              {
                icon: Activity,
                title: "Future Token",
                desc: "Moving towards a 100% TRK Token Economy to drive scarcity and long-term value.",
                color: "text-cyan-400",
                bg: "bg-cyan-400/10"
              }
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity blur-xl pointer-events-none" />
                <div className="h-full bg-white/[0.02] border border-white/10 p-8 rounded-[2.5rem] space-y-4 hover:bg-white/[0.05] hover:border-white/20 transition-all">
                  <div className={`h-14 w-14 rounded-2xl ${p.bg} flex items-center justify-center ${p.color} group-hover:scale-110 transition-transform`}>
                    <p.icon className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{p.title}</h3>
                    <p className="text-sm text-white/30 uppercase font-medium leading-relaxed tracking-wide">
                      {p.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
              <Link href="/auth">
                <Button size="lg" className="h-14 px-8 bg-white text-black font-black hover:bg-primary transition-colors rounded-xl shadow-xl">
                  Follow the Roadmap
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

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
                  <h3 className="text-4xl font-display font-black text-white">Club Income</h3>
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

                <Link href="/auth">
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
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 brightness-100 contrast-150" />
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

      {/* TRK Roadmap Section */}
      <section id="roadmap" className="py-32 bg-black/40 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-primary/5 blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16 space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-[0.2em] uppercase"
            >
              Future Vision
            </motion.div>
            <h2 className="text-5xl md:text-7xl font-display font-black text-white italic uppercase tracking-tighter">
              TRK Token <span className="text-primary">Roadmap</span>
            </h2>
            <p className="text-lg text-white/40 max-w-2xl mx-auto uppercase tracking-widest leading-relaxed">
              Our strategic path towards a decentralized, TRK-powered economic ecosystem.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                phase: "Phase 1",
                model: "100% USDT",
                status: "ACTIVE",
                desc: "Foundation phase focusing on pure stablecoin participation and trust building.",
                color: "from-primary to-primary/60"
              },
              {
                phase: "Phase 2",
                model: "USDT or TRK",
                status: "UPCOMING",
                desc: "Introduction of TRK token as an alternative entry method for users.",
                color: "from-blue-500 to-indigo-600"
              },
              {
                phase: "Phase 3",
                model: "50/50 Hybrid",
                status: "PLANNED",
                desc: "Balanced adoption of both currencies to stabilize the token economy.",
                color: "from-purple-500 to-pink-600"
              },
              {
                phase: "Phase 4",
                model: "100% TRK Economy",
                status: "GOAL",
                desc: "Final transition to a full utility-driven TRK token ecosystem.",
                color: "from-orange-500 to-amber-600"
              }
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative"
              >
                <div className="absolute -inset-1 bg-gradient-to-br opacity-20 group-hover:opacity-40 transition-opacity blur-lg pointer-events-none" />
                <Card className="h-full bg-white/[0.02] border-white/10 rounded-[2.5rem] p-8 space-y-6 flex flex-col hover:bg-white/[0.04] transition-all relative overflow-hidden">
                  <div className={`h-1 absolute top-0 left-0 w-full bg-gradient-to-r ${p.color}`} />
                  <div className="flex justify-between items-start">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{p.phase}</div>
                    <div className={cn(
                      "text-[8px] font-black px-2 py-1 rounded-md tracking-widest",
                      p.status === "ACTIVE" ? "bg-primary text-black" : "bg-white/5 text-white/40"
                    )}>
                      {p.status}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-white uppercase italic leading-none">{p.model}</h3>
                    <div className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Economic Model</div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/40 uppercase font-medium flex-grow">
                    {p.desc}
                  </p>
                  <div className="pt-4 border-t border-white/5 flex items-center gap-2 group-hover:text-primary transition-colors">
                    <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Projected Roadmap</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-black/80 border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16 space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-[10px] font-black tracking-[0.2em] uppercase"
            >
              FAQ Section
            </motion.div>
            <h2 className="text-5xl md:text-6xl font-display font-black text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know before you start.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`group rounded-2xl border transition-all duration-300 ${openFAQ === i
                  ? "bg-white/10 border-primary/50 shadow-lg shadow-primary/10"
                  : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className={`font-display font-bold text-lg transition-colors ${openFAQ === i ? "text-primary" : "text-white"
                    }`}>
                    {item.q}
                  </span>
                  <div className={`p-2 rounded-full transition-colors ${openFAQ === i ? "bg-primary/20 text-primary" : "bg-white/5 text-white/50 group-hover:text-white"
                    }`}>
                    {openFAQ === i ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </div>
                </button>

                <AnimatePresence>
                  {openFAQ === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-0 text-muted-foreground leading-relaxed">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 max-w-3xl mx-auto rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center space-y-4">
            <p className="text-white/60">
              Still have questions? Join our community or contact support.
            </p>
            <Link href="/auth">
              <Button size="lg" className="h-14 px-10 bg-primary text-black font-black rounded-2xl">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Terms Section */}
      <section id="terms" className="py-28 bg-black border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-[1.2fr_1fr] gap-10 items-start">
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-[0.2em] uppercase"
              >
                Terms
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-display font-black text-white">
                Terms & Disclosures
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                By using TRK Game, you agree to the platform terms and risk disclosures.
                Please review the legal documentation before participating in real play.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/auth">
                  <Button size="lg" variant="outline" className="h-12 px-6 border-white/10 text-white font-bold rounded-xl hover:bg-white/5">
                    Launch App
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  title: "Fair Play Policy",
                  desc: "Game outcomes are recorded on-chain and follow published mechanics for transparency."
                },
                {
                  title: "Risk Awareness",
                  desc: "Always play within your limits. Blockchain transactions are final once confirmed."
                },
                {
                  title: "Security Reminder",
                  desc: "Use official links and never share your seed phrase with anyone."
                }
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="text-sm font-bold text-white">{item.title}</div>
                  <p className="text-xs text-white/50 mt-2 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

