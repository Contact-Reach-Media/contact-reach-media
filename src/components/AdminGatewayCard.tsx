import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, ArrowRight, ShieldAlert, Phone } from 'lucide-react';
import { api } from '../services/api.ts';
import { loginWithGoogle } from '../services/firebase.ts';

interface AdminGatewayCardProps {
  onSuccess: (adminUser: any) => void;
  onReturnHome: () => void;
}

export const AdminGatewayCard: React.FC<AdminGatewayCardProps> = ({
  onSuccess,
  onReturnHome
}) => {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone' | 'google'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onSuccess(res.admin);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check administrator credentials.');
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
      onSuccess(res.admin);
    } catch (err: any) {
      setError(err.message || 'Staff phone authentication failed. Please verify your phone number and PIN.');
    } finally {
      setLoading(false);
    }
  };

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
      onSuccess(res.admin);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setAuthMethod('email');
        setError('Google popup sign-in is restricted by Google on preview URLs. Switched to Email & Password below to sign in instantly (no domain restriction).');
      } else {
        setError(err.message || 'Google authentication failed. Please make sure your account is an authorized administrator.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Header Badge */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6000] to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 mx-auto mb-3">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[11px] font-black uppercase tracking-wider mb-2">
            <span>ADMIN GATEWAY</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">ContactReach Admin Portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in with your authorized administrator credentials.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/50 border border-amber-600/60 text-amber-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Sign-in Method Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-2xl mb-5 text-xs font-bold border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('email');
              setError(null);
            }}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMethod === 'email'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
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
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
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
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
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

        {/* METHOD 1: EMAIL & PASSWORD */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@contactreachmarket.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#FF6000] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In with Email</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* METHOD 2: PHONE & STAFF PIN */}
        {authMethod === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Staff Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0780022600 or 0792412177"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">
                Password or PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={phonePassword}
                  onChange={(e) => setPhonePassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white shadow-lg border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying Access...</span>
              ) : (
                <>
                  <span>Sign In with Phone</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* METHOD 3: GOOGLE ONE-CLICK SIGN IN */}
        {authMethod === 'google' && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-300 text-xs">
              Sign in with your verified Google administrator account.
            </p>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loading ? 'Connecting...' : 'Sign In with Google'}</span>
            </button>

            <div className="p-3 rounded-xl bg-orange-950/40 border border-orange-600/40 text-[11px] text-orange-200 leading-normal">
              On preview environments, Google restricts popup authorization. Use <strong>Email</strong> or <strong>Phone</strong> tab above to sign in without domain restriction.
            </div>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={onReturnHome}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            &larr; Return to Customer Storefront
          </button>
        </div>
      </div>
    </div>
  );
};
