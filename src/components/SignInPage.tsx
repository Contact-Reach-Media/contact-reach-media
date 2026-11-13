import React, { useState } from 'react';
import {
  Phone, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2,
  AlertCircle, Calendar, ChevronRight, ShoppingBag, User, ShieldCheck, MessageCircle
} from 'lucide-react';
import { api } from '../services/api.ts';
import { CustomerUser } from '../types.ts';
import { Language } from '../translations.ts';

interface SignInPageProps {
  onSuccess: (user: CustomerUser) => void;
  onNavigateHome: () => void;
  onOpenVendorApplication?: () => void;
  initialMode?: 'signin' | 'register' | 'forgot';
  currentLang?: Language;
}

export const SignInPage: React.FC<SignInPageProps> = ({
  onSuccess,
  onNavigateHome,
  onOpenVendorApplication,
  initialMode = 'signin',
  currentLang = 'rw'
}) => {
  const isEn = currentLang === 'en';
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot'>(initialMode);
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

  const switchMode = (nextMode: 'signin' | 'register' | 'forgot') => {
    setMode(nextMode);
    setError(null);
    setSuccessMsg(null);
  };

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

  // Form Submission
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
            ? 'Password must be at least 6 characters long.'
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
        onNavigateHome();
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
        onNavigateHome();
      }
    } catch (err: any) {
      setError(err.message || (isEn ? 'Authentication failed. Please try again.' : 'Habaye ikosa. Ongera ugerageze.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Navigation Back */}
      <div className="max-w-5xl mx-auto w-full mb-4">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#f95700] transition-colors cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Subira ku Rubuga / Back to Store</span>
        </button>
      </div>

      {/* Main Split-Screen Container */}
      <div className="max-w-5xl mx-auto w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* LEFT COLUMN: Phone & Password Sign In / Register Form */}
        <div className="p-8 sm:p-12 lg:p-14 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Top Brand Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f95700] to-amber-500 p-0.5 flex items-center justify-center shadow-md shadow-orange-500/20">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center p-1.5">
                  <img
                    src="/logo.png"
                    alt="ContactReach Market"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <ShoppingBag className="w-5 h-5 text-[#f95700]" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1">
                  ContactReach Market
                  <span className="text-[10px] font-bold text-[#f95700] bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                    MARKET
                  </span>
                </span>
                <span className="text-[9px] text-slate-400 font-medium">ContactReach Market Limited</span>
              </div>
            </div>

            {/* Heading */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {mode === 'signin' && (isEn ? 'Buyer Sign In' : 'Injira muri Konti !')}
                {mode === 'register' && (isEn ? 'Create Buyer Account' : 'Fungura Konti Nshya !')}
                {mode === 'forgot' && (isEn ? 'Password Assistance' : 'Subiramo Ijambo ry\'ibanga')}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {mode === 'signin' && (
                  isEn
                    ? 'Sign in with your phone number and password to continue shopping and tracking orders across your devices.'
                    : 'Injira ukoresheje numero ya telefone n\'ijambo ry\'ibanga ukomeze guhaha.'
                )}
                {mode === 'register' && (
                  isEn
                    ? 'Create an account with your phone number and your own password.'
                    : 'Iyandikishe na numero ya telefone uhitemo ijambo ry\'ibanga ryawe.'
                )}
                {mode === 'forgot' && (
                  isEn
                    ? 'Enter your phone number to request password reset support.'
                    : 'Andika nimero ya telefone wakoresheje wiyandikisha.'
                )}
              </p>
            </div>

            {/* Mode Switch Pills */}
            {mode !== 'forgot' && (
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className={`flex-1 py-2.5 rounded-lg transition-all cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isEn ? 'Sign In' : 'Injira'}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className={`flex-1 py-2.5 rounded-lg transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {isEn ? 'Create Account' : 'Iyandikishe'}
                </button>
              </div>
            )}

            {/* Feedback Notifications */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-2 animate-in fade-in">
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

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Full Name *' : 'Amazina yawe yose *'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="e.g. Thierry Maniriho"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 transition-all font-medium"
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
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    placeholder="e.g. 0780 022 600"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 transition-all font-mono font-semibold"
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
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={mode === 'register' ? 6 : 1}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      placeholder={mode === 'register' ? (isEn ? 'Create a strong password' : 'Andika ijambo ry\'ibanga rishya') : (isEn ? 'Enter your password' : 'Andika ijambo ry\'ibanga')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === 'register' && password.length > 0 && (
                    <p className={`text-[11px] mt-1 font-semibold ${password.length >= 6 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {password.length >= 6
                        ? (isEn ? '✓ Password length looks good' : '✓ Ijambo ry\'ibanga rihagije')
                        : (isEn ? `Need ${6 - password.length} more character(s)` : `Ongeraho inyuguti ${6 - password.length}`)}
                    </p>
                  )}
                </div>
              )}

              {/* Confirm Password */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Confirm Password *' : 'Emeza ijambo ry\'ibanga *'}
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder={isEn ? 'Re-enter your password' : 'Subiramo ijambo ry\'ibanga'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:border-[#f95700] focus:ring-2 focus:ring-orange-100 transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              {/* Remember me & Forgot Password Row */}
              {mode === 'signin' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#f95700] focus:ring-[#f95700] border-slate-300 cursor-pointer"
                    />
                    <span>{isEn ? 'Keep me signed in' : 'Komeza mbe muri konti'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[#f95700] hover:text-orange-700 font-bold transition-colors cursor-pointer"
                  >
                    {isEn ? 'Forgot password?' : 'Wibagiwe ijambo ry\'ibanga?'}
                  </button>
                </div>
              )}

              {/* Primary Solid Orange Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-[#f95700] hover:bg-[#ea4e00] text-white text-sm sm:text-base font-extrabold rounded-xl shadow-md shadow-orange-500/25 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

          {/* Bottom Navigation Links */}
          <div className="pt-6 mt-6 border-t border-slate-100 space-y-2 text-center text-xs">
            {mode === 'signin' ? (
              <p className="text-slate-600">
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-[#f95700] hover:text-orange-700 font-bold underline cursor-pointer"
                >
                  {isEn ? 'New to ContactReach? Create an account.' : 'Nta Konti Ufite? Iyandikishe.'}
                </button>
              </p>
            ) : (
              <p className="text-slate-600">
                {isEn ? 'Already have an account?' : 'Ufite konti isanzwe?'}{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
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

        {/* RIGHT COLUMN: Authentic ContactReach Market Vibrant Banner with Shopper & Sales Card */}
        <div className="hidden lg:relative lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[#ff6000] via-[#f95700] to-[#ea4e00] text-white relative overflow-hidden select-none">
          {/* Subtle concentric circular background wave rings matching Image 5 */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <svg className="w-full h-full" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="250" cy="250" r="100" stroke="white" strokeWidth="1.5" strokeDasharray="3 3" />
              <circle cx="250" cy="250" r="160" stroke="white" strokeWidth="2" />
              <circle cx="250" cy="250" r="220" stroke="white" strokeWidth="1.5" strokeDasharray="4 4" />
              <circle cx="250" cy="250" r="280" stroke="white" strokeWidth="2.5" />
              <circle cx="250" cy="250" r="340" stroke="white" strokeWidth="2" strokeDasharray="6 6" />
              <circle cx="250" cy="250" r="400" stroke="white" strokeWidth="3" />
            </svg>
          </div>

          {/* Large Bold Brand Header: ContactReach Market */}
          <div className="relative z-10 text-center pt-2">
            <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight drop-shadow-md">
              ContactReach Market
            </h2>
            <p className="text-orange-100 text-xs font-semibold mt-1">
              ContactReach Market · Guhaha Byoroshye
            </p>
          </div>

          {/* Central Smiling African Woman Customer Carrying Shopping Basket */}
          <div className="relative z-10 flex-1 flex items-center justify-center my-4">
            <div className="relative w-72 h-80 max-w-full flex items-center justify-center">
              {/* Fallback image + real uploaded art */}
              <img
                src="/assets/aistudio/image_027b1349.png"
                alt="ContactReach Market Customer"
                className="w-full h-full object-cover object-right rounded-3xl shadow-xl shadow-black/15"
                onError={(e) => {
                  // Fallback to high-resolution photo of smiling African customer with shopping bag
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80';
                }}
              />
            </div>
          </div>

          {/* Floating Glassmorphism Sales Metric Card Matching Image 5 */}
          <div className="relative z-20 mx-auto w-full max-w-xs bg-white text-slate-900 rounded-2xl p-4 shadow-2xl border border-white/60">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#f95700] flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-500">Sales</span>
              </div>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200">
                +2.15%
              </span>
            </div>

            <div className="text-xl font-black font-mono text-slate-900 mb-2">
              RWF 145,000
            </div>

            {/* Stylized Bar Chart */}
            <div className="flex items-end gap-1.5 h-10 py-1">
              <div className="w-2.5 h-5 bg-sky-500 rounded-sm" />
              <div className="w-2.5 h-8 bg-sky-500 rounded-sm" />
              <div className="w-2.5 h-10 bg-sky-500 rounded-sm" />
              <div className="w-2.5 h-7 bg-sky-500 rounded-sm" />
              <div className="w-2.5 h-9 bg-sky-500 rounded-sm" />
              <div className="w-2.5 h-4 bg-slate-200 rounded-sm" />
              <div className="w-2.5 h-5 bg-slate-200 rounded-sm" />
              <div className="w-2.5 h-6 bg-slate-200 rounded-sm" />
              <div className="w-2.5 h-8 bg-slate-200 rounded-sm" />
              <div className="w-2.5 h-5 bg-slate-200 rounded-sm" />
            </div>

            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
              <span>Set Goals</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
