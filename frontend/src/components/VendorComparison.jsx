import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Award,
  IndianRupee,
  Truck,
  ShieldCheck,
  History,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  ChevronDown,
  Check,
  ArrowRight,
  RefreshCw,
  Cpu,
  Info,
  Zap,
  Bot,
  MessageSquare,
  Clock,
  ArrowDownRight,
  ShieldAlert,
  SlidersHorizontal,
  User,
  Building,
  X
} from 'lucide-react';
import { prAPI, vendorAPI, dashboardAPI, approvalsAPI } from '../api';

export default function VendorComparison({
  selectedPrId,
  onSelectPr,
  onNavigateToTab,
  onPoGenerated
}) {
  const [prs, setPrs] = useState([]);
  const [activePrId, setActivePrId] = useState(selectedPrId || null);
  const [prDetail, setPrDetail] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [aiAudit, setAiAudit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatingPo, setGeneratingPo] = useState(false);
  const [error, setError] = useState('');
  const [poSuccess, setPoSuccess] = useState(null);
  const [showDetailedScoring, setShowDetailedScoring] = useState(false);

  // Negotiation States
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [negotiationData, setNegotiationData] = useState(null);
  const [negotiationSuccess, setNegotiationSuccess] = useState(false);

  // Load all PRs for the dropdown
  useEffect(() => {
    const fetchPrs = async () => {
      try {
        const data = await prAPI.getAll();
        setPrs(data || []);
        if (!activePrId && data && data.length > 0) {
          setActivePrId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load PRs:', err);
      }
    };
    fetchPrs();
  }, []);

  // When selectedPrId changes from parent
  useEffect(() => {
    if (selectedPrId) {
      setActivePrId(selectedPrId);
    }
  }, [selectedPrId]);

  const triggerAiAudit = async (prIdToAudit) => {
    const id = prIdToAudit || activePrId;
    if (!id) return;
    setAiLoading(true);
    try {
      const data = await dashboardAPI.runAIAnalysis(id);
      setAiAudit(data);
    } catch (err) {
      console.error('AI audit error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // Load recommendations & PR detail when activePrId changes
  useEffect(() => {
    if (!activePrId) return;

    const fetchPRData = async () => {
      setLoading(true);
      setError('');
      setAiAudit(null);
      setPoSuccess(null);
      setNegotiationData(null);
      setNegotiationSuccess(false);

      try {
        const [detailData, recData] = await Promise.all([
          prAPI.getById(activePrId),
          vendorAPI.getRecommendations(activePrId),
        ]);
        setPrDetail(detailData);
        const recs = recData?.recommendations || [];
        setRecommendations(recs);

        // Check if top recommendations already have saved negotiation transcripts
        const topWithTranscripts = recs.filter((r) => Array.isArray(r.negotiation_transcript) && r.negotiation_transcript.length > 0);
        if (topWithTranscripts.length > 0) {
          // Reconstruct negotiation data from stored bids
          let totalInit = 0;
          let totalNeg = 0;
          const reconstructedResults = topWithTranscripts.map((r) => {
            const origP = r.original_quoted_price ?? r.quoted_price;
            const origD = r.original_delivery_days ?? r.delivery_days;
            const savings = Math.max(0, origP - r.quoted_price);
            const savingsPct = origP > 0 ? (savings / origP) * 100 : 0;
            totalInit += origP;
            totalNeg += r.quoted_price;

            return {
              vendor_id: r.vendor_id,
              vendor_name: r.vendor_name,
              pricing_tier: r.pricing_tier,
              original_price: origP,
              negotiated_price: r.quoted_price,
              original_days: origD,
              negotiated_days: r.delivery_days,
              savings_amount: savings,
              savings_pct: savingsPct,
              days_saved: Math.max(0, origD - r.delivery_days),
              status: 'completed',
              transcript: r.negotiation_transcript,
              updated_score: r.scores?.total_score
            };
          });

          setNegotiationData({
            pr_id: activePrId,
            pr_title: detailData.title,
            estimated_budget: detailData.estimated_budget,
            total_initial_spend: totalInit,
            total_negotiated_spend: totalNeg,
            total_savings: Math.max(0, totalInit - totalNeg),
            total_savings_pct: totalInit > 0 ? ((totalInit - totalNeg) / totalInit) * 100 : 0,
            top_vendor_id: recs[0]?.vendor_id,
            top_vendor_name: recs[0]?.vendor_name,
            results: reconstructedResults,
            recommendations: recs
          });
        }

        // Automatically trigger AI audit
        triggerAiAudit(activePrId);
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
        setError('Failed to load vendor quotation data.');
      } finally {
        setLoading(false);
      }
    };

    fetchPRData();
  }, [activePrId]);



  const handleRunNegotiation = async () => {
    if (!activePrId) return;
    setIsNegotiating(true);
    setError('');
    setNegotiationSuccess(false);

    try {
      const data = await vendorAPI.negotiate(activePrId);

      // Build recommendation lookup map to enrich vendor results with metadata if needed
      const recList = Array.isArray(data.recommendations) ? data.recommendations : (recommendations || []);
      const recMap = new Map(recList.map((r) => [r.vendor_id, r]));

      const normalizedResults = Array.isArray(data.results)
        ? data.results.map((vr) => {
            const rec = recMap.get(vr.vendor_id);
            const origPrice = vr.original_price ?? (rec?.original_quoted_price ?? rec?.quoted_price ?? (vr.final_price !== undefined && vr.savings !== undefined ? vr.final_price + vr.savings : 0));
            const negPrice = vr.negotiated_price ?? vr.final_price ?? rec?.quoted_price ?? origPrice;
            const origDays = vr.original_days ?? (rec?.original_delivery_days ?? rec?.delivery_days ?? vr.final_days ?? 0);
            const negDays = vr.negotiated_days ?? vr.final_days ?? rec?.delivery_days ?? origDays;
            const savingsAmt = vr.savings_amount ?? vr.savings ?? Math.max(0, origPrice - negPrice);
            const savingsPct = vr.savings_pct ?? vr.savings_percentage ?? (origPrice > 0 ? (savingsAmt / origPrice) * 100 : 0);

            // Extract transcript from vr.transcript or vr.events
            const rawEvents = Array.isArray(vr.transcript) ? vr.transcript : (Array.isArray(vr.events) ? vr.events : []);
            const normalizedTranscript = rawEvents.map((turn) => ({
              id: turn.id,
              round: turn.round ?? 0,
              speaker_role: turn.speaker_role ?? 'agent',
              message: turn.message || '',
              offered_price: turn.offered_price ?? turn.price ?? negPrice,
              offered_days: turn.offered_days ?? turn.delivery_days ?? negDays
            }));

            return {
              ...vr,
              vendor_id: vr.vendor_id,
              vendor_name: vr.vendor_name,
              pricing_tier: vr.pricing_tier || rec?.pricing_tier || 'Standard',
              original_price: origPrice,
              negotiated_price: negPrice,
              original_days: origDays,
              negotiated_days: negDays,
              savings_amount: savingsAmt,
              savings_pct: savingsPct,
              days_saved: vr.days_saved ?? Math.max(0, origDays - negDays),
              status: vr.status || 'completed',
              transcript: normalizedTranscript,
              events: rawEvents,
              updated_score: vr.updated_score ?? rec?.scores?.total_score ?? rec?.bid_score ?? 95.0
            };
          })
        : [];

      const normalizedData = {
        ...data,
        results: normalizedResults
      };

      setNegotiationData(normalizedData);
      if (Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
      }
      setNegotiationSuccess(true);
      // Re-trigger AI audit with the newly negotiated pricing
      triggerAiAudit(activePrId);
    } catch (err) {
      console.error('Negotiation error:', err);
      setError(err.response?.data?.detail || 'Failed to complete autonomous negotiation.');
    } finally {
      setIsNegotiating(false);
    }
  };

  const handleAuthorizePo = async (vendorId) => {
    if (!activePrId) return;
    setGeneratingPo(true);
    try {
      const res = await approvalsAPI.generatePO(
        activePrId,
        vendorId,
        'Authorized via Vendor Comparison & Gemini AI Audit Matrix'
      );
      setPoSuccess(res.po);
      if (onPoGenerated) onPoGenerated(res.po);

      // Refresh PR detail
      const refreshed = await prAPI.getById(activePrId);
      setPrDetail(refreshed);
    } catch (err) {
      console.error('Failed to generate PO:', err);
      setError(err.response?.data?.detail || 'Failed to authorize PO.');
    } finally {
      setGeneratingPo(false);
    }
  };

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'Enterprise Tier-1':
        return 'bg-purple-50 text-purple-700 border-purple-200 font-mono text-[9px] uppercase font-semibold';
      case 'Mid-Tier':
        return 'bg-blue-50 text-blue-700 border-blue-200 font-mono text-[9px] uppercase font-semibold';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[9px] uppercase font-semibold';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & PR Selector & Negotiation Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">
            RFQ Sourcing &amp; Autonomous Negotiation
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Vendor Comparison &amp; AI Recommendation
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Autonomous multi-agent LangGraph negotiation with Gemini 2.5 Flash trade-off auditing.
          </p>
        </div>

        {/* PR Selector & Negotiation Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600 font-mono uppercase text-[10px] whitespace-nowrap">Active PR:</label>
            <div className="relative min-w-[220px]">
              <select
                value={activePrId || ''}
                onChange={(e) => setActivePrId(Number(e.target.value))}
                className="w-full bg-white border border-[#dcd9ce] rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-mono shadow-sm"
              >
                {prs.map((p) => (
                  <option key={p.id} value={p.id}>
                    PR-{(p.id || 0).toString().padStart(4, '0')} : {p.title?.slice(0, 28)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Autonomous Negotiation Trigger Button (Reserved Primary Accent) */}
          <button
            type="button"
            onClick={handleRunNegotiation}
            disabled={isNegotiating || !activePrId}
            className="btn-primary"
          >
            <Zap className={`w-3.5 h-3.5 ${isNegotiating ? 'animate-bounce' : ''}`} />
            {isNegotiating ? (
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Negotiating (3 Rounds)...
              </span>
            ) : (
              'Run Autonomous Negotiation'
            )}
          </button>
        </div>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-rose-500 hover:text-rose-700 p-1 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PR Summary Bar */}
      {prDetail && (
        <div className="enterprise-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900">
                PR-{(prDetail.id || 0).toString().padStart(4, '0')}
              </span>
              <span className="text-sm font-semibold text-slate-900 truncate">{prDetail.title}</span>
              <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                prDetail.urgency === 'Critical'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                  : 'bg-[#f3f2ec] text-slate-600 border-[#e8e6df]'
              }`}>
                {prDetail.urgency}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-xl">{prDetail.item_description}</p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-[#f5f4f0] border border-[#e8e6df]">
              <span className="text-slate-500 text-[9px] uppercase font-mono block">Estimated Budget</span>
              <span className="font-mono tabular-nums font-bold text-slate-900">₹{(prDetail.estimated_budget || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#f5f4f0] border border-[#e8e6df]">
              <span className="text-slate-500 text-[9px] uppercase font-mono block">Department</span>
              <span className="font-medium text-slate-700">{prDetail.department}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#f5f4f0] border border-[#e8e6df]">
              <span className="text-slate-500 text-[9px] uppercase font-mono block">Quantity</span>
              <span className="font-mono text-slate-700">{prDetail.quantity} Units</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#f5f4f0] border border-[#e8e6df]">
              <span className="text-slate-500 text-[9px] uppercase font-mono block">PR Status</span>
              <span className="font-mono text-[11px] text-emerald-700 font-semibold">{prDetail.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* PO Generated Success Alert */}
      {poSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <strong className="text-slate-900 text-xs">Purchase Order {poSuccess.po_number} Authorized</strong>
              <span className="text-emerald-700 ml-2">
                ReportLab PDF generated and indexed in NetSuite register.
              </span>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('purchase_orders')}
            className="btn-success text-[11px] py-1 px-2.5"
          >
            Open in PO Register <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* AI Executive Auditor Panel */}
      <div className="enterprise-card p-5 space-y-4 border-l-4 border-l-blue-600 shadow-md bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e6df] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Gemini 2.5 Strategic Procurement Audit</h2>
                <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${
                  aiAudit?.is_live_gemini
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                    : 'bg-[#f3f2ec] text-slate-600 border-[#e8e6df]'
                }`}>
                  {aiAudit?.is_live_gemini ? 'Gemini 2.5 Live' : 'Autonomous Auditor'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Trade-off optimization across cost, delivery SLA, reliability, and risk.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => triggerAiAudit()}
            disabled={aiLoading}
            className="btn-secondary text-[11px] py-1 px-2.5 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
            <span>{aiLoading ? 'Auditing...' : 'Re-Run Audit'}</span>
          </button>
        </div>

        {aiLoading ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Gemini 2.5 Flash is analyzing quotation trade-offs...</p>
          </div>
        ) : aiAudit ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left AI Column */}
            <div className="lg:col-span-5 p-3.5 rounded-lg bg-[#f5f4f0] border border-[#e8e6df] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Recommended Award</span>
                <span className="text-xs font-bold text-emerald-700 font-mono">
                  {aiAudit.confidence_score}% Confidence
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  {aiAudit.selected_vendor_name}
                </div>
                <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" />
                  Est. Savings: ₹{(aiAudit?.net_savings_estimate || 0).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Confidence Progress Bar */}
              <div className="w-full bg-[#e8e6df] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${aiAudit.confidence_score}%` }}
                />
              </div>

              {/* Executive Summary */}
              <div className="p-2.5 rounded-lg bg-[#fbfbfa] border border-[#e8e6df] text-xs text-slate-700 leading-relaxed shadow-sm">
                "{aiAudit.executive_summary}"
              </div>
            </div>

            {/* Right AI Column */}
            <div className="lg:col-span-7 space-y-3">
              {/* Key Advantages */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Key Strategic Advantages
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {aiAudit.key_advantages?.map((adv, i) => (
                    <div key={i} className="p-2 rounded-lg bg-[#f5f4f0] border border-[#e8e6df] text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1" />
                      <span className="text-[11px]">{adv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="p-3 rounded-lg bg-[#f5f4f0] border border-[#e8e6df] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Risk Level
                  </span>
                  <span className={`px-1.5 py-0.2 rounded font-semibold text-[9px] uppercase border ${
                    aiAudit.risk_assessment?.risk_level === 'High'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : aiAudit.risk_assessment?.risk_level === 'Moderate'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {aiAudit.risk_assessment?.risk_level || 'Low'} Risk
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  <strong className="text-slate-700">Mitigation:</strong> {aiAudit.risk_assessment?.mitigation_advice}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* --- AUTONOMOUS MULTI-AGENT NEGOTIATION TRANSCRIPT PANEL --- */}
      {(isNegotiating || (negotiationData && Array.isArray(negotiationData.results) && negotiationData.results.length > 0)) && (
        <div className="enterprise-card p-5 space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e6df] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">LangGraph Multi-Agent Negotiation Transcript</h2>
                  <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-[#f3f2ec] text-slate-600 border border-[#e8e6df]">
                    3-Round StateGraph
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Simultaneous multi-round bargaining between BuyerAgent and top-ranked supplier personas.
                </p>
              </div>
            </div>

            {/* Total Savings Pill */}
            {negotiationData && (
              <div className="flex items-center gap-2.5 self-start sm:self-auto bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                <span className="text-[10px] text-emerald-800 uppercase font-semibold">Net Savings:</span>
                <span className="text-xs font-bold text-emerald-700 font-mono">
                  +₹{(negotiationData.total_savings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-emerald-600 font-mono">
                  ({(negotiationData.total_savings_pct || 0).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          {isNegotiating ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <div className="space-y-0.5">
                <h3 className="text-xs font-semibold text-slate-900">Negotiation in Progress</h3>
                <p className="text-[11px] text-slate-500">
                  Orchestrating price discovery, persona counter-offers, and SLA settlement...
                </p>
              </div>
            </div>
          ) : (negotiationData && Array.isArray(negotiationData.results)) && (
            <div className="space-y-4">
              {/* 3-Column Messenger Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {negotiationData.results.map((vr) => {
                  const hasSavings = (vr.savings_amount ?? vr.savings ?? 0) > 0;
                  const isHeld = vr.status === 'held';
                  const transcript = Array.isArray(vr.transcript) ? vr.transcript : (Array.isArray(vr.events) ? vr.events : []);

                  return (
                    <div
                      key={vr.vendor_id}
                      className="rounded-xl bg-[#fbfbfa] border border-[#e8e6df] flex flex-col justify-between overflow-hidden shadow-sm"
                    >
                      {/* Column Header: Vendor Persona & Delta */}
                      <div className="p-3.5 bg-[#f5f4f0] border-b border-[#e8e6df] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${getTierBadge(vr.pricing_tier)}`}>
                            {vr.pricing_tier || 'Standard'}
                          </span>
                          {isHeld ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#f3f2ec] text-slate-600 border border-[#e8e6df]">
                              Standard Quote
                            </span>
                          ) : hasSavings ? (
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                              -₹{Number(vr.savings_amount ?? vr.savings ?? 0).toLocaleString()} ({Number(vr.savings_pct ?? vr.savings_percentage ?? 0).toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#f3f2ec] text-slate-600 border border-[#e8e6df]">
                              Held Firm
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 truncate">{vr.vendor_name}</h4>
                          <div className="flex items-center justify-between text-xs pt-0.5 font-mono">
                            <span className="text-slate-500 text-[11px]">
                              Init: <span className="line-through">₹{Number(vr.original_price ?? vr.quoted_price ?? 0).toLocaleString()}</span>
                            </span>
                            <span className="text-emerald-700 font-semibold text-xs">
                              Final: ₹{Number(vr.negotiated_price ?? vr.final_price ?? vr.quoted_price ?? 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                            <span>SLA: {vr.original_days ?? vr.final_days ?? 0}d &rarr; <strong className="text-slate-800">{vr.negotiated_days ?? vr.final_days ?? 0}d</strong></span>
                            {(vr.days_saved ?? 0) > 0 && (
                              <span className="text-blue-600">({vr.days_saved}d faster)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Chat Messages Container */}
                      <div className="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-[340px] text-xs bg-[#f5f4f0]/50">
                        {transcript.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-xs italic">
                            No negotiation transcript events recorded.
                          </div>
                        ) : (
                          transcript.map((turn, tIdx) => {
                            const isBuyer = turn.speaker_role === 'buyer' || turn.speaker_role === 'GOV_AGENT' || turn.speaker_role === 'GOVERNMENT';
                            const offerPrice = turn.offered_price ?? turn.price ?? 0;
                            const offerDays = turn.offered_days ?? turn.delivery_days ?? 0;

                            return (
                              <div
                                key={turn.id || tIdx}
                                className={`flex flex-col space-y-1 ${isBuyer ? 'items-start' : 'items-end'}`}
                              >
                                <div className="text-[9px] text-slate-500 px-0.5 font-medium">
                                  {isBuyer ? `Buyer Agent • Round ${turn.round ?? 0}` : `${vr.vendor_name?.split(' ')[0] || 'Vendor'} Sales • Round ${turn.round ?? 0}`}
                                </div>

                                <div
                                  className={`p-2.5 rounded-lg max-w-[92%] space-y-1.5 leading-relaxed text-[11px] shadow-sm ${
                                    isBuyer
                                      ? 'bg-blue-50 border border-blue-200 text-slate-800'
                                      : 'bg-[#fbfbfa] border border-[#e8e6df] text-slate-800'
                                  }`}
                                >
                                  <p>{turn.message}</p>
                                  <div className="flex items-center gap-2 pt-1 border-t border-[#e8e6df] text-[10px] font-mono text-slate-500">
                                    <span>Offer: <strong className="text-slate-900">₹{Number(offerPrice).toLocaleString()}</strong></span>
                                    <span>•</span>
                                    <span>SLA: <strong className="text-slate-900">{offerDays}d</strong></span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer Action */}
                      <div className="p-2.5 bg-[#f5f4f0] border-t border-[#e8e6df] flex items-center justify-between">
                        <span className="text-[10px] text-slate-600">
                          Score: <strong className="text-emerald-700 font-mono">{Number(vr.updated_score ?? 95.0).toFixed(1)}/100</strong>
                        </span>
                        <button
                          type="button"
                          disabled={generatingPo}
                          onClick={() => handleAuthorizePo(vr.vendor_id)}
                          className="btn-primary text-[10px] py-1 px-2.5"
                        >
                          <FileCheck className="w-3 h-3" /> Award Bid
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showDetailedScoring && (
      <div className="animate-fade-in">
        {/* Vendor Scoring Algorithm Formula Explainer Bar */}
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-[#f5f4f0] border border-[#e8e6df] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px]">
              <strong className="text-slate-900">LokProcure Scoring:</strong> Total (100) = Price (30 max) + Delivery (25 max) + Reliability (25 max) + History (20 max) + Nearshoring ESG Bonus (+3.0 max)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            History Score = mean(delivery, order_accuracy, quality)
          </span>
        </div>

        {/* Cold-Start & Local Sourcing Policy Note */}
        <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-start gap-2 text-[11px] text-slate-700">
          <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-emerald-700">Oracle NetSuite Vendor Cold-Start &amp; ESG Policy: </span>
            Local SMB &amp; new suppliers with 0 legacy ERP orders are evaluated via a <strong className="text-slate-900">Bayesian Neutral Baseline (80%)</strong> + <strong className="text-emerald-700 font-semibold">+3.0 pt Nearshoring ESG Credit</strong> (&lt;25km proximity), preventing cold-start discrimination while maintaining ISO quality standards.
          </div>
        </div>
      </div>
      </div>
      )}
      
      {/* Vendor Bids Matrix Table */}
      <div className="enterprise-card p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#e8e6df] pb-3">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Quotation Audit</span>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-slate-400" /> Supplier Quotation Ranking Matrix
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDetailedScoring(!showDetailedScoring)}
              className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3 h-3" />
              {showDetailedScoring ? 'Hide Technical Details' : 'Show Detailed Scoring'}
            </button>
            <span className="px-2 py-0.5 rounded bg-[#f3f2ec] border border-[#e8e6df] text-[10px] font-mono text-slate-600 uppercase font-medium">
              {recommendations.length} Bids Evaluated
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e8e6df] text-slate-500 uppercase text-[10px] tracking-wider bg-[#f3f2ec]">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Supplier &amp; Tier</th>
                <th className="py-2.5 px-3 font-mono text-right">Quoted Price</th>
                <th className="py-2.5 px-3 text-right">Variance</th>
                <th className="py-2.5 px-3 text-center">Delivery SLA</th>
                <th className="py-2.5 px-3 text-center">Reliability</th>
                <th className="py-2.5 px-3 text-center">History (ERP)</th>
                {showDetailedScoring && <th className="py-2.5 px-3 text-center font-mono">Price (30)</th>}
                {showDetailedScoring && <th className="py-2.5 px-3 text-center font-mono">Deliv (25)</th>}
                {showDetailedScoring && <th className="py-2.5 px-3 text-center font-mono">Rel (25)</th>}
                {showDetailedScoring && <th className="py-2.5 px-3 text-center font-mono">Hist (20)</th>}
                {showDetailedScoring && <th className="py-2.5 px-3 text-center font-mono">ESG (+3)</th>}
                <th className="py-2.5 px-3 font-mono text-right">Score / 100</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeebe3]">
              {recommendations.map((rec) => {
                const isWinner = rec.rank === 1;
                const isSelectedByAi = aiAudit?.selected_vendor_name === rec.vendor_name;

                return (
                  <tr
                    key={rec.bid_id}
                    className={`transition-colors ${
                      isWinner
                        ? 'bg-blue-50/40 hover:bg-blue-50/70'
                        : 'hover:bg-[#f5f4f0]/80'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3 font-bold">
                      {rec.rank === 1 ? (
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-mono uppercase flex items-center gap-1 w-max font-semibold">
                          <Award className="w-3 h-3 text-amber-500" /> #1 Best
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">#{rec.rank}</span>
                      )}
                    </td>

                    {/* Supplier & Tier */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 flex flex-wrap items-center gap-1.5">
                        {rec.vendor_name}
                        {isSelectedByAi && (
                          <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-semibold">
                            AI Pick
                          </span>
                        )}
                        {rec.is_incubator && (
                          <span
                            title="Evaluated via Bayesian Cold-Start Prior (80% baseline) + Nearshoring ESG Credit"
                            className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5 font-semibold"
                          >
                            🌱 Local SMB ({rec.local_proximity_km || 12}km)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-medium ${getTierBadge(rec.pricing_tier)}`}>
                          {rec.pricing_tier}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{rec.contact_email}</span>
                      </div>
                    </td>

                    {/* Quoted Price */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                      {rec.original_quoted_price && rec.original_quoted_price > rec.quoted_price ? (
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-slate-400 line-through">
                            ₹{Number(rec.original_quoted_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-emerald-700 font-bold flex items-center justify-end gap-1">
                            <Zap className="w-3 h-3" />
                            ₹{Number(rec.quoted_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-900">
                          ₹{Number(rec.quoted_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>

                    {/* Variance vs Budget */}
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-[11px]">
                      <span className={rec.scores.price_variance_pct <= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                        {rec.scores.price_variance_pct <= 0 ? '' : '+'}
                        {rec.scores.price_variance_pct}%
                      </span>
                    </td>

                    {/* Delivery Days */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-slate-800">{rec.delivery_days}d</span>
                      {rec.original_delivery_days && rec.original_delivery_days > rec.delivery_days && (
                        <span className="text-[10px] text-emerald-700 font-mono block">
                          (-{rec.original_delivery_days - rec.delivery_days}d)
                        </span>
                      )}
                    </td>

                    {/* Reliability */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="text-slate-800">{rec.reliability_score}%</span>
                    </td>

                    {/* History */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="text-slate-800">{rec.history_score_raw}%</span>
                      {rec.is_incubator && (
                        <span className="text-[9px] text-emerald-700 block font-mono">
                          (Prior)
                        </span>
                      )}
                    </td>

                    {showDetailedScoring && (
                      <>
                        {/* Price Score (30) */}
                                            <td className="py-3 px-3 text-center font-mono text-slate-700 text-[11px]">
                                              {Number(rec.scores?.price_score || 0).toFixed(1)}
                                            </td>
                        
                                            {/* Delivery Score (25) */}
                                            <td className="py-3 px-3 text-center font-mono text-slate-700 text-[11px]">
                                              {Number(rec.scores?.delivery_score || 0).toFixed(1)}
                                            </td>
                        
                                            {/* Reliability Score (25) */}
                                            <td className="py-3 px-3 text-center font-mono text-slate-700 text-[11px]">
                                              {Number(rec.scores?.reliability_score || 0).toFixed(1)}
                                            </td>
                        
                                            {/* History Score (20) */}
                                            <td className="py-3 px-3 text-center font-mono text-slate-700 text-[11px]">
                                              {Number(rec.scores?.history_score || 0).toFixed(1)}
                                            </td>
                        
                                            {/* ESG Nearshoring Bonus (+3) */}
                                            <td className="py-3 px-3 text-center font-mono text-[11px]">
                                              {rec.scores.nearshoring_bonus > 0 ? (
                                                <span className="text-emerald-700 font-semibold">+{Number(rec.scores?.nearshoring_bonus || 0).toFixed(1)}</span>
                                              ) : (
                                                <span className="text-slate-400">-</span>
                                              )}
                                            </td>
                      </>
                    )}

                    {/* Total Composite Score with Signature Mini Progress Bar */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2 font-mono">
                        <div className="w-12 h-1.5 rounded-full bg-[#e8e6df] overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              rec.scores.total_score >= 90
                                ? 'bg-emerald-500'
                                : rec.scores.total_score >= 80
                                ? 'bg-blue-500'
                                : rec.scores.total_score >= 70
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, rec.scores.total_score)}%` }}
                          />
                        </div>
                        <span className={`font-bold tabular-nums text-xs ${getScoreColor(rec.scores.total_score)}`}>
                          {Number(rec.scores?.total_score || 0).toFixed(1)}
                        </span>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-3 text-center">
                      {prDetail?.purchase_order ? (
                        <span className="text-[9px] font-mono uppercase text-slate-500 px-2 py-0.5 rounded bg-[#f3f2ec] border border-[#e8e6df] font-medium">
                          PO Issued
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={generatingPo}
                          onClick={() => handleAuthorizePo(rec.vendor_id)}
                          className={`text-[11px] py-1 px-2.5 mx-auto ${
                            isWinner ? 'btn-primary' : 'btn-secondary'
                          }`}
                        >
                          <FileCheck className="w-3 h-3" />
                          <span>{isWinner ? 'Award & Issue PO' : 'Award'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
