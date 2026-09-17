import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  ArrowUpDown,
  PlusCircle,
  Eye,
  Gavel,
  Users,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  IndianRupee,
  Tag
} from 'lucide-react';
import { prAPI } from '../../api';

export default function GovOrders({
  onSelectPrForBids,
  onSelectPrForComparison,
  onTriggerNewPr
}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await prAPI.getAll();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch procurement orders:', err);
      setError('Unable to load procurement orders from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const categories = ['All', ...new Set(orders.map(o => o.category || 'Industrial Equipment'))];

  // Map raw backend statuses to public procurement stages cleanly
  const getStatusStage = (order) => {
    const raw = (order.status || '').toLowerCase();
    if (order.purchase_order || raw.includes('po') || raw.includes('award')) {
      return { label: 'Awarded', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (raw.includes('negotiat')) {
      return { label: 'Negotiation', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (order.bids_count > 0 || raw.includes('bid')) {
      return { label: 'Bidding', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (raw.includes('publish') || raw.includes('approv')) {
      return { label: 'Published', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    return { label: 'Draft/Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  const filteredOrders = orders.filter((o) => {
    const titleMatch = (o.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (o.item_description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (o.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const cat = o.category || 'Industrial Equipment';
    const catMatch = selectedCategory === 'All' || cat === selectedCategory;
    const stage = getStatusStage(o).label;
    const statusMatch = selectedStatus === 'All' || stage === selectedStatus;
    return titleMatch && catMatch && statusMatch;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">
            Government Requisitions &amp; Solicitations
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Procurement Orders
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage public requisitions, view live vendor bidding, and orchestrate policy negotiations.
          </p>
        </div>

        <button
          type="button"
          onClick={onTriggerNewPr}
          className="btn-primary"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Create Requisition (PR)</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="enterprise-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#fbfbfa]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order title, specification, or department..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#dcd9ce] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white border border-[#dcd9ce] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-2">
            <span>Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white border border-[#dcd9ce] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Draft/Pending">Draft/Pending</option>
            <option value="Published">Published</option>
            <option value="Bidding">Bidding</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Awarded">Awarded</option>
          </select>
        </div>
      </div>

      {/* Orders Table / Cards */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="enterprise-card p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-mono">Loading procurement orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="enterprise-card p-12 text-center space-y-2">
          <Briefcase className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No Procurement Orders Found</h3>
          <p className="text-xs text-slate-500">Try adjusting your search query or filter settings.</p>
        </div>
      ) : (
        <div className="enterprise-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e8e6df] bg-[#f5f4f0] text-slate-500 font-mono text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">PR Identifier</th>
                  <th className="py-3 px-4 font-semibold">Title &amp; Category</th>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold text-right">Budget &amp; Qty</th>
                  <th className="py-3 px-4 font-semibold text-center">Urgency</th>
                  <th className="py-3 px-4 font-semibold text-center">Stage</th>
                  <th className="py-3 px-4 font-semibold text-center">Bids</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6df]">
                {filteredOrders.map((order) => {
                  const stage = getStatusStage(order);
                  const cat = order.category || 'Industrial Equipment';

                  return (
                    <tr key={order.id} className="hover:bg-[#f5f4f0]/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        PR-{order.id.toString().padStart(4, '0')}
                      </td>
                      <td className="py-3 px-4 min-w-[240px]">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {order.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                            <Tag className="w-2.5 h-2.5" />
                            {cat}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{order.department}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          ₹{Number(order.estimated_budget || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Qty: {order.quantity} units
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                          order.urgency === 'Critical'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : order.urgency === 'High'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {order.urgency}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${stage.color}`}>
                          {stage.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold bg-[#f3f2ec] text-slate-800 border border-[#e8e6df]">
                          <Gavel className="w-3 h-3 text-slate-500" />
                          {order.bids_count ?? (order.bids?.length || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectPrForBids(order.id)}
                            className="btn-secondary text-[11px] py-1 px-2.5"
                            title="View Active Bids for this Order"
                          >
                            <Gavel className="w-3 h-3 text-slate-600" />
                            <span>Bids</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectPrForComparison(order.id)}
                            className="btn-primary text-[11px] py-1 px-2.5"
                            title="Open Vendor Comparison Matrix & AI Negotiation"
                          >
                            <Users className="w-3 h-3" />
                            <span>Compare</span>
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
