import React, { useState } from 'react';
import {
  X, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight,
  ShoppingBag, Truck, MapPin, Sparkles, RefreshCw, Copy, ExternalLink, Phone, User
} from 'lucide-react';
import { api } from '../services/api.ts';
import { loginWithGoogle } from '../services/firebase.ts';
import { CustomerUser } from '../types.ts';
import { Language } from '../translations.ts';

interface BuyerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: CustomerUser) => void;
  currentLang: Language;
}

export const BuyerAuthModal: React.FC<BuyerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentLang
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [authMode, setAuthMode] = useState<'google' | 'phone'>('google');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerName, setBuyerName] = useState('');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setUnauthorizedDomain(null);
    setLoading(true);
    try {
      const fbUser = await loginWithGoogle();
      if (!fbUser.email) {
        throw new Error(
          currentLang === 'en'
            ? 'Your Google account did not share an email address. Please allow email access to sign in.'
            : 'Konti yawe ya Google ntiyatanze imeli. Nyabuneka wemerere imeli kugira ngo winjire.'
        );
      }

      const idToken = await fbUser.getIdToken();
      const res = await api.buyerGoogleLogin({
        email: fbUser.email,
        displayName: fbUser.displayName,
        uid: fbUser.uid,
        photoURL: fbUser.photoURL,
        phoneNumber: fbUser.phoneNumber,
        idToken
      });

      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        const domain = err.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
        setUnauthorizedDomain(domain);
        setError(
          currentLang === 'en'
            ? 'This domain requires authorization in Firebase Console for Google Sign-In.'
            : 'Uru rubuga rukeneye kwemezwa muri Firebase kugira ngo ukoreshe Google.'
        );
      } else if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('closed-by-user')) {
        setError(
          currentLang === 'en'
            ? 'Sign in popup was closed. Click the button below to try again.'
            : 'Idirishya ryo kwinjira ryafunzwe. Kanda kuri buto yo hasi wongere ugerageze.'
        );
      } else if (err.code === 'auth/popup-blocked') {
        setError(
          currentLang === 'en'
            ? 'Browser blocked the Google popup. Please allow popups for this site and retry.'
            : 'Urubuga rwazitiye idirishya rya Google. Nyabuneka hemerera popup kuri uru rubuga.'
        );
      } else {
        setError(
          err.message ||
            (currentLang === 'en'
              ? 'Google sign-in could not be completed. Please try again.'
              : 'Kwinjira na Google ntibikunze. Ongera ugerageze.')
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerPhone.trim()) {
      setError(
        currentLang === 'en'
          ? 'Please enter your phone number (e.g., 0780022600).'
          : 'Nyabuneka andika nimero yawe ya terefone.'
      );
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.buyerPhoneLogin(buyerPhone.trim(), buyerName.trim() || undefined);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Phone sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative border border-slate-200 flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Visual Emblem */}
        <div className="text-center pt-2 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 via-[#FF6000] to-amber-500 p-0.5 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-orange-500/20">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center p-2.5">
              <img
                src="/logo.png"
                alt="ContactReach Market"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {currentLang === 'en' ? 'Sign In to ContactReach' : 'Injira muri ContactReach Market'}
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
            {currentLang === 'en'
              ? 'Fast, 1-click Google authentication for seamless ordering, address autosave, and live order tracking.'
              : 'Kwinjira byihuse kandi bishyitse na Google kugira ngo ukurikirane komande kandi ubike aho utuye.'}
          </p>
        </div>

        {/* Unauthorized Domain Guide Card */}
        {unauthorizedDomain && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-slate-800 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="font-extrabold text-amber-950 text-sm">
                  {currentLang === 'en' ? 'Firebase Authorized Domain Required' : 'Uru rubuga rukeneye kwemezwa'}
                </div>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {currentLang === 'en'
                    ? 'To enable Google Sign-In, this preview domain must be added to your Firebase project (marketdatabase-1090b).'
                    : 'Kugira ngo ukoreshe Google, uru rubuga rugomba kongerwa muri poroje yawe ya Firebase.'}
                </p>

                {/* Domain Copy Box */}
                <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-amber-200 font-mono text-[11px] text-slate-800">
                  <span className="truncate select-all">{unauthorizedDomain}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(unauthorizedDomain);
                      setCopiedDomain(true);
                      setTimeout(() => setCopiedDomain(false), 2500);
                    }}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg shrink-0 transition-colors cursor-pointer text-[10px] flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedDomain ? 'Copied!' : 'Copy Domain'}</span>
                  </button>
                </div>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <a
                    href="https://console.firebase.google.com/project/marketdatabase-1090b/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                  >
                    <span>Firebase Settings</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setAuthMode('phone')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#FF6000]" />
                    <span>{currentLang === 'en' ? 'Use Phone / MoMo Instead' : 'Koresha Terefone / MoMo'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Standard Error Alert (Non-domain) */}
        {error && !unauthorizedDomain && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold leading-snug">{error}</p>
              <button
                type="button"
                onClick={authMode === 'google' ? handleGoogleSignIn : () => setError(null)}
                className="mt-1.5 text-rose-800 font-extrabold underline flex items-center gap-1 hover:text-rose-950 cursor-pointer text-[11px]"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{currentLang === 'en' ? 'Try Again' : 'Ongera Ugerageze'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setAuthMode('google')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'google' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('phone')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'phone' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-[#FF6000]" />
            <span>{currentLang === 'en' ? 'Phone / MoMo' : 'Terefone'}</span>
          </button>
        </div>

        {authMode === 'google' ? (
          /* Google Sign-In Action */
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-slate-300 rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#FF6000] border-t-transparent rounded-full animate-spin" />
                  <span className="font-extrabold text-slate-700">
                    {currentLang === 'en' ? 'Connecting with Google...' : 'Guhuza na Google...'}
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="text-slate-900 font-extrabold">
                    {currentLang === 'en' ? 'Continue with Google' : 'Komeza ukoresheje Google'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
                </>
              )}
            </button>
          </div>
        ) : (
          /* Phone / MoMo Sign-In Form */
          <form onSubmit={handlePhoneSignIn} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {currentLang === 'en' ? 'MTN / Airtel Phone Number *' : 'Nimero ya Terefone (MTN / Airtel) *'}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="0780 022 600"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#FF6000] bg-slate-50/50"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {currentLang === 'en' ? 'Your Name (Optional)' : 'Amazina yawe (Bihitamo)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="e.g. Jean Damascene"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#FF6000] bg-slate-50/50"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#FF6000] hover:bg-[#E05300] text-white rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? (currentLang === 'en' ? 'Signing in...' : 'Kwinjira...') : (currentLang === 'en' ? 'Sign In with Phone' : 'Injira na Terefone')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Value Proposition Highlights */}
        <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span>
              {currentLang === 'en'
                ? 'No passwords to remember or forget'
                : 'Nta magambobanga yo kwibuka cyangwa kwibagirwa'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-orange-100 text-[#FF6000] flex items-center justify-center shrink-0">
              <Truck className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span>
              {currentLang === 'en'
                ? 'Instant real-time tracking for all your orders'
                : 'Gukurikirana komande zawe mu buryo bw\'ako kanya'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span>
              {currentLang === 'en'
                ? 'Autosave your Kigali delivery address for fast checkout'
                : 'Bika aho utuye muri Kigali kugira ngo uhite ugura vuba'}
            </span>
          </div>
        </div>

        {/* Security Assurance */}
        <div className="mt-5 p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {currentLang === 'en'
              ? 'Protected by Google Firebase Zero-Trust Security'
              : 'Birasigaswe n\'umutekano w\'ikitegererezo wa Google'}
          </span>
        </div>
      </div>
    </div>
  );
};
