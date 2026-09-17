import { useState } from 'react';
import {
  Bot,
  User,
  Clock,
  IndianRupee,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Send,
  X,
  FileText,
  Scale,
  Lock,
  Activity
} from 'lucide-react';
import { negotiationsAPI, vendorPortalAPI } from '../../api';

export default function NegotiationPanel({
  session,
  events = [],
  escalations = [],
  decisions = [],
  govState = null,
  vendorState = null,
  userRole = 'Lead Procurement Officer',
  onActionComplete,
  onRefresh
}) {
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showPolicyHistory, setShowPolicyHistory] = useState(false);
  const [showAuditTable, setShowAuditTable] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterDays, setCounterDays] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isVendorUser = userRole === 'Vendor';
  const isGovUser = !isVendorUser;
  const sessionId = session?.id || session?.session_id;

  // Render Status Badge - Restrained Government ERP Style
  const renderStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ACCEPTED
          </span>
        );
      case 'NEGOTIATING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Activity className="w-3.5 h-3.5 text-blue-600" /> NEGOTIATING
          </span>
        );
      case 'ESCALATED':
      case 'PENDING_GOV_APPROVAL':
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> PENDING GOV APPROVAL
          </span>
        );
      case 'PENDING_VENDOR_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-600" /> PENDING VENDOR APPROVAL
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> REJECTED
          </span>
        );
      case 'RESUMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <RotateCcw className="w-3.5 h-3.5 text-teal-600" /> RESUMED
          </span>
        );
      case 'INITIATED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> INITIATED
          </span>
        );
    }
  };

  // Determine active escalation info
  const allEscalations = session?.escalations || escalations || [];
  const relevantEscalation = allEscalations.find(e => e.status === 'PENDING') || allEscalations[allEscalations.length - 1];

  const currentStatus = (session?.status || '').toUpperCase();
  const isPendingGovState = ['PENDING_GOV_APPROVAL', 'PENDING_APPROVAL', 'ESCALATED'].includes(currentStatus);
  const isPendingVendorState = currentStatus === 'PENDING_VENDOR_APPROVAL';

  // Government human escalation actions
  const handleGovAction = async (decision) => {
    if (!sessionId) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const resp = await negotiationsAPI.actionEscalation(
        sessionId,
        decision,
        comment || (decision === 'APPROVE' ? 'Executive exception approved by procurement authority' : 'Proposal rejected by procurement authority')
      );
      setSuccessMsg(`Government decision recorded: ${decision}`);
      
      if (decision === 'APPROVE') {
        try {
          await negotiationsAPI.resumeNegotiation(sessionId);
          setSuccessMsg('Escalation approved and bilateral negotiation successfully resumed!');
        } catch (resumeErr) {
          console.warn('Resume triggered with notice:', resumeErr);
        }
      }

      if (onActionComplete) onActionComplete(resp);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Gov escalation action error:', err);
      setError(err?.response?.data?.detail || 'Failed to execute escalation action');
    } finally {
      setActionLoading(false);
      setComment('');
    }
  };

  // Vendor human escalation actions
  const handleVendorAction = async (decision) => {
    if (!sessionId) return;
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const resp = await vendorPortalAPI.actionEscalation(
        sessionId,
        decision,
        comment || (decision === 'APPROVE' ? 'Commercial concession approved by vendor management' : 'Vendor commercial management declined terms')
      );
      setSuccessMsg(`Vendor decision recorded: ${decision}`);

      if (onActionComplete) onActionComplete(resp);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Vendor escalation action error:', err);
      setError(err?.response?.data?.detail || 'Failed to submit vendor action');
    } finally {
      setActionLoading(false);
      setComment('');
    }
  };

  // Submit manual counteroffer (Gov or Vendor)
  const handleManualCounterSubmit = async (e) => {
    e.preventDefault();
    if (!counterPrice || !counterDays) {
      setError('Please provide both price and delivery days');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      let resp;
      if (isGovUser) {
        resp = await negotiationsAPI.counterOffer(
          sessionId,
          Number(counterPrice),
          Number(counterDays),
          counterMessage
        );
        setSuccessMsg(`Government counteroffer of ₹${Number(counterPrice).toLocaleString('en-IN')} submitted! Vendor Agent is responding.`);
      } else {
        resp = await vendorPortalAPI.counterOffer(
          sessionId,
          Number(counterPrice),
          Number(counterDays),
          counterMessage
        );
        setSuccessMsg(`Vendor counteroffer of ₹${Number(counterPrice).toLocaleString('en-IN')} submitted! Government Agent is responding.`);
      }

      setShowCounterModal(false);
      setCounterPrice('');
      setCounterDays('');
      setCounterMessage('');
      if (onActionComplete) onActionComplete(resp);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Manual counteroffer error:', err);
      setError(err?.response?.data?.detail || 'Failed to submit manual counteroffer');
    } finally {
      setActionLoading(false);
    }
  };

  const currentPrice = session?.current_price ?? (events?.length ? events[events.length - 1]?.price : null);
  const currentDays = session?.current_delivery_days ?? (events?.length ? events[events.length - 1]?.delivery_days : null);
  const currentRound = session?.current_round ?? (events?.length ? Math.max(...events.map(e => e.round || 0)) : 0);

  // Group events by speaker role
  const isGovSpeaker = (role) => {
    const r = (role || '').toUpperCase();
    return r.includes('GOV') || r === 'GOVERNMENT';
  };

  const isVendorSpeaker = (role) => {
    const r = (role || '').toUpperCase();
    return r.includes('VENDOR');
  };

  const govEvents = events.filter(e => isGovSpeaker(e.speaker_role));
  const vendorEvents = events.filter(e => isVendorSpeaker(e.speaker_role));

  // Determine policy engine state
  const policyDecisionsList = session?.decisions || session?.policy_decisions || decisions || [];
  const latestPolicyDecision = policyDecisionsList.length > 0
    ? policyDecisionsList[policyDecisionsList.length - 1]
    : null;

  const policyAction = latestPolicyDecision?.decision || (
    currentStatus === 'ACCEPTED' ? 'ACCEPT' :
    isPendingGovState || isPendingVendorState ? 'ESCALATE' :
    currentStatus === 'REJECTED' ? 'REJECT' : 'CONTINUE'
  );

  const policyRule = latestPolicyDecision?.rule_triggered || (
    isPendingGovState ? 'GOV_MAX_PRICE_CEILING' :
    isPendingVendorState ? 'VENDOR_MIN_PRICE_FLOOR' :
    currentStatus === 'ACCEPTED' ? 'BUDGET_COMPLIANCE_CONVERGENCE' :
    currentStatus === 'REJECTED' ? 'MAX_ROUNDS_DEADLOCK' :
    'BILATERAL_ZONE_TOLERANCE'
  );

  return (
    <div className="space-y-5 animate-fade-in text-slate-800">
      {/* ========================================================================= */}
      {/* 1. HEADER                                                                 */}
      {/* ========================================================================= */}
      <div className="enterprise-card p-5 bg-[#fbfbfa] border border-[#e8e6df] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                NEG-{sessionId || '---'}
              </span>
              <span className="text-xs font-semibold text-slate-600 bg-white border border-[#e0ddd2] px-2.5 py-0.5 rounded-full">
                Round <strong className="font-mono text-slate-900">{currentRound}</strong>
              </span>
              {renderStatusBadge(session?.status)}
            </div>

            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{session?.pr_title || 'Autonomous Bilateral Sourcing Order'}</span>
            </h2>

            <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>Vendor Counterparty:</span>
              <strong className="text-slate-800 font-medium">{session?.vendor_name || 'Qualified Vendor'}</strong>
              <span className="text-slate-300">|</span>
              <span>Session #{sessionId}</span>
            </div>
          </div>

          {/* Current Settlement Terms */}
          <div className="flex items-center gap-3 bg-white border border-[#e8e6df] px-4 py-2 rounded-lg shadow-2xs shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono block font-medium">
                Current Offer
              </span>
              <span className="text-base font-bold font-mono text-slate-900">
                {currentPrice !== null && currentPrice !== undefined
                  ? `₹${Number(currentPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '---'}
              </span>
            </div>

            <div className="w-[1px] h-7 bg-[#e8e6df]" />

            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono block font-medium">
                Delivery SLA
              </span>
              <span className="text-sm font-semibold font-mono text-blue-700">
                {currentDays !== null && currentDays !== undefined
                  ? `${currentDays} days`
                  : '---'}
              </span>
            </div>
          </div>
        </div>

        {/* STRICT PRIVACY STRATEGY BANNER (OWNER ROLE ONLY) */}
        {isGovUser && govState && (
          <div className="mt-3 pt-3 border-t border-[#e8e6df] flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 flex-wrap">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-semibold text-blue-900 uppercase font-mono tracking-wider text-[10px]">
                Government Private Parameters (Protected):
              </span>
              <span>Target: <strong className="font-mono text-slate-800">₹{Number(govState.target_price || 0).toLocaleString()}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Budget Ceiling: <strong className="font-mono text-slate-800">₹{Number(govState.max_authorized_price || 0).toLocaleString()}</strong></span>
            </div>
            <span className="text-[10px] italic text-slate-400 hidden sm:inline">
              Never disclosed to vendor
            </span>
          </div>
        )}

        {isVendorUser && vendorState && (
          <div className="mt-3 pt-3 border-t border-[#e8e6df] flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2 flex-wrap">
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-semibold text-slate-800 uppercase font-mono tracking-wider text-[10px]">
                Vendor Commercial Parameters (Protected):
              </span>
              <span>Target: <strong className="font-mono text-slate-800">₹{Number(vendorState.target_price || 0).toLocaleString()}</strong></span>
              <span className="text-slate-300">|</span>
              <span>Minimum Floor: <strong className="font-mono text-slate-800">₹{Number(vendorState.absolute_minimum_price || 0).toLocaleString()}</strong></span>
            </div>
            <span className="text-[10px] italic text-slate-400 hidden sm:inline">
              Never disclosed to government
            </span>
          </div>
        )}
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN NEGOTIATION AREA: TWO AUTONOMOUS AGENTS SIDE-BY-SIDE              */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Bilateral Autonomous Agent Arena
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            {events.length} Public Protocol Messages
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* --------------------------------------------------------------------- */}
          {/* LEFT COLUMN: Government Agent                                         */}
          {/* --------------------------------------------------------------------- */}
          <div className="enterprise-card overflow-hidden border border-[#e8e6df] border-t-2 border-t-blue-600 bg-white flex flex-col shadow-xs">
            {/* Gov Agent Header */}
            <div className="bg-[#fbfbfa] p-3 flex items-center justify-between border-b border-[#e8e6df]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-900 tracking-wide">Government Agent</h4>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      BUYER
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Autonomous Sourcing AI
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">
                  Proposals
                </span>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {govEvents.length} Actions
                </span>
              </div>
            </div>

            {/* Gov Agent Offers Stream */}
            <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto max-h-[540px] bg-[#faf9f6]">
              {govEvents.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Bot className="w-7 h-7 text-slate-300 mx-auto opacity-70" />
                  <p>Awaiting opening government proposal...</p>
                </div>
              ) : (
                govEvents.map((ev, idx) => {
                  const isHuman = ev.speaker_role === 'GOV_HUMAN';
                  const isAccept = ev.event_type === 'ACCEPT';
                  const isReject = ev.event_type === 'REJECT';

                  return (
                    <div
                      key={ev.id || idx}
                      className={`p-3 rounded-lg border transition-all ${
                        isHuman
                          ? 'bg-amber-50/60 border-amber-300 shadow-2xs'
                          : isAccept
                          ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                          : isReject
                          ? 'bg-rose-50/60 border-rose-300 shadow-2xs'
                          : 'bg-white border-[#e8e6df] shadow-2xs hover:border-slate-300'
                      }`}
                    >
                      {/* Card Top Meta */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            Round {ev.round ?? 0}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                            isHuman
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : isAccept
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isReject
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {isHuman ? 'HUMAN OVERRIDE' : ev.event_type || 'OFFER'}
                          </span>
                        </div>

                        {ev.created_at && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Terms Chips */}
                      <div className="pt-2 flex items-center gap-2 flex-wrap">
                        {ev.price !== null && ev.price !== undefined && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                            <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
                            ₹{Number(ev.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        {ev.delivery_days !== null && ev.delivery_days !== undefined && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#f5f4f0] text-slate-700 border border-[#e8e6df]">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {ev.delivery_days} days SLA
                          </span>
                        )}
                      </div>

                      {/* Public Message Statement */}
                      <div className="pt-2">
                        <p className="text-xs text-slate-700 leading-relaxed bg-[#fbfbfa] p-2 rounded border border-[#f0eee6]">
                          &ldquo;{ev.message}&rdquo;
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: Vendor Agent                                            */}
          {/* --------------------------------------------------------------------- */}
          <div className="enterprise-card overflow-hidden border border-[#e8e6df] border-t-2 border-t-slate-500 bg-white flex flex-col shadow-xs">
            {/* Vendor Agent Header */}
            <div className="bg-[#fbfbfa] p-3 flex items-center justify-between border-b border-[#e8e6df]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-900 tracking-wide">Vendor Agent</h4>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300">
                      SELLER
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Autonomous Supplier Sales AI
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">
                  Proposals
                </span>
                <span className="text-xs font-mono font-bold text-slate-800">
                  {vendorEvents.length} Actions
                </span>
              </div>
            </div>

            {/* Vendor Agent Offers Stream */}
            <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto max-h-[540px] bg-[#faf9f6]">
              {vendorEvents.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Bot className="w-7 h-7 text-slate-300 mx-auto opacity-70" />
                  <p>Awaiting vendor counterproposal...</p>
                </div>
              ) : (
                vendorEvents.map((ev, idx) => {
                  const isHuman = ev.speaker_role === 'VENDOR_HUMAN';
                  const isAccept = ev.event_type === 'ACCEPT';
                  const isReject = ev.event_type === 'REJECT';

                  return (
                    <div
                      key={ev.id || idx}
                      className={`p-3 rounded-lg border transition-all ${
                        isHuman
                          ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                          : isAccept
                          ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                          : isReject
                          ? 'bg-rose-50/60 border-rose-300 shadow-2xs'
                          : 'bg-white border-[#e8e6df] shadow-2xs hover:border-slate-300'
                      }`}
                    >
                      {/* Card Top Meta */}
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            Round {ev.round ?? 0}
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                            isHuman
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isAccept
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isReject
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {isHuman ? 'HUMAN OVERRIDE' : ev.event_type || 'OFFER'}
                          </span>
                        </div>

                        {ev.created_at && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Terms Chips */}
                      <div className="pt-2 flex items-center gap-2 flex-wrap">
                        {ev.price !== null && ev.price !== undefined && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-300">
                            <IndianRupee className="w-3.5 h-3.5 text-slate-600" />
                            ₹{Number(ev.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        {ev.delivery_days !== null && ev.delivery_days !== undefined && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#f5f4f0] text-slate-700 border border-[#e8e6df]">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {ev.delivery_days} days SLA
                          </span>
                        )}
                      </div>

                      {/* Public Message Statement */}
                      <div className="pt-2">
                        <p className="text-xs text-slate-700 leading-relaxed bg-[#fbfbfa] p-2 rounded border border-[#f0eee6]">
                          &ldquo;{ev.message}&rdquo;
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PROMINENT ESCALATION CARD (Between panels when pending approval)           */}
      {/* ========================================================================= */}
      {isGovUser && isPendingGovState && (
        <div className="enterprise-card p-5 bg-amber-50/70 border-2 border-amber-300 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    Human Supervisory Intervention Required
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 font-bold border border-amber-300">
                    Rule: {relevantEscalation?.role === 'GOVERNMENT' ? 'GOV_MAX_PRICE_CEILING' : 'GOV_AUTHORITY_THRESHOLD'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-amber-950 mt-1">
                  Algorithmic Authority Limit Reached
                </h3>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed max-w-2xl">
                  {relevantEscalation?.reason || 'Vendor proposal exceeds the autonomous pricing ceiling. Supervisory review is required to approve an exception, counteroffer, or decline.'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 bg-white border border-amber-300 px-3 py-2 rounded-lg shadow-2xs">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Proposal Under Review</span>
              <strong className="font-mono text-sm text-slate-900 block">
                ₹{Number(currentPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <span className="text-[10px] font-mono text-slate-600">{currentDays || '--'} delivery days</span>
            </div>
          </div>

          <div className="pt-3 border-t border-amber-200 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs font-semibold text-amber-950">
              Select an executive action to resolve this escalation:
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleGovAction('APPROVE')}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-1.5 px-3.5 shadow-xs flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve &amp; Resume</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setCounterPrice(currentPrice ? String(currentPrice) : '');
                  setCounterDays(currentDays ? String(currentDays) : '');
                  setShowCounterModal(true);
                }}
                className="btn-secondary bg-white hover:bg-slate-50 text-slate-800 border-[#e8e6df] text-xs py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer font-semibold shadow-2xs"
              >
                <Send className="w-4 h-4 text-slate-600" />
                <span>Manual Counteroffer</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleGovAction('REJECT')}
                className="btn-danger text-xs py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer font-semibold"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Informational for Government when Vendor Escalation is Pending */}
      {isGovUser && isPendingVendorState && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 flex items-start gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-600 block">
              Awaiting Counterparty Concession
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              Vendor Commercial Leadership Review in Progress
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              The vendor sales agent has paused negotiations and escalated government terms to vendor corporate management for margin concession approval. The negotiation is paused awaiting their review.
            </p>
          </div>
        </div>
      )}

      {/* Prominent Vendor Escalation Card */}
      {isVendorUser && isPendingVendorState && (
        <div className="enterprise-card p-5 bg-amber-50/70 border-2 border-amber-300 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    Vendor Commercial Authority Review
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 font-bold border border-amber-300">
                    Rule: {relevantEscalation?.role === 'VENDOR' ? 'VENDOR_MIN_PRICE_FLOOR' : 'COMMERCIAL_BOUNDARY'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-amber-950 mt-1">
                  Commercial Margin Boundary Reached
                </h3>
                <p className="text-xs text-amber-900 mt-1 leading-relaxed max-w-2xl">
                  {relevantEscalation?.reason || 'Government proposal is below your configured minimum floor. Executive commercial approval is required to concede, counteroffer, or decline.'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 bg-white border border-amber-300 px-3 py-2 rounded-lg shadow-2xs">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Government Offer</span>
              <strong className="font-mono text-sm text-slate-900 block">
                ₹{Number(currentPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <span className="text-[10px] font-mono text-slate-600">{currentDays || '--'} delivery days</span>
            </div>
          </div>

          <div className="pt-3 border-t border-amber-200 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs font-semibold text-amber-950">
              Select an executive commercial action:
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleVendorAction('APPROVE')}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-1.5 px-3.5 shadow-xs flex items-center gap-1.5 cursor-pointer font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Concession</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setCounterPrice(currentPrice ? String(currentPrice) : '');
                  setCounterDays(currentDays ? String(currentDays) : '');
                  setShowCounterModal(true);
                }}
                className="btn-secondary bg-white hover:bg-slate-50 text-slate-800 border-[#e8e6df] text-xs py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer font-semibold shadow-2xs"
              >
                <Send className="w-4 h-4 text-slate-600" />
                <span>Counteroffer</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleVendorAction('REJECT')}
                className="btn-danger text-xs py-1.5 px-3.5 flex items-center gap-1.5 cursor-pointer font-semibold"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Informational for Vendor when Government Escalation is Pending */}
      {isVendorUser && isPendingGovState && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 flex items-start gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-600 block">
              Awaiting Government Approval
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              Government Procurement Authority Review in Progress
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Vendor terms have been escalated to the government procurement supervisor for budget ceiling exception approval. Negotiation is currently paused.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. POLICY ENGINE EVALUATION & DETERMINISTIC RULES                          */}
      {/* ========================================================================= */}
      <div className="enterprise-card p-4 bg-white border border-[#e8e6df] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#f0eee6]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Policy Engine Evaluation
              </h4>
              <p className="text-[10px] text-slate-500">
                Autonomous governance rules enforcing statutory and commercial boundaries
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f5f4f0] text-slate-600 border border-[#e8e6df]">
            Deterministic Rule Validator
          </span>
        </div>

        {/* Status / Active Rule / Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-2.5 rounded-lg bg-[#fbfbfa] border border-[#e8e6df]">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">Decision State</span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                policyAction === 'ACCEPT' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                policyAction === 'ESCALATE' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                policyAction === 'REJECT' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                {policyAction}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#fbfbfa] border border-[#e8e6df]">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">Active Policy Rule</span>
            <span className="text-xs font-bold font-mono text-slate-800 mt-1 block truncate">
              {policyRule}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#fbfbfa] border border-[#e8e6df]">
            <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">Algorithmic Outcome</span>
            <span className="text-xs text-slate-700 mt-1 block">
              {policyAction === 'ACCEPT' && 'Terms converged within budget ceiling. Consensus approved.'}
              {policyAction === 'ESCALATE' && 'Supervisory threshold crossed. Paused for human decision.'}
              {policyAction === 'REJECT' && 'Terms violate non-negotiable boundaries. Terminated.'}
              {policyAction === 'CONTINUE' && 'Counterproposal within standard variance. Round advanced.'}
            </span>
          </div>
        </div>

        {/* Historical Policy Decisions Table if present */}
        {policyDecisionsList.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#f0eee6]">
            <div className="flex items-center justify-between py-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">
                Evaluation History ({policyDecisionsList.length} Rounds Evaluated)
              </span>
              <button
                type="button"
                onClick={() => setShowPolicyHistory(!showPolicyHistory)}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 underline font-mono cursor-pointer"
              >
                {showPolicyHistory ? 'Collapse History' : 'Expand History (' + policyDecisionsList.length + ')'}
              </button>
            </div>
            {showPolicyHistory && (
          <div className="mt-2 pt-2 border-t border-[#f0eee6] overflow-x-auto">
            <table className="w-full text-left text-[11px] font-mono">
              <thead>
                <tr className="text-slate-400 border-b border-[#f0eee6]">
                  <th className="pb-1">Round</th>
                  <th className="pb-1">Role</th>
                  <th className="pb-1">Evaluated Terms</th>
                  <th className="pb-1">Rule Triggered</th>
                  <th className="pb-1 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f7f6f2]">
                {policyDecisionsList.map((pd, i) => (
                  <tr key={pd.id || i} className="text-slate-700">
                    <td className="py-1 font-bold">Round {pd.round}</td>
                    <td className="py-1">{pd.role}</td>
                    <td className="py-1">₹{Number(pd.evaluated_price || 0).toLocaleString()} ({pd.evaluated_delivery_days}d)</td>
                    <td className="py-1 text-slate-500 truncate max-w-[200px]">{pd.rule_triggered}</td>
                    <td className="py-1 text-right font-bold">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                        pd.decision === 'ACCEPT' ? 'bg-emerald-100 text-emerald-800' :
                        pd.decision === 'ESCALATE' ? 'bg-amber-100 text-amber-800' :
                        pd.decision === 'REJECT' ? 'bg-rose-100 text-rose-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {pd.decision}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM: AUDIT TIMELINE                                                 */}
      {/* ========================================================================= */}
      <div className="enterprise-card p-4 bg-white border border-[#e8e6df] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#f0eee6]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-slate-100 text-slate-700 border border-slate-300 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Audit Timeline &amp; Ledger
              </h4>
              <p className="text-[10px] text-slate-500">
                Immutable chronology of all bilateral offers, policy triggers, and human interventions
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#f5f4f0] text-slate-600 border border-[#e8e6df]">
            Tamper-Evident Ledger
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-[#f0eee6] mt-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">
            Chronological Event Log ({events.length} Events Recorded)
          </span>
          <button
            type="button"
            onClick={() => setShowAuditTable(!showAuditTable)}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 underline font-mono cursor-pointer"
          >
            {showAuditTable ? 'Hide Detailed Event Table' : 'View Full Event Table (' + events.length + ')'}
          </button>
        </div>

        {showAuditTable && (
          <div className="mt-2">
            {events.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No events recorded in the audit ledger yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e8e6df] bg-[#fbfbfa] text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  <th className="py-1.5 px-2"># / Round</th>
                  <th className="py-1.5 px-2">Speaker</th>
                  <th className="py-1.5 px-2">Event</th>
                  <th className="py-1.5 px-2">Price &amp; SLA</th>
                  <th className="py-1.5 px-2">Action / Justification Statement</th>
                  <th className="py-1.5 px-2 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0eee6]">
                {events.map((ev, index) => {
                  const isGov = isGovSpeaker(ev.speaker_role);
                  const isHuman = ev.speaker_role?.includes('HUMAN');
                  const isAccept = ev.event_type === 'ACCEPT';
                  const isReject = ev.event_type === 'REJECT';

                  return (
                    <tr key={ev.id || index} className="hover:bg-[#fcfbf9] transition-colors">
                      <td className="py-2 px-2 font-mono text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        #{index + 1} | R{ev.round ?? 0}
                      </td>

                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          isHuman
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : isGov
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}>
                          {isHuman ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                          <span>{isHuman ? (isGov ? 'Human Gov' : 'Human Vendor') : (isGov ? 'Gov Agent' : 'Vendor Agent')}</span>
                        </span>
                      </td>

                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                          isAccept
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isReject
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : isHuman
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {ev.event_type || 'OFFER'}
                        </span>
                      </td>

                      <td className="py-2 px-2 whitespace-nowrap font-mono text-[11px]">
                        {ev.price !== null && ev.price !== undefined ? (
                          <strong className="text-slate-900 font-bold">
                            ₹{Number(ev.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </strong>
                        ) : (
                          <span className="text-slate-400">---</span>
                        )}
                        {ev.delivery_days !== null && ev.delivery_days !== undefined && (
                          <span className="text-slate-500 ml-1.5">({ev.delivery_days}d)</span>
                        )}
                      </td>

                      <td className="py-2 px-2 text-xs text-slate-600 max-w-md truncate">
                        {ev.message || '---'}
                      </td>

                      <td className="py-2 px-2 text-right font-mono text-[10px] text-slate-400 whitespace-nowrap">
                        {ev.created_at
                          ? new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                          : '---'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
          </div>
        )}

        {/* Final Consensus Summary Bar */}
        {currentStatus === 'ACCEPTED' && (
          <div className="p-3 rounded-lg bg-emerald-50/80 border border-emerald-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Agreement Settlement: Final terms confirmed at <strong>₹{Number(currentPrice || 0).toLocaleString()}</strong> with <strong>{currentDays || '--'} delivery days SLA</strong>.
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-950 font-bold border border-emerald-200">
              Ready for Purchase Order
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MANUAL COUNTEROFFER MODAL                                                 */}
      {/* ========================================================================= */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-[#d8d5ca] max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e8e6df] pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-2xs border ${
                  isGovUser
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Submit Manual Counteroffer
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    {isGovUser ? 'Government Procurement Officer' : 'Vendor Commercial Representative'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCounterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualCounterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    Proposed Price (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      placeholder="e.g. 15500.00"
                      className="w-full pl-7 pr-3 py-2 text-xs bg-[#fbfbfa] border border-[#d8d5ca] rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                    Delivery SLA (Days)
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="number"
                      required
                      value={counterDays}
                      onChange={(e) => setCounterDays(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full pl-7 pr-3 py-2 text-xs bg-[#fbfbfa] border border-[#d8d5ca] rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono mb-1">
                  Public Commercial Rationale / Justification
                </label>
                <textarea
                  rows="3"
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  placeholder="State terms, quantity expectations, or operational constraints..."
                  className="w-full px-3 py-2 text-xs bg-[#fbfbfa] border border-[#d8d5ca] rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 placeholder-slate-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#e8e6df]">
                <button
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="btn-secondary text-xs py-2 px-3.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`btn-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer ${
                    isGovUser ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Submitting...' : 'Submit Counteroffer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
