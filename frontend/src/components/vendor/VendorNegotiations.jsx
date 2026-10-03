import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  IndianRupee,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { vendorPortalAPI } from '../../api';
import NegotiationPanel from '../negotiation/NegotiationPanel';

export default function VendorNegotiations({
  user,
  initialSessionId = null
}) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await vendorPortalAPI.getNegotiations();
      const list = Array.isArray(data) ? data : [];
      setSessions(list);
      if (list.length > 0 && !selectedSessionId) {
        setSelectedSessionId(list[0].session_id);
      }
    } catch (err) {
      console.error('Failed to load vendor negotiations:', err);
      setError('Unable to load negotiation sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) return;
    const loadDetail = async () => {
      try {
        setDetailLoading(true);
        const data = await vendorPortalAPI.getNegotiationDetail(selectedSessionId);
        setSessionDetail(data);
      } catch (err) {
        console.error('Failed to load session details:', err);
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [selectedSessionId]);

  const filteredSessions = sessions.filter(s => {
    const title = (s.pr_title || '').toLowerCase();
    const status = (s.status || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return title.includes(q) || status.includes(q);
  });

  const activeSessionObj = sessions.find(s => s.session_id === selectedSessionId);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">
            Supplier Bilateral Contracting
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Vendor AI Negotiations
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Participate in real-time autonomous negotiation with government procurement agents. Inspect round settlement and execute human counter-approvals.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSessions}
          className="btn-secondary px-3"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Split Layout: Sessions List / NegotiationPanel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sessions List */}
        <div className="lg:col-span-4 enterprise-card p-4 space-y-3 bg-[#fbfbfa]">
          <div className="flex items-center justify-between pb-2 border-b border-[#e8e6df]">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono uppercase">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              Vendor Sessions ({sessions.length})
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search negotiations..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-[#dcd9ce] rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500"
            />
          </div>

          {loading ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-[11px] text-slate-500 font-mono">Loading sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 space-y-2">
              <Bot className="w-8 h-8 text-slate-400 mx-auto" />
              <p>No active negotiation sessions found.</p>
              <p className="text-[10px] text-slate-400">Negotiation sessions will appear once government buyers initiate price discovery.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredSessions.map((s) => {
                const sId = s.session_id;
                const isSelected = selectedSessionId === sId;

                return (
                  <button
                    key={sId}
                    type="button"
                    onClick={() => setSelectedSessionId(sId)}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-sm'
                        : 'bg-white hover:bg-[#f5f4f0] border-[#e8e6df]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#f3f2ec] text-slate-700 font-bold border border-[#e8e6df]">
                            #{sId}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {s.pr_title || `PR #${s.purchase_request_id}`}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                          s.status === 'ACCEPTED' || s.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : s.status === 'PENDING_VENDOR_APPROVAL'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : ['PENDING_GOV_APPROVAL', 'PENDING_APPROVAL', 'ESCALATED'].includes(s.status)
                            ? 'bg-amber-50 text-amber-900 border-amber-400'
                            : s.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : s.status === 'RESUMED'
                            ? 'bg-teal-50 text-teal-800 border-teal-300'
                            : s.status === 'NEGOTIATING'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#f0eee6] flex items-center justify-between text-[10px] font-mono text-slate-600">
                      <span>Rounds: <strong>{s.current_round ?? 0}</strong></span>
                      <span>Events: <strong>{s.event_count || 0}</strong></span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: NegotiationPanel */}
        <div className="lg:col-span-8">
          {detailLoading ? (
            <div className="enterprise-card p-16 text-center space-y-3 bg-[#fbfbfa]">
              <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-mono">Loading public negotiation transcript...</p>
            </div>
          ) : sessionDetail ? (
            <NegotiationPanel
              session={{
                id: sessionDetail.session_id || selectedSessionId,
                status: sessionDetail.status,
                current_round: sessionDetail.current_round,
                current_price: sessionDetail.current_price ?? sessionDetail.events?.[sessionDetail.events.length - 1]?.price,
                current_delivery_days: sessionDetail.current_delivery_days ?? sessionDetail.events?.[sessionDetail.events.length - 1]?.delivery_days,
                pr_title: sessionDetail.pr_title,
                vendor_name: user?.department || 'Apex Global Industrial',
                escalations: sessionDetail.escalations || [],
              }}
              events={sessionDetail.events || []}
              escalations={sessionDetail.escalations || []}
              decisions={sessionDetail.decisions || []}
              vendorState={sessionDetail.vendor_state || null}
              userRole="Vendor"
              onActionComplete={loadSessions}
              onRefresh={loadSessions}
            />
          ) : (
            <div className="enterprise-card p-16 text-center text-xs text-slate-500 space-y-2 bg-[#fbfbfa]">
              <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800">Select a Negotiation Session</h3>
              <p>Choose an active or past session from the list on the left to inspect the transcript.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
