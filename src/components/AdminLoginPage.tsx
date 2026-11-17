import React, { useState, useEffect, useRef } from 'react';
import {
  Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft,
  Shield, Eye, EyeOff
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AUTHORIZED_ADMIN_EMAIL, getSupabaseSession } from '../services/supabase.ts';
import { AdminUser } from '../types.ts';

interface AdminLoginPageProps {
  onLoginSuccess: (user: AdminUser, token: string) => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onLoginSuccessRef = useRef(onLoginSuccess);
  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess;
  }, [onLoginSuccess]);

  // Restore active administrator session on mount/refresh
  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const token = api.getAdminToken();
      const sbSession = await getSupabaseSession();
      const user = api.getStoredAdminUser();

      if (token || sbSession?.access_token) {
        try {
          const isValid = await api.adminCheckAuth();
          if (!active) return;
          const verifiedToken = api.getAdminToken() || sbSession?.access_token || '';
          const verifiedUser = api.getStoredAdminUser() || user;
          if (
            isValid &&
            verifiedToken &&
            verifiedUser &&
            verifiedUser.active !== false &&
            verifiedUser.email?.toLowerCase().trim() === AUTHORIZED_ADMIN_EMAIL
          ) {
            onLoginSuccessRef.current(verifiedUser, verifiedToken);
            return;
          }
        } catch {
          // Fall through to Email & Password form
        }
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
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Please enter your administrator email address and password.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (cleanEmail !== AUTHORIZED_ADMIN_EMAIL) {
      setError('Access denied: This account is not authorized to access the admin dashboard.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.adminLogin(cleanEmail, password);
      if (res && res.token && res.admin) {
        onLoginSuccessRef.current(res.admin, res.token);
      } else {
        throw new Error('Invalid authentication response.');
      }
    } catch (err: any) {
      const msg = String(err?.message || '').trim();
      if (!msg || msg.includes('api-key-not-valid') || msg.includes('auth/')) {
        setError('Invalid administrator email or password.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
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
                : 'Sign in with your authorized administrator email and password.'}
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

              {/* Email & Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter administrator email"
                      required
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs text-slate-900 outline-none"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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
                  disabled={loading}
                  className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protected by Supabase Authentication</span>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
