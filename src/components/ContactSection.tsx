import React, { useState } from 'react';
import {
  Mail, Phone, MapPin, Clock, MessageCircle, Send, CheckCircle2,
  AlertTriangle, ShieldAlert, FileText, Search, HelpCircle, ArrowRight
} from 'lucide-react';
import { AppSettings, ProblemCategory } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';

interface ContactSectionProps {
  settings: AppSettings;
  currentLang: Language;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ settings, currentLang }) => {
  const t = translations[currentLang];
  const [activeTab, setActiveTab] = useState<'message' | 'report' | 'track-case'>('message');

  // Contact Form State
  const [msgName, setMsgName] = useState('');
  const [msgEmail, setMsgEmail] = useState('');
  const [msgPhone, setMsgPhone] = useState('');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgOrderNum, setMsgOrderNum] = useState('');
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  // Problem / Complaint Form State
  const [repName, setRepName] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repOrderNum, setRepOrderNum] = useState('');
  const [repCategory, setRepCategory] = useState<ProblemCategory>('delivery_delay');
  const [repDesc, setRepDesc] = useState('');
  const [repLoading, setRepLoading] = useState(false);
  const [generatedCaseNumber, setGeneratedCaseNumber] = useState<string | null>(null);
  const [repError, setRepError] = useState<string | null>(null);

  // Case Tracking State
  const [caseLookupNum, setCaseLookupNum] = useState('');
  const [caseLookupLoading, setCaseLookupLoading] = useState(false);
  const [caseLookupResult, setCaseLookupResult] = useState<any | null>(null);
  const [caseLookupError, setCaseLookupError] = useState<string | null>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsgError(null);
    setMsgLoading(true);

    try {
      await api.sendContactMessage({
        name: msgName,
        email: msgEmail,
        phone: msgPhone || undefined,
        subject: msgSubject || 'Inquiry',
        message: msgBody,
        orderNumber: msgOrderNum || undefined
      });
      setMsgSuccess(true);
      setMsgName('');
      setMsgEmail('');
      setMsgPhone('');
      setMsgSubject('');
      setMsgBody('');
      setMsgOrderNum('');
    } catch (err: any) {
      setMsgError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setMsgLoading(false);
    }
  };

  const handleReportProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepError(null);
    setRepLoading(true);

    try {
      const res = await api.submitProblemReport({
        customerName: repName,
        customerPhone: repPhone,
        customerEmail: repEmail || undefined,
        orderNumber: repOrderNum || undefined,
        category: repCategory,
        description: repDesc,
        priority: 'high'
      });
      setGeneratedCaseNumber(res.caseNumber);
      setRepName('');
      setRepPhone('');
      setRepEmail('');
      setRepOrderNum('');
      setRepDesc('');
    } catch (err: any) {
      setRepError(err.message || 'Failed to submit problem report. Please try again.');
    } finally {
      setRepLoading(false);
    }
  };

  const handleLookupCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseLookupNum.trim()) return;

    setCaseLookupLoading(true);
    setCaseLookupError(null);
    setCaseLookupResult(null);

    try {
      const res = await api.trackProblemReport(caseLookupNum.trim());
      setCaseLookupResult(res);
    } catch (err: any) {
      setCaseLookupError(err.message || 'Case number not found. Please verify your reference.');
    } finally {
      setCaseLookupLoading(false);
    }
  };

  const whatsappDirect = `https://wa.me/250780022600?text=${encodeURIComponent(
    'Hello ContactReach Support, I would like assistance with an order or product.'
  )}`;

  return (
    <div className="bg-[#F8F9FA] min-h-[85vh] pb-16">
      {/* 1. HERO GRADIENT BANNER */}
      <div className="bg-gradient-to-r from-[#FF6000] via-[#E24E1B] to-[#1E40AF] text-white py-14 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-xs rounded-full text-xs font-bold uppercase tracking-wider">
            Customer Care & Official Support
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            {currentLang === 'en' ? 'Contact & Customer Support' : 'Twandikire & Ubufasha'}
          </h1>
          <p className="text-xs sm:text-sm text-white/90 max-w-xl mx-auto leading-relaxed font-medium">
            {currentLang === 'en'
              ? 'Our dedicated team in Kigali is ready to assist you. Send us an inquiry, report a delivery or payment issue, or track a case.'
              : 'Twishimiye kukumva. Tuvugishe ku bibazo bya serivisi, ibicuruzwa, cyangwa ubufasha bwo kwishyura.'}
          </p>
        </div>
      </div>

      {/* 2. MAIN CONTAINER */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form Zone */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm">
            {/* Tabs for Message vs Problem vs Case Tracking */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('message');
                  setMsgSuccess(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'message'
                    ? 'bg-[#FF6000] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Send Message
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('report');
                  setGeneratedCaseNumber(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'report'
                    ? 'bg-[#EA580C] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Report a Problem
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('track-case')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === 'track-case'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Track Case
              </button>
            </div>

            {/* TAB 1: General Contact Message */}
            {activeTab === 'message' && (
              <div>
                <div className="mb-5">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    {currentLang === 'en' ? 'Send Us a Message' : 'Twohereze Ubutumwa'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Ask questions about products, bulk orders, or shop partnerships.
                  </p>
                </div>

                {msgSuccess ? (
                  <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3 animate-in fade-in">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Ubutumwa Bwoherejwe Neza!
                    </h3>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Thank you for contacting ContactReach Market. Your message has been logged in our administrator inbox. Our support team will reach out promptly.
                    </p>
                    <button
                      onClick={() => setMsgSuccess(false)}
                      className="mt-2 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 cursor-pointer"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    {msgError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{msgError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {currentLang === 'en' ? 'Your Name' : 'Amazina yawe'} *
                        </label>
                        <input
                          type="text"
                          required
                          value={msgName}
                          onChange={(e) => setMsgName(e.target.value)}
                          placeholder="e.g. Thierry Maniriho"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Phone Number (Telefoni)
                        </label>
                        <input
                          type="tel"
                          value={msgPhone}
                          onChange={(e) => setMsgPhone(e.target.value)}
                          placeholder="078... / 079..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {currentLang === 'en' ? 'Email Address' : 'Imeyili'} *
                        </label>
                        <input
                          type="email"
                          required
                          value={msgEmail}
                          onChange={(e) => setMsgEmail(e.target.value)}
                          placeholder="name@gmail.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Order Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={msgOrderNum}
                          onChange={(e) => setMsgOrderNum(e.target.value)}
                          placeholder="e.g. CRM-78291"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {currentLang === 'en' ? 'Subject' : 'Impamvu'}
                      </label>
                      <input
                        type="text"
                        value={msgSubject}
                        onChange={(e) => setMsgSubject(e.target.value)}
                        placeholder="e.g. Product availability inquiry"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {currentLang === 'en' ? 'Message' : 'Ubutumwa'} *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={msgBody}
                        onChange={(e) => setMsgBody(e.target.value)}
                        placeholder="Andika ubutumwa bwawe hano..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={msgLoading}
                      className="w-full py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm bg-[#121316] hover:bg-black text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{msgLoading ? 'Kohereza...' : (currentLang === 'en' ? 'Send Message' : 'Ohereza Ubutumwa')}</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: Customer Problem & Complaint Filing */}
            {activeTab === 'report' && (
              <div>
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-orange-600" />
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      Report a Problem or Complaint
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Submit issues regarding payments, delayed delivery, missing or damaged items, or refund requests. You will receive an official tracking Case Number.
                  </p>
                </div>

                {generatedCaseNumber ? (
                  <div className="p-8 text-center bg-orange-50 rounded-2xl border border-orange-200 space-y-3 animate-in fade-in">
                    <CheckCircle2 className="w-12 h-12 text-orange-600 mx-auto" />
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      Ikibazo cyawe cyakiriwe (Case Logged)
                    </h3>
                    <p className="text-xs text-slate-600">
                      Your issue has been assigned to our support investigation team. Please note your official case tracking reference:
                    </p>
                    <div className="inline-block px-5 py-2.5 bg-white border-2 border-orange-500 rounded-xl font-mono font-black text-base text-orange-600 shadow-sm">
                      {generatedCaseNumber}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      You can check the status of this case at any time using the "Track Case" tab.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setCaseLookupNum(generatedCaseNumber);
                          setActiveTab('track-case');
                        }}
                        className="px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl hover:bg-orange-700 cursor-pointer"
                      >
                        Track This Case Now
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleReportProblem} className="space-y-4">
                    {repError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{repError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Issue Type / Category *
                      </label>
                      <select
                        value={repCategory}
                        onChange={(e) => setRepCategory(e.target.value as ProblemCategory)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white font-semibold"
                      >
                        <option value="delivery_delay">Delivery Delay / Ikibazo cyo gutinda k'ubutumwa</option>
                        <option value="payment_issue">Mobile Money Payment Problem / Ikibazo cya MoMo</option>
                        <option value="missing_item">Missing or Incomplete Item in Package</option>
                        <option value="damaged_item">Damaged or Defective Product Received</option>
                        <option value="refund_request">Refund or Order Cancellation Request</option>
                        <option value="account_issue">Website or Order Tracking Error</option>
                        <option value="other">Other Complaint or Feedback</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Your Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={repName}
                          onChange={(e) => setRepName(e.target.value)}
                          placeholder="e.g. Jean Claude Mugisha"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Phone Number (Telefoni) *
                        </label>
                        <input
                          type="tel"
                          required
                          value={repPhone}
                          onChange={(e) => setRepPhone(e.target.value)}
                          placeholder="078... / 079..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          value={repEmail}
                          onChange={(e) => setRepEmail(e.target.value)}
                          placeholder="mugisha@gmail.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Related Order Reference #
                        </label>
                        <input
                          type="text"
                          value={repOrderNum}
                          onChange={(e) => setRepOrderNum(e.target.value)}
                          placeholder="e.g. CRM-78291"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Detailed Problem Description *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={repDesc}
                        onChange={(e) => setRepDesc(e.target.value)}
                        placeholder="Sobanura ikibazo wahuye nacyo, igihe cyabereye, cyangwa numero ya transagisiyo..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={repLoading}
                      className="w-full py-3.5 px-6 rounded-xl font-black text-xs sm:text-sm bg-orange-600 hover:bg-orange-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>{repLoading ? 'Submitting Report...' : 'Submit Problem Report & Generate Case ID'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: Case Tracking */}
            {activeTab === 'track-case' && (
              <div>
                <div className="mb-5">
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Track Customer Case Status
                  </h2>
                  <p className="text-xs text-slate-500">
                    Check the progress of your submitted support ticket or complaint.
                  </p>
                </div>

                <form onSubmit={handleLookupCase} className="flex gap-2 mb-6">
                  <input
                    type="text"
                    required
                    value={caseLookupNum}
                    onChange={(e) => setCaseLookupNum(e.target.value)}
                    placeholder="Enter Case # (e.g. CASE-4821)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono uppercase focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={caseLookupLoading}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{caseLookupLoading ? 'Searching...' : 'Lookup'}</span>
                  </button>
                </form>

                {caseLookupError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{caseLookupError}</span>
                  </div>
                )}

                {caseLookupResult && (
                  <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Case Reference</span>
                        <h4 className="font-mono font-black text-slate-900 text-base">{caseLookupResult.caseNumber}</h4>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                        caseLookupResult.status === 'Resolved' || caseLookupResult.status === 'Closed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : caseLookupResult.status === 'In Progress' || caseLookupResult.status === 'Under Review'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {caseLookupResult.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Customer</span>
                        <span className="font-bold text-slate-800">{caseLookupResult.customerName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Category</span>
                        <span className="font-bold text-slate-800 capitalize">{caseLookupResult.category?.replace('_', ' ')}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[11px]">Logged On</span>
                        <span className="font-mono text-slate-600">{new Date(caseLookupResult.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {caseLookupResult.resolution && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
                        <span className="font-bold block mb-1">Official Resolution / Response:</span>
                        <p>{caseLookupResult.resolution}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Tuvugishe with Support Details */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 mb-1">
                {currentLang === 'en' ? 'Contact Details' : 'Tuvugishe'}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                {currentLang === 'en'
                  ? 'Have questions about products, delivery fees, or payments? Ruth and our Kigali team are here to assist you.'
                  : 'Ufite ikibazo ku bicuruzwa cyangwa serivisi zacu? Itsinda ryacu rihari ngo rigufashe. Twandikire ukoresheje uburyo bwose bukurikira.'}
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Card 1: Aderesi */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">
                    {currentLang === 'en' ? 'Address' : 'Aderesi'}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Fair View Plaza, KG 622 St, Kigali, Rwanda
                  </p>
                  <span className="text-[11px] text-slate-400 block font-normal">
                    Central Distribution & Pickup Hub
                  </span>
                </div>
              </div>

              {/* Card 2: Telefoni */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <Phone className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">
                    {currentLang === 'en' ? 'Support Helpline' : 'Telefoni y\'ubufasha'}
                  </h3>
                  <a href="tel:0780022600" className="text-xs font-black text-slate-900 hover:text-[#FF6000] block">
                    0780022600 / +250 780 022 600
                  </a>
                  <span className="text-[11px] text-slate-500 block font-medium">
                    MoMo & Airtel Receiver: <strong>Ruth (0780022600 / 2328354)</strong>
                  </span>
                </div>
              </div>

              {/* Card 3: Imeyili */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <Mail className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">
                    {currentLang === 'en' ? 'Support Email' : 'Imeyili y\'ubufasha'}
                  </h3>
                  <a href="mailto:contactreachmedialimited@gmail.com" className="text-xs font-bold text-slate-800 hover:text-[#FF6000] block break-all">
                    contactreachmedialimited@gmail.com
                  </a>
                </div>
              </div>

              {/* Card 4: Amasaha y'akazi */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-3.5 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">
                    {currentLang === 'en' ? 'Working Hours' : 'Amasaha y\'akazi'}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Monday – Sunday: 8:00 AM – 9:00 PM
                  </p>
                  <span className="text-[11px] text-emerald-600 font-semibold block">
                    Same-day delivery active daily
                  </span>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Action */}
            <div className="pt-2">
              <a
                href={whatsappDirect}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Twandikire kuri WhatsApp (+250 780 022 600)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
