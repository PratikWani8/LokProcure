import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
  FileText,
  PlusCircle,
  Award
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Cell
} from 'recharts';
import { dashboardAPI } from '../api';

const DEPARTMENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function Dashboard({
  onNavigateToTab,
  onSelectPrForComparison,
  onTriggerNewPr
}) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setError('Unable to fetch live ERP metrics. Please verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      case 'High':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 font-normal';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PO Created':
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
      case 'Pending Approval':
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-semibold';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="h-72 bg-white rounded-xl border border-slate-200 shadow-sm" />
          <div className="h-72 bg-white rounded-xl border border-slate-200 shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">
            Procure-to-Pay (P2P) Control Center
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Procurement Executive Dashboard
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Multi-vendor RFQ pipeline, dynamic approval matrix, and NetSuite ERP synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onTriggerNewPr}
            className="btn-primary"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Purchase Request</span>
          </button>
        </div>
      </div>

      {/* Structured KPI Groups */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total PO Spend */}
          <div className="enterprise-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">Total PO Spend</span>
              <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-2xl lg:text-3xl font-mono tabular-nums font-extrabold text-slate-900 tracking-tight">
              ₹{(metrics?.total_spend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <span className="text-emerald-600 font-semibold flex items-center gap-0.5 font-mono">
                <TrendingUp className="w-3 h-3 text-emerald-600" /> +14.2%
              </span>
              <span>vs previous month</span>
            </div>
          </div>

          {/* Card 2: Pending Approvals */}
          <div className="enterprise-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">Pending Approvals</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl lg:text-3xl font-mono tabular-nums font-extrabold text-amber-600 tracking-tight">
              {metrics?.pending_approvals || 0}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
              <span className="text-amber-700">Awaiting sign-off</span>
              <button
                onClick={() => onNavigateToTab('approval_queue')}
                className="text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1 cursor-pointer text-xs"
              >
                Review Queue <ArrowRight className="w-3 h-3 text-amber-600" />
              </button>
            </div>
          </div>

          {/* Card 3: 3-Way Match Verified */}
          <div className="enterprise-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">3-Way Match Verified</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl lg:text-3xl font-mono tabular-nums font-extrabold text-slate-900 tracking-tight">
              <span className="text-emerald-600">{metrics?.three_way_match_verified || 0}</span>
              <span className="text-xs font-normal text-slate-400 ml-1.5 font-mono">/ {metrics?.total_approved_pos || 0} POs</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>SKU &amp; Invoice verified</span>
            </div>
          </div>

          {/* Card 4: Supplier Reliability */}
          <div className="enterprise-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest font-mono">Avg Supplier Score</span>
              <Award className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-2xl lg:text-3xl font-mono tabular-nums font-extrabold text-slate-900 tracking-tight">
              {metrics?.avg_vendor_reliability || 92.5}%
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Contracted supplier base</span>
            </div>
          </div>
        </div>
      </div>

      {/* NetSuite ERP Integration Notice Banner */}
      <div className="p-3 rounded-lg bg-[#fbfbfa] border border-[#e8e6df] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-xs">NetSuite ERP Routing Engine</span>
            <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 uppercase font-bold">
              Active
            </span>
            <span className="text-slate-400 hidden md:inline">•</span>
            <span className="text-slate-500 text-[11px] hidden md:inline">
              Automated policy rules: Operations (&gt; ₹1,00,000), IT Software (&gt; ₹50,000), Departmental Fast-Track (≤ ₹10,000)
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigateToTab('vendor_comparison')}
          className="btn-secondary text-[11px] py-1 px-2.5 shrink-0"
        >
          <span>Vendor Scoring Matrix</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart: Monthly Spend Flow (Primary Accent Gradient) */}
        <div className="lg:col-span-7 enterprise-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#e8e6df] pb-3">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Financial Flow</span>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Monthly Procurement Spend</h3>
            </div>
            <span className="text-[10px] text-blue-600 font-mono font-semibold">INR (₹)</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.monthly_spend_flow || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#e8e6df" />
                <XAxis dataKey="month" stroke="#78756e" fontSize={10} tickLine={false} />
                <YAxis stroke="#78756e" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fbfbfa', borderColor: '#e8e6df', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.06)', fontSize: '11px', color: '#1c1b18' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Spend']}
                />
                <Area type="monotone" dataKey="spend" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#spendGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart: Spend by Department (Distinct Colors per Department Bar) */}
        <div className="lg:col-span-5 enterprise-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#e8e6df] pb-3">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Allocation</span>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Department Budget Distribution</h3>
            </div>
            <Building className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.spend_by_department || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e8e6df" />
                <XAxis dataKey="department" stroke="#78756e" fontSize={10} tickLine={false} />
                <YAxis stroke="#78756e" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fbfbfa', borderColor: '#e8e6df', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.06)', fontSize: '11px', color: '#1c1b18' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Allocated']}
                />
                <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                  {(metrics?.spend_by_department || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Purchase Requests Live Table */}
      <div className="enterprise-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8e6df] pb-3">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Requisition Pipeline</span>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Purchase Requests</h3>
          </div>
          <button
            onClick={() => onNavigateToTab('vendor_comparison')}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
          >
            Comparison Matrix <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e8e6df] text-slate-500 uppercase text-[10px] tracking-wider bg-[#f3f2ec]">
                <th className="py-2.5 px-3 font-mono">PR ID</th>
                <th className="py-2.5 px-3">Title &amp; Specifications</th>
                <th className="py-2.5 px-3">Dept</th>
                <th className="py-2.5 px-3">Budget</th>
                <th className="py-2.5 px-3">Urgency</th>
                <th className="py-2.5 px-3">Routing Rule</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeebe3]">
              {(!metrics?.recent_prs || metrics.recent_prs.length === 0) ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                    No purchase requests found in the system.
                  </td>
                </tr>
              ) : (
                metrics.recent_prs.map((pr) => (
                  <tr key={pr.id} className="hover:bg-[#f5f4f0]/80 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-900 font-semibold text-xs">
                      PR-{pr.id.toString().padStart(4, '0')}
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-medium text-slate-900 truncate text-xs">{pr.title}</div>
                      <div className="text-[10px] text-slate-500 truncate">{pr.item_description}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 text-xs">{pr.department}</td>
                    <td className="py-3 px-3 font-mono tabular-nums font-semibold text-slate-900 text-xs">
                      ₹{pr.estimated_budget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase border ${getUrgencyBadge(pr.urgency)}`}>
                        {pr.urgency}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="text-[10px] font-mono text-slate-700 uppercase tracking-tight truncate" title={pr.assigned_approval_rule}>
                        {pr.assigned_approval_rule || 'Standard Routing'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Approver: <span className="text-slate-700">{pr.assigned_approver_role || 'Manager'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase border ${getStatusBadge(pr.status)}`}>
                        {pr.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectPrForComparison(pr.id);
                          onNavigateToTab('vendor_comparison');
                        }}
                        className="btn-secondary text-[11px] py-1 px-2.5"
                      >
                        Bids ({pr.bids_count}) &amp; AI
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

