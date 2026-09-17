import React, { useState } from 'react';
import { UserCheck, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authAPI } from '../api';

const DEMO_PERSONAS = [
  {
    role: 'Lead Procurement Officer',
    name: 'Priya Sharma',
    email: 'admin@procureiq.internal',
    password: 'admin123',
    department: 'Supply Chain',
    desc: 'Full Procurement authority, RFQ panel management & PO release',
    badge: 'Super Admin / Lead'
  },
  {
    role: 'Plant Head',
    name: 'Rajesh Verma',
    email: 'planthead@procureiq.internal',
    password: 'plant123',
    department: 'Operations',
    desc: 'Approver for Rule 1: Operations CapEx > ₹1,00,000',
    badge: 'Rule 1 Approver'
  },
  {
    role: 'VP Operations',
    name: 'Kavita Reddy',
    email: 'vpops@procureiq.internal',
    password: 'vp123',
    department: 'Operations',
    desc: 'Approver for Rule 2: Critical Urgency & Bulk Quantity > 500',
    badge: 'Rule 2 Approver'
  },
  {
    role: 'Finance Director',
    name: 'Arjun Patel',
    email: 'finance@procureiq.internal',
    password: 'finance123',
    department: 'Finance',
    desc: 'Approver for Rule 3: High Value Purchase > ₹50,000',
    badge: 'Rule 3 Approver'
  },
  {
    role: 'Department Manager',
    name: 'Rohan Mehta',
    email: 'deptmgr@procureiq.internal',
    password: 'dept123',
    department: 'Engineering',
    desc: 'Approver for Rule 4: Standard Departmental PRs',
    badge: 'Rule 4 Approver'
  },
  {
    role: 'Vendor',
    name: 'Vikram Malhotra',
    email: 'vendor@apex.internal',
    password: 'vendor123',
    department: 'Apex Global Industrial',
    desc: 'Vendor Marketplace: Browse RFQ orders, submit bids & negotiate via AI',
    badge: 'Vendor Portal'
  }
];

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('admin@procureiq.internal');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e, customEmail, customPassword) => {
    if (e) e.preventDefault();
    const loginEmail = customEmail || email;
    const loginPassword = customPassword || password;
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.login(loginEmail, loginPassword);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.access_token);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.detail || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPersona = (persona) => {
    setEmail(persona.email);
    setPassword(persona.password);
    handleLogin(null, persona.email, persona.password);
  };

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden flex flex-col justify-center items-center py-6 px-4 sm:px-6 lg:px-8">
      {/* Full-Screen Environmental Photographic Backdrop with Lion Capital */}
      <div
        className="fixed inset-0 bg-cover bg-center md:bg-[center_35%] bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: "url('/assets/lion_capital.jpg')" }}
      />

      {/* Subtle Warm/Dark Environmental Overlay for Depth & Contrast */}
      <div className="fixed inset-0 bg-stone-900/30 pointer-events-none z-0" />
      <div className="fixed inset-0 bg-gradient-to-b from-stone-950/40 via-transparent to-stone-950/50 pointer-events-none z-0" />

      {/* Centered Main Content Container */}
      <div className="w-full max-w-[1140px] mx-auto z-10 flex flex-col items-center">

        {/* Header Visual Hierarchy:
            1. Official Golden Emblem (transparent, subtle seal)
            2. Eyebrow Capsule
            3. LokProcure ERP Title
            4. Concise Subtitle
        */}
        <div className="text-center space-y-2 mb-6 md:mb-7 flex flex-col items-center">
          {/* Official Subtle Golden State Emblem of India (Satyameva Jayate) */}
          <div className="flex justify-center mb-0.5">
            <img
              src="/assets/india_emblem_gold.png"
              alt="State Emblem of India - Satyameva Jayate"
              className="h-14 sm:h-16 w-auto object-contain drop-shadow-md select-none pointer-events-none transition-transform duration-300 hover:scale-105"
            />
          </div>

          {/* Government Eyebrow Capsule */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-stone-900/65 backdrop-blur-md border border-stone-700/60 text-stone-200 text-[11px] font-semibold tracking-wider uppercase shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Government of India &bull; Procurement Command Center</span>
          </div>

          {/* Product Title */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center gap-2">
            LokProcure <span className="text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">ERP</span>
          </h1>

          {/* Concise Subtitle */}
          <p className="text-white/90 text-xs sm:text-sm max-w-xl mx-auto font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            Autonomous Two-Sided Procurement Marketplace: Unified Government Buyer &amp; Vendor Ecosystem with Bilateral AI Agent Negotiation and Policy Guardrails.
          </p>
        </div>

        {/* Two-Column Balanced Glass Panels */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* Left Panel: Direct Secure Access (5 cols ~ 42%) */}
          <div
            className="lg:col-span-5 rounded-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.06)] border border-white/60 flex flex-col justify-between transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)'
            }}
          >
            <div className="space-y-4">
              <div className="border-b border-stone-200/70 pb-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" /> Secure Access
                  </h2>
                  <span className="text-[11px] font-medium text-stone-500">Official Portal</span>
                </div>
                <p className="text-stone-500 text-xs mt-0.5">Authenticate with your corporate credentials</p>
              </div>

              {/* Portal Selector Toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-stone-200/50 rounded-lg border border-white/60">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@procureiq.internal');
                    setPassword('admin123');
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    !email.includes('vendor')
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Government
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('vendor@apex.internal');
                    setPassword('vendor123');
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    email.includes('vendor')
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Vendor
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-50/90 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-stone-700">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@procureiq.internal"
                      className="w-full bg-white/85 focus:bg-white border border-stone-300/80 focus:border-amber-600 rounded-lg pl-9 pr-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-stone-700">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full bg-white/85 focus:bg-white border border-stone-300/80 focus:border-amber-600 rounded-lg pl-9 pr-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none transition-all shadow-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-amber-300 hover:text-amber-200 font-semibold text-xs rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enter Command Center</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Status Row */}
            <div className="pt-4 mt-4 border-t border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> NetSuite Sandbox Synced
              </span>
              <span className="font-mono text-[10px] text-stone-400">v1.0.0</span>
            </div>
          </div>

          {/* Right Panel: Quick Demo Personas (7 cols ~ 58%) */}
          <div
            className="lg:col-span-7 rounded-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.06)] border border-white/60 flex flex-col justify-between transition-all"
            style={{
              background: 'rgba(255, 255, 255, 0.65)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)'
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200/70 pb-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" /> Quick Demo Personas
                  </h2>
                  <p className="text-stone-500 text-xs mt-0.5">
                    Select a role to experience the platform from different perspectives
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-md bg-stone-200/60 text-stone-700 border border-stone-300/60 text-[10px] font-semibold shrink-0">
                  6 Roles
                </span>
              </div>

              {/* Persona Rows - Glass strips with internal scrolling to prevent height imbalance */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {DEMO_PERSONAS.map((persona) => (
                  <button
                    key={persona.email}
                    type="button"
                    onClick={() => handleQuickPersona(persona)}
                    disabled={loading}
                    className="w-full text-left p-2.5 rounded-xl bg-white/55 hover:bg-white/90 border border-white/70 hover:border-amber-400/60 shadow-xs hover:shadow-sm transition-all group flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-stone-200/80 border border-stone-300/60 text-stone-800 font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors">
                        {persona.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-stone-900 text-xs font-semibold group-hover:text-amber-700 transition-colors">
                            {persona.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100/90 text-stone-700 border border-stone-200/80 font-medium">
                            {persona.badge || persona.role}
                          </span>
                        </div>
                        <p className="text-stone-500 text-[11px] mt-0.5 truncate">{persona.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className="hidden sm:inline-block text-[10px] text-amber-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Select
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-800 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Status Banner */}
            <div className="p-2.5 mt-3 rounded-xl bg-stone-100/70 border border-stone-200/60 flex items-center justify-between text-[11px] text-stone-600">
              <span className="flex items-center gap-1.5 text-stone-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Dual-side platform with connected state &amp; approval guardrails</span>
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
