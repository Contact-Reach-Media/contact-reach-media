import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Check, Globe, RotateCcw, Sparkles, Navigation } from 'lucide-react';
import { GOOGLE_LANGUAGES, GoogleLanguage } from '../data/languages.ts';
import { detectVisitorLanguage } from '../services/googleTranslate.ts';

interface SearchableLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: string;
  onSelectLanguage: (langCode: string) => void;
}

export const SearchableLanguageModal: React.FC<SearchableLanguageModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onSelectLanguage
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredLanguages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return GOOGLE_LANGUAGES.filter(lang => {
      // Region filter
      if (selectedRegion === 'popular' && !lang.popular) return false;
      if (selectedRegion !== 'all' && selectedRegion !== 'popular' && lang.region !== selectedRegion) return false;

      // Text search
      if (!q) return true;
      return (
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedRegion]);

  const currentLangObj = useMemo(() => {
    return GOOGLE_LANGUAGES.find(l => l.code === currentLang) || GOOGLE_LANGUAGES[0];
  }, [currentLang]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200 text-slate-800"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF6000] to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Select Website Language</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Google Powered
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                134+ languages supported with live real-time translation across all pages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="px-5 sm:px-6 pt-4 pb-2 flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 bg-slate-50/50 text-xs">
          {/* Reset to Original English Button */}
          <button
            type="button"
            onClick={() => {
              onSelectLanguage('en');
              onClose();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              currentLang === 'en'
                ? 'bg-orange-100 text-[#FF6000] border border-orange-200'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FF6000]" />
            <span>Reset to Original (English)</span>
            {currentLang === 'en' && <Check className="w-3 h-3 text-[#FF6000]" />}
          </button>

          {/* Auto-Detect Language Button */}
          <button
            type="button"
            onClick={() => {
              const detected = detectVisitorLanguage();
              onSelectLanguage(detected);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span>Detect My Language</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 sm:p-5 pb-3">
          <div className="relative">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by language, country, or native name (e.g. Kinyarwanda, French, Swahili, العربية)..."
              className="w-full ps-10 pe-9 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6000] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Region Filter Chips */}
        <div className="px-5 sm:px-6 pb-3 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold scrollbar-none">
          {[
            { id: 'all', label: `All (${GOOGLE_LANGUAGES.length})` },
            { id: 'popular', label: '⭐ Popular' },
            { id: 'Africa', label: '🌍 Africa' },
            { id: 'Europe', label: '🏰 Europe' },
            { id: 'Asia', label: '🌏 Asia' },
            { id: 'Middle East', label: '🕌 Middle East' },
            { id: 'Americas', label: '🌎 Americas' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedRegion(tab.id)}
              className={`px-3 py-1 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                selectedRegion === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Languages Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2 divide-y divide-slate-100">
          {filteredLanguages.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-semibold">No languages matched "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-bold text-[#FF6000] hover:underline cursor-pointer"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {filteredLanguages.map(lang => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      onSelectLanguage(lang.code);
                      onClose();
                    }}
                    className={`p-3 rounded-2xl flex items-center justify-between text-start transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-orange-50/80 border-[#FF6000] shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0 leading-none">{lang.flag}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#FF6000]' : 'text-slate-900'}`}>
                            {lang.nativeName}
                          </span>
                          {lang.dir === 'rtl' && (
                            <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-500">
                              RTL
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {lang.name} <span className="font-mono text-[10px]">({lang.code})</span>
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#FF6000] text-white flex items-center justify-center shrink-0 ms-1 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-sm">{currentLangObj.flag}</span>
            <span>Active: <strong className="text-slate-800">{currentLangObj.nativeName} ({currentLangObj.name})</strong></span>
          </div>
          <span className="text-[11px] text-slate-400">
            Powered by Google Cloud Translation
          </span>
        </div>
      </div>
    </div>
  );
};
