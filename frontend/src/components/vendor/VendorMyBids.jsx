import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  MessageSquare,
  Clock,
  IndianRupee,
  TrendingUp,
  Tag,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import { vendorPortalAPI } from '../../api';

export default function VendorMyBids({
  onNavigateToNegotiation,
  onNavigateToMarketplace
}) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBids = async () => {
    try {
      setLoading(true);
      const data = await vendorPortalAPI.getMyBids();
      setBids(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load my bids:', err);
      setError('Unable to load submitted bids.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids();
  }, []);

  const filteredBids = bids.filter((b) => {
    const title = (b.pr_title || '').toLowerCase();
    const notes = (b.notes || '').toLowerCase();
    const cat = (b.pr_category || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return title.includes(q) || notes.includes(q) || cat.includes(q);
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-purple-600 font-bold block mb-1">
            Supplier Commercial Ledger
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Submitted Bids
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Track quotation submissions, algorithmic bid ratings, and entry into bilateral AI negotiations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToMarketplace}
            className="btn-primary bg-purple-600 hover:bg-purple-700"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Submit Another Bid</span>
          </button>

          <button
            type="button"
            onClick={fetchBids}
            className="btn-secondary px-2.5"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="enterprise-card p-4 flex items-center justify-between gap-3 bg-[#fbfbfa]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search my bids by requisition title, category, or notes..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#dcd9ce] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>
        <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
          Showing {filteredBids.length} of {bids.length} bids
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Bids Table */}
      {loading ? (
        <div className="enterprise-card p-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-mono">Loading submitted bids...</p>
        </div>
      ) : filteredBids.length === 0 ? (
        <div className="enterprise-card p-16 text-center space-y-3">
          <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Submitted Bids Found</h3>
          <p className="text-xs text-slate-500">
            You haven't submitted any bids matching your search. Browse the marketplace to submit proposals.
          </p>
        </div>
      ) : (
        <div className="enterprise-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e8e6df] bg-[#f5f4f0] text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Bid ID</th>
                  <th className="py-3 px-4 font-semibold">Procurement Order &amp; Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Quoted Price</th>
                  <th className="py-3 px-4 font-semibold text-center">Delivery SLA</th>
                  <th className="py-3 px-4 font-semibold text-center">Bid Score</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold">Commercial Notes</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6df]">
                {filteredBids.map((bid) => {
                  const score = bid.bid_score ?? 85.0;

                  return (
                    <tr key={bid.id} className="hover:bg-[#f5f4f0]/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-purple-700 whitespace-nowrap">
                        #{bid.id}
                      </td>

                      <td className="py-3 px-4 min-w-[220px]">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {bid.pr_title || `Requisition #${bid.purchase_request_id}`}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                            <Tag className="w-2.5 h-2.5" />
                            {bid.pr_category || 'Industrial Equipment'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-sm">
                          ₹{Number(bid.quoted_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono whitespace-nowrap">
                        <span className="font-bold text-slate-800">{bid.delivery_days} days</span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                          score >= 90
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : score >= 80
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {score.toFixed(1)} / 100
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                          {bid.status || 'Active'}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs text-slate-600 text-[11px]">
                        <p className="truncate" title={bid.notes}>
                          {bid.notes || <span className="text-slate-400 italic">No notes</span>}
                        </p>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigateToNegotiation(bid.purchase_request_id)}
                          className="btn-secondary text-[11px] py-1 px-2.5"
                        >
                          <MessageSquare className="w-3 h-3 text-purple-600" />
                          <span>Negotiate</span>
                        </button>
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
