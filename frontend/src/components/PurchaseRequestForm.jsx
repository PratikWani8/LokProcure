import React, { useState } from 'react';
import {
  PlusCircle,
  Sparkles,
  Send,
  Building,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Info,
  FileText
} from 'lucide-react';
import { prAPI } from '../api';

const DEPARTMENTS = [
  'Operations',
  'IT',
  'Supply Chain',
  'Manufacturing',
  'Engineering',
  'Facilities & MRO'
];

const CATEGORIES = [
  'Industrial Equipment',
  'Robotics & Automation',
  'Electronics & Sensors',
  'Raw Materials',
  'MRO & Logistics',
  'IT Infrastructure'
];

const URGENCIES = [
  { value: 'Low', label: 'Low (Standard 10-14 days SLA)', color: 'border-slate-300 text-slate-700' },
  { value: 'Medium', label: 'Medium (Standard 5-7 days SLA)', color: 'border-blue-200 text-blue-700' },
  { value: 'High', label: 'High (Expedited 3-4 days SLA)', color: 'border-amber-200 text-amber-700' },
  { value: 'Critical', label: 'Critical (Emergency 24-48h SLA)', color: 'border-rose-200 text-rose-700' },
];

const PRESETS = [
  {
    name: 'Rule 1: Operations CapEx > ₹1,00,000',
    title: 'High-Precision Automated Conveyor Assembly & Stamping Cell',
    desc: 'Heavy industrial automated conveyor system with integrated PLC logic controllers and high-speed optical inspection for Line #2.',
    qty: 2,
    dept: 'Operations',
    category: 'Industrial Equipment',
    urgency: 'High',
    budget: 135000,
    badge: 'Routes to Plant Head',
    policyTag: 'Compliant'
  },
  {
    name: 'Rule 2: Critical Urgency & Bulk > 500',
    title: 'Emergency Hydraulic High-Pressure Seals & Valve Packs',
    desc: 'Critical emergency overhaul kit for plant stamping presses to prevent catastrophic line downtime during peak shift.',
    qty: 600,
    dept: 'Operations',
    category: 'MRO & Logistics',
    urgency: 'Critical',
    budget: 72000,
    badge: 'Routes to VP Operations',
    policyTag: 'Compliant'
  },
  {
    name: 'Policy Test: Spend Cap Violation (₹1,85,000)',
    title: 'Plant-Wide Smart Factory Automation & Robotic Palletizer Unit',
    desc: 'Automated high-capacity robotic palletizer cell for central warehouse distribution hub.',
    qty: 1,
    dept: 'Operations',
    category: 'Robotics & Automation',
    urgency: 'High',
    budget: 185000,
    badge: 'Exceeds ₹1,50,000 Cap',
    policyTag: 'Spend Cap Alert'
  },
  {
    name: 'Policy Test: Recurring Renewal Disclosure',
    title: 'Enterprise ERP Cloud Infrastructure & Multi-Region Database Subscription',
    desc: 'Annual recurring subscription for high-availability enterprise database hosting and disaster recovery nodes.',
    qty: 1,
    dept: 'IT',
    category: 'IT Infrastructure',
    urgency: 'Medium',
    budget: 48000,
    badge: 'Renewal Clause Needed',
    policyTag: 'Disclosure Alert'
  }
];

