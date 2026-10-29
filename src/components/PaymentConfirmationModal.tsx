import React, { useState, useEffect } from 'react';
import {
  X, ShieldCheck, MessageCircle, AlertCircle, CheckCircle2, Upload,
  PhoneCall, Copy, Check, FileText, Image as ImageIcon, Sparkles, RefreshCw
} from 'lucide-react';
import { Order, PaymentMethod, PaymentConfirmation } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';
import { buildUssdCode, formatUssdTelUri, autoTriggerUssd } from '../utils/ussd.ts';

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onConfirmationSuccess: (confirmation: PaymentConfirmation, updatedOrder: Order) => void;
  currentLang: Language;
}

export const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
  isOpen,
  onClose,
  order,
  onConfirmationSuccess,
  currentLang
}) => {
  const t = translations[currentLang];

  const [customerName, setCustomerName] = useState(order?.customerName || '');
  const [paymentPhone, setPaymentPhone] = useState(order?.customerPhone || '');
  const [orderNumber, setOrderNumber] = useState(order?.orderNumber || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order?.paymentMethod || 'MTN Merchant Code');
  const [amountPaid, setAmountPaid] = useState<number>(order?.totalAmount || 0);
  const [transactionId, setTransactionId] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Tab mode: 'both' | 'screenshot' | 'sms'
  const [proofTab, setProofTab] = useState<'both' | 'screenshot' | 'sms'>('both');
  const [detectedTxn, setDetectedTxn] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ confirmation: PaymentConfirmation; order: Order } | null>(null);

  // Synchronize state when order prop changes
  useEffect(() => {
    if (order) {
      if (order.customerName) setCustomerName(order.customerName);
      if (order.customerPhone) setPaymentPhone(order.customerPhone);
      if (order.orderNumber) setOrderNumber(order.orderNumber);
      if (order.paymentMethod) setPaymentMethod(order.paymentMethod);
      if (order.totalAmount) setAmountPaid(order.totalAmount);
    }
  }, [order]);

  if (!isOpen) return null;

  // File upload to base64
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

    // Look for TxId / Transaction ID / Ref
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

    // Look for phone number in text if not set
    const phoneMatch = text.match(/(?:from|to|by|sender|phone)?[:\s]*(07[8|3|2|9]\d{7})/i);
    if (phoneMatch && phoneMatch[1] && !paymentPhone) {
      setPaymentPhone(phoneMatch[1]);
    }

    // Look for amount in text
    const amountMatch = text.match(/(?:RWF|FRW|amount)?[:\s]*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)\s*(?:RWF|FRW)?/i);
    if (amountMatch && amountMatch[1] && amountPaid === 0) {
      const cleaned = parseInt(amountMatch[1].replace(/,/g, ''), 10);
      if (!isNaN(cleaned) && cleaned > 0) {
        setAmountPaid(cleaned);
      }
    }
  };

  const handlePasteSampleSms = () => {
    const mockTxn = `TXN${Math.floor(100000000 + Math.random() * 900000000)}`;
    const sample = paymentMethod === 'Airtel Money'
      ? `Airtel Money: You have sent ${amountPaid.toLocaleString()} RWF to Ruth (0780022600). TxId: ${mockTxn}. Fee: 0 RWF. New Balance: 45,000 RWF.`
      : `Y'ello! You have transferred ${amountPaid.toLocaleString()} RWF to ContactReach Market / Ruth (0780022600) on ${new Date().toLocaleDateString()}. TxId: ${mockTxn}. Fee: 100 RWF. Your new balance: 52,400 RWF.`;
    handleMessageChange(sample);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!orderNumber.trim() || !paymentPhone.trim() || !amountPaid) {
      setError(
        currentLang === 'en'
          ? 'Please provide your order reference, payment phone number, and amount paid.'
          : 'Nyamuneka wuzuze nimero ya komande, telefone wishyuriyeho n\'amafaranga wishyuye.'
      );
      return;
    }

    const hasProof = Boolean(screenshotData || confirmationMessage.trim() || transactionId.trim());
    if (!hasProof) {
      setError(
        currentLang === 'en'
          ? 'Please either upload a payment screenshot, paste your SMS confirmation message, or enter the transaction ID.'
          : 'Nyamuneka shyiraho ifoto (screenshot) yo kwishyura, cyangwa ukoporore ubutumwa bwa SMS bwemeza kwishyura.'
      );
      return;
    }

    setLoading(true);
    try {
      const data = await api.submitPaymentConfirmation({
        orderNumber: orderNumber.trim(),
        customerName: customerName.trim(),
        paymentPhone: paymentPhone.trim(),
        paymentMethod,
        amountPaid: Number(amountPaid),
        transactionId: transactionId.trim() || (detectedTxn || `SMS-${Date.now().toString().slice(-6)}`),
        screenshotUrl: screenshotData || undefined,
        confirmationMessage: confirmationMessage.trim() || undefined
      });

      setSuccessResult(data);
      onConfirmationSuccess(data.confirmation, data.order);
    } catch (err: any) {
      setError(err.message || 'Error submitting payment confirmation.');
    } finally {
      setLoading(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello ContactReach Support, I have submitted payment confirmation for Order Reference: ${orderNumber} for amount ${amountPaid.toLocaleString()} FRW (${paymentMethod}). Transaction ID: ${transactionId || detectedTxn || 'Provided in confirmation'}.`
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[94vh] overflow-y-auto shadow-2xl relative border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-200 shadow-2xs shrink-0 flex items-center justify-center p-0.5">
              <img
                src="/logo.png"
                alt="ContactReach Market Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg sm:text-xl text-slate-900 leading-tight">
                  {currentLang === 'en' ? 'I Have Already Paid' : 'Narangije Kwishyura'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Verification
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentLang === 'en'
                  ? 'Upload payment screenshot or paste mobile money SMS confirmation'
                  : 'Shyiraho ifoto (screenshot) cyangwa ukoporore ubutumwa bwa SMS bwemeza kwishyura'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          {successResult ? (
            /* Success confirmation screen */
            <div className="text-center py-6 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="font-extrabold text-xl text-slate-900">
                  {currentLang === 'en' ? 'Payment Submitted for Admin Verification!' : 'Gihamya yo Kwishyura Yakiriwe!'}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
                  {currentLang === 'en' ? (
                    <>
                      Your payment proof for order <strong className="text-slate-900 font-mono">#{successResult.order.orderNumber}</strong> ({successResult.confirmation.amountPaid.toLocaleString()} FRW) has been received. Our team will verify and dispatch your order promptly.
                    </>
                  ) : (
                    <>
                      Gihamya yo kwishyura komande <strong className="text-slate-900 font-mono">#{successResult.order.orderNumber}</strong> yakiriwe neza. Ikipe yacu igiye kubisuzuma no kubyemeza ako kanya.
                    </>
                  )}
                </p>
              </div>

              {/* Status Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 text-left space-y-1.5 shadow-2xs">
                <div className="font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-sm">Status: Pending Admin Review</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Your transaction reference (<span className="font-mono font-bold text-slate-900">{successResult.confirmation.transactionId}</span>) will be reconciled with the official telecom statement. Once approved, your order moves to <strong>Confirmed</strong>.
                </p>
              </div>

              {/* WhatsApp direct contact */}
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

                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {currentLang === 'en' ? 'Close & Return to Market' : 'Funga & Garuka ku Isoko'}
                </button>
              </div>
            </div>
          ) : (
            /* Confirmation Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Order Quick Overview Banner */}
              <div className="p-3.5 bg-orange-50/80 rounded-2xl border border-orange-200 flex flex-wrap items-center justify-between gap-2 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#FF5500] text-white flex items-center justify-center font-black text-xs">
                    ✓
                  </span>
                  <div>
                    <span className="text-[10px] text-orange-950/70 uppercase font-bold block">
                      {currentLang === 'en' ? 'Verifying Payment For Order' : 'Kwemeza Kwishyura kwa Komande'}
                    </span>
                    <span className="font-mono font-extrabold text-slate-900 text-sm">
                      {orderNumber || 'CRM-PENDING'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Due</span>
                  <span className="font-mono font-black text-[#FF5500] text-base">
                    {amountPaid.toLocaleString()} RWF
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              {/* Order & Payer Identifiers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Order Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. CRM-78291"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-orange-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Name as registered on MoMo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Used to Pay *
                  </label>
                  <input
                    type="tel"
                    required
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="078... / 073..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-orange-500 bg-slate-50"
                  />
                </div>
              </div>

              {/* Method and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Channel *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-orange-500 bg-slate-50"
                  >
                    <option value="MTN Merchant Code">MTN MoMoPay (Merchant Code: 2328354)</option>
                    <option value="MTN Mobile Money">MTN Mobile Money (Direct to 0780022600 - Ruth)</option>
                    <option value="Airtel Money">Airtel Money (0780022600 - Ruth)</option>
                    <option value="Bank Transfer">Bank Transfer (I&M Bank)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount Paid (FRW) *
                  </label>
                  <input
                    type="number"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-orange-500 bg-slate-50"
                  />
                </div>
              </div>

              {/* PROOF SECTION: Screenshot Upload OR Paste SMS Confirmation */}
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>{currentLang === 'en' ? 'Proof of Payment (Select or Provide Either)' : 'Gihamya yo Kwishyura'}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Upload a payment screenshot, paste your mobile money SMS, or provide both.
                    </p>
                  </div>

                  {/* Mode selector pills */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setProofTab('both')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        proofTab === 'both' ? 'bg-[#FF5500] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Options
                    </button>
                    <button
                      type="button"
                      onClick={() => setProofTab('screenshot')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                        proofTab === 'screenshot' ? 'bg-[#FF5500] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Screenshot</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProofTab('sms')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                        proofTab === 'sms' ? 'bg-[#FF5500] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>Paste SMS</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* OPTION 1: Upload Screenshot */}
                  {(proofTab === 'both' || proofTab === 'screenshot') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                          <span>1. {currentLang === 'en' ? 'Upload Payment Screenshot' : 'Shyiraho Ifoto (Screenshot)'}</span>
                        </label>
                        {screenshotData && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Photo Attached
                          </span>
                        )}
                      </div>

                      <div className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                        screenshotData ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-300 hover:border-orange-400 bg-white'
                      }`}>
                        <input
                          type="file"
                          id="receipt-file-upload"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="receipt-file-upload"
                          className="flex flex-col items-center justify-center cursor-pointer gap-2 py-2"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            screenshotData ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-50 text-orange-600'
                          }`}>
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">
                              {screenshotData ? 'Change Payment Screenshot' : 'Click to select screenshot image'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              PNG, JPG, WEBP up to 8MB
                            </span>
                          </div>
                        </label>

                        {screenshotData && (
                          <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between gap-2 text-left">
                            <div className="flex items-center gap-2 min-w-0">
                              <img
                                src={screenshotData}
                                alt="Receipt preview"
                                className="h-12 w-12 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                              <div className="truncate">
                                <span className="text-xs font-bold text-slate-900 block truncate">
                                  {fileName || 'Payment_Screenshot.jpg'}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-bold block">
                                  Ready to upload
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setScreenshotData(null);
                                setFileName(null);
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OPTION 2: Paste Payment SMS Message */}
                  {(proofTab === 'both' || proofTab === 'sms') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-orange-600" />
                          <span>2. {currentLang === 'en' ? 'Paste Payment Confirmation Message' : 'Koporora Ubutumwa bwa SMS'}</span>
                        </label>
                        <button
                          type="button"
                          onClick={handlePasteSampleSms}
                          className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Sample SMS</span>
                        </button>
                      </div>

                      <div className="relative">
                        <textarea
                          rows={screenshotData ? 4 : 5}
                          value={confirmationMessage}
                          onChange={(e) => handleMessageChange(e.target.value)}
                          placeholder={
                            currentLang === 'en'
                              ? "Paste your MTN MoMo or Airtel Money SMS here (e.g., 'Y'ello! You have transferred 35,000 RWF to Ruth (0780022600)... TxId: 981273921' or '*165*...')"
                              : "Koporora hano ubutumwa bwa SMS wakiriye kuri telefone yawe (Urugero: 'Mwungutse amafaranga... TxId: 981273921')..."
                          }
                          className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 bg-white font-mono leading-relaxed"
                        />

                        {detectedTxn && (
                          <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] flex items-center justify-between text-emerald-900">
                            <span className="flex items-center gap-1.5 font-medium">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Detected Txn ID: <strong className="font-mono">{detectedTxn}</strong>
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold uppercase">Auto-filled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Explicit Transaction ID Field */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      Transaction Reference / ID
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Auto-detected from message or typed manually
                    </span>
                  </div>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. TXN-192847581 or MOMO-982173"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 bg-white"
                  />
                </div>
              </div>

              {/* Support & Receiver Desk Reference */}
              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 border border-slate-200">
                <span>Official Receiver: <strong>Ruth (0780022600 / 2328354)</strong></span>
                <a
                  href={`https://wa.me/250780022600?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Payment Support (+250 780 022 600)</span>
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.submitting}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>
                      {currentLang === 'en'
                        ? 'Submit Payment for Admin Verification'
                        : 'Ohereza Gihamya yo Kwishyura ku Ubuyobozi'}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
