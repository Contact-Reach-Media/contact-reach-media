import React, { useState } from 'react';
import {
  Wrench, ShieldCheck, Clock, MessageCircle, Phone, Mail,
  RefreshCw, LogIn, Search, CheckCircle2, AlertTriangle, ArrowRight,
  Globe, Sparkles
} from 'lucide-react';
import { AppSettings } from '../types.ts';
import { Language } from '../translations.ts';

interface MaintenancePageProps {
  settings: AppSettings;
  onOpenAdminLogin: () => void;
  onOpenOrderTracking: () => void;
  onCheckStatus: () => void;
  currentLang: Language;
  onToggleLang: () => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  settings,
  onOpenAdminLogin,
  onOpenOrderTracking,
  onCheckStatus,
  currentLang,
  onToggleLang
}) => {
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    await onCheckStatus();
    setTimeout(() => setChecking(false), 800);
  };

  const title = settings.maintenanceTitle || (currentLang === 'en' ? "We'll Be Back Soon" : "Turagaruka Vuba Cyane");
  const defaultMessageEn = "ContactReach Market is currently undergoing planned system maintenance and performance optimizations to serve you better. All customer accounts, existing orders, and payments remain 100% safe. We will be back online shortly!";
  const defaultMessageRw = "ContactReach Market irimo gukorerwa amavugurura ateganyijwe muri gahunda yo kunoza serivisi n'ubunararibonye bwo guhaha. Konti zanyu, komande zose n'ubwishyu bitekanye ijana ku ijana. Turasubira ku murongo vuba!";
  const message = settings.maintenanceMessage || (currentLang === 'en' ? defaultMessageEn : defaultMessageRw);
  const eta = settings.maintenanceEstimatedTime;

  const phoneDisplay = settings.phone || '+250 780 022 600';
  const cleanPhone = phoneDisplay.replace(/\D/g, '');
  const whatsAppNumber = settings.whatsAppNumber || '+250780022600';
  const cleanWhatsApp = whatsAppNumber.replace(/\D/g, '');
  const email = settings.email || 'contactreachmedialimited@gmail.com';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col justify-between selection:bg-[#FF6000] selection:text-white relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[360px] bg-gradient-to-r from-orange-600/15 via-amber-500/10 to-orange-600/15 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-orange-600/10 blur-3xl pointer-events-none rounded-full" />

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="ContactReach Market"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-orange-500/30 shadow-md bg-white p-0.5 object-cover"
              onError={(e) => {
                (e.target as HTMLElement).setAttribute('src', '/public/logo-circle.png');
              }}
            />
            <div>
              <span className="font-black text-sm sm:text-base tracking-tight text-white block">
                {settings.marketName || 'ContactReach Market'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                {settings.companyName || 'ContactReach Media Ltd'} · Kigali, Rwanda
              </span>
            </div>
          </div>

          {/* Quick Actions in Navbar */}
          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <button
              onClick={onToggleLang}
              className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#FF6000]" />
              <span>{currentLang === 'en' ? 'RW' : 'EN'}</span>
            </button>

            {/* Admin Login Shortcut */}
            <button
              onClick={onOpenAdminLogin}
              className="px-3 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Access</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Maintenance Hero */}
      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center flex-1 flex flex-col justify-center items-center">
        {/* Status Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[#FF8533] text-xs font-black tracking-wide uppercase mb-6 animate-pulse shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#FF6000] shadow-[0_0_8px_#FF6000]" />
          <span>
            {currentLang === 'en' ? 'Scheduled System Maintenance' : 'Gahunda yo Kuvugurura Sisitemu'}
          </span>
        </div>

        {/* Big Illustration / Icon Container */}
        <div className="relative mb-8">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-400 p-0.5 shadow-2xl shadow-orange-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center relative">
              <Wrench className="w-11 h-11 sm:w-13 sm:h-13 text-[#FF6000] -rotate-12 animate-wiggle" />
              <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md border-2 border-slate-900">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4 max-w-2xl">
          {title}
        </h1>

        {/* Message */}
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto mb-6 font-medium">
          {message}
        </p>

        {/* ETA Badge (if configured) */}
        {eta && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800/90 border border-slate-700 text-amber-300 text-xs sm:text-sm font-semibold mb-8 shadow-inner">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="text-white">Estimated Return:</strong> {eta}
            </span>
          </div>
        )}

        {/* Primary Call-to-Actions for Visitors */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md mb-8">
          {/* Refresh / Check Status */}
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="flex-1 min-w-[160px] px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF6000] to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? (currentLang === 'en' ? 'Checking...' : 'Birimo gusuzumwa...') : (currentLang === 'en' ? 'Check If Back Online' : 'Ongera Ugerageze')}</span>
          </button>

          {/* Track Existing Order (Still accessible!) */}
          <button
            onClick={onOpenOrderTracking}
            className="flex-1 min-w-[160px] px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Search className="w-4 h-4 text-orange-400" />
            <span>{currentLang === 'en' ? 'Track My Order' : 'Kurikirana Komande'}</span>
          </button>
        </div>

        {/* Safety & Customer Guarantees Card */}
        <div className="w-full max-w-xl bg-slate-800/40 border border-slate-800 rounded-3xl p-5 mb-8 text-left backdrop-blur-xs">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6000]" />
            <span>{currentLang === 'en' ? 'Customer Assurance During Upgrade' : 'Icyizere ku Bakiriya Mu Gihe cy\'Amavugurura'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="flex items-start gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{currentLang === 'en' ? 'All existing orders in dispatch are active' : 'Komande zose zatanzwe ziri gutunganywa'}</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{currentLang === 'en' ? 'MoMo payments & tokens are secured' : 'Konti n\'ubwishyu bya MoMo birinzwe'}</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{currentLang === 'en' ? 'Support team is live on WhatsApp' : 'Ikipe ifasha iri kuri WhatsApp'}</span>
            </div>
          </div>
        </div>

        {/* Live Support Channels Box */}
        <div className="w-full max-w-xl bg-slate-900/80 border border-slate-800 rounded-3xl p-5 text-center">
          <span className="text-xs font-bold text-slate-400 block mb-3">
            {currentLang === 'en'
              ? 'Need urgent help with an ongoing order or courier delivery?'
              : 'Ukeneye ubufasha bwihuse kuri komande cyangwa ubutumwa bwihariye?'}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* WhatsApp */}
            <a
              href={`https://wa.me/${cleanWhatsApp.startsWith('250') ? cleanWhatsApp : '250' + cleanWhatsApp.slice(-9)}?text=${encodeURIComponent(
                'Hello ContactReach Support, I would like to inquire regarding my order during marketplace maintenance.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Support</span>
            </a>

            {/* Direct Call */}
            <a
              href={`tel:${phoneDisplay}`}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Phone className="w-4 h-4 text-orange-400" />
              <span>{phoneDisplay}</span>
            </a>

            {/* Email */}
            <a
              href={`mailto:${email}?subject=${encodeURIComponent('Inquiry during maintenance - ContactReach Market')}`}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Email Desk</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/80 px-4 sm:px-8 py-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {settings.companyName || 'ContactReach Media Ltd'}. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenAdminLogin}
              className="text-slate-400 hover:text-orange-400 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Administrator Sign In</span>
            </button>
            <span>·</span>
            <span className="font-mono text-[11px] text-slate-600">Fair View Plaza, Kigali</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
