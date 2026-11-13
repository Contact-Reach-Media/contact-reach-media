import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, Mail, User, KeyRound, Clock, AlertCircle,
  ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle2, Phone, ShieldAlert
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AdminRole, AdminUser } from '../types.ts';

interface AdminInviteAcceptPageProps {
  token: string;
  onAcceptSuccess: (user: AdminUser, token: string) => void;
  onNavigateHome: () => void;
  onNavigateAdminLogin: () => void;
}

export const AdminInviteAcceptPage: React.FC<AdminInviteAcceptPageProps> = ({
  token,
  onAcceptSuccess,
  onNavigateHome,
  onNavigateAdminLogin
}) => {
  const [verifying, setVerifying] = useState(true);
  const [inviteStatus, setInviteStatus] = useState<'Pending' | 'Accepted' | 'Revoked' | 'Expired' | 'Invalid'>('Pending');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<{
    id: string;
    inviteeName: string;
    maskedEmail: string;
    role: AdminRole;
    expiresAt: string;
    createdAt: string;
    createdByName: string;
  } | null>(null);

  // Verification & onboarding inputs
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!token || !token.trim()) {
      setVerifying(false);
      setInviteStatus('Invalid');
      setVerifyError('No invitation token was found in this link.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    api.verifyAdminInvitationToken(token.trim())
      .then((res) => {
        if (!active) return;
        if (res.valid && res.invitation) {
          setInviteStatus('Pending');
          setInviteInfo(res.invitation);
          setName(res.invitation.inviteeName || '');
        } else {
          setInviteStatus((res.status as any) || 'Invalid');
          setVerifyError(res.error || 'This invitation link is no longer valid.');
        }
      })
      .catch((err: any) => {
        if (!active) return;
        setInviteStatus('Invalid');
        setVerifyError(err?.message || 'Unable to verify invitation link.');
      })
      .finally(() => {
        if (active) setVerifying(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const passwordHasLetter = /[a-zA-Z]/.test(password);
  const passwordHasNumOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password);
  const passwordLongEnough = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!email.trim()) {
      setSubmitError('Please enter your invited email address for verification.');
      return;
    }
    if (!verificationCode.trim() || verificationCode.trim().length < 6) {
      setSubmitError('Please enter the 6-digit verification code provided by the main administrator.');
      return;
    }
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username.trim())) {
      setSubmitError('Username must be 3–32 characters using letters, numbers, dots, underscores, or hyphens.');
      return;
    }
    if (!passwordLongEnough || !passwordHasLetter || !passwordHasNumOrSymbol) {
      setSubmitError('Password must be at least 8 characters and include both letters and a number or symbol.');
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.acceptAdminInvitation({
        token: token.trim(),
        email: email.trim(),
        verificationCode: verificationCode.trim(),
        name: name.trim() || undefined,
        username: username.trim(),
        phone: phone.trim() || undefined,
        password
      });
      if (res.token && res.admin) {
        onAcceptSuccess(res.admin, res.token);
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Verification failed. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-lg space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </button>
          <button
            onClick={onNavigateAdminLogin}
            className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors cursor-pointer"
          >
            Admin Sign In
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
          {verifying ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-9 h-9 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
              <h2 className="text-sm font-black text-slate-900">Verifying Invitation Link...</h2>
              <p className="text-xs text-slate-500">Checking single-use token authenticity and expiration.</p>
            </div>
          ) : !inviteInfo || inviteStatus !== 'Pending' ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider">
                  Invitation {inviteStatus}
                </span>
                <h1 className="text-lg font-black text-slate-900">
                  Unable to Use Invitation Link
                </h1>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  {verifyError || 'This invitation link is invalid, expired, revoked, or has already been used.'}
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={onNavigateAdminLogin}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Go to Admin Sign In
                </button>
                <button
                  onClick={onNavigateHome}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Back to Storefront
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Verify & Activate Admin Account
                </h1>
                <p className="text-xs text-slate-500">
                  Invited by <strong className="text-slate-700">{inviteInfo.createdByName}</strong>. Complete identity verification below to activate your dashboard access.
                </p>
              </div>

              {/* Invitation Metadata Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Assigned Role</span>
                  <span className="font-black text-slate-900 capitalize">{inviteInfo.role.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Invited Email Match</span>
                  <span className="font-mono font-bold text-slate-700">{inviteInfo.maskedEmail}</span>
                </div>
                <div className="sm:col-span-2 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Single-use link expires on <strong>{new Date(inviteInfo.expiresAt).toLocaleString()}</strong>
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Invited Email Address *</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Confirm invited email"
                        autoComplete="email"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-slate-900 outline-none"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">6-Digit Verification Code *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Enter 6-digit code"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 font-mono tracking-widest text-slate-900 outline-none"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-slate-900 outline-none"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Choose Admin Username *</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Letters, numbers, . _ -"
                        autoComplete="username"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-slate-900 outline-none"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contact phone number"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-slate-900 outline-none"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Create Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                        className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-slate-900 outline-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-slate-900 outline-none"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                {/* Live Password Requirements */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${passwordLongEnough ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordHasLetter && passwordHasNumOrSymbol ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Contains letters and at least one number or special character</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{submitting ? 'Verifying & Creating Account...' : 'Verify Invitation & Activate Access'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
