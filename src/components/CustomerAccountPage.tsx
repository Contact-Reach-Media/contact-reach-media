import React, { useState, useEffect } from 'react';
import {
  User, Package, MessageSquare, LogOut, CheckCircle2, Clock,
  Truck, AlertCircle, Send, ArrowLeft, ChevronRight, Phone,
  Mail, MapPin, RefreshCw, ShoppingBag, ShieldCheck
} from 'lucide-react';
import { CustomerUser, Order } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';
import { getProductImageDueToProduct } from '../utils/productImages.ts';

interface CustomerAccountPageProps {
  user: CustomerUser | null;
  onLogout: () => void;
  onNavigate: (view: string, params?: any) => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
}

export const CustomerAccountPage: React.FC<CustomerAccountPageProps> = ({
  user,
  onLogout,
  onNavigate,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates
}) => {
  const t = translations[currentLang] || translations.en;

  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'inbox'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMsgText, setNewMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Profile Edit fields
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editAddress, setEditAddress] = useState(user?.deliveryAddress || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditAddress(user.deliveryAddress || '');

      // Load orders for buyer
      setLoadingOrders(true);
      api.getBuyerOrders()
        .then(res => setOrders(Array.isArray(res) ? res : []))
        .catch(() => setOrders([]))
        .finally(() => setLoadingOrders(false));

      // Load messages
      setLoadingMessages(true);
      api.getBuyerMessages()
        .then(res => setMessages(Array.isArray(res) ? res : []))
        .catch(() => setMessages([]))
        .finally(() => setLoadingMessages(false));
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.updateBuyerProfile({
        name: editName.trim(),
        phone: editPhone.trim(),
        deliveryAddress: editAddress.trim()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;
    setSendingMsg(true);
    try {
      const res = await api.sendBuyerMessage(newMsgText.trim());
      setMessages(prev => [...prev, res]);
      setNewMsgText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-slate-50 min-h-screen py-16 flex flex-col items-center justify-center p-6 text-center">
        <User className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Please Sign In to View Your Account</h2>
        <p className="text-slate-500 text-sm mt-1 max-w-md">
          Access your order history, live parcel tracking, and customer support inbox.
        </p>
        <button
          onClick={() => onNavigate('login')}
          className="mt-6 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer transition-colors"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-orange-600 transition-colors font-medium cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-900">Customer Account</span>
        </nav>

        {/* User Card Header */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white font-black text-xl flex items-center justify-center shadow-xs shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {user.name || 'Valued Customer'}
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                {user.email && <span>{user.email}</span>}
                {user.phone && <span>&bull; {user.phone}</span>}
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Buyer
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200 self-end sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-b-2 border-orange-600 text-orange-600 bg-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>My Orders ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-b-2 border-orange-600 text-orange-600 bg-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Address</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'inbox'
                ? 'border-b-2 border-orange-600 text-orange-600 bg-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Inbox & Support ({messages.length})</span>
          </button>
        </div>

        {/* TAB 1: MY ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {loadingOrders ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <RefreshCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading your orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
                <Package className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">You haven't placed any orders yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Browse through thousands of products on ContactReach Market and enjoy doorstep delivery across Rwanda.
                </p>
                <button
                  onClick={() => onNavigate('shop')}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Start Shopping</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-100">
                {orders.map(ord => {
                  const firstItem = ord.items?.[0];
                  const itemImg = getProductImageDueToProduct(firstItem);
                  return (
                    <div
                      key={ord.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <img
                          src={itemImg}
                          alt={firstItem?.productName || 'Order Item'}
                          className="w-14 h-14 rounded-2xl object-cover bg-white border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-slate-900">{ord.orderNumber}</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-bold text-xs text-slate-800 truncate" title={firstItem?.productName}>
                            {firstItem?.productName} {ord.items.length > 1 ? `(+${ord.items.length - 1} more)` : ''}
                          </p>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className={`px-2 py-0.2 rounded-full font-bold ${
                              ord.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {ord.paymentStatus || 'Pending Payment'}
                            </span>
                            <span className="px-2 py-0.2 rounded-full font-bold bg-blue-100 text-blue-800">
                              {ord.deliveryStatus || ord.status || 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                        <div className="text-right">
                          <span className="font-mono font-black text-sm text-slate-900 block">
                            {formatCurrencyPrice(ord.totalAmount, currentCurrency, exchangeRates).primary}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {ord.items.length} item{ord.items.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onNavigate('track-order', { orderRef: ord.orderNumber })}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Track Delivery</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PROFILE & ADDRESS */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-5">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              Delivery Address & Contact Details
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (MTN / Airtel)</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Address (Street / Landmark)</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="e.g. Gasabo, Kimironko, Near Market"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Profile updated!
                  </span>
                )}
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: INBOX & SUPPORT */}
        {activeTab === 'inbox' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
            <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
              Direct Support & Messages
            </h3>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No messages yet. Send a message below to reach customer support.</p>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl text-xs max-w-lg ${
                      m.sender === 'admin'
                        ? 'bg-orange-50 border border-orange-200 text-orange-950 ml-0 mr-auto'
                        : 'bg-slate-900 text-white ml-auto mr-0'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-75 mb-1">
                      <span>{m.sender === 'admin' ? 'ContactReach Support' : 'You'}</span>
                      <span>{new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="leading-relaxed">{m.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-100 text-xs">
              <input
                type="text"
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                placeholder="Type your message or question about an order..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs"
              />
              <button
                type="submit"
                disabled={sendingMsg || !newMsgText.trim()}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
