import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Bot,
  User,
  ArrowRight,
  TrendingDown,
  Building,
  RefreshCw,
  Search
} from 'lucide-react';
import { negotiationsAPI, prAPI } from '../../api';
import NegotiationPanel from '../negotiation/NegotiationPanel';

export default function GovNegotiations({
  user,
  initialPrId = null,
  onNavigateToTab
}) {
  const [sessions, setSessions] = useState([]);
  const [prs, setPrs] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [negotiatingPrId, setNegotiatingPrId] = useState(null);
  const [selectedNewPrId, setSelectedNewPrId] = useState(initialPrId || '');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadSessions = async () => {
    try {
      setLoading(true);
      const [sessionsData, prsData] = await Promise.all([
        negotiationsAPI.getAll(),
        prAPI.getAll()
      ]);
      const sList = Array.isArray(sessionsData) ? sessionsData : [];
      setSessions(sList);
      setPrs(Array.isArray(prsData) ? prsData : []);

      if (sList.length > 0 && !selectedSessionId) {
        setSelectedSessionId(sList[0].session_id || sList[0].id);
      }
    } catch (err) {
      console.error('Failed to load negotiation sessions:', err);
      setError('Unable to load negotiation sessions from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // When a session is selected, fetch its full detail & event transcript
  useEffect(() => {
    if (!selectedSessionId) return;
    const loadDetail = async () => {
      try {
        setDetailLoading(true);
        const data = await negotiationsAPI.getHistory(selectedSessionId);
        setSessionDetail(data);
      } catch (err) {
        console.error('Failed to fetch negotiation history:', err);
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [selectedSessionId]);

  // Start new negotiation for a PR
  const handleStartNegotiation = async (prIdToRun) => {
    const targetPrId = prIdToRun || selectedNewPrId;
    if (!targetPrId) return;
    setNegotiatingPrId(targetPrId);
    setError('');
    try {
      const resp = await negotiationsAPI.negotiate(targetPrId);
      await loadSessions();
      if (resp?.sessions?.length > 0) {
        setSelectedSessionId(resp.sessions[0].id);
      }
    } catch (err) {
      console.error('Negotiation launch failed:', err);
      setError(err?.response?.data?.detail || 'Negotiation failed to initiate.');
    } finally {
      setNegotiatingPrId(null);
    }
  };

  const filteredSessions = sessions.filter(s => {
    const title = (s.pr_title || '').toLowerCase();
    const vendor = (s.vendor_name || '').toLowerCase();
    const status = (s.status || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return title.includes(q) || vendor.includes(q) || status.includes(q);
  });

  const activeSessionObj = sessions.find(s => (s.session_id || s.id) === selectedSessionId);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e6df] pb-5">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">
            Bilateral Autonomous Contracting
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Government Negotiations
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Audit LangGraph multi-agent rounds, evaluate vendor concessions, and manage executive escalations.
          </p>
        </div>

        {/* Quick Launch Negotiation */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedNewPrId}
            onChange={(e) => setSelectedNewPrId(e.target.value)}
            className="bg-white border border-[#dcd9ce] rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm max-w-xs"
          >
            <option value="">Select PR to Negotiate...</option>
            {prs.map(p => (
              <option key={p.id} value={p.id}>
                PR-{p.id.toString().padStart(4, '0')}: {p.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!selectedNewPrId || negotiatingPrId !== null}
            onClick={() => handleStartNegotiation(selectedNewPrId)}
            className="btn-primary"
          >
            <Zap className={`w-3.5 h-3.5 ${negotiatingPrId ? 'animate-spin' : ''}`} />
            <span>{negotiatingPrId ? 'Negotiating...' : 'Run Bilateral AI'}</span>
          </button>

          <button
            type="button"
            onClick={loadSessions}
            className="btn-secondary px-2.5"
            title="Refresh Sessions"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Split Layout: Left Sessions List / Right NegotiationPanel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sessions List */}
        <div className="lg:col-span-4 enterprise-card p-4 space-y-3 bg-[#fbfbfa]">
          <div className="flex items-center justify-between pb-2 border-b border-[#e8e6df]">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono uppercase">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              Sessions ({sessions.length})
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions or vendors..."
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
              <p>No negotiation sessions found.</p>
              <p className="text-[10px] text-slate-400">Select a PR above and click "Run Bilateral AI" to start.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredSessions.map((s) => {
                const sId = s.session_id || s.id;
                const isSelected = selectedSessionId === sId;
                const isEscalated = ['ESCALATED', 'PENDING_APPROVAL', 'PENDING_GOV_APPROVAL'].includes(
                  s.status?.toUpperCase()
                );

                return (
                  <button
                    key={sId}
                    type="button"
                    onClick={() => setSelectedSessionId(sId)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 shadow-xs ring-1 ring-blue-500/20'
                        : isEscalated
                        ? 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-300 shadow-2xs'
                        : 'bg-white hover:bg-[#f5f4f0] border-[#e8e6df]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#f3f2ec] text-slate-700 font-bold border border-[#e8e6df]">
                            #{sId}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                            {s.vendor_name || 'Qualified Vendor'}
                          </span>
                          {isEscalated && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold animate-pulse">
                              Action Req
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {s.pr_title || `PR #${s.purchase_request_id}`}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                          s.status === 'ACCEPTED' || s.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : s.status === 'PENDING_VENDOR_APPROVAL'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : ['PENDING_GOV_APPROVAL', 'PENDING_APPROVAL', 'ESCALATED'].includes(s.status)
                            ? 'bg-amber-100 text-amber-900 border-amber-400'
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

                    <div className="mt-1.5 pt-1.5 border-t border-[#f0eee6] flex items-center justify-between text-[10px] font-mono text-slate-600">
                      <span>Offer: <strong className="text-slate-900">₹{Number(s.current_price || 0).toLocaleString()}</strong></span>
                      <span>SLA: <strong className="text-slate-900">{s.current_delivery_days || '--'}d</strong></span>
                      <span>Round {s.current_round ?? 0}</span>
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
              <p className="text-xs text-slate-500 font-mono">Loading negotiation transcript &amp; state...</p>
            </div>
          ) : sessionDetail ? (
            <NegotiationPanel
              session={{
                id: sessionDetail.session?.id || selectedSessionId,
                status: sessionDetail.session?.status || activeSessionObj?.status,
                current_round: sessionDetail.session?.current_round,
                current_price: sessionDetail.session?.current_price,
                current_delivery_days: sessionDetail.session?.current_delivery_days,
                pr_title: activeSessionObj?.pr_title,
                vendor_name: activeSessionObj?.vendor_name,
                escalations: sessionDetail.escalations || [],
              }}
              events={sessionDetail.events || []}
              escalations={sessionDetail.escalations || []}
              decisions={sessionDetail.decisions || []}
              govState={sessionDetail.gov_state || null}
              userRole={user?.role || 'Lead Procurement Officer'}
              onActionComplete={loadSessions}
              onRefresh={loadSessions}
            />
          ) : (
            <div className="enterprise-card p-16 text-center text-xs text-slate-500 space-y-2 bg-[#fbfbfa]">
              <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800">Select a Negotiation Session</h3>
              <p>Choose an active or past negotiation session from the list on the left to inspect its live transcript.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
