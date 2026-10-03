import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Building,
  IndianRupee,
  User,
  MessageSquare,
  FileText,
  AlertTriangle,
  Award
} from 'lucide-react';
import { approvalsAPI } from '../api';

export default function ApprovalQueue({
  user,
  onNavigateToTab,
  onSelectPrForComparison,
  onPoGenerated
}) {
  const [queue, setQueue] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // { type: 'approve'|'reject', item: wf }
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await approvalsAPI.getQueue(statusFilter === 'All' ? null : statusFilter);
      setQueue(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load approval queue:', err);
      setError(err.response?.data?.detail || 'Unable to load approval workflows.');
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [statusFilter]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!actionModal) return;

    setActionLoading(true);
    setError('');

    try {
      const { type, item } = actionModal;
      if (type === 'approve') {
        // Authorize and generate PO
        const res = await approvalsAPI.generatePO(
          item.pr_id,
          item.top_bid?.vendor_id,
          comment || `Authorized by ${user?.full_name || 'Executive'} (${user?.role || 'Approver'})`
        );
        if (onPoGenerated) onPoGenerated(res.po);
      } else {
        // Reject workflow
        await approvalsAPI.takeAction(
          item.id,
          'Rejected',
          comment || `Rejected by ${user?.full_name || 'Executive'} (${user?.role || 'Approver'})`
        );
      }

      setActionModal(null);
      setComment('');
      fetchQueue();
    } catch (err) {
      console.error('Action error:', err);
      setError(err.response?.data?.detail || 'Failed to submit approval decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const getRuleBadge = (rule) => {
    const r = String(rule || '');
    if (r.includes('Rule 1')) {
      return { label: 'Plant Head CapEx (> ₹1,00,000)', color: 'text-slate-600 bg-[#f5f4f0] border-[#e8e6df]' };
    } else if (r.includes('Rule 2')) {
      return { label: 'VP Ops Critical (>500)', color: 'text-slate-600 bg-[#f5f4f0] border-[#e8e6df]' };
    } else if (r.includes('Rule 3')) {
      return { label: 'Finance Director (> ₹50,000)', color: 'text-slate-600 bg-[#f5f4f0] border-[#e8e6df]' };
    } else {
      return { label: 'Dept Manager Standard', color: 'text-slate-600 bg-[#f5f4f0] border-[#e8e6df]' };
    }
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'Rejected':
        return 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
      default:
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">
            Governance &amp; Multi-Rule Routing
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Executive Approval Queue
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Dynamic policy verification. Authorizing requests automatically compiles official NetSuite ReportLab Purchase Orders.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#f3f2ec] border border-[#e8e6df] text-xs self-start md:self-auto font-mono">
          {['Pending', 'Approved', 'Rejected', 'All'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 border border-[#d8d5ca] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-[#e8e6df]/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Approver Persona Context Bar */}
      <div className="p-3 rounded-lg bg-[#fbfbfa] border border-[#e8e6df] flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Approving Authority:</span>
            <strong className="text-slate-900 font-semibold">{user?.full_name || 'Priya Sharma'}</strong>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300 font-semibold">
              {user?.role}
            </span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
          Filtered for <strong className="text-slate-800">{user?.role}</strong> delegation
        </div>
      </div>

      {/* Queue Items */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-white rounded-xl border border-[#e8e6df] shadow-2xs" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="enterprise-card p-12 text-center space-y-2 bg-[#fbfbfa]">
          <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">No {statusFilter} Approvals in Queue</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All purchase requests matching your criteria have been processed in accordance with NetSuite ERP governance rules.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((wf) => {
            const ruleBadge = getRuleBadge(wf.triggered_rule);
            const isPending = wf.status === 'Pending';
            const isApproved = wf.status === 'Approved';
            const isRejected = wf.status === 'Rejected';

            return (
              <div
                key={wf.id}
                className={`enterprise-card p-4 space-y-3 transition-colors ${
                  isPending
                    ? 'border-l-4 border-l-amber-500 shadow-2xs'
                    : isApproved
                    ? 'border-l-4 border-l-emerald-500'
                    : isRejected
                    ? 'border-l-4 border-l-rose-500'
                    : ''
                }`}
              >
                {/* Top Row: PR ID, Title, Rule, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0eee6] pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      PR-{(wf.pr_id || 0).toString().padStart(4, '0')}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{wf.pr_title || 'Purchase Request'}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">({wf.department || 'Operations'})</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Compliance Status Badge */}
                    {wf.compliance && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${
                        wf.compliance.compliant
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {wf.compliance.compliant ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Compliant
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Policy Alert
                          </>
                        )}
                      </span>
                    )}

                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${ruleBadge.color}`}>
                      {ruleBadge.label}
                    </span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${getStatusPill(wf.status)}`}>
                      {isPending ? 'Action Required' : (wf.status || 'Pending')}
                    </span>
                  </div>
                </div>

                {/* Middle Grid: PR Details & Flattened Supplier Bid Summary */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Left PR Info */}
                  <div className="md:col-span-7 space-y-1.5 text-xs">
                    <p className="text-slate-600 leading-relaxed text-xs">{wf.item_description || 'No description provided.'}</p>

                    <div className="flex flex-wrap gap-4 text-slate-500 pt-1 text-[11px]">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" /> Requester: <strong className="text-slate-800">{wf.requester?.full_name || 'Priya Sharma'}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-3 h-3 text-slate-400" /> Budget: <strong className="text-slate-900 font-mono font-bold">₹{(wf.estimated_budget || 0).toLocaleString()}</strong>
                      </span>
                    </div>

                    {/* Policy Compliance Warning Box if Non-Compliant */}
                    {wf.compliance && !wf.compliance.compliant && (
                      <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs space-y-1">
                        <div className="font-semibold text-rose-800 flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          Policy Violations:
                        </div>
                        <div className="space-y-0.5 pl-4">
                          {(Array.isArray(wf.compliance.violations) ? wf.compliance.violations : []).map((v, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700">
                              <strong className="text-rose-800">{v.rule_name || 'Policy Rule'}:</strong> {v.explanation || ''}
                            </div>
                          ))}
                        </div>
                        {wf.compliance.required_action && (
                          <div className="text-[10px] text-blue-700 pt-0.5 border-t border-rose-200">
                            <strong>Required Action:</strong> {wf.compliance.required_action}
                          </div>
                        )}
                      </div>
                    )}

                    {wf.comment && (
                      <div className="mt-1 p-2 rounded-lg bg-[#f5f4f0] border border-[#e8e6df] text-[11px] text-slate-600 flex items-start gap-2">
                        <MessageSquare className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span><strong>Remarks:</strong> {wf.comment}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Flattened Recommended Supplier Commercial Terms */}
                  <div className="md:col-span-5 p-3 rounded-lg bg-[#fbfbfa] border border-[#e8e6df] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-900 text-xs font-bold flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        {wf.top_bid?.vendor_name || 'Recommended Supplier'}
                      </span>
                      <span className="text-emerald-700 font-bold font-mono text-xs">
                        Score: {wf.top_bid?.bid_score?.toFixed(1) || '95.0'}/100
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#f0eee6] text-xs">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {wf.top_bid?.pricing_tier || 'Standard'} • {wf.top_bid?.delivery_days || 3}d SLA
                      </span>
                      <div className="text-right font-mono">
                        <span className="text-sm font-extrabold text-slate-900">
                          ₹{(wf.top_bid?.quoted_price || wf.estimated_budget || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        {(wf.estimated_budget || 0) > (wf.top_bid?.quoted_price || 0) && (
                          <span className="text-[10px] text-emerald-700 font-medium ml-1.5 block">
                            -₹{Math.max(0, (wf.estimated_budget || 0) - (wf.top_bid?.quoted_price || wf.estimated_budget || 0)).toLocaleString('en-IN')} vs budget
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-[#f0eee6]">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> Submitted {wf.created_at ? new Date(wf.created_at).toLocaleDateString() : 'Recently'}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPrForComparison(wf.pr_id);
                        onNavigateToTab('vendor_comparison');
                      }}
                      className="btn-secondary text-[11px] py-1 px-2.5"
                    >
                      <Sparkles className="w-3 h-3 text-slate-400" /> Bids Matrix
                    </button>

                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActionModal({ type: 'reject', item: wf })}
                          className="btn-danger text-[11px] py-1 px-2.5"
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </button>

                        <button
                          type="button"
                          onClick={() => setActionModal({ type: 'approve', item: wf })}
                          className="btn-primary text-[11px] py-1 px-3"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Authorize &amp; Issue PO
                        </button>
                      </>
                    )}

                    {wf.has_po && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('purchase_orders')}
                        className="btn-secondary text-[11px] py-1 px-2.5 text-emerald-700 font-medium"
                      >
                        <FileText className="w-3 h-3" /> View {wf.po_number || 'PO'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Modal (Authorize / Reject) */}
      {actionModal && actionModal.item && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="enterprise-card p-5 md:p-6 max-w-lg w-full space-y-4 shadow-2xl animate-fade-in bg-[#fbfbfa] border border-[#e8e6df]">
            <div className="border-b border-[#e8e6df] pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {actionModal.type === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Authorize &amp; Compile NetSuite PO
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Reject Purchase Request
                  </>
                )}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#f5f4f0] border border-[#e8e6df] space-y-1">
                <div className="font-semibold text-slate-900 text-xs">{actionModal.item.pr_title || 'Purchase Request'}</div>
                <div className="text-slate-500 text-[11px]">
                  Department: <strong className="text-slate-800">{actionModal.item.department || 'Operations'}</strong> •
                  Budget: <strong className="text-emerald-700 font-mono">₹{(actionModal.item.estimated_budget || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div className="text-[10px] text-blue-600 pt-0.5 font-medium">
                  Policy: {actionModal.item.triggered_rule || 'Standard Policy'}
                </div>
              </div>

              {actionModal.type === 'approve' && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px] leading-relaxed">
                  Awarding to winning supplier <strong className="text-slate-900">{actionModal.item.top_bid?.vendor_name || 'Primary Supplier'}</strong> at
                  <strong className="font-mono text-emerald-700"> ₹{(actionModal.item.top_bid?.quoted_price || actionModal.item.estimated_budget || 0).toLocaleString('en-IN')}</strong>.
                  A binding ReportLab PDF Purchase Order will be generated immediately.
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  {actionModal.type === 'approve' ? 'Approver Executive Remarks' : 'Reason for Rejection'}
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={actionModal.type === 'approve' ? 'e.g. Approved. Verified against operational plan.' : 'e.g. Budget ceiling exceeded. Please revise.'}
                  className="w-full bg-white border border-[#dcd9ce] rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setActionModal(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={handleActionSubmit}
                className={actionModal.type === 'approve' ? 'btn-primary text-xs' : 'btn-danger text-xs'}
              >
                {actionLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Confirm &amp; Proceed</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
