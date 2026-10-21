import React, { useState, useEffect } from 'react';
import {
  X, User, Phone, MapPin, Mail, Calendar, ShoppingBag,
  LogOut, ShieldCheck, CheckCircle2, ChevronRight, AlertCircle, Edit3
} from 'lucide-react';
import { CustomerUser, Order } from '../types.ts';
import { api } from '../services/api.ts';
import { Language } from '../translations.ts';

interface BuyerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: CustomerUser;
  onLogout: () => void;
  onTrackOrder: (orderNumber: string) => void;
  currentLang: Language;
}

export const BuyerAccountModal: React.FC<BuyerAccountModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onTrackOrder,
  currentLang
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');

  // Contact & Delivery details edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [phone, setPhone] = useState(user.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(user.deliveryAddress || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingOrders(true);
      api.buyerGetOrders()
        .then(data => setOrders(data))
        .catch(() => setOrders([]))
        .finally(() => setLoadingOrders(false));
      setDeliveryAddress(user.deliveryAddress || '');
      setPhone(user.phone || '');
      setErrorMsg(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setErrorMsg(null);
    try {
      const updated = await api.buyerUpdateProfile({
        phone: phone.trim(),
        deliveryAddress: deliveryAddress.trim()
      });
      user.phone = updated.phone;
      user.deliveryAddress = updated.deliveryAddress;
      setIsEditingProfile(false);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update delivery details');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative border border-slate-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Card Header */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-500 shadow-md shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF6000] to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 truncate">{user.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Google Verified</span>
              </span>
            </div>
            {user.email && (
              <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{user.email}</p>
            )}
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              <span>
                {currentLang === 'en' ? 'Customer since' : 'Yiyandikishije'}{' '}
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {currentLang === 'en' ? 'My Account Details' : 'Imyirondoro'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{currentLang === 'en' ? 'My Orders' : 'Komande Zanjye'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-[#FF6000] text-[10px] font-extrabold">
              {orders.length}
            </span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Tab 1: Profile Details */}
        {activeTab === 'profile' && (
          <div className="space-y-4 text-xs">
            {/* Account Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {currentLang === 'en' ? 'Total Orders' : 'Komande Zose'}
                </span>
                <span className="text-lg font-black text-slate-900 mt-1 block">
                  {orders.length}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {currentLang === 'en' ? 'Total Spent' : 'Amafaranga Yose'}
                </span>
                <span className="text-lg font-black text-[#FF6000] mt-1 block">
                  {orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()} FRW
                </span>
              </div>
            </div>

            {/* Delivery Contact Phone & Address */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <MapPin className="w-4 h-4 text-[#FF6000]" />
                  <span>{currentLang === 'en' ? 'Delivery Contact & Address' : 'Aderesi & Telefoni yo kugezaho'}</span>
                </div>
                {!isEditingProfile && (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="text-[#FF6000] font-bold hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{currentLang === 'en' ? 'Edit Details' : 'Hindura'}</span>
                  </button>
                )}
              </div>

              {isEditingProfile ? (
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {currentLang === 'en' ? 'Delivery Phone Number (for courier call)' : 'Nimero ya telefoni (yo guhamagarwaho na motari)'}
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0780022600"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      {currentLang === 'en' ? 'Saved Delivery Location / Street' : 'Aho utuye / Aho ibicuruzwa bizagezwa'}
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Kigali, Gasabo, Kimironko Near Gate 2"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      {currentLang === 'en' ? 'Cancel' : 'Reka'}
                    </button>
                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={handleSaveProfile}
                      className="px-4 py-1.5 bg-[#FF6000] text-white rounded-xl font-bold hover:bg-orange-600 cursor-pointer disabled:opacity-50"
                    >
                      {savingProfile
                        ? currentLang === 'en' ? 'Saving...' : 'Kubika...'
                        : currentLang === 'en' ? 'Save Changes' : 'Bika'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 pl-5 text-slate-600 font-medium">
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{user.phone || (currentLang === 'en' ? 'No courier phone set (Click Edit to add)' : 'Nta nimero ya telefoni yashyizwemo')}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{user.deliveryAddress || (currentLang === 'en' ? 'No delivery address saved yet.' : 'Nta hantu wemeje ho kukugezaho ibicuruzwa.')}</span>
                  </p>
                </div>
              )}

              {savedMsg && (
                <p className="text-emerald-600 font-bold text-[11px] flex items-center gap-1 pl-5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentLang === 'en' ? 'Details saved successfully!' : 'Amakuru yabitswe neza!'}</span>
                </p>
              )}
            </div>

            {/* Google Authentication Info Box */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <div>
                  <p className="font-bold text-slate-800 text-xs">
                    {currentLang === 'en' ? 'Google Account Connected' : 'Konti ya Google Ihujwe'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {user.email || 'Verified Single Sign-On'}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
                Active
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Orders List */}
        {activeTab === 'orders' && (
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {loadingOrders ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {currentLang === 'en' ? 'Loading orders...' : 'Kureba komande...'}
              </div>
            ) : orders.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-bold">
                  {currentLang === 'en' ? 'No orders yet.' : 'Nta komande urakora.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {currentLang === 'en' ? 'Browse our catalog and start shopping!' : 'Sura ibicuruzwa utangire kugura!'}
                </p>
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 hover:bg-orange-50/40 transition-colors text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-slate-900">{ord.orderNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        ord.status === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                    <span className="font-extrabold text-[#FF6000]">
                      {ord.totalAmount.toLocaleString()} FRW
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {ord.items?.length || 1} {ord.items?.length === 1 ? 'item' : 'items'}
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        onTrackOrder(ord.orderNumber);
                      }}
                      className="text-[#FF6000] font-bold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <span>{currentLang === 'en' ? 'Track Order' : 'Kurikirana'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer Logout Action */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="text-rose-600 hover:text-rose-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{currentLang === 'en' ? 'Sign Out of Account' : 'Sohoka muri Konti'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
          >
            {currentLang === 'en' ? 'Close' : 'Funga'}
          </button>
        </div>
      </div>
    </div>
  );
};
