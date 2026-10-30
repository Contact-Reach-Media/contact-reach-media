import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Check, Copy, PhoneCall, MessageCircle, AlertCircle, ShieldCheck,
  MapPin, Tag, Smartphone, CheckCircle2, ChevronRight, Info, Truck,
  Zap, ArrowLeft, Upload, FileText, Image as ImageIcon, Sparkles, RefreshCw,
  Search, ExternalLink
} from 'lucide-react';
import { CartItem, Order, PaymentMethod, AppSettings, CustomerUser, PaymentConfirmation } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';
import { buildUssdCode, formatUssdTelUri, autoTriggerUssd, USSD_CONFIG } from '../utils/ussd.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  settings: AppSettings;
  onOrderCreated: (order: Order) => void;
  onOpenConfirmation?: (order: Order) => void;
  onOpenTracking?: (orderNumber: string) => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
  buyerUser?: CustomerUser | null;
  onOpenBuyerAuth?: () => void;
}

export type CheckoutStep = 'details' | 'payment' | 'proof' | 'confirmed';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  settings,
  onOrderCreated,
  onOpenConfirmation,
  onOpenTracking,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates,
  buyerUser,
  onOpenBuyerAuth
}) => {
  const t = translations[currentLang] || translations.en;

  // Seamless 4-stage flow inside ONE modal
  const [step, setStep] = useState<CheckoutStep>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [dialerPrompted, setDialerPrompted] = useState(false);
  const [dialerFeedback, setDialerFeedback] = useState<string | null>(null);

  // Step 1: Customer & Delivery Details
  const [customerName, setCustomerName] = useState(buyerUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(buyerUser?.phone || '');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(settings.kigaliAreas?.[0]?.id || 'gasabo');
  const [deliveryAddress, setDeliveryAddress] = useState(buyerUser?.deliveryAddress || 'Kigali, Gasabo');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountMsg, setDiscountMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Step 2 & 3: Created Order Reference & Payment Selection
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MTN Merchant Code');

  // Step 3: Payment Proof Data
  const [transactionId, setTransactionId] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [detectedTxn, setDetectedTxn] = useState<string | null>(null);
  const [proofSubmittedResult, setProofSubmittedResult] = useState<{ confirmation: PaymentConfirmation; order: Order } | null>(null);

  // Sync with buyerUser profile
  useEffect(() => {
    if (buyerUser) {
      if (buyerUser.name && !customerName) setCustomerName(buyerUser.name);
      if (buyerUser.phone && !customerPhone) setCustomerPhone(buyerUser.phone);
      if (buyerUser.deliveryAddress && (!deliveryAddress || deliveryAddress === 'Kigali, Gasabo')) {
        setDeliveryAddress(buyerUser.deliveryAddress);
      }
    }
  }, [buyerUser]);

  if (!isOpen) return null;

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const isOutsideKigali = selectedLocationId === 'outside';
  const qualifiesForFreeDelivery = subtotal >= (settings.freeDeliveryThreshold || 50000) && !isOutsideKigali;
  const currentArea = settings.kigaliAreas?.find(a => a.id === selectedLocationId);
  const deliveryFee = qualifiesForFreeDelivery
    ? 0
    : isOutsideKigali
    ? (settings.deliveryFeeUpcountry || 3500)
    : (currentArea ? currentArea.fee : (settings.deliveryFeeKigali || 1500));
  const grandTotal = Math.max(0, subtotal + deliveryFee - appliedDiscount);

  // Merchant & Receiver details
  const primaryProduct = cart[0]?.product;
  const merchantCode = primaryProduct?.merchantCode || settings.merchantCode || USSD_CONFIG.mtnMerchantCode;
  const receiverPhone = primaryProduct?.receiverPhone || settings.paymentNumber || USSD_CONFIG.mtnMomoNumber;
  const receiverName = primaryProduct?.receiverName || settings.receiverName || USSD_CONFIG.receiverName;

  const amountToPay = createdOrder ? createdOrder.totalAmount : grandTotal;

  // Active USSD code
  const activeUssdCode = buildUssdCode(
    paymentMethod,
    amountToPay,
    receiverPhone,
    merchantCode
  );
  const activeTelUri = formatUssdTelUri(activeUssdCode);

  // Promo Code Validation
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    try {
      const res = await api.validateCoupon(discountCode.trim(), subtotal);
      if (res.valid) {
        setAppliedDiscount(res.discountAmount);
        const pctLabel = res.discountType === 'percentage' && res.discountValue ? ` (${res.discountValue}% OFF)` : '';
        setDiscountMsg({
          text: res.message || `Coupon applied${pctLabel}: ${res.discountAmount.toLocaleString()} FRW discount!`,
          isError: false
        });
      } else {
        setDiscountMsg({ text: res.message || 'Invalid promo code', isError: true });
      }
    } catch (err: any) {
      if (['WELCOME10', 'CRM2026', 'MOMO', 'DISCOUNT10'].includes(discountCode.trim().toUpperCase())) {
        const disc = Math.min(10000, Math.round(subtotal * 0.1));
        setAppliedDiscount(disc);
        setDiscountMsg({ text: `Promo applied: 10% OFF (-${disc.toLocaleString()} FRW)!`, isError: false });
      } else {
        setDiscountMsg({ text: err.message || 'Invalid coupon code.', isError: true });
      }
    }
  };

  // Step 1 Submission: Place Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setError(
        currentLang === 'en'
          ? 'Please enter your full name, Rwandan phone number, and delivery address.'
          : 'Nyamuneka wuzuze amazina yawe, telefone yo mu Rwanda n\'aderesi yo koherezaho.'
      );
      return;
    }

    // Rwandan phone validation (078, 073, 072, 079, or +25078...)
    const cleanPhone = customerPhone.replace(/\s+/g, '');
    const isRwandaPhone = /^(?:\+?250|0)?7[2389]\d{7}$/.test(cleanPhone);
    if (!isRwandaPhone) {
      setError(
        currentLang === 'en'
          ? 'Please enter a valid Rwandan mobile number (e.g., 0780 022 600 or 0730 000 000).'
          : 'Shyiramo numero ya telefone yo mu Rwanda yemewe (urugero: 078... cyangwa 073...).'
      );
      return;
    }

    if (cart.length === 0) {
      setError('Your shopping cart is empty.');
      return;
    }

    setLoading(true);
    try {
      const selectedLocationName = isOutsideKigali
        ? 'Outside Kigali (Upcountry / Intara)'
        : (currentArea?.name || 'Kigali Area');

      const orderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryLocation: selectedLocationName,
        deliveryAddress: deliveryAddress.trim(),
        deliveryNotes: deliveryNotes.trim() || undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        paymentMethod,
        couponCode: appliedDiscount > 0 ? discountCode.trim() : undefined
      };

      const orderData = await api.createOrder(orderPayload);
      if (!orderData || !orderData.orderNumber) {
        throw new Error(currentLang === 'en' ? 'Could not generate order reference. Please try again.' : 'Ntibyashobotse gukora komande. Ongera ugerageze.');
      }
      setCreatedOrder(orderData);
      try {
        onOrderCreated(orderData);
      } catch (cbErr) {
        console.warn('onOrderCreated callback notice:', cbErr);
      }
      setStep('payment');
      setDialerPrompted(true);

      // Trigger native phone dialer with USSD code safely
      try {
        const codeToDial = buildUssdCode(
          paymentMethod,
          orderData.totalAmount,
          receiverPhone,
          merchantCode
        );
        setTimeout(() => {
          try {
            autoTriggerUssd(codeToDial);
          } catch {}
        }, 300);
      } catch {}
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || (currentLang === 'en' ? 'An error occurred while creating order.' : 'Habaye ikibazo mu gukora komande.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Payment Method Switcher (Never creates duplicate orders!)
  const handleSelectPaymentMethod = async (newMethod: PaymentMethod) => {
    setPaymentMethod(newMethod);
    if (createdOrder) {
      try {
        await api.updateOrderPaymentMethod(createdOrder.orderNumber, newMethod);
        createdOrder.paymentMethod = newMethod;
      } catch (e) {
        console.warn('Could not update order payment method:', e);
      }
    }

    const code = buildUssdCode(newMethod, amountToPay, receiverPhone, merchantCode);
    setDialerPrompted(true);
    setDialerFeedback(
      currentLang === 'en'
        ? `Switched to ${newMethod}. Opening dialer: ${code}`
        : `Wahisemo ${newMethod}. Dialer ifunguye: ${code}`
    );
    autoTriggerUssd(code);
    setTimeout(() => setDialerFeedback(null), 4000);
  };

  const handleManualDial = (methodToUse = paymentMethod) => {
    const code = buildUssdCode(methodToUse, amountToPay, receiverPhone, merchantCode);
    setDialerPrompted(true);
    setDialerFeedback(
      currentLang === 'en'
        ? `USSD dialer opened: ${code}`
        : `Dialer ya telefoni ifunguwe: ${code}`
    );
    autoTriggerUssd(code);
    setTimeout(() => setDialerFeedback(null), 4000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeUssdCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Step 3: Payment Proof File Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setError(currentLang === 'en' ? 'Image file is too large. Please select an image under 8MB.' : 'Ifoto irarenze urugero rwemewe (munsi ya 8MB).');
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotData(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Smart Parser for pasted SMS text
  const handleMessageChange = (text: string) => {
    setConfirmationMessage(text);
    setError(null);

    const txnMatch = text.match(/(?:TxId|Transaction ID|Txn ID|Ref|Reference|ID|Id)[:\s]*([A-Za-z0-9_-]+)/i);
    if (txnMatch && txnMatch[1]) {
      const extracted = txnMatch[1].trim();
      setDetectedTxn(extracted);
      if (!transactionId) {
        setTransactionId(extracted);
      }
    } else {
      setDetectedTxn(null);
    }
  };

  const handlePasteSampleSms = () => {
    const mockTxn = `TXN${Math.floor(100000000 + Math.random() * 900000000)}`;
    const sample = paymentMethod === 'Airtel Money'
      ? `Airtel Money: You have sent ${amountToPay.toLocaleString()} RWF to Ruth (0780022600). TxId: ${mockTxn}. Fee: 0 RWF. New Balance: 45,000 RWF.`
      : paymentMethod === 'MTN Merchant Code'
      ? `Y'ello! You have paid ${amountToPay.toLocaleString()} RWF to ContactReach Market (2328354) on ${new Date().toLocaleDateString()}. TxId: ${mockTxn}. Fee: 0 RWF.`
      : `Y'ello! You have transferred ${amountToPay.toLocaleString()} RWF to Ruth (0780022600) on ${new Date().toLocaleDateString()}. TxId: ${mockTxn}. Fee: 100 RWF.`;
    handleMessageChange(sample);
  };

  // Step 3 Submission: Submit Proof for Admin Verification
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const orderRef = createdOrder?.orderNumber || 'CRM-PENDING';
    const hasProof = Boolean(screenshotData || confirmationMessage.trim() || transactionId.trim());

    if (!hasProof) {
      setError(
        currentLang === 'en'
          ? 'Please either upload a payment screenshot, paste your confirmation SMS, or enter the transaction ID.'
          : 'Nyamuneka shyiraho ifoto yo kwishyura cyangwa ukoporore SMS wahawe.'
      );
      return;
    }

    setLoading(true);
    try {
      const data = await api.submitPaymentConfirmation({
        orderNumber: orderRef,
        customerName: customerName.trim(),
        paymentPhone: customerPhone.trim(),
        paymentMethod,
        amountPaid: Number(amountToPay),
        transactionId: transactionId.trim() || (detectedTxn || `SMS-${Date.now().toString().slice(-6)}`),
        screenshotUrl: screenshotData || undefined,
        confirmationMessage: confirmationMessage.trim() || undefined
      });

      setProofSubmittedResult(data);
      if (data.order && data.order.id) {
        setCreatedOrder(data.order);
      }
      setStep('confirmed');
    } catch (err: any) {
      setError(err.message || 'Error submitting payment confirmation.');
    } finally {
      setLoading(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello ContactReach Support, I have placed order #${createdOrder?.orderNumber || ''} for ${amountToPay.toLocaleString()} FRW (${paymentMethod}). Proof submitted. Please verify.`
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[94vh] overflow-y-auto shadow-2xl relative border border-slate-200 flex flex-col">
        {/* Unified Top Header with Stepper */}
        <div className="p-4 sm:p-5 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-xs z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center p-1 shrink-0">
                <img src="/logo.png" alt="CRM" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                  {step === 'details' && (currentLang === 'en' ? 'Checkout & Order Summary' : 'Kugura & Ibiri mu Igate')}
                  {step === 'payment' && (currentLang === 'en' ? 'Select Payment & Dial USSD' : 'Hitamo Uburyo & Kanda USSD')}
                  {step === 'proof' && (currentLang === 'en' ? 'Submit Proof of Payment' : 'Gihamya yo Kwishyura')}
                  {step === 'confirmed' && (currentLang === 'en' ? 'Payment Submitted for Verification' : 'Kwishyura Kwakiriwe')}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {createdOrder && (
                    <span className="font-mono text-xs font-bold text-[#FF5500]">
                      #{createdOrder.orderNumber}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 font-medium">
                    {step === 'details' && 'Step 1 of 3: Delivery Details'}
                    {step === 'payment' && 'Step 2 of 3: Instant Phone Dialing'}
                    {step === 'proof' && 'Step 3 of 3: Proof Submission'}
                    {step === 'confirmed' && 'Audit in Progress'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
            <div className={`h-1.5 rounded-full transition-all ${
              step === 'details' ? 'bg-[#FF5500]' : 'bg-emerald-500'
            }`} />
            <div className={`h-1.5 rounded-full transition-all ${
              step === 'payment' ? 'bg-[#FF5500]' : (step === 'proof' || step === 'confirmed') ? 'bg-emerald-500' : 'bg-slate-200'
            }`} />
            <div className={`h-1.5 rounded-full transition-all ${
              step === 'proof' ? 'bg-[#FF5500]' : step === 'confirmed' ? 'bg-emerald-500' : 'bg-slate-200'
            }`} />
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 1: CHECKOUT DETAILS & ORDER SUMMARY                       */}
          {/* ============================================================== */}
          {step === 'details' && (
            <form onSubmit={handleCreateOrder} className="space-y-5">
              {/* Compact Order Summary Card */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#FF5500]" />
                    <span>{currentLang === 'en' ? 'Order Summary' : 'Incamake ya Komande'}</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    {cart.reduce((s, i) => s + i.quantity, 0)} {currentLang === 'en' ? 'items' : 'ibicuruzwa'}
                  </span>
                </div>

                {/* Items List with image thumbnail, name, qty, price */}
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-2">
                  {cart.map(item => (
                    <div key={item.product.id} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="truncate">
                          <p className="font-bold text-slate-900 truncate">{item.product.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {item.quantity} × {formatCurrencyPrice(item.product.price, currentCurrency, exchangeRates).primary}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        {formatCurrencyPrice(item.product.price * item.quantity, currentCurrency, exchangeRates).primary}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotal & Delivery Line items */}
                <div className="pt-2 border-t border-slate-200 text-xs space-y-1.5 font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>{t.subtotal}</span>
                    <span className="font-mono text-slate-900 font-bold">
                      {formatCurrencyPrice(subtotal, currentCurrency, exchangeRates).primary}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <span>{t.deliveryFee}</span>
                      {qualifiesForFreeDelivery && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold uppercase">
                          Free
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-slate-900">
                      {deliveryFee === 0 ? '0' : formatCurrencyPrice(deliveryFee, currentCurrency, exchangeRates).primary}
                    </span>
                  </div>

                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Promo Discount ({discountCode})</span>
                      <span className="font-mono">-{formatCurrencyPrice(appliedDiscount, currentCurrency, exchangeRates).primary}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline text-sm sm:text-base font-black text-slate-900">
                    <span>{t.totalAmount}</span>
                    <div className="text-end">
                      <span className="font-mono text-[#FF5500]">
                        {formatCurrencyPrice(grandTotal, currentCurrency, exchangeRates).primary}
                      </span>
                      {currentCurrency !== 'RWF' && (
                        <span className="block text-[11px] text-slate-500 font-mono font-medium">
                          {t.baseSettlementNotice}<strong>{grandTotal.toLocaleString()} FRW</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {currentCurrency !== 'RWF' && (
                    <div className="mt-2 p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-[11px] text-orange-950 font-medium space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-orange-900">
                        <Info className="w-3.5 h-3.5 text-[#FF6000]" />
                        <span>{t.currencyNotice}</span>
                      </div>
                      <p className="text-[10px] text-orange-800 leading-normal">
                        Rwandan Mobile Money (MTN MoMo, Airtel Money) and bank transfers process payments in Rwandan Francs. Your phone prompt will request <strong>{grandTotal.toLocaleString()} FRW</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Zone Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5500]" />
                  <span>{currentLang === 'en' ? 'Delivery Zone & Sector' : 'Akarere & Aho uherereye'} *</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {settings.kigaliAreas?.map(area => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => setSelectedLocationId(area.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedLocationId === area.id
                          ? 'border-[#FF5500] bg-orange-50/70 text-slate-900 ring-2 ring-orange-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs truncate">{area.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                        {qualifiesForFreeDelivery ? 'Free Delivery' : `${area.fee.toLocaleString()} RWF`}
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedLocationId('outside')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedLocationId === 'outside'
                        ? 'border-[#FF5500] bg-orange-50/70 text-slate-900 ring-2 ring-orange-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    <div className="font-bold text-xs">Outside Kigali</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {(settings.deliveryFeeUpcountry || 3500).toLocaleString()} RWF
                    </div>
                  </button>
                </div>
              </div>

              {/* Customer Information Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {currentLang === 'en' ? 'Full Name' : 'Amazina Yombi'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Mugabo Jean"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {currentLang === 'en' ? 'Rwandan Phone (MTN/Airtel)' : 'Telefoni (MTN / Airtel)'} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="078... / 073..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {currentLang === 'en' ? 'Delivery Street / Address' : 'Aderesi cyangwa Umuryango'} *
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. KG 15 Ave, Kimironko near BK"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {currentLang === 'en' ? 'Delivery Notes (Optional)' : 'Ibisobanuro by\'inyongera (Niba bihari)'}
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Black gate, call upon arrival"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>

              {/* Promo Code Input */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="Promo Code (e.g. WELCOME10)"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase bg-white focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {discountMsg && (
                  <p className={`text-[11px] mt-1.5 font-medium ${
                    discountMsg.isError ? 'text-rose-600' : 'text-emerald-700'
                  }`}>
                    {discountMsg.text}
                  </p>
                )}
              </div>

              {/* Available Payment Channel Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {currentLang === 'en' ? 'Select Preferred Mobile Money Channel:' : 'Hitamo uburyo bwo kwishyura:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'MTN Merchant Code'
                      ? 'border-[#FF5500] bg-orange-50/70'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="init-payment"
                        checked={paymentMethod === 'MTN Merchant Code'}
                        onChange={() => setPaymentMethod('MTN Merchant Code')}
                        className="accent-[#FF5500]"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-900">MTN MoMoPay</div>
                        <div className="text-[10px] text-slate-500 font-mono">Code: {merchantCode}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-400 font-black px-1.5 py-0.5 rounded text-slate-950">MTN</span>
                  </label>

                  <label className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'MTN Mobile Money'
                      ? 'border-[#FF5500] bg-orange-50/70'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="init-payment"
                        checked={paymentMethod === 'MTN Mobile Money'}
                        onChange={() => setPaymentMethod('MTN Mobile Money')}
                        className="accent-[#FF5500]"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-900">MTN MoMo Direct</div>
                        <div className="text-[10px] text-slate-500 font-mono">{receiverPhone}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-400 font-black px-1.5 py-0.5 rounded text-slate-950">MoMo</span>
                  </label>

                  <label className={`p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'Airtel Money'
                      ? 'border-[#FF5500] bg-orange-50/70'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="init-payment"
                        checked={paymentMethod === 'Airtel Money'}
                        onChange={() => setPaymentMethod('Airtel Money')}
                        className="accent-[#FF5500]"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-900">Airtel Money</div>
                        <div className="text-[10px] text-slate-500 font-mono">{receiverPhone}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-red-600 font-black px-1.5 py-0.5 rounded text-white">AIR</span>
                  </label>
                </div>
              </div>

              {/* Direct Error Banner above submit button */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base bg-[#FF5500] hover:bg-[#E54D00] text-white shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98 disabled:opacity-60"
              >
                {loading && (
                  <RefreshCw className="w-5 h-5 animate-spin text-white" />
                )}
                <span>
                  {loading
                    ? (currentLang === 'en' ? 'Placing Order...' : 'Gukora Komande...')
                    : (currentLang === 'en'
                        ? `Confirm & Pay ${grandTotal.toLocaleString()} RWF`
                        : `Emeza & Wishyure ${grandTotal.toLocaleString()} RWF`)}
                </span>
                {!loading && <ChevronRight className="w-5 h-5" />}
              </button>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 2: SIMPLE PAYMENT METHOD SELECTION & USSD DIALING         */}
          {/* ============================================================== */}
          {step === 'payment' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Order Status Badge */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">Order Created Successfully</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    #{createdOrder?.orderNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-amber-200/80 text-amber-900 font-bold rounded-lg text-[11px]">
                    Awaiting Payment
                  </span>
                </div>
              </div>

              {/* Feedback toast when USSD dialer triggers */}
              {dialerFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                    <span>{dialerFeedback}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full uppercase">
                    Dialing
                  </span>
                </div>
              )}

              {/* Payment Method Tabs */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  {currentLang === 'en' ? 'Select Payment Channel to Open Dial Code:' : 'Hitamo uburyo bwo kwishyura:'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: MTN MoMoPay Merchant */}
                  <button
                    type="button"
                    onClick={() => handleSelectPaymentMethod('MTN Merchant Code')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'MTN Merchant Code'
                        ? 'border-amber-500 bg-amber-50/90 shadow-xs ring-2 ring-amber-400/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                        MoMo
                      </span>
                      {paymentMethod === 'MTN Merchant Code' && <Check className="w-4 h-4 text-amber-700" />}
                    </div>
                    <div className="font-extrabold text-xs text-slate-900 leading-tight">MTN MoMoPay (Code)</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                      *182*8*1*{merchantCode}*{amountToPay}#
                    </div>
                  </button>

                  {/* Option 2: MTN MoMo Direct */}
                  <button
                    type="button"
                    onClick={() => handleSelectPaymentMethod('MTN Mobile Money')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'MTN Mobile Money'
                        ? 'border-amber-500 bg-amber-50/90 shadow-xs ring-2 ring-amber-400/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                        MTN
                      </span>
                      {paymentMethod === 'MTN Mobile Money' && <Check className="w-4 h-4 text-amber-700" />}
                    </div>
                    <div className="font-extrabold text-xs text-slate-900 leading-tight">MTN MoMo (Direct)</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                      *182*1*1*{receiverPhone}*{amountToPay}#
                    </div>
                  </button>

                  {/* Option 3: Airtel Money */}
                  <button
                    type="button"
                    onClick={() => handleSelectPaymentMethod('Airtel Money')}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'Airtel Money'
                        ? 'border-red-500 bg-red-50/90 shadow-xs ring-2 ring-red-400/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-black text-[10px] flex items-center justify-center">
                        AIR
                      </span>
                      {paymentMethod === 'Airtel Money' && <Check className="w-4 h-4 text-red-600" />}
                    </div>
                    <div className="font-extrabold text-xs text-slate-900 leading-tight">Airtel Money</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                      *182*1*2*{receiverPhone}*{amountToPay}#
                    </div>
                  </button>
                </div>
              </div>

              {/* Provider Information Box */}
              <div className="border border-slate-200 rounded-3xl p-4 sm:p-5 bg-white space-y-4 shadow-sm">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">
                      {paymentMethod === 'MTN Merchant Code' ? 'Business / Account' : 'Receiver Name'}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                      {paymentMethod === 'MTN Merchant Code' ? 'ContactReach Market' : receiverName}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-500 block">
                      {paymentMethod === 'MTN Merchant Code' ? 'Merchant Code' : 'Receiver Phone'}
                    </span>
                    <span className="font-extrabold text-[#FF5500] text-sm mt-0.5 block font-mono">
                      {paymentMethod === 'MTN Merchant Code' ? merchantCode : receiverPhone}
                    </span>
                  </div>
                </div>

                {/* Pre-filled USSD Code Box with Copy */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      {currentLang === 'en' ? 'Generated USSD Payment Code' : 'Kode ya USSD Yuzuye neza'}
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {amountToPay.toLocaleString()} RWF
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3.5 sm:p-4 bg-slate-950 text-white rounded-2xl font-mono text-sm sm:text-base font-bold shadow-inner border border-slate-800">
                    <span className="truncate text-amber-400 tracking-wider">{activeUssdCode}</span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3.5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs active:scale-95"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? (currentLang === 'en' ? 'Copied!' : 'Byakoporowe!') : (currentLang === 'en' ? 'Copy Code' : 'Koporora')}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Dial Action: Big Green Button with pulsing phone icon */}
                <div>
                  <a
                    href={activeTelUri}
                    onClick={() => handleManualDial(paymentMethod)}
                    className="w-full py-3.5 sm:py-4 px-5 rounded-2xl font-black text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-500/20"
                  >
                    <PhoneCall className="w-5 h-5 text-white animate-bounce shrink-0" />
                    <span className="truncate">
                      {currentLang === 'en' ? 'Dial USSD Code' : 'Hamagara Kode ya USSD'}: <span className="underline font-mono">{activeUssdCode}</span>
                    </span>
                  </a>
                  <p className="text-[11px] text-slate-500 text-center mt-2 leading-relaxed">
                    {currentLang === 'en'
                      ? 'Tapping opens your phone dialer. If automatic dialing is unsupported on your device, use the "Copy Code" button and paste it into your phone.'
                      : 'Kanda hano uhite uhamagara. Niba telefoni yawe idahise ifunguka, kanda "Koporora" maze ushyire kode muri dialer yawe.'}
                  </p>
                </div>
              </div>

              {/* 4-Step Visual Payment Instructions */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  {currentLang === 'en' ? 'How to complete payment on your phone:' : 'Intambwe zo kwishyura kuri telefoni:'}
                </h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                    <span className="text-slate-600 text-[11px]">Dialer opens with pre-filled code ({activeUssdCode})</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                    <span className="text-slate-600 text-[11px]">Press Call on MTN or Airtel SIM card</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                    <span className="text-slate-600 text-[11px]">Enter secret MoMo PIN to authorize</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
                    <span className="text-slate-600 text-[11px]">Click "I Have Already Paid" below</span>
                  </div>
                </div>
              </div>

              {/* ACTION: "I Have Already Paid" Button (advances directly to Step 3 inside this modal!) */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setStep('proof')}
                  className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base bg-[#FF5500] hover:bg-[#E54D00] text-white shadow-xl shadow-orange-500/30 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer transform active:scale-98 ring-4 ring-orange-500/20"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>{currentLang === 'en' ? 'I Have Already Paid' : 'Narangije Kwishyura'}</span>
                  </div>
                  <span className="text-[11px] font-medium text-orange-100">
                    {currentLang === 'en'
                      ? 'Click here to upload receipt screenshot or paste SMS for instant verification'
                      : 'Kanda hano ushyireho ifoto cyangwa ubutumwa bwa SMS bwemeza kwishyura'}
                  </span>
                </button>

                <a
                  href={`https://wa.me/250780022600?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Contact Payment Support on WhatsApp (+250 780 022 600)</span>
                </a>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: PAYMENT CONFIRMATION FORM                              */}
          {/* ============================================================== */}
          {step === 'proof' && (
            <form onSubmit={handleSubmitProof} className="space-y-4 animate-in fade-in">
              {/* Back to USSD Step link */}
              <button
                type="button"
                onClick={() => setStep('payment')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to USSD payment codes</span>
              </button>

              {/* Read-Only Attached Order Reference Banner */}
              <div className="p-3.5 bg-orange-50 rounded-2xl border border-orange-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-orange-950/70 uppercase font-bold block">
                    Order Reference Attached
                  </span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    #{createdOrder?.orderNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Paid</span>
                  <span className="font-mono font-black text-[#FF5500] text-base">
                    {amountToPay.toLocaleString()} RWF
                  </span>
                </div>
              </div>

              {/* Pre-attached Form Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Method Used *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-slate-50"
                  >
                    <option value="MTN Merchant Code">MTN MoMoPay (Code: {merchantCode})</option>
                    <option value="MTN Mobile Money">MTN MoMo Direct (Ruth / {receiverPhone})</option>
                    <option value="Airtel Money">Airtel Money (Ruth / {receiverPhone})</option>
                  </select>
                </div>
              </div>

              {/* Proof Options: Screenshot Upload OR Paste SMS Confirmation */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4">
                <div>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Proof of Payment (Provide At Least One) *</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload your payment screenshot, paste your mobile money confirmation SMS, or both.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* OPTION 1: Upload Screenshot */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                        <span>1. Upload Screenshot</span>
                      </label>
                      {screenshotData && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Attached
                        </span>
                      )}
                    </div>

                    <div className={`border-2 border-dashed rounded-2xl p-3 text-center transition-all ${
                      screenshotData ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-300 hover:border-orange-400 bg-white'
                    }`}>
                      <input
                        type="file"
                        id="payment-screenshot-input"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="payment-screenshot-input"
                        className="flex flex-col items-center justify-center cursor-pointer gap-1.5 py-1"
                      >
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          screenshotData ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-50 text-orange-600'
                        }`}>
                          <Upload className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {screenshotData ? 'Change Screenshot' : 'Click to upload receipt image'}
                        </span>
                        <span className="text-[10px] text-slate-400">PNG, JPG up to 8MB</span>
                      </label>

                      {screenshotData && (
                        <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2 text-left">
                          <img
                            src={screenshotData}
                            alt="Receipt"
                            className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <span className="text-[11px] font-bold text-slate-800 truncate flex-1">
                            {fileName || 'Screenshot.jpg'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setScreenshotData(null);
                              setFileName(null);
                            }}
                            className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* OPTION 2: Paste SMS Confirmation */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>2. Paste Confirmation SMS</span>
                      </label>
                      <button
                        type="button"
                        onClick={handlePasteSampleSms}
                        className="text-[10px] font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Sample SMS</span>
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        rows={screenshotData ? 3 : 4}
                        value={confirmationMessage}
                        onChange={(e) => handleMessageChange(e.target.value)}
                        placeholder="Paste your MTN MoMo or Airtel Money SMS here (e.g. 'Y'ello! You have paid 35,000 RWF... TxId: 981273921')..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white focus:ring-2 focus:ring-orange-500 leading-relaxed"
                      />
                      {detectedTxn && (
                        <div className="mt-1 p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] flex items-center justify-between text-emerald-900">
                          <span className="font-medium flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Detected TxId: <strong className="font-mono">{detectedTxn}</strong>
                          </span>
                          <span className="font-bold text-emerald-700 uppercase">Auto-filled</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transaction ID manual field */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transaction ID / Reference (If Available)
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. TXN-981273921 or MOMO-129481"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base bg-[#FF5500] hover:bg-[#E54D00] text-white shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer transform active:scale-98 disabled:opacity-50"
              >
                <span>
                  {loading
                    ? (currentLang === 'en' ? 'Submitting Proof...' : 'Kwohereza Gihamya...')
                    : (currentLang === 'en' ? 'Submit Payment for Verification' : 'Ohereza Gihamya yo Kwishyura')}
                </span>
                <Check className="w-5 h-5" />
              </button>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 4: ORDER CONFIRMATION & VERIFICATION STATUS               */}
          {/* ============================================================== */}
          {step === 'confirmed' && (
            <div className="text-center py-4 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="font-extrabold text-xl text-slate-900">
                  {currentLang === 'en' ? 'Payment Submitted for Verification!' : 'Gihamya yo Kwishyura Yakiriwe!'}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
                  Your payment evidence for order{' '}
                  <strong className="text-slate-900 font-mono">#{createdOrder?.orderNumber}</strong> (
                  {amountToPay.toLocaleString()} RWF) has been received.
                </p>
              </div>

              {/* Status Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 text-left space-y-1.5 max-w-lg mx-auto shadow-2xs">
                <div className="font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-sm font-extrabold">Status: Under Verification</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Our finance team reconciles submitted transaction references with official MTN MoMo & Airtel statements. Once verified, your order status automatically moves to <strong>Confirmed</strong> and is dispatched.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5 max-w-md mx-auto">
                <a
                  href={`https://wa.me/250780022600?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Notify Admin Ruth on WhatsApp (+250 780 022 600)</span>
                </a>

                {onOpenTracking && createdOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenTracking(createdOrder.orderNumber);
                      onClose();
                    }}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Track Order #{createdOrder.orderNumber}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {currentLang === 'en' ? 'Close & Return to Market' : 'Funga & Garuka ku Isoko'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
