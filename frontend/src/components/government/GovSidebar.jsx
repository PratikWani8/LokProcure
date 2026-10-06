import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  CheckSquare,
  FileText,
  LogOut,
  Layers,
  ChevronDown,
  Building,
  Gavel,
  MessageSquare,
  TrendingUp,
  Briefcase,
  ShieldCheck
} from 'lucide-react';

const QUICK_ROLES = [
  { role: 'Lead Procurement Officer', email: 'admin@lokprocure.internal', pass: 'admin123', name: 'Priya Sharma' },
  { role: 'Plant Head', email: 'planthead@lokprocure.internal', pass: 'plant123', name: 'Rajesh Verma' },
  { role: 'VP Operations', email: 'vpops@lokprocure.internal', pass: 'vp123', name: 'Kavita Reddy' },
  { role: 'Finance Director', email: 'finance@lokprocure.internal', pass: 'finance123', name: 'Arjun Patel' },
  { role: 'Department Manager', email: 'deptmgr@lokprocure.internal', pass: 'dept123', name: 'Rohan Mehta' },
  { role: 'Vendor', email: 'vendor@apex.internal', pass: 'vendor123', name: 'Vikram Malhotra (Vendor Portal)' },
];

export default function GovSidebar({
  activeTab,
  setActiveTab,
  user,
  onLogout,
  onSwitchPersona,
  pendingCount = 0,
  pendingVendorsCount = 0
}) {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'orders',
      label: 'Procurement Orders',
      icon: Briefcase,
    },
    {
      id: 'new_pr',
      label: 'Create Order',
      icon: PlusCircle,
    },
    {
      id: 'active_bids',
      label: 'Active Bids',
      icon: Gavel,
    },
    {
      id: 'vendor_comparison',
      label: 'Vendor Comparison',
      icon: Users,
    },
    {
      id: 'negotiations',
      label: 'Negotiations',
      icon: MessageSquare,
    },
    {
      id: 'approval_queue',
      label: 'Approvals',
      icon: CheckSquare,
      badge: pendingCount > 0 ? `${pendingCount} Pending` : null,
    },
    {
      id: 'vendor_registrations',
      label: 'Vendor Empanelment',
      icon: ShieldCheck,
      badge: pendingVendorsCount > 0 ? `${pendingVendorsCount} New` : null,
    },
    {
      id: 'purchase_orders',
      label: 'Purchase Orders',
      icon: FileText,
    },
  ];

  return (
    <aside className="w-64 bg-[#fbfbfa] border-r border-[#e8e6df] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* Top Section */}
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Brand Header with Subtle Government Emblem */}
        <div className="p-4 border-b border-[#e8e6df] flex items-center justify-between bg-white/40 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 text-white flex items-center justify-center shadow-xs overflow-hidden p-0.5 border border-amber-600/30 shrink-0">
              <img src="/assets/lion_capital.jpg" alt="Government of India" className="w-full h-full object-cover object-top filter contrast-125 brightness-110" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-sm text-slate-900 tracking-tight">LokProcure</span>
                <span className="text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  GOV
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium tracking-tight">Govt of India Command</span>
            </div>
          </div>
        </div>

        {/* User Persona Switcher Box */}
        <div className="p-3 border-b border-[#e8e6df] relative">
          <button
            type="button"
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="w-full p-2.5 rounded-lg bg-[#f5f4f0] hover:bg-[#eeebe3] border border-[#e8e6df] text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-[10px] shrink-0">
                  {user?.full_name?.split(' ').map(n => n[0]).join('') || 'G'}
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="font-semibold text-xs text-slate-900 truncate">{user?.full_name || 'Government Officer'}</div>
                  <div className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    <Building className="w-2.5 h-2.5 text-slate-400" /> {user?.department || 'Procurement Authority'}
                  </div>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showPersonaMenu ? 'rotate-180' : ''}`} />
            </div>

            <div className="mt-2">
              <span className="inline-block text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-white border border-[#e8e6df] text-slate-700 font-medium">
                {user?.role || 'Government Role'}
              </span>
            </div>
          </button>

          {/* Persona Switcher Dropdown */}
          {showPersonaMenu && (
            <div className="absolute left-3 right-3 top-[90px] z-50 bg-[#fbfbfa] border border-[#e8e6df] rounded-lg shadow-xl p-1 space-y-0.5 animate-fade-in">
              <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Switch Role Persona
              </div>
              {QUICK_ROLES.map((r) => (
                <button
                  key={r.email}
                  type="button"
                  onClick={() => {
                    setShowPersonaMenu(false);
                    onSwitchPersona(r.email, r.pass);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    user?.email === r.email
                      ? 'bg-[#eeebe3] text-slate-900 font-medium'
                      : 'text-slate-600 hover:bg-[#f5f4f0] hover:text-slate-900'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="font-medium truncate text-xs">{r.name}</div>
                    <div className="text-[9px] text-slate-400 font-mono truncate">{r.role}</div>
                  </div>
                  {user?.email === r.email && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-2 space-y-0.5 flex-1">
          <div className="px-2.5 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            Government Portal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-center justify-between group cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#f5f4f0] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <div className="truncate">
                    <div className="text-xs leading-tight">{item.label}</div>
                  </div>
                </div>

                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-[#e8e6df] space-y-2 bg-[#f5f4f0]">
        <div className="px-2.5 py-1.5 rounded bg-[#fbfbfa] border border-[#e8e6df] flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-600 font-mono">Policy Engine</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-700 font-semibold uppercase">
            Active
          </span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full py-1.5 px-3 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
