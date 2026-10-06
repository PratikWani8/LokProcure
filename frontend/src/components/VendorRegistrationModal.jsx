import React, { useState } from 'react';
import {
  X,
  Building2,
  FileCheck2,
  ShieldCheck,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { vendorRegistrationAPI } from '../api';

const BUSINESS_TYPES = [
  'Private Limited',
  'Public Limited',
  'Partnership / LLP',
  'Sole Proprietorship',
  'MSME / Startup Entity'
];

const CATEGORIES = [
  'Industrial Robotics & Automation',
  'Heavy Machinery & Fabrication',
  'Electrical & Electronic Components',
  'Precision CNC Tooling & Machining',
  'Hydraulics, Pumps & Valve Assemblies',
  'Renewable Energy & Battery Storage',
  'Safety PPE & Industrial Kits',
  'IT & Cloud Infrastructure'
];

export default function VendorRegistrationModal({ isOpen, onClose, onRegistered }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);

  const [formData, setFormData] = useState({
    company_name: '',
    business_type: 'Private Limited',
    cin_llpin: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: '',
    is_msme: false,
    msme_reg_no: '',
    is_incubator: false,
    category: 'Industrial Robotics & Automation',
    specialties: '',
    annual_turnover: 25000000,
    avg_delivery_days: 5,
    local_proximity_km: 15,
    quality_certifications: 'ISO 9001:2015, CE Marking',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: '',
    password: '',
    confirm_password: ''
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Auto-extract PAN from GSTIN if 15 chars
      if (name === 'gstin' && value.length === 15) {
        const potentialPan = value.substring(2, 12).toUpperCase();
        if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(potentialPan) && !prev.pan) {
          updated.pan = potentialPan;
        }
      }
      return updated;
    });
    setError('');
  };

  // Real-time validations
  const cleanGstin = (formData.gstin || '').trim().toUpperCase();
  const cleanPan = (formData.pan || '').trim().toUpperCase();
  const isGstinValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGstin);
  const isPanValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan);
  const isPanGstinMatched = cleanGstin.length >= 12 && cleanPan.length === 10 && cleanGstin.substring(2, 12) === cleanPan;
  const isIfscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test((formData.bank_ifsc || '').trim().toUpperCase());

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!formData.company_name.trim()) return setError('Please enter legal company name');
      if (!formData.contact_person.trim()) return setError('Please enter contact person name');
      setStep(2);
    } else if (step === 2) {
      if (!formData.email.trim() || !formData.email.includes('@')) return setError('Please enter a valid official email address');
      if (!formData.phone.trim()) return setError('Please enter contact phone');
      if (!formData.city.trim() || !formData.state.trim()) return setError('Please provide city and state');
      setStep(3);
    } else if (step === 3) {
      if (!isGstinValid) return setError('Please provide a valid 15-character GSTIN');
      if (!isPanValid) return setError('Please provide a valid 10-character PAN');
      if (!isPanGstinMatched) return setError('Statutory Mismatch: The PAN must match characters 3 to 12 of your GSTIN');
      if (!formData.bank_account_number.trim()) return setError('Bank account number is required');
      if (!isIfscValid) return setError('Please provide a valid 11-character RBI IFSC code (e.g. HDFC0001234)');
      setStep(4);
    }
  };

  const handleBack = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    if (formData.password !== formData.confirm_password) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      const payload = {
        company_name: formData.company_name.trim(),
        business_type: formData.business_type,
        cin_llpin: formData.cin_llpin.trim() || null,
        contact_person: formData.contact_person.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || `${formData.city}, ${formData.state}`,
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim() || '400001',
        gstin: cleanGstin,
        pan: cleanPan,
        is_msme: formData.is_msme,
        msme_reg_no: formData.msme_reg_no.trim() || null,
        is_incubator: formData.is_incubator,
        category: formData.category,
        specialties: formData.specialties.trim() || formData.category,
        annual_turnover: Number(formData.annual_turnover) || 0,
        avg_delivery_days: Number(formData.avg_delivery_days) || 7,
        local_proximity_km: Number(formData.local_proximity_km) || 15,
        quality_certifications: formData.quality_certifications.trim() || null,
        bank_account_number: formData.bank_account_number.trim(),
        bank_ifsc: formData.bank_ifsc.trim().toUpperCase(),
        bank_name: formData.bank_name.trim() || 'Scheduled Bank',
        password: formData.password
      };

      const res = await vendorRegistrationAPI.register(payload);
      setVerificationResult(res);
      if (onRegistered) onRegistered(res);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.detail || 'Failed to submit registration. Please verify details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Supplier Empanelment Portal</h2>
              <p className="text-xs text-slate-300">LokProcure Government & Enterprise ERP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar (when not finished) */}
        {!verificationResult && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
              <span className={step >= 1 ? 'text-blue-600 font-bold' : ''}>1. Corporate Identity</span>
              <span className={step >= 2 ? 'text-blue-600 font-bold' : ''}>2. Contact & Hub</span>
              <span className={step >= 3 ? 'text-blue-600 font-bold' : ''}>3. GSTIN & Tax KYC</span>
              <span className={step >= 4 ? 'text-blue-600 font-bold' : ''}>4. Operations & Security</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* VERIFICATION REPORT CARD (Post-Submission View) */}
          {verificationResult ? (
            <div className="space-y-5 animate-fade-in">
              <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-bold">
                        Application {verificationResult.application_number}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">
                        Registration Submitted & Verified!
                      </h3>
                      <p className="text-xs text-slate-600">
                        {verificationResult.company_name} &bull; {verificationResult.business_type}
                      </p>
                    </div>
                  </div>
                  
                  {/* Score badge */}
                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 shadow-xs">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="text-base font-black text-emerald-700 leading-none">
                          {verificationResult.verification_score}/100
                        </div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">
                          {verificationResult.verification_risk_level} Risk
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-200/60 text-xs text-slate-700 leading-relaxed">
                  <strong>Status:</strong>{' '}
                  <span className="font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                    PENDING LEAD PROCUREMENT OFFICER AUTHORIZATION
                  </span>
                  <p className="mt-2 text-slate-600">
                    Your statutory compliance credentials have been automatically validated against the Indian GSTIN/PAN database. The Lead Procurement Officer (<span className="font-semibold">Priya Sharma</span>) has been queued to perform the final database authorization.
                  </p>
                </div>
              </div>

              {/* Automated Checklist Results */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Automated Verification Matrix Checks
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(() => {
                    try {
                      const flags = JSON.parse(verificationResult.verification_flags_json || '[]');
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

              <div className="pt-2 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-semibold text-xs shadow-md transition-all"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          ) : (
            /* MULTI-STEP REGISTRATION FORM */
            <form onSubmit={step === 4 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
              
              {/* STEP 1: Corporate Profile */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Legal Business / Company Name *
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      required
                      placeholder="e.g. Apex Industrial Systems Pvt Ltd"
                      value={formData.company_name}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Legal Business Structure *
                      </label>
                      <select
                        name="business_type"
                        value={formData.business_type}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white"
                      >
                        {BUSINESS_TYPES.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        CIN / LLPIN / Registration No.
                      </label>
                      <input
                        type="text"
                        name="cin_llpin"
                        placeholder="e.g. U29253MH2021PTC364120"
                        value={formData.cin_llpin}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Authorized Contact Person *
                    </label>
                    <input
                      type="text"
                      name="contact_person"
                      required
                      placeholder="Full name of representative"
                      value={formData.contact_person}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Contact & Location */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Official Business Email (Used for Login) *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          name="email"
                          required
                          placeholder="procurement@company.com"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contact Mobile / Phone *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          name="phone"
                          required
                          placeholder="+91 98200 12345"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Factory / Office Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      placeholder="Plot / Street / Industrial Area"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                      <input
                        type="text"
                        name="city"
                        required
                        placeholder="e.g. Mumbai"
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
                      <input
                        type="text"
                        name="state"
                        required
                        placeholder="e.g. Maharashtra"
                        value={formData.state}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        name="pincode"
                        placeholder="400001"
                        value={formData.pincode}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Distance to Central Procurement Hub (km): <span className="font-bold text-blue-600">{formData.local_proximity_km} km</span>
                    </label>
                    <input
                      type="range"
                      name="local_proximity_km"
                      min="2"
                      max="120"
                      value={formData.local_proximity_km}
                      onChange={handleChange}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                      <span>2 km (Local Nearshore)</span>
                      <span>50 km (Policy Threshold)</span>
                      <span>120 km (Regional)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Tax KYC & Banking */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Goods & Services Tax ID (GSTIN) *
                      </label>
                      <input
                        type="text"
                        name="gstin"
                        required
                        maxLength={15}
                        placeholder="27AABCH1234F1Z5"
                        value={formData.gstin}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2 rounded-lg border text-xs font-mono uppercase outline-none ${
                          cleanGstin.length === 15
                            ? isGstinValid ? 'border-emerald-500 bg-emerald-50/30' : 'border-rose-400 bg-rose-50/30'
                            : 'border-slate-300'
                        }`}
                      />
                      <div className="mt-1 text-[10px] flex items-center gap-1 text-slate-500">
                        {isGstinValid ? (
                          <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Valid 15-char format (State {cleanGstin.substring(0, 2)})
                          </span>
                        ) : (
                          <span>15 Alphanumeric characters</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Permanent Account Number (PAN) *
                      </label>
                      <input
                        type="text"
                        name="pan"
                        required
                        maxLength={10}
                        placeholder="AABCH1234F"
                        value={formData.pan}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2 rounded-lg border text-xs font-mono uppercase outline-none ${
                          cleanPan.length === 10
                            ? isPanValid ? 'border-emerald-500 bg-emerald-50/30' : 'border-rose-400 bg-rose-50/30'
                            : 'border-slate-300'
                        }`}
                      />
                      <div className="mt-1 text-[10px] flex items-center gap-1 text-slate-500">
                        {isPanGstinMatched ? (
                          <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Matches GSTIN Tax Entity
                          </span>
                        ) : cleanGstin.length >= 12 && cleanPan.length === 10 ? (
                          <span className="text-rose-600 font-medium flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" /> Mismatched with GSTIN ({cleanGstin.substring(2, 12)})
                          </span>
                        ) : (
                          <span>10-character PAN</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MSME & Incubator Checkboxes */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_msme"
                        checked={formData.is_msme}
                        onChange={handleChange}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Registered as Micro, Small or Medium Enterprise (MSME / Make in India)</span>
                    </label>

                    {formData.is_msme && (
                      <div className="pl-6 pt-1">
                        <input
                          type="text"
                          name="msme_reg_no"
                          placeholder="Udyam Registration Number (UDYAM-MH-01-0029381)"
                          value={formData.msme_reg_no}
                          onChange={handleChange}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono uppercase bg-white outline-none"
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_incubator"
                        checked={formData.is_incubator}
                        onChange={handleChange}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>DPIIT Recognized Startup / Technology Incubator Hub</span>
                    </label>
                  </div>

                  {/* Banking Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name *</label>
                      <input
                        type="text"
                        name="bank_name"
                        required
                        placeholder="e.g. HDFC Bank Ltd"
                        value={formData.bank_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number *</label>
                      <input
                        type="text"
                        name="bank_account_number"
                        required
                        placeholder="Account number"
                        value={formData.bank_account_number}
                        onChange={handleChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code *</label>
                      <input
                        type="text"
                        name="bank_ifsc"
                        required
                        maxLength={11}
                        placeholder="HDFC0001234"
                        value={formData.bank_ifsc}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 rounded-lg border text-xs font-mono uppercase outline-none ${
                          formData.bank_ifsc.length === 11
                            ? isIfscValid ? 'border-emerald-500 bg-emerald-50/30' : 'border-rose-400 bg-rose-50/30'
                            : 'border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Capacity & Password */}
              {step === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Supply Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Annual Turnover (INR) *
                      </label>
                      <input
                        type="number"
                        name="annual_turnover"
                        min="100000"
                        step="100000"
                        value={formData.annual_turnover}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Committed Average Delivery Lead Time (Days) *
                      </label>
                      <input
                        type="number"
                        name="avg_delivery_days"
                        min="1"
                        max="60"
                        value={formData.avg_delivery_days}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Quality Certifications Held
                      </label>
                      <input
                        type="text"
                        name="quality_certifications"
                        placeholder="ISO 9001:2015, CE Marking, BIS"
                        value={formData.quality_certifications}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Key Specialties & Catalog Description
                    </label>
                    <textarea
                      name="specialties"
                      rows={2}
                      placeholder="e.g. Servo motors, robotic conveyor components, aerospace grade fasteners..."
                      value={formData.specialties}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 outline-none resize-none"
                    />
                  </div>

                  {/* Password Credentials */}
                  <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Portal Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          name="password"
                          required
                          placeholder="Minimum 6 characters"
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="password"
                          name="confirm_password"
                          required
                          placeholder="Re-enter password"
                          value={formData.confirm_password}
                          onChange={handleChange}
                          className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    Continue <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying Statutory Credentials...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Submit Application & Run Verification
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