export default function PurchaseRequestForm({ onPrCreated }) {
  const [title, setTitle] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [category, setCategory] = useState('Industrial Equipment');
  const [quantity, setQuantity] = useState(1);
  const [department, setDepartment] = useState('Operations');
  const [urgency, setUrgency] = useState('Medium');
  const [estimatedBudget, setEstimatedBudget] = useState(35000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Compute live routing rule preview
  const getRulePreview = () => {
    const budgetNum = Number(estimatedBudget) || 0;
    const qtyNum = Number(quantity) || 1;

    if (budgetNum > 100000 && department === 'Operations') {
      return {
        rule: 'Rule 1: Operations CapEx > ₹1,00,000',
        approver: 'Plant Head (Rajesh Verma)',
        color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        desc: 'High-value operational CapEx requires direct sign-off from the Plant Head.'
      };
    } else if (urgency === 'Critical' && qtyNum > 500) {
      return {
        rule: 'Rule 2: Critical Bulk Urgency (>500 units)',
        approver: 'VP Operations (Kavita Reddy)',
        color: 'bg-amber-50 border-amber-200 text-amber-800',
        desc: 'Critical urgency combined with high-volume quantity triggers executive VP Operations approval.'
      };
    } else if (budgetNum > 50000) {
      return {
        rule: 'Rule 3: High Value Purchase (> ₹50,000)',
        approver: 'Finance Director (Arjun Patel)',
        color: 'bg-blue-50 border-blue-200 text-blue-800',
        desc: 'Any expenditure exceeding ₹50,000 requires corporate financial controller audit.'
      };
    } else {
      return {
        rule: 'Rule 4: Standard Departmental Request',
        approver: 'Department Manager (Rohan Mehta)',
        color: 'bg-slate-100 border-slate-200 text-slate-700',
        desc: 'Standard operational expenditure within departmental authority limits.'
      };
    }
  };

  const currentRule = getRulePreview();

  const handleApplyPreset = (preset) => {
    setTitle(preset.title);
    setItemDescription(preset.desc);
    setQuantity(preset.qty);
    setDepartment(preset.dept);
    if (preset.category) setCategory(preset.category);
    setUrgency(preset.urgency);
    setEstimatedBudget(preset.budget);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        item_description: itemDescription.trim(),
        category: category.trim(),
        quantity: parseInt(quantity, 10),
        urgency,
        department,
        estimated_budget: parseFloat(estimatedBudget)
      };

      const created = await prAPI.create(payload);
      setSuccessData(created);
    } catch (err) {
      console.error('Failed to create PR:', err);
      setError(err.response?.data?.detail || 'Failed to submit Purchase Request. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-[#e8e6df] pb-5">
        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-bold block mb-1">
          Intelligent Purchase Initiation
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create Purchase Request (PR)
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Initiate demand specification. LokProcure will broadcast RFQ bids, evaluate autonomous RAG policy compliance against company bylaws, and dynamically route for multi-tier approval.
        </p>
      </div>

      {/* Quick Demo Presets */}
      <div className="enterprise-card p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-mono text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Quick-Fill Demo Scenarios (1-Click)
          </span>
          <span className="text-[10px] font-mono text-slate-500">Click a scenario to test specific routing &amp; compliance rules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-left p-3 rounded-lg bg-[#f5f4f0] hover:bg-[#eeebe3] border border-[#e8e6df] hover:border-[#d8d5ca] transition-colors text-xs space-y-1 group cursor-pointer shadow-sm"
            >
              <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 text-xs">
                {preset.name}
              </div>
              <div className="text-slate-500 text-[11px] line-clamp-2">{preset.title}</div>
              <div className="pt-1 flex items-center justify-between text-[10px]">
                <span className="text-slate-900 font-mono font-bold">₹{preset.budget.toLocaleString('en-IN')}</span>
                <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] uppercase font-semibold border ${
                  preset.policyTag === 'Compliant'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {preset.policyTag}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Success Modal / Compliance Banner */}
      {successData && (
        <div className="enterprise-card p-5 border-blue-200 space-y-4 animate-fade-in shadow-xl bg-[#fbfbfa]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold text-slate-900">Purchase Request Initiated Successfully</h3>
                <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-mono text-xs font-semibold">
                  PR-{successData.id.toString().padStart(4, '0')}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                RFQ bids have been broadcast to 8 qualified suppliers and the approval workflow is active.
              </p>
              <div className="pt-1.5 flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-medium">
                  Category: <strong className="text-slate-900">{successData.category || category}</strong>
                </span>
                <span className="px-2.5 py-0.5 rounded bg-[#f3f2ec] border border-[#e8e6df] text-slate-700 text-[11px]">
                  Assigned Rule: <strong className="text-slate-900">{successData.assigned_approval_rule}</strong>
                </span>
                <span className="px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium">
                  Target Approver: <strong className="text-slate-900">{successData.assigned_approver_role}</strong>
                </span>
                <span className="px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
                  Bids Received: <strong className="text-slate-900">{successData.bids_count} Suppliers</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Autonomous RAG Compliance Result Panel */}
          {successData.compliance && (
            <div className={`p-3.5 rounded-lg border ${
              successData.compliance.compliant
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            } space-y-2.5`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {successData.compliance.compliant ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  )}
                  <span className="text-xs font-bold text-slate-900">
                    {successData.compliance.compliant
                      ? 'Policy Compliance Guard: Verified Compliant'
                      : `Policy Compliance Alert: Non-Compliant (${successData.compliance.violations?.length || 1} Violations)`}
                  </span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded font-mono uppercase ${
                  successData.compliance.compliant
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {successData.compliance.compliant ? 'All Policies Met' : 'Policy Alert'}
                </span>
              </div>

              {successData.compliance.compliant ? (
                <p className="text-xs text-slate-600">
                  This request was automatically evaluated against company procurement bylaws via ChromaDB semantic vector search and verified compliant. No policy deviations or spend cap anomalies detected.
                </p>
              ) : (
                <div className="space-y-2 pt-0.5">
                  <div className="space-y-1.5">
                    {successData.compliance.violations?.map((v, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-[#fbfbfa] border border-rose-200 text-xs space-y-1 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-rose-800 flex items-center gap-1.5 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            {v.rule_name}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded font-mono uppercase ${
                            v.severity === 'High'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {v.severity} Severity
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{v.explanation}</p>
                      </div>
                    ))}
                  </div>

                  {successData.compliance.required_action && (
                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                      <strong className="text-slate-900">Required Action: </strong>
                      {successData.compliance.required_action}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setSuccessData(null);
                setTitle('');
                setItemDescription('');
              }}
              className="btn-secondary text-xs"
            >
              Create Another PR
            </button>
            <button
              type="button"
              onClick={() => onPrCreated(successData.id)}
              className="btn-primary text-xs"
            >
              <span>View Vendor Bids &amp; AI Audit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Form & Live Routing Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Input Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 enterprise-card p-5 md:p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-[#e8e6df] pb-2.5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" /> Request Specifications
          </h2>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3.5">
            {/* PR Title */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Purchase Request Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Automated High-Speed Optical Inspection Scanner"
                className="w-full bg-white border border-[#dcd9ce] rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            {/* Item Description */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Item Description &amp; Technical Specifications <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                required
                placeholder="Provide detailed technical specifications, model requirements, tolerance limits, and operational context..."
                className="w-full bg-white border border-[#dcd9ce] rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Procurement Category <span className="text-rose-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-[#dcd9ce] rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm font-medium"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Quantity & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Quantity (Units) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full bg-white border border-[#dcd9ce] rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Requesting Department <span className="text-rose-600">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-[#dcd9ce] rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estimated Budget & Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Authorized Budget (₹ INR) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={estimatedBudget}
                    onChange={(e) => setEstimatedBudget(e.target.value)}
                    required
                    className="w-full bg-white border border-[#dcd9ce] rounded-lg pl-8 pr-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Operational Urgency <span className="text-rose-600">*</span>
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full bg-white border border-[#dcd9ce] rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                >
                  {URGENCIES.map((u) => (
                    <option key={u.value} value={u.value}>{u.value} SLA</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5 text-xs justify-center"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit PR &amp; Broadcast RFQ</span>
              </>
            )}
          </button>
        </form>

        {/* Right: Live Dynamic Routing Rule Card & Workflow Explanation */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Routing Engine Preview */}
          <div className="enterprise-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#e8e6df] pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600" /> Dynamic Routing Engine
              </h3>
              <span className="text-[9px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                Live Preview
              </span>
            </div>

            <div className={`p-3 rounded-lg border ${currentRule.color} space-y-1`}>
              <div className="text-[10px] font-bold uppercase tracking-wider">Triggered Policy Rule</div>
              <div className="text-xs font-bold text-slate-900">{currentRule.rule}</div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{currentRule.desc}</p>
            </div>

            <div className="p-3 rounded-lg bg-[#f5f4f0] border border-[#e8e6df] space-y-1.5 text-xs">
              <div className="text-slate-500 text-[10px] uppercase font-medium">Designated Approver Persona</div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                  {currentRule.approver[0]}
                </div>
                <div className="font-semibold text-slate-900 text-xs">{currentRule.approver}</div>
              </div>
            </div>

            <div className="border-t border-[#e8e6df] pt-2.5 space-y-1 text-[11px] text-slate-500">
              <div className="font-semibold text-slate-700 text-[10px] uppercase">Routing Hierarchy:</div>
              <ul className="space-y-1 pl-4 list-disc text-slate-600 text-[10px]">
                <li><strong className="text-slate-800">Rule 1:</strong> Budget &gt; ₹1,00,000 &amp; Operations &rarr; <strong>Plant Head</strong></li>
                <li><strong className="text-slate-800">Rule 2:</strong> Critical &amp; Qty &gt; 500 &rarr; <strong>VP Operations</strong></li>
                <li><strong className="text-slate-800">Rule 3:</strong> Budget &gt; ₹50,000 &rarr; <strong>Finance Director</strong></li>
                <li><strong className="text-slate-800">Rule 4:</strong> Standard &rarr; <strong>Department Manager</strong></li>
              </ul>
            </div>
          </div>

          {/* Automated RFQ Process Box */}
          <div className="enterprise-card p-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Automated RFQ &amp; AI Audit Pipeline
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Upon PR creation, quotations are requested from 8 active suppliers across Enterprise Tier-1, Mid-Tier, and Economy Tier. 
              The system calculates composite weighted scores (Price 30, Delivery 25, Reliability 25, History 20) and sends data to <strong>Gemini 2.5 Flash</strong> for AI strategic evaluation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
