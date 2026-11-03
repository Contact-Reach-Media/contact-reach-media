import React, { useState, useEffect, useRef } from 'react';
import {
  X, User, Phone, MapPin, Mail, Calendar, ShoppingBag,
  LogOut, ShieldCheck, CheckCircle2, ChevronRight, AlertCircle, Edit3,
  MessageSquare, Send, Bell, Clock, Truck, Package, Copy, ExternalLink,
  RefreshCw, Check, ArrowRight, Info
} from 'lucide-react';
import { CustomerUser, Order, AdminMessage } from '../types.ts';
import { api } from '../services/api.ts';
import { Language, translations } from '../translations.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';

interface BuyerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: CustomerUser;
  onLogout: () => void;
  onTrackOrder: (orderNumber: string) => void;
  onOpenPaymentConfirmation?: (order: Order) => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
  initialTab?: 'inbox' | 'orders' | 'profile';
}

export const BuyerAccountModal: React.FC<BuyerAccountModalProps> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  onTrackOrder,
  onOpenPaymentConfirmation,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates,
  initialTab = 'orders'
}) => {
  const t = translations[currentLang] || translations.en;
  const isRTL = currentLang === 'ar';

  const [activeTab, setActiveTab] = useState<'inbox' | 'orders' | 'profile'>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Chat & Inbox state
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [selectedOrderRef, setSelectedOrderRef] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [copiedOrder, setCopiedOrder] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Order search/filter in Order Tracking tab
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'active' | 'delivered'>('all');

  // Contact & Delivery details edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [phone, setPhone] = useState(user.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(user.deliveryAddress || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calculate unread count for customer
  const unreadMessagesCount = messages.filter(
    m => m.sender === 'admin' && m.isReadByCustomer === false
  ).length;

  const loadData = async (silent = false) => {
    if (!silent) {
      setLoadingOrders(true);
      setLoadingMessages(true);
    }
    try {
      const [fetchedOrders, fetchedMessages] = await Promise.all([
        api.buyerGetOrders(),
        api.buyerGetMessages()
      ]);
      setOrders(fetchedOrders);
      setMessages(fetchedMessages);
    } catch (err) {
      console.warn('[BuyerAccount] Sync notice:', err);
    } finally {
      if (!silent) {
        setLoadingOrders(false);
        setLoadingMessages(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      loadData(false);
      setDeliveryAddress(user.deliveryAddress || '');
      setPhone(user.phone || '');
      setErrorMsg(null);

      // Real-time synchronization: silently refresh buyer orders & messages every 4 seconds
      const syncTimer = setInterval(() => {
        loadData(true);
      }, 4000);

      const handleFocus = () => {
        if (document.visibilityState === 'visible') {
          loadData(true);
        }
      };
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleFocus);

      return () => {
        clearInterval(syncTimer);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
      };
    }
  }, [isOpen, user, initialTab]);

  // When switching to inbox tab, mark messages as read and scroll to bottom
  useEffect(() => {
    if (activeTab === 'inbox' && isOpen) {
      api.buyerMarkMessagesRead().then(() => {
        setMessages(prev => prev.map(m => ({ ...m, isReadByCustomer: true })));
      }).catch(() => {});
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [activeTab, isOpen, messages.length]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || sendingMessage) return;

    setSendingMessage(true);
    setErrorMsg(null);

    // Optimistic message creation
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: AdminMessage = {
      id: tempId,
      customerId: user.id,
      name: user.name,
      email: user.email || '',
      phone: user.phone || '',
      subject: selectedOrderRef ? `Inquiry regarding Order #${selectedOrderRef}` : 'Customer Support Chat',
      message: text,
      orderNumber: selectedOrderRef || undefined,
      createdAt: new Date().toISOString(),
      status: 'unread',
      sender: 'customer',
      senderName: user.name,
      isReadByCustomer: true,
      isReadByAdmin: false,
      notificationType: 'chat'
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setChatInput('');

    try {
      const created = await api.buyerSendMessage({
        message: text,
        orderNumber: selectedOrderRef || undefined,
        subject: selectedOrderRef ? `Inquiry regarding Order #${selectedOrderRef}` : undefined
      });
      setMessages(prev => prev.map(m => m.id === tempId ? created : m));
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send message. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSendingMessage(false);
    }
  };

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOrder(text);
    setTimeout(() => setCopiedOrder(null), 2000);
  };

  const openChatForOrder = (orderNumber: string) => {
    setSelectedOrderRef(orderNumber);
    setActiveTab('inbox');
    setChatInput(`Hello! I have a question regarding my order #${orderNumber}: `);
  };

  // Filtered orders for tracking tab
  const filteredOrders = orders.filter(ord => {
    if (orderStatusFilter === 'active') {
      if (ord.status === 'Delivered' || ord.status === 'Cancelled' || ord.deliveryStatus === 'Delivered' || ord.deliveryStatus === 'Cancelled') {
        return false;
      }
    } else if (orderStatusFilter === 'delivered') {
      if (ord.status !== 'Delivered' && ord.deliveryStatus !== 'Delivered') {
        return false;
      }
    }

    if (!orderSearch.trim()) return true;
    const q = orderSearch.toLowerCase();
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      (ord.trackingNumber && ord.trackingNumber.toLowerCase().includes(q)) ||
      ord.items?.some(it => it.productName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dashboard Header Profile Banner */}
        <div className="flex items-center gap-3.5 pb-4 mb-4 border-b border-slate-100">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.name}
              className="w-13 h-13 rounded-2xl object-cover border-2 border-[#FF6000] shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#FF6000] to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">{user.name}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Verified Buyer</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-0.5 flex-wrap">
              {user.email && <span className="truncate">{user.email}</span>}
              {user.phone && <span className="font-mono">{user.phone}</span>}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'inbox'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#FF6000]" />
            <span>{currentLang === 'en' ? 'Inbox & Chat' : 'Ubutumwa'}</span>
            {unreadMessagesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#FF6000] text-white text-[10px] font-extrabold animate-pulse">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>{currentLang === 'en' ? 'Order Tracking' : 'Gukurikirana'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>{currentLang === 'en' ? 'My Profile' : 'Imyirondoro'}</span>
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-3 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: INBOX & LIVE ADMIN CHAT */}
        {activeTab === 'inbox' && (
          <div className="flex flex-col flex-1 min-h-[360px] max-h-[55vh] overflow-hidden">
            {/* Live Chat Header Status */}
            <div className="bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-200/80 flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {currentLang === 'en' ? 'ContactReach Admin & Support Desk' : 'Abakozi ba ContactReach'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {currentLang === 'en' ? 'Direct Real-time Sync' : 'Birasangizwa ako kanya'}
              </span>
            </div>

            {/* Quick Topic Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 text-[11px] shrink-0 scrollbar-none">
              <span className="text-slate-400 font-bold shrink-0 text-[10px]">
                {currentLang === 'en' ? 'Quick Topic:' : 'Inyandiko:'}
              </span>
              {[
                { label: 'Delivery Status', rw: 'Aho komande igeze' },
                { label: 'Payment Verification', rw: 'Kwishyura' },
                { label: 'Change Address', rw: 'Guhindura aderesi' },
                { label: 'Order Assistance', rw: 'Ubufasha' }
              ].map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    const prefix = currentLang === 'en' ? chip.label : chip.rw;
                    setChatInput(prev => prev ? `${prev} [${prefix}]` : `Inquiry about ${prefix}: `);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-[#FF6000] text-slate-600 font-semibold shrink-0 cursor-pointer transition-colors"
                >
                  {currentLang === 'en' ? chip.label : chip.rw}
                </button>
              ))}
            </div>

            {/* Message Thread List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
              {loadingMessages ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FF6000]" />
                  <span>{currentLang === 'en' ? 'Loading message history...' : 'Kureba ubutumwa...'}</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-600 font-bold">
                    {currentLang === 'en' ? 'No messages in your inbox yet.' : 'Nta butumwa urabona.'}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    {currentLang === 'en'
                      ? 'Have a question about your order, delivery, or payments? Send a message directly to our admin team below!'
                      : 'Ufite ikibazo kuri komande yawe cyangwa kwishyura? Andikira abakozi bacu hasi!'}
                  </p>
                </div>
              ) : (
                messages.map(msg => {
                  const isCustomer = msg.sender === 'customer';
                  const isSystem = msg.sender === 'system' || msg.notificationType === 'order_update';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs space-y-1 my-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px]">
                            <Bell className="w-3.5 h-3.5 text-amber-600" />
                            <span>{msg.subject || 'Order Notification'}</span>
                          </div>
                          <span className="text-[10px] text-amber-600/80 font-mono">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                          {msg.message}
                        </p>
                        {msg.orderNumber && (
                          <div className="pt-1 flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-amber-200/60 px-2 py-0.5 rounded text-amber-900">
                              Order #{msg.orderNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onTrackOrder(msg.orderNumber!);
                              }}
                              className="text-[10px] text-[#FF6000] font-bold hover:underline cursor-pointer"
                            >
                              {currentLang === 'en' ? 'View live tracking →' : 'Kureba komande →'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-600">
                          {isCustomer ? (currentLang === 'en' ? 'You' : 'Wowe') : (msg.senderName || 'Customer Support')}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs shadow-xs leading-relaxed ${
                          isCustomer
                            ? 'bg-[#FF6000] text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                        }`}
                      >
                        {msg.orderNumber && (
                          <div className={`text-[10px] font-bold mb-1 pb-1 border-b flex items-center gap-1 ${
                            isCustomer ? 'border-white/30 text-white/90' : 'border-slate-100 text-[#FF6000]'
                          }`}>
                            <Package className="w-3 h-3" />
                            <span>Order #{msg.orderNumber}</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>

                      {msg.replyNote && isCustomer && (
                        <div className="mt-1.5 max-w-[85%] p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-700 border border-slate-200">
                          <span className="font-bold text-[#FF6000] block text-[10px]">
                            {currentLang === 'en' ? 'Admin note:' : 'Icyo ubuyobozi bwasubije:'}
                          </span>
                          <p>{msg.replyNote}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Message Composer */}
            <form onSubmit={handleSendMessage} className="pt-3 space-y-2 shrink-0">
              {/* Optional Order Attachment Selector */}
              {orders.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold shrink-0">
                    {currentLang === 'en' ? 'Attach Order (optional):' : 'Huza na komande:'}
                  </span>
                  <select
                    value={selectedOrderRef}
                    onChange={(e) => setSelectedOrderRef(e.target.value)}
                    className="text-[11px] bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#FF6000]"
                  >
                    <option value="">{currentLang === 'en' ? 'None (General Inquiry)' : 'Nta komande'}</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.orderNumber}>
                        {o.orderNumber} ({o.items?.length || 1} item - {o.status})
                      </option>
                    ))}
                  </select>
                  {selectedOrderRef && (
                    <button
                      type="button"
                      onClick={() => setSelectedOrderRef('')}
                      className="text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={currentLang === 'en' ? 'Type your message to admin support here...' : 'Andika ubutumwa hano...'}
                  className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-medium focus:ring-2 focus:ring-[#FF6000] focus:bg-white focus:outline-none"
                  disabled={sendingMessage}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || sendingMessage}
                  className="px-4 py-2.5 bg-[#FF6000] hover:bg-orange-600 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors shadow-xs"
                >
                  {sendingMessage ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{currentLang === 'en' ? 'Send' : 'Ohereza'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: ORDER TRACKING */}
        {activeTab === 'orders' && (
          <div className="flex flex-col flex-1 min-h-[360px] max-h-[55vh] overflow-hidden">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between mb-3 shrink-0">
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder={currentLang === 'en' ? 'Search by Order # or product...' : 'Shakisha komande...'}
                className="flex-1 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-[#FF6000] focus:outline-none font-medium"
              />
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                    orderStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter('active')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                    orderStatusFilter === 'active' ? 'bg-white text-[#FF6000] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setOrderStatusFilter('delivered')}
                  className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                    orderStatusFilter === 'delivered' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Delivered
                </button>
              </div>
            </div>

            {/* Orders List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#FF6000]" />
                  <span>{currentLang === 'en' ? 'Fetching live orders...' : 'Kureba komande...'}</span>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-100 p-6">
                  <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-600 font-bold">
                    {orderSearch || orderStatusFilter !== 'all'
                      ? (currentLang === 'en' ? 'No orders match your filter.' : 'Nta komande ihuye nibyo ushatse.')
                      : (currentLang === 'en' ? 'No orders placed yet.' : 'Nta komande urakora.')}
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    {currentLang === 'en'
                      ? 'Browse through our catalog, pick items you love, and enjoy nationwide doorstep delivery!'
                      : 'Hitamo ibicuruzwa ukunda tubikugezeho aho uri hose mu Rwanda!'}
                  </p>
                </div>
              ) : (
                filteredOrders.map(ord => {
                  const isDelivered = ord.status === 'Delivered' || ord.deliveryStatus === 'Delivered';
                  const isCancelled = ord.status === 'Cancelled' || ord.deliveryStatus === 'Cancelled';
                  const isPaid = ord.paymentStatus === 'Paid';
                  const isPendingPayment = ord.paymentStatus === 'Pending Payment' || ord.paymentStatus === 'Awaiting Payment';

                  // Step tracker logic: 1. Placed, 2. Payment Verified, 3. Preparing, 4. Shipped/In Transit, 5. Delivered
                  let currentStep = 1;
                  if (isPaid) currentStep = 2;
                  if (ord.status === 'Preparing' || ord.deliveryStatus === 'Processing' || ord.deliveryStatus === 'Awaiting Shipment') currentStep = 3;
                  if (ord.status === 'Out for Delivery' || ord.deliveryStatus === 'In Transit' || ord.deliveryStatus === 'Shipped' || ord.deliveryStatus === 'Out for Delivery') currentStep = 4;
                  if (isDelivered) currentStep = 5;

                  return (
                    <div
                      key={ord.id}
                      className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 hover:border-orange-300 transition-all text-xs space-y-3 shadow-2xs"
                    >
                      {/* Top Header: Order Number, Copy & Statuses */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {ord.orderNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(ord.orderNumber)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200/60 cursor-pointer"
                            title="Copy Order #"
                          >
                            {copiedOrder === ord.orderNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Payment Status Pill */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.paymentStatus === 'Under Verification' || ord.paymentStatus === 'Payment Submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : ord.paymentStatus === 'Payment Rejected' || ord.paymentStatus === 'Failed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.paymentStatus || 'Pending Payment'}
                          </span>

                          {/* Delivery Status Pill */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800'
                              : isCancelled
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-[#FF6000]/15 text-[#FF6000]'
                          }`}>
                            {ord.deliveryStatus || ord.status}
                          </span>
                        </div>
                      </div>

                      {/* Visual Step Progress Tracker (only if not cancelled) */}
                      {!isCancelled && (
                        <div className="py-1">
                          <div className="grid grid-cols-4 gap-1 relative text-[10px]">
                            {[
                              { label: 'Placed', step: 1 },
                              { label: 'Payment', step: 2 },
                              { label: 'In Transit', step: 4 },
                              { label: 'Delivered', step: 5 }
                            ].map((s, idx) => (
                              <div key={s.label} className="flex flex-col items-center text-center">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold mb-1 transition-colors ${
                                  currentStep >= s.step
                                    ? 'bg-[#FF6000] text-white'
                                    : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {currentStep > s.step ? '✓' : s.step}
                                </div>
                                <span className={`font-semibold ${currentStep >= s.step ? 'text-slate-800' : 'text-slate-400'}`}>
                                  {s.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Order Info & Total */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                        </span>
                        <div className="text-right">
                          <span className="font-black text-[#FF6000] text-sm block">
                            {(() => {
                              const formatted = formatCurrencyPrice(ord.totalAmount, currentCurrency, exchangeRates, { showBaseSecondary: true });
                              return (
                                <span>
                                  <span>{formatted.primary}</span>
                                  {formatted.secondary && (
                                    <span className="text-[10px] text-slate-400 block font-normal">
                                      {formatted.secondary}
                                    </span>
                                  )}
                                </span>
                              );
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Courier & Tracking info if available */}
                      {(ord.trackingNumber || ord.expectedDeliveryDate || ord.assignedCourier) && (
                        <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-[11px] space-y-1">
                          {ord.trackingNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-blue-900 font-bold flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Tracking: <strong className="font-mono">{ord.trackingNumber}</strong></span>
                                {ord.trackingCarrier && <span className="text-blue-600">({ord.trackingCarrier})</span>}
                              </span>
                              {ord.trackingUrl && (
                                <a
                                  href={ord.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 font-bold hover:underline flex items-center gap-0.5 text-[10px]"
                                >
                                  <span>Track Live</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}
                          {ord.expectedDeliveryDate && (
                            <p className="text-blue-800 text-[10px]">
                              Expected Arrival: <strong>{ord.expectedDeliveryDate}</strong>
                            </p>
                          )}
                          {ord.assignedCourier && (
                            <p className="text-blue-800 text-[10px]">
                              Courier: <strong>{ord.assignedCourier}</strong> {ord.courierPhone && `(${ord.courierPhone})`}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Items Preview */}
                      <div className="space-y-1.5 pt-1">
                        {ord.items?.slice(0, 2).map((it, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px]">
                            {it.imageUrl && (
                              <img
                                src={it.imageUrl}
                                alt={it.productName}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 truncate">{it.productName}</p>
                              <p className="text-[10px] text-slate-400">Qty: {it.quantity} {it.variation && `• ${it.variation}`}</p>
                            </div>
                          </div>
                        ))}
                        {ord.items && ord.items.length > 2 && (
                          <p className="text-[10px] text-slate-400 pl-1">
                            +{ord.items.length - 2} more item(s)...
                          </p>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openChatForOrder(ord.orderNumber)}
                          className="text-[#FF6000] hover:text-orange-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{currentLang === 'en' ? 'Chat about this order' : 'Baza kuri iyi komande'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {isPendingPayment && onOpenPaymentConfirmation && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenPaymentConfirmation(ord);
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                            >
                              {currentLang === 'en' ? 'Pay Now' : 'Ishyura'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onTrackOrder(ord.orderNumber);
                            }}
                            className="text-slate-700 hover:text-slate-900 font-bold flex items-center gap-1 text-[11px] cursor-pointer px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                          >
                            <span>{currentLang === 'en' ? 'Track In Detail' : 'Ibisobanuro'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PROFILE & DELIVERY ADDRESS */}
        {activeTab === 'profile' && (
          <div className="space-y-4 text-xs overflow-y-auto pr-1 max-h-[55vh]">
            {/* Account Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {currentLang === 'en' ? 'Total Orders' : 'Komande Zose'}
                </span>
                <span className="text-xl font-black text-slate-900 mt-1 block">
                  {orders.length}
                </span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {currentLang === 'en' ? 'Total Spent' : 'Amafaranga Yose'}
                </span>
                <span className="text-base font-black text-[#FF6000] mt-1 block">
                  {(() => {
                    const totalRwf = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                    const formatted = formatCurrencyPrice(totalRwf, currentCurrency, exchangeRates, { showBaseSecondary: true });
                    return (
                      <span>
                        {formatted.primary}
                        {formatted.secondary && (
                          <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                            {formatted.secondary}
                          </span>
                        )}
                      </span>
                    );
                  })()}
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
                    type="button"
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
                        ? (currentLang === 'en' ? 'Saving...' : 'Kubika...')
                        : (currentLang === 'en' ? 'Save Changes' : 'Bika')}
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

        {/* Footer Logout Action */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="text-rose-600 hover:text-rose-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{currentLang === 'en' ? 'Sign Out' : 'Sohoka muri Konti'}</span>
          </button>
          <button
            type="button"
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
