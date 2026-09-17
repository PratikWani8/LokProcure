import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  FileCheck,
  MessageSquare,
  Award,
  TrendingUp,
  Clock,
  ArrowRight,
  IndianRupee,
  Tag,
  Building,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { vendorPortalAPI } from '../../api';

export default function VendorDashboard({
  user,
  onNavigateToTab,
  onSelectOrderToBid
}) {
  const [orders, setOrders] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [ordersData, bidsData, negsData] = await Promise.all([
        vendorPortalAPI.getOrders(),
        vendorPortalAPI.getMyBids(),
        vendorPortalAPI.getNegotiations()
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setMyBids(Array.isArray(bidsData) ? bidsData : []);
      setNegotiations(Array.isArray(negsData) ? negsData : []);
    } catch (err) {
      console.error('Failed to load vendor dashboard:', err);
      setError('Unable to load vendor marketplace data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const awardedBids = myBids.filter(b => (b.status || '').toLowerCase().includes('award'));
  const activeNegotiationsCount = negotiations.filter(n => ['NEGOTIATING', 'PENDING_APPROVAL', 'PENDING_GOV_APPROVAL', 'PENDING_VENDOR_APPROVAL'].includes((n.status || '').toUpperCase())).length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">
            Supplier Operations Portal
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Vendor Overview
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Welcome back, <strong className="text-slate-800">{user?.full_name || 'Vikram Malhotra'}</strong> ({user?.department || 'Apex Global Industrial'}). Monitor open RFQs, active AI negotiations, and contracted orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToTab('vendor_active_orders')}
            className="btn-primary bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Browse RFQ Marketplace</span>
          </button>

          <button
            type="button"
            onClick={loadDashboard}
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

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Active Orders */}
        <div className="enterprise-card p-4 space-y-2 bg-[#fbfbfa]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
              Open RFQ Orders
            </span>
            <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {orders.length}
          </div>
          <p className="text-[11px] text-slate-500">
            Requisitions currently accepting supplier quotations
          </p>
        </div>

        {/* My Submitted Bids */}
        <div className="enterprise-card p-4 space-y-2 bg-[#fbfbfa]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
              My Submitted Bids
            </span>
            <div className="w-7 h-7 rounded-md bg-purple-50 border border-purple-200 flex items-center justify-center text-slate-500">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {myBids.length}
          </div>
          <p className="text-[11px] text-slate-500">
            Active commercial bids submitted across orders
          </p>
        </div>

        {/* Active Negotiations */}
        <div className="enterprise-card p-4 space-y-2 bg-[#fbfbfa]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
              AI Negotiations
            </span>
            <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {negotiations.length}
          </div>
          <p className="text-[11px] text-slate-500">
            {activeNegotiationsCount} sessions currently active
          </p>
        </div>

        {/* Awarded Orders */}
        <div className="enterprise-card p-4 space-y-2 bg-[#fbfbfa]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-wider">
              Awarded Contracts
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {awardedBids.length}
          </div>
          <p className="text-[11px] text-slate-500">
            Finalized purchase orders awarded to Apex Global
          </p>
        </div>
      </div>

      {/* Two Column Section: Recent Active Orders & Recent My Bids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Available Orders Available to Bid */}
        <div className="lg:col-span-7 enterprise-card p-5 space-y-4 bg-[#fbfbfa]">
          <div className="flex items-center justify-between border-b border-[#e8e6df] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-slate-500" />
                Featured Procurement Orders Available for Bidding
              </h3>
              <p className="text-[11px] text-slate-500">
                Public government orders seeking commercial supplier proposals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('vendor_active_orders')}
              className="text-xs font-semibold text-slate-500 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All ({orders.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No open orders available currently.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 4).map((order) => (
                <div
                  key={order.id}
                  className="p-3.5 rounded-lg border border-[#e8e6df] bg-white hover:border-blue-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-50 text-blue-700 font-bold border border-purple-200">
                        PR-{order.id.toString().padStart(4, '0')}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {order.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {order.category || 'Industrial Equipment'}
                      </span>
                      <span>•</span>
                      <span>Qty: <strong className="text-slate-800">{order.quantity} units</strong></span>
                      <span>•</span>
                      <span>Required SLA: <strong className="text-slate-800">{order.delivery_sla_days || 7} days</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-slate-400 block">Est. Budget</span>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{Number(order.estimated_budget || 0).toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectOrderToBid(order)}
                      className="btn-primary bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3"
                    >
                      <span>Submit Bid</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: My Submitted Bids Summary */}
        <div className="lg:col-span-5 enterprise-card p-5 space-y-4 bg-[#fbfbfa]">
          <div className="flex items-center justify-between border-b border-[#e8e6df] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Recent Submitted Bids
              </h3>
              <p className="text-[11px] text-slate-500">
                Your submitted commercial proposals and scores.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('vendor_my_bids')}
              className="text-xs font-semibold text-slate-500 hover:text-blue-700 flex items-center gap-1"
            >
              <span>My Bids ({myBids.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
            </div>
          ) : myBids.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              You haven't submitted any bids yet. Browse open orders to submit your first quotation.
            </div>
          ) : (
            <div className="space-y-3">
              {myBids.slice(0, 5).map((bid) => (
                <div
                  key={bid.id}
                  className="p-3 rounded-lg border border-[#e8e6df] bg-white space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {bid.pr_title || `Order #${bid.purchase_request_id}`}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      Score: {bid.bid_score?.toFixed(1) || '85.0'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 pt-0.5">
                    <span>Quoted: <strong className="text-slate-900">₹{Number(bid.quoted_price).toLocaleString()}</strong></span>
                    <span>SLA: <strong className="text-slate-800">{bid.delivery_days}d</strong></span>
                    <span className="text-slate-400">{bid.created_at ? new Date(bid.created_at).toLocaleDateString() : 'Active'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
