import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://snasyjifdrvbcjekiqyh.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_OjFoAKe3zgUtd20dPQEwEA_Z25-mgT-';
export const SUPABASE_PROJECT_ID = 'snasyjifdrvbcjekiqyh';
export const SUPABASE_PROJECT_NAME = "Contact-Reach-Media's Project";

// Initialize Supabase Client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export interface SupabaseAuthResult {
  user: any;
  session: any;
  token?: string;
}

/**
 * Sign in or sign up with Supabase using email and password
 */
export async function loginWithSupabasePassword(email: string, password: string): Promise<SupabaseAuthResult> {
  const cleanEmail = email.trim().toLowerCase();

  // Attempt login
  let { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: password
  });

  // If user does not exist in Supabase auth yet, auto-register them
  if (error && (
    error.message.includes('Invalid login credentials') ||
    error.message.includes('user_not_found') ||
    error.message.includes('Email not confirmed')
  )) {
    try {
      const signupRes = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            role: 'owner',
            name: 'ContactReach Administrator'
          }
        }
      });
      if (signupRes.data?.user) {
        data = signupRes.data as any;
        error = null;
      }
    } catch {
      // ignore signup error if signup is restricted
    }
  }

  if (error && !data?.user) {
    throw new Error(error.message || 'Supabase authentication failed');
  }

  return {
    user: data.user,
    session: data.session,
    token: data.session?.access_token
  };
}

/**
 * Sign in using Supabase Google OAuth (domain-independent)
 */
export async function loginWithSupabaseGoogle(): Promise<void> {
  const redirectUrl = typeof window !== 'undefined'
    ? window.location.origin
    : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });

  if (error) {
    throw new Error(error.message || 'Supabase Google sign-in failed');
  }
}

/**
 * Get current Supabase session
 */
export async function getSupabaseSession() {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Sign out from Supabase
 */
export async function logoutSupabase(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[Supabase] Sign-out warning:', err);
  }
}
