import React, { useState } from 'react';
import { X, Lock, Mail, ShieldAlert, KeyRound, ArrowRight, ShieldCheck, CheckCircle2, HelpCircle, Copy, ExternalLink, Sparkles } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setUnauthorizedDomain(null);
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
        const domain = err.domain || (typeof window !== 'undefined' ? window.location.hostname : '');
        setUnauthorizedDomain(domain);
        setError('This domain is not in your Firebase Authorized Domains list.');
      } else {
        setError(err.message || 'Google authentication failed. Please make sure your account is an authorized administrator.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
              {/* Unauthorized Domain Explanatory Card */}
              {unauthorizedDomain && (
                <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-slate-800 text-xs shadow-xs animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <div className="font-extrabold text-amber-950 text-sm">
                        Firebase Authorized Domain Setup Required
                      </div>
                      <p className="text-slate-600 leading-relaxed text-xs">
                        Google Sign-In requires your current preview domain to be registered in your Firebase project (<strong>marketdatabase-1090b</strong>).
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

                      {/* 3 Step Instructions */}
                      <ol className="list-decimal list-inside space-y-1 text-slate-700 text-[11px] pt-1">
                        <li>Open Firebase Console for <strong>marketdatabase-1090b</strong></li>
                        <li>Navigate to <strong>Authentication &rarr; Settings &rarr; Authorized domains</strong></li>
                        <li>Click <strong>Add domain</strong>, paste the domain above, and click <strong>Save</strong></li>
                      </ol>

                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <a
                          href="https://console.firebase.google.com/project/marketdatabase-1090b/authentication/settings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                        >
                          <span>Open Firebase Settings</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setEmail('contactreachmedialimited@gmail.com');
                            setPassword('CRM@2026');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Fill Administrator Password</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && !unauthorizedDomain && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Fast Google Admin Sign-In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 hover:border-slate-400"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Or sign in with email & password
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                      placeholder="admin@domain.com"
                      autoComplete="username"
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
                    <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Protected by 24h JWT Session & Audit Trail
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
