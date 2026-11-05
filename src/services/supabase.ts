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

/**
 * Persist checkout order data to Supabase database
 */
export async function saveOrderToSupabase(order: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const orderRecord: Record<string, any> = {
      id: order.id || `ord-${Date.now()}`,
      order_number: order.orderNumber,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      customer_email: order.customerEmail || null,
      delivery_type: order.deliveryType || 'delivery',
      delivery_address: order.deliveryAddress,
      delivery_location: order.deliveryLocation || null,
      total_amount: order.totalAmount,
      subtotal: order.subtotal || order.totalAmount,
      delivery_fee: order.deliveryFee || 0,
      payment_method: order.paymentMethod,
      payment_status: order.paymentStatus || 'Pending Payment',
      status: order.status || 'New',
      items: order.items,
      created_at: order.createdAt || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('orders')
      .upsert(orderRecord, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] orders table upsert notice:', error.message);
      try {
        const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(orderRecord)
        });
        if (!fallbackRes.ok) {
          const errText = await fallbackRes.text();
          return { success: false, error: errText };
        }
        return { success: true };
      } catch (fErr: any) {
        return { success: false, error: fErr?.message };
      }
    }
    return { success: true, data };
  } catch (err: any) {
    console.warn('[Supabase] Save order error:', err);
    return { success: false, error: err?.message };
  }
}

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tableExists?: boolean;
  details?: any;
}> {
  try {
    const { data, error } = await supabase.from('orders').select('id').limit(1);
    if (error) {
      if (error.message.includes('relation "orders" does not exist') || error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase project successfully! Please run the SQL migration below to create the orders table.',
          tableExists: false,
          details: error
        };
      }
      return {
        success: false,
        message: `Supabase connection notice: ${error.message}`,
        tableExists: false,
        details: error
      };
    }
    return {
      success: true,
      message: 'Successfully connected to Supabase database! Orders table is active and ready.',
      tableExists: true,
      details: data
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Supabase database',
      tableExists: false,
      details: err
    };
  }
}

export async function syncAllOrdersToSupabase(orders: any[] = []): Promise<{
  success: boolean;
  syncedCount: number;
  message?: string;
}> {
  if (!orders || orders.length === 0) {
    return { success: true, syncedCount: 0, message: 'No orders to sync' };
  }

  let count = 0;
  for (const ord of orders) {
    const res = await saveOrderToSupabase(ord);
    if (res.success) count++;
  }
  return {
    success: true,
    syncedCount: count,
    message: `Successfully synchronized ${count} orders to Supabase`
  };
}

export async function syncAllAccountsToSupabase(accounts: any[] = []): Promise<{
  success: boolean;
  syncedCount: number;
  message?: string;
}> {
  try {
    let count = 0;
    for (const acc of accounts) {
      const { error } = await supabase.from('accounts').upsert({
        id: acc.id,
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        role: acc.role || 'customer'
      }, { onConflict: 'id' });
      if (!error) count++;
    }
    return { success: true, syncedCount: count };
  } catch (err: any) {
    return { success: false, syncedCount: 0, message: err?.message };
  }
}


