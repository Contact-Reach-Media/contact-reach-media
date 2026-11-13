import React, { useState, useEffect } from 'react';
import {
  Lock, User, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft,
  Shield
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AdminUser } from '../types.ts';

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
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(() => Boolean(api.getAdminToken()));
  const [error, setError] = useState<string | null>(null);

  // If already logged in on this device, automatically verify and enter dashboard
  useEffect(() => {
    let active = true;
    const token = api.getAdminToken();
    const user = api.getStoredAdminUser();
    if (!token) {
      setCheckingSession(false);
      return;
    }

    setCheckingSession(true);
    api.adminCheckAuth()
      .then((isValid) => {
        if (!active) return;
        const verifiedToken = api.getAdminToken();
        const verifiedUser = api.getStoredAdminUser() || user;
        if (isValid && verifiedToken && verifiedUser && verifiedUser.active !== false) {
          onLoginSuccess(verifiedUser, verifiedToken);
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide your administrator username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.adminLogin(username.trim(), password.trim());
      if (res && res.token && res.admin) {
        onLoginSuccess(res.admin, res.token);
      } else {
        throw new Error('Invalid authentication response.');
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      const msg = err?.message || '';
      if (msg.includes('api-key-not-valid') || msg.includes('auth/')) {
        setError('Invalid administrator credentials. Please check your username and password.');
      } else {
        setError(msg || 'Invalid administrator credentials. Please check your username and password.');
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
                ? 'Restoring your active administrator session...'
                : 'Enter your administrator credentials to access the control panel.'}
            </p>
          </div>

          {checkingSession ? (
            <div className="py-8 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-600">Verifying saved device session...</p>
            </div>
          ) : (
            <>
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs text-slate-900 outline-none"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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
            <span>Secured administrator authentication</span>
          </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
