import React from 'react';
import { Search, ShoppingCart, CreditCard, ShieldCheck, Truck, ChevronRight } from 'lucide-react';
import { Language, translations } from '../translations.ts';

interface HowToBuySectionProps {
  currentLang: Language;
  onStartShopping: () => void;
}

export const HowToBuySection: React.FC<HowToBuySectionProps> = ({ currentLang, onStartShopping }) => {
  const t = translations[currentLang];

  const steps = [
    {
      step: '01',
      icon: Search,
      titleEn: 'Discover Products',
      titleRw: 'Shakisha Ibicuruzwa',
      descEn: 'Browse our diverse categories or use the search bar to find genuine cosmetics, smartphones, televisions, and fashion items at unbeatable prices.',
      descRw: 'Reba ibyiciro byinshi by\'ibicuruzwa kandi ukoreshe akabuto ko gushakisha kugira ngo ubone ibyo ushaka byihuse.'
    },
    {
      step: '02',
      icon: ShoppingCart,
      titleEn: 'Add to Cart or Buy Now',
      titleRw: 'Shyira mu Gatebo',
      descEn: 'Select your preferred quantity, check availability, and add items to your cart or click "Buy Now" for immediate single-item checkout.',
      descRw: 'Nimara kubona igicuruzwa ukunda, kanda "Shyira mu Gatebo" cyangwa "Gura Nonaha". Ushobora guhindura ingano igihe cyose.'
    },
    {
      step: '03',
      icon: Truck,
      titleEn: 'Enter Delivery Location',
      titleRw: 'Komeza Kugura',
      descEn: 'Provide your name, contact phone number, and delivery address in Kigali (same-day) or upcountry provinces across Rwanda.',
      descRw: 'Jya mu gatebo hanyuma ukande "Kugura". Uzabazwa amazina yawe, aho uherereye n\'aho biba bigomba kugezwa.'
    },
    {
      step: '04',
      icon: CreditCard,
      titleEn: 'Pay via Mobile Money USSD',
      titleRw: 'Kwishyura kuri USSD ya Telefoni',
      descEn: 'USSD opens automatically in your phone dialer! Supports MTN MoMo direct (*182*1*1*078002260*AMOUNT#), MTN MoMoPay merchant (*182*8*1*078002*AMOUNT#), and Airtel Money (*182*1*2*078002260*AMOUNT#).',
      descRw: 'Kode ya USSD ifunguka mu buryo bwikora kuri telefoni yawe! MTN MoMo (*182*1*1*078002260*AMOUNT#), MTN MoMoPay (*182*8*1*078002*AMOUNT#) na Airtel Money (*182*1*2*078002260*AMOUNT#).'
    },
    {
      step: '05',
      icon: ShieldCheck,
      titleEn: 'Confirm & Receive Order',
      titleRw: 'Kubikugezaho Byihuse',
      descEn: 'Click "I Have Already Paid" to submit your SMS transaction reference. Our team verifies payments promptly and delivers your order safely to your door.',
      descRw: 'Kanda "Narangije Kwishyura" wohereze nimero ya transaction. Ikipe yacu ihita ibyemeza maze igicuruzwa kigerezwe aho uri.'
    }
  ];

  return (
    <section className="py-12 sm:py-16 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#EA580C] uppercase tracking-wider block mb-2">
            Simple 5-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {currentLang === 'en' ? 'How to Shop on ContactReach Market' : 'Uburyo bwo Kugura kuri ContactReach'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            {currentLang === 'en'
              ? 'Fast, transparent, and completely secure shopping with Rwanda’s leading mobile money providers.'
              : 'Kugura kuri twe ni byihuse, byoroshye kandi bitekanye. Kurikiza izi ntambwe zoroshye ugure ibyo wifuza.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="group relative bg-[#F8F9FA] hover:bg-orange-50/50 p-5 rounded-2xl border border-slate-200 transition-all duration-300 hover:shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#EA580C] shadow-2xs group-hover:bg-[#EA580C] group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs font-black text-slate-300 group-hover:text-orange-400">
                      {s.step}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">
                    {currentLang === 'en' ? s.titleEn : s.titleRw}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {currentLang === 'en' ? s.descEn : s.descRw}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={onStartShopping}
            className="inline-flex items-center gap-2 py-3.5 px-6 rounded-xl font-bold text-xs sm:text-sm bg-[#EA580C] hover:bg-[#D94F04] text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer"
          >
            <span>{t.shopNow}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
