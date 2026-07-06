import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Utensils, ArrowRight, Check, X, Clock, Users, Store, ShieldCheck,
  KeyRound, Bell, Ban, MessageCircleQuestion
} from 'lucide-react';

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F2F4EE] text-[#16231C] overflow-x-hidden">
      <Nav />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <Features />
      <Pricing />
      <OriginStory />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-['IBM_Plex_Mono'] text-[11px] font-medium uppercase tracking-[0.2em] text-[#1F4D3A]">
      <span className="w-4 h-px bg-[#C9A227]" />
      {children}
    </span>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-[#F2F4EE]/90 backdrop-blur-sm border-b border-black/5">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1F4D3A] rounded-lg flex items-center justify-center">
            <Utensils className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">LunchOS</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="px-3 sm:px-4 py-2 text-sm font-bold text-[#16231C]/70 hover:text-[#16231C] transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="px-4 py-2.5 bg-[#1F4D3A] text-white rounded-full text-sm font-bold hover:bg-[#173a2c] transition-colors whitespace-nowrap"
          >
            <span className="sm:hidden">Register</span>
            <span className="hidden sm:inline">Register your company</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const [showClean, setShowClean] = useState(false);

  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
      <div className="grid md:grid-cols-2 gap-12 md:gap-8 items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <Eyebrow>For offices in Accra &amp; beyond</Eyebrow>
          <h1 className="font-['Fraunces'] text-[2.75rem] leading-[1.05] sm:text-6xl font-semibold mt-5 mb-6 tracking-tight">
            Lunch ordering, without the <span className="italic text-[#1F4D3A]">group chat chaos</span>.
          </h1>
          <p className="text-lg text-[#16231C]/70 max-w-md leading-relaxed mb-8">
            One clean system for your whole company to pick meals, track who's ordered, and pay the vendor — instead of a WhatsApp thread of "+1 jollof, no chicken" every day at 11:45am.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/register"
              className="group inline-flex items-center gap-3 pl-6 pr-2 py-2 bg-[#1F4D3A] text-white rounded-full font-bold hover:bg-[#173a2c] transition-colors"
            >
              Get started free
              <span className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
            <a href="#how-it-works" className="text-sm font-bold text-[#16231C]/60 hover:text-[#16231C] transition-colors">
              See how it works
            </a>
          </div>
          <p className="font-['IBM_Plex_Mono'] text-[11px] uppercase tracking-[0.15em] text-[#16231C]/40 mt-8">
            Built for teams of 20 to 100+ employees
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative"
        >
          <button
            onClick={() => setShowClean(!showClean)}
            className="absolute -top-9 right-0 font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.15em] text-[#16231C]/50 hover:text-[#1F4D3A] transition-colors flex items-center gap-1.5"
          >
            {showClean ? 'See the old way' : 'See it organized'}
            <ArrowRight className="w-3 h-3" />
          </button>

          <div className="relative h-[380px]">
            {/* Messy chat card */}
            <div
              className={`absolute inset-0 bg-white rounded-[1.75rem] border border-black/5 shadow-xl shadow-black/5 p-6 transition-all duration-500 ${
                showClean ? 'opacity-0 -rotate-6 scale-90 pointer-events-none' : 'opacity-100 -rotate-2'
              }`}
            >
              <p className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.15em] text-[#16231C]/30 mb-4">
                Office Lunch Squad · 47 members
              </p>
              <div className="space-y-2.5">
                <ChatBubble color="#E2672B">+1 jollof, no chicken pls 🙏</ChatBubble>
                <ChatBubble color="#1F4D3A">who's collecting the money today</ChatBubble>
                <ChatBubble color="#C9A227">did anyone order for me? I said waakye earlier</ChatBubble>
                <ChatBubble color="#1F4D3A">closing orders in 5 mins guys</ChatBubble>
                <ChatBubble color="#E2672B">wait I changed my mind, banku instead</ChatBubble>
              </div>
            </div>

            {/* Clean confirmed order card */}
            <div
              className={`absolute inset-0 bg-white rounded-[1.75rem] border border-black/5 shadow-xl shadow-black/5 p-7 transition-all duration-500 ${
                showClean ? 'opacity-100 rotate-0' : 'opacity-0 rotate-6 scale-90 pointer-events-none'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <p className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.15em] text-[#1F4D3A] font-medium">
                  Today's Orders · Closed 11:30am
                </p>
                <span className="text-[10px] font-black uppercase bg-green-100 text-green-700 px-2 py-1 rounded-full">Confirmed</span>
              </div>
              <div className="space-y-3">
                {[
                  ['Jollof Rice, no chicken', '12'],
                  ['Waakye + fish', '9'],
                  ['Banku & tilapia', '6'],
                ].map(([name, qty]) => (
                  <div key={name} className="flex items-center justify-between py-2.5 border-b border-black/5 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={3} />
                      </div>
                      <span className="font-bold text-sm">{name}</span>
                    </div>
                    <span className="font-black text-[#1F4D3A]">×{qty}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ChatBubble({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 max-w-[85%]">
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <p className="text-xs text-[#16231C]/70 leading-relaxed py-1 pr-2">{children}</p>
    </div>
  );
}

function ProblemSection() {
  const items = [
    {
      icon: MessageCircleQuestion,
      title: 'The 11:45am scramble',
      body: 'Orders trickle in through a group chat until the last possible minute, and someone always has to manually count who wants what.',
    },
    {
      icon: Ban,
      title: 'Wrong order, again',
      body: 'By the time thirty messages have piled up, half the changes and substitutions get lost in the scroll.',
    },
    {
      icon: Clock,
      title: 'Who\u2019s collecting the money?',
      body: 'Someone in the office is always stuck chasing payments and reconciling receipts by hand, every single day.',
    },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <motion.div {...fadeUp} className="max-w-lg mb-14">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="font-['Fraunces'] text-3xl sm:text-4xl font-semibold mt-4 tracking-tight">
          Every office has this exact same lunch group chat.
        </h2>
      </motion.div>
      <div className="grid md:grid-cols-3 gap-5">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: i * 0.08 }}
            className="bg-white rounded-[1.5rem] p-7 border border-black/5"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#F2F4EE] flex items-center justify-center mb-5">
              <item.icon className="w-5 h-5 text-[#1F4D3A]" strokeWidth={1.75} />
            </div>
            <h3 className="font-bold text-lg mb-2">{item.title}</h3>
            <p className="text-sm text-[#16231C]/60 leading-relaxed">{item.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Admin activates a vendor',
      body: 'Pick which food vendor is serving today and set the ordering cutoff time. Takes ten seconds.',
    },
    {
      n: '02',
      title: 'Employees pick their meal',
      body: 'Everyone browses today\u2019s menu and confirms an order before the deadline, right from their phone.',
    },
    {
      n: '03',
      title: 'HODs can order for their team',
      body: 'Department heads can bulk-order for people who forgot, in one screen, filtered to their own department.',
    },
    {
      n: '04',
      title: 'Vendor gets one clean list',
      body: 'No more counting messages. The vendor sees a single summary of exactly what to prepare, confirmed in one tap.',
    },
  ];
  return (
    <section id="how-it-works" className="bg-white border-y border-black/5">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <motion.div {...fadeUp} className="max-w-lg mb-14">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="font-['Fraunces'] text-3xl sm:text-4xl font-semibold mt-4 tracking-tight">
            Four steps, no chat thread required.
          </h2>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-10">
          {steps.map((step, i) => (
            <motion.div
              key={step.n}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.06 }}
              className="flex gap-5"
            >
              <span className="font-['Fraunces'] text-3xl font-semibold text-[#C9A227]/70 leading-none pt-1">
                {step.n}
              </span>
              <div>
                <h3 className="font-bold text-lg mb-1.5">{step.title}</h3>
                <p className="text-sm text-[#16231C]/60 leading-relaxed max-w-sm">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Users, title: 'Role-based access', body: 'Separate views for admins, HODs, employees, interns, and vendors — everyone sees only what\u2019s theirs.' },
    { icon: KeyRound, title: 'Quick PIN login', body: 'Staff can set a 4-digit PIN after their first login, so daily sign-in doesn\u2019t need a code every time.' },
    { icon: Clock, title: 'Cutoff enforcement', body: 'Ordering automatically closes at the time you set — no more late orders sneaking in after prep starts.' },
    { icon: Bell, title: 'Email, SMS & WhatsApp', body: 'Reminders and confirmations reach people however they check their phone, not just one channel.' },
    { icon: Store, title: 'Multi-vendor ready', body: 'Rotate between different food vendors day to day, with menus and orders kept cleanly separate.' },
    { icon: ShieldCheck, title: 'Safe by default', body: 'PINs are hashed, logins are rate-limited, and every account action is tracked in an audit log.' },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <motion.div {...fadeUp} className="max-w-lg mb-14">
        <Eyebrow>What you get</Eyebrow>
        <h2 className="font-['Fraunces'] text-3xl sm:text-4xl font-semibold mt-4 tracking-tight">
          Everything the daily order needs, nothing it doesn't.
        </h2>
      </motion.div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: (i % 3) * 0.07 }}
            className="p-1.5 bg-black/[0.03] rounded-[1.6rem]"
          >
            <div className="bg-white rounded-[1.35rem] p-6 h-full border border-black/5">
              <f.icon className="w-5 h-5 text-[#1F4D3A] mb-4" strokeWidth={1.75} />
              <h3 className="font-bold mb-1.5">{f.title}</h3>
              <p className="text-sm text-[#16231C]/60 leading-relaxed">{f.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { range: '0\u201320', label: 'Small office', highlight: false },
    { range: '21\u201350', label: 'Growing team', highlight: true },
    { range: '51\u2013100', label: 'Established company', highlight: false },
    { range: '100+', label: 'Enterprise', highlight: false },
  ];
  return (
    <section className="bg-white border-y border-black/5">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <motion.div {...fadeUp} className="max-w-lg mb-14">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="font-['Fraunces'] text-3xl sm:text-4xl font-semibold mt-4 tracking-tight">
            Priced by headcount, not by feature.
          </h2>
          <p className="text-[#16231C]/60 mt-3 leading-relaxed">
            Every plan includes the full platform. Pick the range that matches your team size when you register.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.range}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.07 }}
              className={`rounded-[1.5rem] p-7 border ${
                tier.highlight ? 'bg-[#1F4D3A] text-white border-transparent' : 'bg-[#F2F4EE] border-black/5'
              }`}
            >
              <p className={`font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.15em] mb-4 ${tier.highlight ? 'text-white/60' : 'text-[#16231C]/40'}`}>
                {tier.label}
              </p>
              <p className="font-['Fraunces'] text-3xl font-semibold mb-1">{tier.range}</p>
              <p className={`text-sm mb-6 ${tier.highlight ? 'text-white/70' : 'text-[#16231C]/60'}`}>employees</p>
              <Link
                to="/register"
                className={`block text-center py-2.5 rounded-full text-sm font-bold transition-colors ${
                  tier.highlight ? 'bg-white text-[#1F4D3A] hover:bg-white/90' : 'bg-white text-[#16231C] hover:bg-black/5 border border-black/10'
                }`}
              >
                Get started
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OriginStory() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <motion.div {...fadeUp} className="max-w-2xl">
        <Eyebrow>Why we built this</Eyebrow>
        <h2 className="font-['Fraunces'] text-3xl sm:text-4xl font-semibold mt-4 mb-6 tracking-tight leading-tight">
          We built this because we lived the group chat.
        </h2>
        <p className="text-[#16231C]/70 leading-relaxed text-lg">
          LunchOS started as a small internal tool for handling corporate lunch orders, born out of watching the same daily scramble play out in a real office. It's built and maintained by two developers who wanted something a WhatsApp group could never quite be: organized, on time, and easy to trust.
        </p>
      </motion.div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24 md:pb-32">
      <motion.div
        {...fadeUp}
        className="bg-[#1F4D3A] rounded-[2rem] px-8 py-16 md:py-20 text-center relative overflow-hidden"
      >
        <Utensils className="absolute -right-10 -bottom-10 w-56 h-56 text-white/[0.04] rotate-12" />
        <h2 className="font-['Fraunces'] text-3xl sm:text-5xl font-semibold text-white mb-5 tracking-tight relative z-10">
          Ready to close the group chat?
        </h2>
        <p className="text-white/70 max-w-md mx-auto mb-9 leading-relaxed relative z-10">
          Register your company and have your team ordering lunch properly by tomorrow.
        </p>
        <Link
          to="/register"
          className="group inline-flex items-center gap-3 pl-7 pr-3 py-3 bg-white text-[#1F4D3A] rounded-full font-bold hover:bg-white/90 transition-colors relative z-10"
        >
          Register your company
          <span className="w-9 h-9 rounded-full bg-[#1F4D3A]/10 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
            <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/5">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#1F4D3A] rounded-md flex items-center justify-center">
            <Utensils className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm">LunchOS</span>
        </div>
        <p className="text-xs text-[#16231C]/40 font-medium">
          &copy; {new Date().getFullYear()} LunchOS. Built in Accra.
        </p>
        <div className="flex items-center gap-5 text-xs font-bold text-[#16231C]/50">
          <Link to="/login" className="hover:text-[#16231C] transition-colors">Log in</Link>
          <Link to="/register" className="hover:text-[#16231C] transition-colors">Register</Link>
        </div>
      </div>
    </footer>
  );
}