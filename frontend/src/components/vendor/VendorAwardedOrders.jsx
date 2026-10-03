import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  Calendar,
  IndianRupee,
  Building,
  FileText,
  Clock,
  Search,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { vendorPortalAPI } from '../../api';

export default function VendorAwardedOrders({
  onNavigateToMarketplace
}) {
  const [awardedOrders, setAwardedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAwarded = async () => {
    try {
      setLoading(true);
      const bids = await vendorPortalAPI.getMyBids();
      const list = Array.isArray(bids) ? bids : [];
      // Awarded or accepted bids
      const awarded = list.filter(b => 
        (b.status || '').toLowerCase().includes('award') || 
        (b.status || '').toLowerCase().includes('accept') ||
        (b.status || '').toLowerCase().includes('po')
      );
      setAwardedOrders(awarded);
    } catch (err) {
      console.error('Failed to load awarded orders:', err);
      setError('Unable to load awarded contracts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAwarded();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-700 font-bold block mb-1">
            Contract Execution &amp; Fulfillment
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Awarded Purchase Orders
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Confirmed government purchase contracts awarded to Apex Global Industrial. Track fulfillment milestones and dispatch requirements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToMarketplace}
            className="btn-primary bg-purple-600 hover:bg-purple-700"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Browse More RFQs</span>
          </button>

          <button
            type="button"
            onClick={fetchAwarded}
            className="btn-secondary px-2.5"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="enterprise-card p-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-mono">Loading awarded contracts...</p>
        </div>
      ) : awardedOrders.length === 0 ? (
        <div className="enterprise-card p-16 text-center space-y-3 bg-[#fbfbfa]">
          <Award className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Awarded Orders Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Once a government procurement officer finalizes an agreement and authorizes a Purchase Order, it will appear here as a contracted award.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onNavigateToMarketplace}
              className="btn-primary bg-purple-600 hover:bg-purple-700 text-xs"
            >
              Browse Active Orders &amp; Bid
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {awardedOrders.map((bid) => (
            <div
              key={bid.id}
              className="enterprise-card p-5 space-y-4 border-emerald-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Awarded Contract
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Bid #{bid.id}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {bid.pr_title || `Order #${bid.purchase_request_id}`}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Category: <strong className="text-slate-700">{bid.pr_category || 'Industrial Equipment'}</strong>
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#f5f4f0] border border-[#e8e6df] grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Agreed Value</span>
                  <strong className="text-slate-900 font-bold text-sm">
                    ₹{Number(bid.quoted_price).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Delivery Commitment</span>
                  <strong className="text-slate-900 font-bold text-sm">
                    {bid.delivery_days} days SLA
                  </strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span>Award Date: {bid.created_at ? new Date(bid.created_at).toLocaleDateString() : 'Active'}</span>
                <span className="font-semibold text-emerald-700">Contract Ready</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
