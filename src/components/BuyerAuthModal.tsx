import React, { useState, useEffect } from 'react';
import {
  X, Phone, Lock, Eye, EyeOff, CheckCircle2,
  AlertCircle, Calendar, ChevronRight, ShoppingBag, User, ShieldCheck, MessageCircle
} from 'lucide-react';
import { api } from '../services/api.ts';
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
  const isEn = currentLang === 'en';
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot'>('signin');
  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem('crm_remember_buyer') || '';
    } catch {
      return '';
    }
  });
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const validatePhoneInput = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return isEn ? 'Please enter your phone number.' : 'Nyabuneka shyiramo numero ya telefone.';
    }
    if (trimmed.includes('@')) {
      return isEn
        ? 'Email sign-in is disabled. Please enter your phone number.'
        : 'Kwinjira na imeyili ntibyemewe. Nyabuneka shyiramo numero ya telefone.';
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      return isEn
        ? 'Please enter a valid phone number (e.g. 0780 022 600).'
        : 'Nyabuneka shyiramo numero ya telefone yuzuye (urugero: 0780 022 600).';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const phoneErr = validatePhoneInput(phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    if (mode === 'forgot') {
      setSuccessMsg(
        isEn
          ? `To reset the password for ${phone.trim()}, please contact ContactReach Support via WhatsApp (+250 780 022 600).`
          : `Kugira ngo usubiremo ijambo ry'ibanga kuri ${phone.trim()}, vugana n'ubuyobozi kuri WhatsApp (+250 780 022 600).`
      );
      return;
    }

    if (!password) {
      setError(isEn ? 'Please enter your password.' : 'Nyabuneka shyiramo ijambo ry\'ibanga.');
      return;
    }

    if (mode === 'register') {
      if (name.trim().length < 2) {
        setError(isEn ? 'Please enter your full name (at least 2 characters).' : 'Nyabuneka shyiramo amazina yawe yose.');
        return;
      }
      if (password.length < 6) {
        setError(
          isEn
            ? 'Your password must be at least 6 characters long.'
            : 'Ijambo ry\'ibanga rigomba kugira nibura inyuguti cyangwa imibare 6.'
        );
        return;
      }
      if (password !== confirmPassword) {
        setError(isEn ? 'Passwords do not match.' : 'Amagambo y\'ibanga ntabwo ahura.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const res = await api.buyerLogin({
          phone: phone.trim(),
          password
        });
        try {
          if (rememberMe) {
            localStorage.setItem('crm_remember_buyer', phone.trim());
          } else {
            localStorage.removeItem('crm_remember_buyer');
          }
        } catch {}
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.buyerRegister({
          name: name.trim(),
          phone: phone.trim(),
          password
        });
        try {
          localStorage.setItem('crm_remember_buyer', phone.trim());
        } catch {}
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || (isEn ? 'Authentication failed. Please try again.' : 'Habaye ikosa. Ongera ugerageze.'));
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

        {/* LEFT FORM COLUMN */}
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
                  ContactReach Market
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
                {mode === 'signin' && (isEn ? 'Buyer Sign In' : 'Injira muri Konti !')}
                {mode === 'register' && (isEn ? 'Create Buyer Account' : 'Fungura Konti Nshya !')}
                {mode === 'forgot' && (isEn ? 'Password Assistance' : 'Subiramo Ijambo ry\'ibanga')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'signin' && (
                  isEn
                    ? 'Sign in with your phone number and password to shop, track orders, and chat across devices.'
                    : 'Injira ukoresheje numero ya telefone n\'ijambo ry\'ibanga ukomeze guhaha.'
                )}
                {mode === 'register' && (
                  isEn
                    ? 'Register with your phone number and choose a password to save your orders & profile across devices.'
                    : 'Iyandikishe na numero ya telefone uhitemo ijambo ry\'ibanga ryawe.'
                )}
                {mode === 'forgot' && (
                  isEn
                    ? 'Enter your registered phone number to request password reset support.'
                    : 'Andika nimero ya telefone wakoresheje wiyandikisha.'
                )}
              </p>
            </div>

            {/* Mode Switch Pills */}
            {mode !== 'forgot' && (
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isEn ? 'Sign In' : 'Injira'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isEn ? 'Create Account' : 'Iyandikishe'}
                </button>
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
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="font-medium">{successMsg}</span>
                </div>
                <a
                  href={`https://wa.me/250780022600?text=${encodeURIComponent(`Hello ContactReach Market Support, please help reset the buyer password for phone number: ${phone.trim()}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Message Support on WhatsApp' : 'Vugana na Support kuri WhatsApp'}</span>
                </a>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Full Name *' : 'Amazina yawe yose *'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="e.g. Thierry Maniriho"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Field 1: Phone Number ONLY */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Phone Number *' : 'Numero ya telefone *'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder="e.g. 0780 022 600"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {mode === 'register'
                      ? (isEn ? 'Choose a Password (min. 6 characters) *' : 'Hitamo ijambo ry\'ibanga (nibura 6) *')
                      : (isEn ? 'Password *' : 'Ijambo ry\'ibanga *')}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={mode === 'register' ? 6 : 1}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      placeholder={mode === 'register' ? (isEn ? 'Create a strong password' : 'Andika ijambo ry\'ibanga rishya') : (isEn ? 'Enter your password' : 'Andika ijambo ry\'ibanga')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'register' && password.length > 0 && (
                    <p className={`text-[10px] mt-1 font-semibold ${password.length >= 6 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {password.length >= 6
                        ? (isEn ? '✓ Password length looks good' : '✓ Ijambo ry\'ibanga rihagije')
                        : (isEn ? `Need ${6 - password.length} more character(s)` : `Ongeraho inyuguti ${6 - password.length}`)}
                    </p>
                  )}
                </div>
              )}

              {/* Confirm Password in Register Mode */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Confirm Password *' : 'Emeza ijambo ry\'ibanga *'}
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder={isEn ? 'Re-enter your password' : 'Subiramo ijambo ry\'ibanga'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 font-medium"
                    />
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
                    <span>{isEn ? 'Keep me signed in' : 'Komeza mbe ndi muri konti'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[#f95700] hover:text-orange-700 font-bold transition-colors cursor-pointer text-[11px]"
                  >
                    {isEn ? 'Forgot password?' : 'Wibagiwe ijambo ry\'ibanga?'}
                  </button>
                </div>
              )}

              {/* Primary Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-5 bg-[#f95700] hover:bg-[#ea4e00] text-white text-sm font-extrabold rounded-xl shadow-md shadow-orange-500/25 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>
                    {mode === 'signin' && (isEn ? 'Sign In' : 'Injira')}
                    {mode === 'register' && (isEn ? 'Create Account' : 'Iyandikishe')}
                    {mode === 'forgot' && (isEn ? 'Request Support' : 'Saba Ubufasha')}
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Links */}
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-1.5 text-center text-xs">
            {mode === 'signin' ? (
              <p className="text-slate-600 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="text-[#f95700] hover:text-orange-700 font-bold underline cursor-pointer"
                >
                  {isEn ? 'New to ContactReach? Create an account.' : 'Nta Konti Ufite? Iyandikishe.'}
                </button>
              </p>
            ) : (
              <p className="text-slate-600 text-[11px]">
                {isEn ? 'Already have an account?' : 'Ufite konti isanzwe?'}{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-[#f95700] hover:text-orange-700 font-bold underline cursor-pointer"
                >
                  {isEn ? 'Sign in here' : 'Injira hano'}
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
                <span>Gurisha kuri ContactReach Market</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Authentic ContactReach Market Banner Matching Image 5 */}
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
            <h3 className="text-2xl font-black text-white tracking-tight">
              ContactReach Market
            </h3>
            <p className="text-orange-100 text-[11px] font-semibold">
              ContactReach Market · Guhaha Byoroshye
            </p>
          </div>

          {/* Image */}
          <div className="relative z-10 flex-1 flex items-center justify-center my-3">
            <img
              src="/assets/aistudio/image_027b1349.png"
              alt="ContactReach Market Customer"
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
