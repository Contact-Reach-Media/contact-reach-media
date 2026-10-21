import React from 'react';
import {
  MessageCircle, Instagram, Facebook, Youtube, ArrowRight, Search
} from 'lucide-react';
import { AppSettings } from '../types.ts';
import { Language, translations } from '../translations.ts';

interface FooterProps {
  settings: AppSettings;
  currentLang: Language;
  onNavigate: (view: string) => void;
  onOpenAdmin: () => void;
  onRequestProduct: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  currentLang,
  onNavigate,
  onOpenAdmin,
  onRequestProduct
}) => {
  const t = translations[currentLang];

  const whatsappUrl = `https://wa.me/${settings.whatsAppNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
    'Hello ContactReach Support, I would like assistance with an order or product.'
  )}`;

  const [legalModal, setLegalModal] = React.useState<{ title: string; content: string } | null>(null);

  return (
    <footer className="bg-[#101114] text-white pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Brand Banner with Official Logo */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-8 mb-8 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-700 bg-white p-0.5 shadow-md shrink-0 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="ContactReach Market Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <h3 className="font-black text-lg sm:text-xl text-white tracking-tight leading-none">
                ContactReach <span className="text-[#FF6000]">Market</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Discover Products. Pay Easily. Shop with Confidence.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full">
            ContactReach Media Ltd · Kigali, Rwanda
          </span>
        </div>

        {/* Top Row: Customer Care & Follow Us (Matching Screenshot 5) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-10 border-b border-slate-800/80">
          <div className="space-y-2">
            <h4 className="font-extrabold text-sm sm:text-base text-white">
              Customer care
            </h4>
            <p className="text-xs text-slate-400">
              Need help? Our support team is available Mon–Sun, 9am–9pm.
            </p>
            <div className="pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold py-2.5 px-4 rounded-full shadow-xs transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Twandikire kuri WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="space-y-2 md:text-right">
            <span className="text-xs font-bold text-slate-400 block">Follow us</span>
            <div className="flex items-center gap-3 text-slate-300">
              <a
                href="https://instagram.com/@contactreachmedia"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com/@contactreachmedia"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://tiktok.com/@contactreachmedia"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-xs transition-colors"
                title="TikTok"
              >
                ♪
              </a>
              <a
                href="https://youtube.com/@contactreachmedia"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                title="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Navigation Columns (Matching Screenshot 5) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 py-10 text-xs">
          {/* Column 1: Company */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-white">Company</h4>
            <ul className="space-y-2 text-slate-400 font-medium">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors cursor-pointer">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Contact Us
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-to-buy')} className="hover:text-white transition-colors cursor-pointer">
                  How To Buy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Returns & Refunds Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Shop */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-sm text-white">Shop</h4>
            <ul className="space-y-2 text-slate-400 font-medium">
              <li>
                <button onClick={() => onNavigate('shop')} className="hover:text-white transition-colors cursor-pointer">
                  Products
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shops')} className="hover:text-white transition-colors cursor-pointer">
                  Shops
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop')} className="hover:text-white transition-colors cursor-pointer">
                  Cart
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('track-order')} className="hover:text-white transition-colors cursor-pointer">
                  Orders
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('shop')} className="hover:text-white transition-colors cursor-pointer">
                  Wishlist
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Customer Problems & Reports
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Service & SABA Card (Matching Screenshot 5) */}
          <div className="space-y-4 col-span-2 md:col-span-1">
            <h4 className="font-extrabold text-sm text-white">Customer Service</h4>

            {/* Special "SABA" Help Search Card from Screenshot 5 */}
            <div
              onClick={onRequestProduct}
              className="bg-white rounded-2xl p-3 text-slate-900 flex items-center justify-between gap-3 shadow-md hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FF6000] text-white flex flex-col items-center justify-center font-black text-[9px] leading-tight shrink-0">
                  <Search className="w-3.5 h-3.5 mb-0.5" />
                  <span>SABA</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    Ntiwabonye igicuruzwa kuri ContactReach?
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                    Tubwire icyo ukeneye
                  </span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <ul className="space-y-2 text-slate-400 font-medium">
              <li>
                <button onClick={() => onNavigate('track-order')} className="hover:text-white transition-colors cursor-pointer">
                  Profile & Orders
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Customer Support
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Returns & Refunds
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-white transition-colors cursor-pointer">
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Legal (Matching Screenshot 5) */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <p>© 2026 ContactReach Market. Powered by ContactReach Media Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLegalModal({
                title: 'Privacy Policy',
                content: 'All customer data, payment transaction IDs, and delivery addresses are encrypted and handled privately by ContactReach Media Ltd.'
              })}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>|</span>
            <button
              onClick={() => setLegalModal({
                title: 'Terms of Service',
                content: 'ContactReach Market provides genuine products with official MTN Mobile Money and Airtel verification by Ruth. All deliveries are coordinated directly in Kigali and provincial centers.'
              })}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>

        {/* Legal Info Dialog */}
        {legalModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-md w-full p-6 space-y-3 shadow-2xl">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="ContactReach Market" className="w-8 h-8 rounded-full border border-slate-700" />
                <h4 className="font-bold text-base">{legalModal.title}</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{legalModal.content}</p>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setLegalModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
