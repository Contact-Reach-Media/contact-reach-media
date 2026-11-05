import React, { useState } from 'react';
import { X, Lock, Mail, ShieldAlert, KeyRound, ArrowRight, ShieldCheck, CheckCircle2, HelpCircle, Phone } from 'lucide-react';
import { api } from '../services/api.ts';
import { loginWithGoogle } from '../services/firebase.ts';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (adminUser?: any) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'google'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const fbUser = await loginWithGoogle();
      if (!fbUser.email) {
        throw new Error('Google account did not provide an email address.');
      }
      const idToken = await fbUser.getIdToken();
      const res = await api.adminFirebaseLogin({
        email: fbUser.email,
        displayName: fbUser.displayName,
        uid: fbUser.uid,
        idToken
      });
      onLoginSuccess(res.admin);
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setAuthMethod('email');
        setError('Google popup sign-in is restricted by Google on preview URLs. Switched to Email & Password below to sign in instantly (no domain restriction).');
      } else {
        setError(err.message || 'Google authentication failed. Please sign in with your email & password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide your administrator email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.adminLogin(email.trim(), password);
      onLoginSuccess(res.admin);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone || !phonePassword) {
      setError('Please provide your staff phone number and password/PIN.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.adminPhoneLogin(phone.trim(), phonePassword);
      onLoginSuccess(res.admin);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Staff phone authentication failed. Please verify your phone number and PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    try {
      const msg = await api.adminResetPasswordRequest(resetEmail);
      setResetMsg(msg || 'If the email is registered, password reset instructions have been sent.');
    } catch (err: any) {
      setResetMsg('Password reset request logged. Please check with the system owner.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative border border-slate-200 flex flex-col">
        {/* Secure Top Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#121316] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-700 shadow-xs shrink-0 flex items-center justify-center p-0.5">
              <img
                src="/logo.png"
                alt="ContactReach Market"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Staff Control Panel
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                ContactReach Market RBAC Security
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showForgot ? (
            <>
              {/* Error Alert */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Sign-in Method Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('email');
                    setError(null);
                  }}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMethod === 'email'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('phone');
                    setError(null);
                  }}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMethod === 'phone'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('google');
                    setError(null);
                  }}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    authMethod === 'google'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
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
              </div>

              {/* METHOD 1: EMAIL & PASSWORD (RECOMMENDED) */}
              {authMethod === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Administrator Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@contactreachmarket.com"
                        autoComplete="email"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50/50"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-[11px] text-[#EA580C] hover:underline font-semibold cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="current-password"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50/50"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-[#EA580C] hover:bg-[#D94F04] text-white shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>{loading ? 'Authenticating...' : 'Sign In with Email & Password'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* METHOD 2: PHONE & STAFF PIN */}
              {authMethod === 'phone' && (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Registered Staff Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 0780022600 or 0792412177"
                        autoComplete="tel"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50/50 font-mono"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Enter your authorized Rwandan MTN or Airtel phone number.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Staff Password or PIN
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={phonePassword}
                        onChange={(e) => setPhonePassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50/50"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-black text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>{loading ? 'Verifying Staff Access...' : 'Sign In with Phone'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* METHOD 3: GOOGLE ONE-CLICK SIGN IN */}
              {authMethod === 'google' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    Sign in with your authorized Google administrator email.
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 hover:border-slate-400"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{loading ? 'Connecting with Google...' : 'Continue with Google Account'}</span>
                  </button>

                  <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-[11px] text-orange-900 leading-normal">
                    <strong>Note for preview environments:</strong> If your current preview domain is not in Firebase authorized domains, click the <strong>Email</strong> tab above to sign in without domain restrictions.
                  </div>
                </div>
              )}

              <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Protected by 24h JWT Session & Security Audit Trail
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 mb-1">
                  Administrator Password Reset
                </h3>
                <p className="text-xs text-slate-500">
                  Enter your registered staff email address to receive password reset authorization.
                </p>
              </div>

              {resetMsg ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{resetMsg}</span>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Staff Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@domain.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#121316] text-white font-bold text-xs hover:bg-black transition-colors"
                  >
                    Send Reset Instructions
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setResetMsg(null);
                }}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 text-center cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
