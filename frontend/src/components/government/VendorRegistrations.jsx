import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  FileCheck2,
  X,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  Mail,
  Phone,
  CreditCard,
  Award,
  Layers,
  Check,
  AlertTriangle
} from 'lucide-react';
import { vendorRegistrationAPI } from '../../api';

export default function VendorRegistrations({ user, onNavigateToTab }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReg, setSelectedReg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Acceptance form state
  const [pricingTier, setPricingTier] = useState('Preferred Partner');
  const [initialReliability, setInitialReliability] = useState(92.0);
  const [officerComment, setOfficerComment] = useState('');
  const [rejectMode, setRejectMode] = useState(false);

  const isLeadOfficer = user?.role === 'Lead Procurement Officer' || user?.role?.includes('Admin');

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const data = await vendorRegistrationAPI.getRegistrations(
        statusFilter === 'ALL' ? null : statusFilter,
        searchQuery || null
      );
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch vendor registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRegistrations();
  };

  const handleOpenAudit = (reg) => {
    setSelectedReg(reg);
    setPricingTier(reg.assigned_tier || 'Preferred Partner');
    setInitialReliability(reg.verification_score >= 90 ? 95.0 : 90.0);
    setOfficerComment('');
    setRejectMode(false);
    setActionError('');
    setActionSuccess('');
  };

  const handleAccept = async () => {
    if (!selectedReg) return;
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const payload = {
        decision: 'APPROVE',
        pricing_tier: pricingTier,
        initial_reliability_score: Number(initialReliability),
        comment: officerComment || `Statutory credentials and capabilities verified and authorized by Lead Procurement Officer ${user?.full_name || ''}`
      };
      const res = await vendorRegistrationAPI.acceptRegistration(selectedReg.id, payload);
      setActionSuccess(res.message || 'Vendor successfully accepted and authorized on DB!');
      setTimeout(() => {
        setSelectedReg(null);
        fetchRegistrations();
      }, 1500);
    } catch (err) {
      console.error('Accept error:', err);
      setActionError(err.response?.data?.detail || 'Failed to accept vendor. Please check permissions.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReg) return;
    if (!officerComment.trim()) {
      return setActionError('Please provide a reason / rejection remark for the vendor record.');
    }
    setActionLoading(true);
    setActionError('');
    try {
      const payload = {
        decision: 'REJECT',
        comment: officerComment.trim()
      };
      await vendorRegistrationAPI.rejectRegistration(selectedReg.id, payload);
      setActionSuccess('Vendor application rejected and recorded in database.');
      setTimeout(() => {
        setSelectedReg(null);
        fetchRegistrations();
      }, 1500);
    } catch (err) {
      console.error('Reject error:', err);
      setActionError(err.response?.data?.detail || 'Failed to reject application.');
    } finally {
      setActionLoading(false);
    }
  };

  // Metric computations
  const totalCount = registrations.length;
  const pendingCount = registrations.filter((r) => r.status === 'PENDING_VERIFICATION').length;
  const approvedCount = registrations.filter((r) => r.status === 'APPROVED').length;
  const avgScore = totalCount > 0
    ? (registrations.reduce((acc, r) => acc + (r.verification_score || 0), 0) / totalCount).toFixed(1)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#fbfbfa] border border-[#e8e6df] shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center shadow-md shadow-blue-900/10 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Vendor Empanelment & Verification Queue
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Lead Procurement Officer Command
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review incoming vendor statutory credentials, automated GSTIN/PAN verification matrices, and authorize database empanelment.
            </p>
          </div>
        </div>

        {/* Lead Officer Indicator */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 shadow-2xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="font-semibold">{user?.full_name || 'Lead Officer'}</div>
            <div className="text-[10px] text-slate-500 font-mono">DB Authorization Authority</div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Awaiting Authorization</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Authorized on DB</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{approvedCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active Supplier Directory</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Verification Score</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{avgScore}%</div>
            <div className="text-[11px] text-slate-400 mt-0.5">GSTIN/PAN Tax Compliance</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Applications</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Supplier Empanelment Pool</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Registrations' },
            { id: 'PENDING_VERIFICATION', label: `Pending (${pendingCount})` },
            { id: 'APPROVED', label: `Authorized (${approvedCount})` },
            { id: 'REJECTED', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search company, GSTIN, PAN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-slate-50"
          />
        </form>
      </div>

      {/* Applications List / Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading vendor applications from database...</p>
        </div>
      ) : registrations.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No Vendor Applications Found</h3>
          <p className="text-xs text-slate-400 mt-1">There are no supplier applications matching the selected criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg) => (
            <div
              key={reg.id}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300/60 flex items-center justify-center text-slate-700 font-bold shrink-0">
                  {reg.company_name?.charAt(0) || 'V'}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{reg.company_name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {reg.application_number}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {reg.business_type}
                    </span>
                    {reg.is_msme && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                        MSME / Make-in-India
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-1.5">
                    <span><strong>Contact:</strong> {reg.contact_person} ({reg.email})</span>
                    <span>&bull;</span>
                    <span className="font-mono"><strong>GSTIN:</strong> {reg.gstin}</span>
                    <span>&bull;</span>
                    <span className="font-mono"><strong>PAN:</strong> {reg.pan}</span>
                    <span>&bull;</span>
                    <span><strong>Proximity:</strong> {reg.local_proximity_km} km ({reg.city}, {reg.state})</span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                {/* Verification Score pill */}
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{reg.verification_score}/100</span>
                  </div>
                  <div className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">
                    {reg.verification_risk_level} Risk
                  </div>
                </div>

                {/* Status badge */}
                <div>
                  {reg.status === 'APPROVED' ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                    </span>
                  ) : reg.status === 'REJECTED' ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Rejected
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 animate-pulse">
                      <Clock className="w-3.5 h-3.5" /> Pending Review
                    </span>
                  )}
                </div>

                {/* Review button */}
                <button
                  onClick={() => handleOpenAudit(reg)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all"
                >
                  <span>Audit & Authorize</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILED VERIFICATION & AUTHORIZATION MODAL */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold tracking-tight">{selectedReg.company_name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-200">
                      {selectedReg.application_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{selectedReg.business_type} &bull; {selectedReg.category}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {actionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {actionSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Status and Score Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Statutory Compliance Verification
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900">
                      {selectedReg.verification_score}/100
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedReg.verification_score >= 80
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedReg.verification_score >= 60
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedReg.verification_risk_level} Risk Rating
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    selectedReg.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : selectedReg.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {selectedReg.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Applicant Profile Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" /> Statutory KYC & Identifiers
                  </h4>
                  <div className="space-y-1 text-slate-600">
                    <div><strong>GSTIN:</strong> <span className="font-mono uppercase text-slate-800">{selectedReg.gstin}</span></div>
                    <div><strong>PAN:</strong> <span className="font-mono uppercase text-slate-800">{selectedReg.pan}</span></div>
                    <div><strong>CIN/LLPIN:</strong> <span className="font-mono text-slate-800">{selectedReg.cin_llpin || 'N/A'}</span></div>
                    <div><strong>MSME Udyam:</strong> <span className="font-mono text-slate-800">{selectedReg.msme_reg_no || (selectedReg.is_msme ? 'Claimed' : 'General')}</span></div>
                    <div><strong>Incubator / Startup:</strong> <span>{selectedReg.is_incubator ? 'Yes (DPIIT Recognized)' : 'No'}</span></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Banking & Logistics
                  </h4>
                  <div className="space-y-1 text-slate-600">
                    <div><strong>Bank:</strong> <span className="text-slate-800">{selectedReg.bank_name}</span></div>
                    <div><strong>Account No:</strong> <span className="font-mono text-slate-800">{selectedReg.bank_account_number}</span></div>
                    <div><strong>IFSC Code:</strong> <span className="font-mono uppercase text-slate-800">{selectedReg.bank_ifsc}</span></div>
                    <div><strong>Proximity:</strong> <span className="text-slate-800 font-semibold">{selectedReg.local_proximity_km} km</span> ({selectedReg.city}, {selectedReg.state})</div>
                    <div><strong>Turnover:</strong> <span className="text-slate-800 font-semibold">₹{(selectedReg.annual_turnover || 0).toLocaleString()}</span></div>
                  </div>
                </div>
              </div>

              {/* Automated Verification Checks Matrix */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Automated Verification Matrix Checks
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(() => {
                    try {
                      const flags = JSON.parse(selectedReg.verification_flags_json || '[]');
                      return flags.map((f, i) => (
                        <div key={i} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <span>{f.name}</span>
                              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1 rounded">+{f.points} pts</span>
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">{f.detail}</div>
                          </div>
                        </div>
                      ));
                    } catch (e) {
                      return <div className="text-xs text-slate-500">Verification details recorded.</div>;
                    }
                  })()}
                </div>
              </div>

              {/* Gemini AI Credibility & Audit Report */}
              {(() => {
                try {
                  const aiSummary = JSON.parse(selectedReg.ai_verification_summary || '{}');
                  if (!aiSummary.executive_summary) return null;
                  return (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/50 to-blue-50/30 border border-indigo-200 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span>Gemini AI Credibility Assessment</span>
                        </div>
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-indigo-100 text-indigo-800 font-mono">
                          {aiSummary.recommendation?.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {aiSummary.executive_summary}
                      </p>

                      {aiSummary.key_strengths?.length > 0 && (
                        <div>
                          <div className="font-bold text-emerald-900 text-[11px] mb-1">Key Verified Strengths:</div>
                          <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                            {aiSummary.key_strengths.map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiSummary.risk_flags?.length > 0 && (
                        <div>
                          <div className="font-bold text-amber-900 text-[11px] mb-1">Identified Operational Caveats:</div>
                          <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                            {aiSummary.risk_flags.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                } catch (e) {
                  return null;
                }
              })()}

              {/* LEAD PROCUREMENT OFFICER AUTHORIZATION ACTIONS */}
              {selectedReg.status === 'PENDING_VERIFICATION' && (
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      <h4 className="text-xs font-bold tracking-tight">Lead Procurement Officer Authorization</h4>
                    </div>
                    <span className="text-[10px] text-slate-300 font-mono">DB Write Authorized</span>
                  </div>

                  {!rejectMode ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">Assign Procurement Tier</label>
                          <select
                            value={pricingTier}
                            onChange={(e) => setPricingTier(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none"
                          >
                            <option value="Preferred Partner">Preferred Partner</option>
                            <option value="Tier 1 - Enterprise">Tier 1 - Enterprise</option>
                            <option value="Standard Supplier">Standard Supplier</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-300 mb-1">Initial Reliability Score (%)</label>
                          <input
                            type="number"
                            min="50"
                            max="100"
                            value={initialReliability}
                            onChange={(e) => setInitialReliability(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Authorization Remarks / Welcome Notes</label>
                        <input
                          type="text"
                          placeholder="e.g. Statutory documents verified. Authorized for manufacturing and robotics RFQs."
                          value={officerComment}
                          onChange={(e) => setOfficerComment(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs outline-none"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setRejectMode(true)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          Reject Application...
                        </button>

                        <button
                          type="button"
                          onClick={handleAccept}
                          disabled={actionLoading}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {actionLoading ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Writing to DB...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Accept & Authorize on DB
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-rose-300 font-semibold mb-1">
                          Rejection Reason (Recorded in DB & Shown to Applicant) *
                        </label>
                        <textarea
                          rows={2}
                          placeholder="State reason for non-compliance or rejection..."
                          value={officerComment}
                          onChange={(e) => setOfficerComment(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-rose-500/50 text-white text-xs outline-none resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setRejectMode(false)}
                          className="text-xs text-slate-300 hover:text-white"
                        >
                          Cancel Rejection
                        </button>

                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={actionLoading}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                        >
                          {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Already Approved Details */}
              {selectedReg.status === 'APPROVED' && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="font-bold">Authorized & Active on Database</div>
                      <div className="text-[11px] text-emerald-800">{selectedReg.reviewer_notes || 'Empaneled into active supplier directory'}</div>
                    </div>
                  </div>
                  <div className="font-mono text-emerald-800 font-semibold">Tier: {selectedReg.assigned_tier}</div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
