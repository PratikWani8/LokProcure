import React, { useState, useEffect } from 'react';
import {
  Gavel,
  Search,
  Filter,
  Users,
  Zap,
  Clock,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Building,
  Award,
  ChevronRight,
  TrendingUp,
  Tag,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { prAPI, vendorAPI } from '../../api';

export default function GovActiveBids({
  initialPrId = null,
  onNavigateToComparison,
  onOpenNegotiation
}) {
  const [prs, setPrs] = useState([]);
  const [selectedPrId, setSelectedPrId] = useState(initialPrId);
  const [bidsData, setBidsData] = useState(null);
  const [loadingPrs, setLoadingPrs] = useState(true);
  const [loadingBids, setLoadingBids] = useState(false);
  const [error, setError] = useState('');

  // Fetch all PRs to populate the selector
  useEffect(() => {
    const loadPrs = async () => {
      try {
        setLoadingPrs(true);
        const data = await prAPI.getAll();
        const list = Array.isArray(data) ? data : [];
        setPrs(list);
        if (!selectedPrId && list.length > 0) {
          setSelectedPrId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load PRs:', err);
        setError('Unable to load procurement requests.');
      } finally {
        setLoadingPrs(false);
      }
    };
    loadPrs();
  }, []);

  // When selectedPrId changes, load bids/recommendations
  useEffect(() => {
    if (!selectedPrId) return;
    const loadBids = async () => {
      try {
        setLoadingBids(true);
        setError('');
        const data = await vendorAPI.getRecommendations(selectedPrId);
        setBidsData(data);
      } catch (err) {
        console.error('Failed to load bids for PR:', err);
        setError('Unable to load active bids for this procurement order.');
      } finally {
        setLoadingBids(false);
      }
    };
    loadBids();
  }, [selectedPrId]);

  const activePr = prs.find(p => p.id === Number(selectedPrId));
  const recommendations = bidsData?.recommendations || [];

  // Summary figures
  const lowestPrice = recommendations.length > 0
    ? Math.min(...recommendations.map(r => r.quoted_price || 0))
    : null;
  const shortestDelivery = recommendations.length > 0
    ? Math.min(...recommendations.map(r => r.delivery_days || 999))
    : null;
  const topVendor = recommendations[0]?.vendor_name || null;

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'Tier-1 Enterprise':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Tier-2 Preferred':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Tier-3 Local Incubator':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">
            Government Sourcing &amp; Bid Auditing
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Active Bids Matrix
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Audit competitive vendor quotations, algorithmic bid scores, and initiate bilateral negotiations.
          </p>
        </div>

        {selectedPrId && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateToComparison(selectedPrId)}
              className="btn-secondary"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Full Comparison Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenNegotiation(selectedPrId)}
              className="btn-primary"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Negotiate via AI</span>
            </button>
          </div>
        )}
      </div>

      {/* PR Selector & Context Strip */}
      <div className="enterprise-card p-3.5 bg-[#fbfbfa] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <label className="text-[10px] font-bold text-slate-600 font-mono uppercase whitespace-nowrap">
            Procurement Order:
          </label>
          <select
            value={selectedPrId || ''}
            onChange={(e) => setSelectedPrId(Number(e.target.value))}
            className="w-full md:max-w-xl bg-white border border-[#dcd9ce] rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs font-mono"
          >
            {prs.map((p) => (
              <option key={p.id} value={p.id}>
                PR-{p.id.toString().padStart(4, '0')}: {p.title} (₹{Number(p.estimated_budget).toLocaleString()} • {p.category || 'Industrial Equipment'})
              </option>
            ))}
          </select>
        </div>

        {activePr && (
          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-medium">
              {activePr.category || 'Industrial Equipment'}
            </span>
            <span className="px-2.5 py-0.5 rounded bg-white border border-[#e8e6df] text-slate-800 shadow-2xs">
              Budget: <strong className="text-slate-900">₹{Number(activePr.estimated_budget).toLocaleString()}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Quick Summary Highlights Bar (Clean & Scannable) */}
      {!loadingBids && recommendations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-lg bg-white border border-[#e8e6df] shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Total Active Bids</span>
            <span className="text-base font-bold font-mono text-slate-900">{recommendations.length} Proposals</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-[#e8e6df] shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Lowest Quoted Price</span>
            <span className="text-base font-bold font-mono text-emerald-700">
              ₹{lowestPrice !== null ? Number(lowestPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '---'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-[#e8e6df] shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Fastest Delivery SLA</span>
            <span className="text-base font-bold font-mono text-blue-700">
              {shortestDelivery !== null ? `${shortestDelivery} days` : '---'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-[#e8e6df] shadow-2xs">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Top Algorithmic Match</span>
            <span className="text-xs font-bold text-slate-900 truncate block mt-0.5">
              {topVendor || '---'}
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Content */}
      {loadingBids ? (
        <div className="enterprise-card p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-mono">Fetching active bids and calculating scores...</p>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="enterprise-card p-12 text-center space-y-2">
          <Gavel className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Bids Submitted for this Order Yet</h3>
          <p className="text-xs text-slate-500">
            This requisition has been broadcast to suppliers. Bids will appear as vendors submit their quotes.
          </p>
        </div>
      ) : (
        <div className="enterprise-card overflow-hidden">
          <div className="p-3.5 border-b border-[#e8e6df] bg-[#fbfbfa] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">
                Supplier Quotations ({recommendations.length})
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                Autonomous Negotiation Ready
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
              Ranked by Multi-Criteria Utility Model (100 pts)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e8e6df] bg-[#f5f4f0] text-slate-600 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-4 font-semibold">Rank &amp; Supplier</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Quoted Price</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Delivery SLA</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Reliability</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Composite Score</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Available Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6df]">
                {recommendations.map((bid, idx) => {
                  const score = bid.scores?.total_score ?? bid.bid_score ?? 80;
                  const isTopRank = idx === 0;

                  return (
                    <tr
                      key={bid.bid_id || bid.vendor_id}
                      className={`transition-colors ${
                        isTopRank
                          ? 'bg-blue-50/30 hover:bg-blue-50/60'
                          : 'hover:bg-[#f5f4f0]/60'
                      }`}
                    >
                      {/* Rank & Supplier */}
                      <td className="py-3 px-4 min-w-[220px]">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                            isTopRank
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-[#f3f2ec] text-slate-700 border border-[#e8e6df]'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs">{bid.vendor_name}</span>
                              {isTopRank && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 font-bold">
                                  Top Match
                                </span>
                              )}
                              {bid.is_incubator && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                  Local SMB
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-mono">
                              <span className={`px-1 py-0.2 rounded border font-medium ${getTierBadge(bid.pricing_tier)}`}>
                                {bid.pricing_tier}
                              </span>
                              <span className="text-slate-400 truncate max-w-[120px]">{bid.contact_email}</span>
                            </div>
                            {bid.notes && (
                              <p className="text-[10px] text-slate-500 truncate max-w-xs mt-0.5" title={bid.notes}>
                                Note: {bid.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quoted Price (Primary Number) */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 text-sm">
                          ₹{Number(bid.quoted_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {bid.original_quoted_price && bid.original_quoted_price > bid.quoted_price && (
                          <div className="text-[10px] text-emerald-700 line-through">
                            ₹{Number(bid.original_quoted_price).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Delivery SLA */}
                      <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                        <span className="font-bold text-slate-800 text-xs">{bid.delivery_days} days</span>
                      </td>

                      {/* Reliability */}
                      <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                        <span className="text-xs text-slate-700 font-semibold">
                          {bid.reliability_score}%
                        </span>
                      </td>

                      {/* Composite Score */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                          score >= 90
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : score >= 80
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {score.toFixed(1)}/100
                        </span>
                      </td>

                      {/* Status (Clean and uncluttered) */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onNavigateToComparison(selectedPrId)}
                            className="btn-secondary text-[11px] py-1 px-2.5"
                          >
                            <Users className="w-3 h-3 text-slate-600" />
                            <span>Compare</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenNegotiation(selectedPrId)}
                            className="btn-primary text-[11px] py-1 px-2.5"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Negotiate</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
