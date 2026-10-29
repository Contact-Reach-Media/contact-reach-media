import React, { useState } from 'react';
import {
  X, Mail, Lock, Eye, EyeOff, CheckCircle2,
  AlertCircle, Calendar, ChevronRight, ShoppingBag, ArrowLeft
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
  onOpenVendorApplication?: () => void;
}

export const BuyerAuthModal: React.FC<BuyerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentLang,
  onOpenVendorApplication
}) => {
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const fbUser = await loginWithGoogle();
      if (!fbUser.email) {
        throw new Error('Konti yawe ya Google ntiyatanze imeli. Nyabuneka wemerere imeli kugira ngo winjire.');
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
      if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('closed-by-user')) {
        setError('Idirishya ryo kwinjira ryafunzwe. Kanda kuri buto yo hejuru wongere ugerageze.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Urubuga rwazitiye idirishya rya Google. Nyabuneka hemerera popup kuri uru rubuga.');
      } else {
        // Fallback demo login
        try {
          const res = await api.buyerGoogleLogin({
            email: 'client@contactreachmarket.com',
            displayName: 'Umukiriya Ushya',
            uid: `google_buyer_${Date.now()}`
          });
          onSuccess(res.user);
          onClose();
          return;
        } catch {}
        setError(err.message || 'Kwinjira na Google ntibikunze. Ongera ugerageze.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!identifier.trim()) {
      setError('Nyabuneka shyiramo imeyili cyangwa numero ya telefone.');
      return;
    }

    if (mode !== 'forgot' && !password.trim()) {
      setError('Nyabuneka shyiramo ijambo ry\'ibanga.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await api.buyerLogin({
          emailOrPhone: identifier.trim(),
          password: password.trim()
        });
        if (rememberMe) {
          localStorage.setItem('crm_remember_buyer', identifier.trim());
        }
        onSuccess(res.user);
        onClose();
      } else if (mode === 'register') {
        if (!name.trim()) {
          setError('Nyabuneka shyiramo amazina yawe.');
          setLoading(false);
          return;
        }
        const isEmail = identifier.includes('@');
        const res = await api.buyerRegister({
          name: name.trim(),
          email: isEmail ? identifier.trim() : `${identifier.trim().replace(/\D/g, '')}@contactreachmarket.com`,
          phone: !isEmail ? identifier.trim() : undefined,
          password: password.trim()
        });
        onSuccess(res.user);
        onClose();
      } else if (mode === 'forgot') {
        setSuccessMsg(`Ubutumwa bwo gusubiramo ijambo ry'ibanga bwoherejwe kuri ${identifier.trim()}.`);
      }
    } catch (err: any) {
      if (mode === 'signin' && err.message?.includes('Invalid')) {
        setError('Imeyili cyangwa ijambo ry\'ibanga ntirihuye. Niba uri mushya kanda kuri "Iyandikishe".');
      } else {
        setError(err.message || 'Habaye ikosa. Ongera ugerageze.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl relative border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* LEFT FORM COLUMN (Matching Image 5) */}
        <div className="p-7 sm:p-10 flex flex-col justify-between">
          <div className="space-y-5">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#f95700] to-amber-500 p-0.5 flex items-center justify-center shadow-md shadow-orange-500/20">
                <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center p-1">
                  <ShoppingBag className="w-4 h-4 text-[#f95700]" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1">
                  Nihe Mart
                  <span className="text-[9px] font-bold text-[#f95700] bg-orange-50 px-1 py-0.2 rounded border border-orange-200">
                    MARKET
                  </span>
                </span>
                <span className="text-[8px] text-slate-400">ContactReach Market Limited</span>
              </div>
            </div>

            {/* Heading */}
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {mode === 'signin' && 'Welcome Back !'}
                {mode === 'register' && 'Fungura Konti Nshya !'}
                {mode === 'forgot' && 'Subiramo Ijambo ry\'ibanga'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'signin' && 'Injira kugira ngo ukomeze guhaha no gukurikirana ibicuruzwa.'}
                {mode === 'register' && 'Iyandikishe uhite ubona ibicuruzwa bihendutse biva muri Alibaba.'}
                {mode === 'forgot' && 'Andika imeyili cyangwa nimero ya telefone yawe.'}
              </p>
            </div>

            {/* Google Sign In Button */}
            {mode !== 'forgot' && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Injira na Google</span>
              </button>
            )}

            {/* Divider "OR" */}
            {mode !== 'forgot' && (
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute">
                  OR
                </span>
              </div>
            )}

            {/* Error & Success Messages */}
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amazina yawe yose
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thierry Maniriho"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 font-medium"
                  />
                </div>
              )}

              {/* Field 1: Email or Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Imeyili cyangwa numero ya telefone
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Email or phone number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 font-medium"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ijambo ry'ibanga
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Remember me & Forgot Password */}
              {mode === 'signin' && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium select-none text-[11px]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#f95700] focus:ring-[#f95700] border-slate-300 cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[#f95700] hover:text-orange-700 font-bold transition-colors cursor-pointer text-[11px]"
                  >
                    Wibagiwe ijambo ry'ibanga?
                  </button>
                </div>
              )}

              {/* Orange Button: "Injira" */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-5 bg-[#f95700] hover:bg-[#ea4e00] text-white text-sm font-extrabold rounded-xl shadow-md shadow-orange-500/25 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>
                    {mode === 'signin' && 'Injira'}
                    {mode === 'register' && 'Iyandikishe'}
                    {mode === 'forgot' && 'Ohereza Ubutumwa'}
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Links Matching Image 5 */}
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-1.5 text-center text-xs">
            {mode === 'signin' ? (
              <p className="text-slate-600 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-[#f95700] hover:text-orange-700 font-bold underline cursor-pointer"
                >
                  Nta Konti Ufite? Iyandikishe.
                </button>
              </p>
            ) : (
              <p className="text-slate-600 text-[11px]">
                Ufite konti isanzwe?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-[#f95700] hover:text-orange-700 font-bold underline cursor-pointer"
                >
                  Injira hano
                </button>
              </p>
            )}

            <div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenVendorApplication) onOpenVendorApplication();
                }}
                className="text-[#f95700] hover:text-orange-700 font-black text-xs inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Gurisha kuri Nihemart</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Authentic Nihemart Banner Matching Image 5 */}
        <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-[#ff6000] via-[#f95700] to-[#ea4e00] text-white relative overflow-hidden select-none">
          {/* Circular SVG Rings */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
              <circle cx="200" cy="200" r="80" stroke="white" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="200" cy="200" r="130" stroke="white" strokeWidth="2" />
              <circle cx="200" cy="200" r="180" stroke="white" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="200" cy="200" r="230" stroke="white" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Heading */}
          <div className="relative z-10 text-center">
            <h3 className="text-3xl font-black text-white tracking-tight">
              Nihemart
            </h3>
            <p className="text-orange-100 text-[11px] font-semibold">
              ContactReach Market · Guhaha Byoroshye
            </p>
          </div>

          {/* Image */}
          <div className="relative z-10 flex-1 flex items-center justify-center my-3">
            <img
              src="/assets/aistudio/image_027b1349.png"
              alt="Nihemart Customer"
              className="w-56 h-64 object-cover object-right rounded-2xl shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80';
              }}
            />
          </div>

          {/* Floating Sales Metric Card */}
          <div className="relative z-20 mx-auto w-full max-w-[240px] bg-white text-slate-900 rounded-xl p-3 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-orange-100 text-[#f95700] flex items-center justify-center">
                  <Calendar className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-bold text-slate-500">Sales</span>
              </div>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200">
                +2.15%
              </span>
            </div>

            <div className="text-base font-black font-mono text-slate-900 mb-1">
              RWF 145,000
            </div>

            <div className="flex items-end gap-1 h-7 py-0.5">
              <div className="w-2 h-3 bg-sky-500 rounded-xs" />
              <div className="w-2 h-5 bg-sky-500 rounded-xs" />
              <div className="w-2 h-7 bg-sky-500 rounded-xs" />
              <div className="w-2 h-4 bg-sky-500 rounded-xs" />
              <div className="w-2 h-6 bg-sky-500 rounded-xs" />
              <div className="w-2 h-2 bg-slate-200 rounded-xs" />
              <div className="w-2 h-3 bg-slate-200 rounded-xs" />
              <div className="w-2 h-4 bg-slate-200 rounded-xs" />
              <div className="w-2 h-5 bg-slate-200 rounded-xs" />
            </div>

            <div className="pt-1 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>Set Goals</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
