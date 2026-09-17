import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  Clock,
  IndianRupee,
  Building,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { vendorPortalAPI } from '../../api';

export default function VendorActiveOrders({
  onNavigateToMyBids,
  orderToBidInitially = null
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Bid submission modal states
  const [bidModalOrder, setBidModalOrder] = useState(orderToBidInitially);
  const [bidPrice, setBidPrice] = useState('');
  const [bidDeliveryDays, setBidDeliveryDays] = useState(7);
  const [bidNotes, setBidNotes] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await vendorPortalAPI.getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch marketplace orders:', err);
      setError('Unable to load active procurement orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenBidModal = (order) => {
    setBidModalOrder(order);
    setBidPrice(order.estimated_budget ? (order.estimated_budget * 0.95).toFixed(0) : '25000');
    setBidDeliveryDays(order.delivery_sla_days || 7);
    setBidNotes('Standard quotation with certified ISO warranty and Tier-1 engineering support.');
    setBidError('');
    setBidSuccess(null);
  };

  const handleCloseBidModal = () => {
    setBidModalOrder(null);
    setBidSuccess(null);
    setBidError('');
  };

  useEffect(() => {
    if (orderToBidInitially) {
      handleOpenBidModal(orderToBidInitially);
    }
  }, [orderToBidInitially]);



  const categories = ['All', ...new Set(orders.map(o => o.category || 'Industrial Equipment'))];



  const handleSubmitBid = async (e) => {
    e.preventDefault();
    if (!bidModalOrder) return;
    setSubmittingBid(true);
    setBidError('');
    try {
      const payload = {
        pr_id: bidModalOrder.id,
        purchase_request_id: bidModalOrder.id,
        quoted_price: parseFloat(bidPrice),
        delivery_days: parseInt(bidDeliveryDays, 10),
        notes: bidNotes.trim()
      };
      const result = await vendorPortalAPI.submitBid(payload);
      setBidSuccess(result);
    } catch (err) {
      console.error('Bid submission failed:', err);
      setBidError(err?.response?.data?.detail || 'Failed to submit bid. Please review terms.');
    } finally {
      setSubmittingBid(false);
    }
  };

  const filteredOrders = orders
    .filter((order) => {
      const title = (order.title || '').toLowerCase();
      const desc = (order.description || '').toLowerCase();
      const dept = (order.department || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchSearch = title.includes(q) || desc.includes(q) || dept.includes(q);
      const cat = order.category || 'Industrial Equipment';
      const matchCat = selectedCategory === 'All' || cat === selectedCategory;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === 'budget_desc') return (b.estimated_budget || 0) - (a.estimated_budget || 0);
      if (sortBy === 'budget_asc') return (a.estimated_budget || 0) - (b.estimated_budget || 0);
      if (sortBy === 'delivery') return (a.delivery_sla_days || 0) - (b.delivery_sla_days || 0);
      return b.id - a.id; // newest default
    });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-purple-600 font-bold block mb-1">
            Supplier RFQ Marketplace
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Active Procurement Orders
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Browse active solicitations published by government departments. Submit competitive quotations and participate in automated AI price discovery.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToMyBids}
          className="btn-secondary"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>View My Submitted Bids</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="enterprise-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#fbfbfa]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search solicitations by title, specifications, or department..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#dcd9ce] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-[#dcd9ce] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 text-xs text-slate-500 ml-2">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-[#dcd9ce] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-purple-500 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="budget_desc">Budget: High to Low</option>
            <option value="budget_asc">Budget: Low to High</option>
            <option value="delivery">Required Delivery: Fastest</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Orders Grid */}
      {loading ? (
        <div className="enterprise-card p-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-mono">Loading active marketplace orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="enterprise-card p-16 text-center space-y-2">
          <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Solicitations Found</h3>
          <p className="text-xs text-slate-500">Try adjusting your search criteria or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const cat = order.category || 'Industrial Equipment';

            return (
              <div
                key={order.id}
                className="enterprise-card p-5 flex flex-col justify-between space-y-4 hover:border-purple-300 transition-all bg-[#fbfbfa] shadow-sm"
              >
                <div className="space-y-3">
                  {/* Order ID & Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                      PR-{order.id.toString().padStart(4, '0')}
                    </span>

                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      order.urgency === 'Critical'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : order.urgency === 'High'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {order.urgency} Urgency
                    </span>
                  </div>

                  {/* Title & Category */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {order.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                        <Tag className="w-2.5 h-2.5" />
                        {cat}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {order.description || 'Detailed specifications available on RFQ bid submission.'}
                  </p>
                </div>

                {/* Details Footer & Action */}
                <div className="space-y-3 pt-3 border-t border-[#e8e6df]">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-[#f5f4f0] border border-[#e8e6df]">
                      <span className="text-[10px] text-slate-400 block">Est. Budget</span>
                      <strong className="text-slate-900 font-bold">
                        ₹{Number(order.estimated_budget || 0).toLocaleString()}
                      </strong>
                    </div>

                    <div className="p-2 rounded bg-[#f5f4f0] border border-[#e8e6df]">
                      <span className="text-[10px] text-slate-400 block">Required SLA</span>
                      <strong className="text-slate-900 font-bold">
                        {order.delivery_sla_days || 7} days max
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      {order.department}
                    </span>
                    <span>Qty: <strong className="text-slate-800 font-mono">{order.quantity} units</strong></span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenBidModal(order)}
                    className="w-full btn-primary bg-purple-600 hover:bg-purple-700 justify-center py-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Quotation</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bid Submission Modal (Section 7) */}
      {bidModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#fbfbfa] border border-[#e8e6df] rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 relative">
            <button
              type="button"
              onClick={handleCloseBidModal}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>

            {bidSuccess ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bid Submitted Successfully!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your commercial quote has been registered in the government procurement ledger.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#f5f4f0] border border-[#e8e6df] text-xs font-mono space-y-1 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bid ID:</span>
                    <strong className="text-slate-900">#{bidSuccess.id || bidSuccess.bid_id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quoted Price:</span>
                    <strong className="text-slate-900">₹{Number(bidPrice).toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery SLA:</span>
                    <strong className="text-slate-900">{bidDeliveryDays} days</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Calculated Bid Score:</span>
                    <strong className="text-emerald-700">{bidSuccess.bid_score?.toFixed(1) || '95.0'} / 100</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleCloseBidModal}
                    className="btn-secondary text-xs"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseBidModal();
                      onNavigateToMyBids();
                    }}
                    className="btn-primary bg-purple-600 hover:bg-purple-700 text-xs"
                  >
                    <span>View in My Bids</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitBid} className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-purple-700 font-bold block mb-0.5">
                    Bid Quotation Submission
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    PR-{bidModalOrder.id.toString().padStart(4, '0')}: {bidModalOrder.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Category: <strong>{bidModalOrder.category || 'Industrial Equipment'}</strong> • Qty: <strong>{bidModalOrder.quantity} units</strong> • Est. Budget: <strong>₹{Number(bidModalOrder.estimated_budget).toLocaleString()}</strong>
                  </p>
                </div>

                {bidError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{bidError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Price Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Total Quoted Price (₹ INR) <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={bidPrice}
                        onChange={(e) => setBidPrice(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#dcd9ce] rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-500 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Delivery Days Input */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Delivery SLA Commitment (Days) <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={bidDeliveryDays}
                        onChange={(e) => setBidDeliveryDays(e.target.value)}
                        required
                        className="w-full pl-9 pr-3 py-2 bg-white border border-[#dcd9ce] rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-500 shadow-sm"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Government target delivery is within {bidModalOrder.delivery_sla_days || 7} days.
                    </span>
                  </div>

                  {/* Notes / Justification */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Commercial Notes &amp; Specifications Justification <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={bidNotes}
                      onChange={(e) => setBidNotes(e.target.value)}
                      required
                      placeholder="Specify product line, quality certification, warranty terms, and logistics..."
                      className="w-full p-2.5 bg-white border border-[#dcd9ce] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseBidModal}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBid}
                    className="btn-primary bg-purple-600 hover:bg-purple-700 text-xs py-2 px-4"
                  >
                    <Send className={`w-3.5 h-3.5 ${submittingBid ? 'animate-spin' : ''}`} />
                    <span>{submittingBid ? 'Registering Bid...' : 'Confirm Quotation'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
