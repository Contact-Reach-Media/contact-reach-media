import React, { useState, useEffect, useRef } from 'react';
import {
  Lock, User, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft,
  Shield, Eye, EyeOff
} from 'lucide-react';
import { api } from '../services/api.ts';
import { getSupabaseSession, loginWithSupabaseGoogle, logoutSupabase } from '../services/supabase.ts';
import { AdminUser } from '../types.ts';

const AUTHORIZED_ADMIN_EMAIL = 'contactreachmedialimited@gmail.com';
const OAUTH_PENDING_KEY = 'crm_admin_google_oauth_pending';

interface AdminLoginPageProps {
  onLoginSuccess: (user: AdminUser, token: string) => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasOAuthReturn =
      sessionStorage.getItem(OAUTH_PENDING_KEY) === '1' ||
      window.location.search.includes('oauth=1') ||
      window.location.search.includes('code=') ||
      window.location.hash.includes('access_token=');
    return Boolean(api.getAdminToken()) || hasOAuthReturn;
  });
  const [error, setError] = useState<string | null>(null);

  const onLoginSuccessRef = useRef(onLoginSuccess);
  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess;
  }, [onLoginSuccess]);

  // Restore saved admin session OR complete Google OAuth verification
  useEffect(() => {
    let active = true;

    const cleanOAuthUrl = () => {
      try {
        if (typeof window !== 'undefined') {
          window.history.replaceState({ view: 'admin-login' }, '', '/admin/login');
        }
      } catch {}
    };

    const initialize = async () => {
      const token = api.getAdminToken();
      const user = api.getStoredAdminUser();

      if (token) {
        setCheckingSession(true);
        try {
          const isValid = await api.adminCheckAuth();
          if (!active) return;
          const verifiedToken = api.getAdminToken();
          const verifiedUser = api.getStoredAdminUser() || user;
          if (isValid && verifiedToken && verifiedUser && verifiedUser.active !== false) {
            onLoginSuccessRef.current(verifiedUser, verifiedToken);
            return;
          }
        } catch {
          // Fall through to normal login / OAuth check
        }
      }

      const search = typeof window !== 'undefined' ? window.location.search : '';
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const searchParams = new URLSearchParams(search);
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      const oauthErrorDesc = searchParams.get('error_description') || hashParams.get('error_description') || searchParams.get('error') || hashParams.get('error');
      const isOAuthReturn =
        (typeof window !== 'undefined' && sessionStorage.getItem(OAUTH_PENDING_KEY) === '1') ||
        search.includes('oauth=1') ||
        search.includes('code=') ||
        hash.includes('access_token=');

      if (oauthErrorDesc) {
        try { sessionStorage.removeItem(OAUTH_PENDING_KEY); } catch {}
        cleanOAuthUrl();
        if (active) {
          setError(decodeURIComponent(oauthErrorDesc));
          setCheckingSession(false);
        }
        return;
      }

      if (isOAuthReturn) {
        setCheckingSession(true);
        try {
          const session = await getSupabaseSession();
          try { sessionStorage.removeItem(OAUTH_PENDING_KEY); } catch {}
          cleanOAuthUrl();

          if (!active) return;

          if (!session?.access_token) {
            setError('Google sign-in did not return an active session. Please try again.');
            setCheckingSession(false);
            return;
          }

          const signedEmail = String(session.user?.email || '').toLowerCase().trim();
          if (signedEmail !== AUTHORIZED_ADMIN_EMAIL) {
            await logoutSupabase().catch(() => {});
            api.removeAdminToken();
            if (!active) return;
            setError(`Access denied: ${signedEmail || 'This account'} is not authorized. Only ${AUTHORIZED_ADMIN_EMAIL} can access the admin dashboard.`);
            setCheckingSession(false);
            return;
          }

          const res = await api.adminLoginWithSupabaseToken(session.access_token);
          if (!active) return;
          if (res?.token && res?.admin) {
            onLoginSuccessRef.current(res.admin, res.token);
            return;
          }
        } catch (err: any) {
          await logoutSupabase().catch(() => {});
          api.removeAdminToken();
          if (!active) return;
          setError(err?.message || `Access denied: Only ${AUTHORIZED_ADMIN_EMAIL} is authorized to access the admin dashboard.`);
        } finally {
          if (active) setCheckingSession(false);
        }
        return;
      }

      if (active) {
        setCheckingSession(false);
      }
    };

    initialize();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide your administrator email or username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.adminLogin(username.trim(), password);
      if (res && res.token && res.admin) {
        onLoginSuccessRef.current(res.admin, res.token);
      } else {
        throw new Error('Invalid authentication response.');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('api-key-not-valid') || msg.includes('auth/')) {
        setError('Invalid administrator credentials. Please check your email/username and password.');
      } else {
        setError(msg || 'Invalid administrator credentials. Please check your email/username and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      try {
        sessionStorage.setItem(OAUTH_PENDING_KEY, '1');
      } catch {}
      await loginWithSupabaseGoogle('/admin/login?oauth=1');
    } catch (err: any) {
      try {
        sessionStorage.removeItem(OAUTH_PENDING_KEY);
      } catch {}
      setError(err?.message || 'Unable to start Google Sign-In. Please check your internet connection or use email & password.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-md space-y-6">

        {/* Back to Storefront */}
        <div>
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Storefront</span>
          </button>
        </div>

        {/* Brand Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center mx-auto shadow-md">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Admin Portal
            </h1>
            <p className="text-xs text-slate-500">
              {checkingSession
                ? 'Verifying your administrator session...'
                : 'Sign in with your administrator email, username, or authorized Google account.'}
            </p>
          </div>

          {checkingSession ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-600">Verifying administrator credentials...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email/Username & Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email or Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="contactreachmedialimited@gmail.com or crmedia"
                      required
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs text-slate-900 outline-none"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      autoComplete="current-password"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs text-slate-900 outline-none"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink-0 mx-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  or
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                    <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
                  </svg>
                  <span>{googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  Restricted to {AUTHORIZED_ADMIN_EMAIL}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Secured administrator authentication</span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
