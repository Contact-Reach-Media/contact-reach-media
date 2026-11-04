import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight, ChevronDown, Search, X, Sparkles, Shirt, Footprints,
  Briefcase, Watch, Baby, Home, HeartHandshake, Crown, Smartphone,
  Tv, Laptop, Wrench, ArrowRight, Grid, Tag
} from 'lucide-react';
import { MAIN_CATEGORY_DEFINITIONS } from '../data/categoryStructure.ts';
import { Language } from '../translations.ts';

// Dynamic Lucide icon mapper
export const getCategoryIcon = (iconName: string, className = 'w-4 h-4') => {
  switch (iconName?.toLowerCase()) {
    case 'shirt': return <Shirt className={className} />;
    case 'footprints': return <Footprints className={className} />;
    case 'briefcase': return <Briefcase className={className} />;
    case 'watch': return <Watch className={className} />;
    case 'baby': return <Baby className={className} />;
    case 'home': return <Home className={className} />;
    case 'sparkles': return <Sparkles className={className} />;
    case 'hearthandshake': return <HeartHandshake className={className} />;
    case 'crown': return <Crown className={className} />;
    case 'smartphone': return <Smartphone className={className} />;
    case 'tv': return <Tv className={className} />;
    case 'laptop': return <Laptop className={className} />;
    case 'wrench': return <Wrench className={className} />;
    default: return <Tag className={className} />;
  }
};

interface CategoryMegaMenuProps {
  currentLang: Language;
  onSelectCategory: (mainCatId: string, subCatId?: string, searchTag?: string) => void;
  isOpen: boolean;
  onClose: () => void;
  selectedCategory?: string;
  productCounts?: Record<string, number>;
}

export const CategoryMegaMenu: React.FC<CategoryMegaMenuProps> = ({
  currentLang,
  onSelectCategory,
  isOpen,
  onClose,
  productCounts = {}
}) => {
  const [activeMainId, setActiveMainId] = useState<string>(MAIN_CATEGORY_DEFINITIONS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter categories and subcategories based on search input
  const filteredCategories = MAIN_CATEGORY_DEFINITIONS.filter(cat => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (cat.name.toLowerCase().includes(q) || cat.nameRw.toLowerCase().includes(q)) return true;
    return cat.subcategories.some(sub =>
      sub.name.toLowerCase().includes(q) ||
      sub.items.some(item => item.toLowerCase().includes(q))
    );
  });

  const activeCategory = MAIN_CATEGORY_DEFINITIONS.find(c => c.id === activeMainId) || MAIN_CATEGORY_DEFINITIONS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-20 px-2 sm:px-4 animate-in fade-in duration-200">
      <div
        ref={menuRef}
        className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      >
        {/* TOP BAR: Header, Search & Close */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF6000] text-white flex items-center justify-center shadow-md">
              <Grid className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-2">
                <span>{currentLang === 'en' ? 'All 13 Product Categories' : 'Ibyiciro Byose (13)'}</span>
                <span className="text-[10px] bg-orange-500/30 text-orange-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-orange-400/30">
                  KiKUU Style
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {currentLang === 'en' ? 'Browse complete ContactReach Market department directory' : 'Hitamo icyiciro wifuza muri ContactReach Market'}
              </p>
            </div>
          </div>

          {/* Category Search Input */}
          <div className="relative flex-1 max-w-xs sm:max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              placeholder={currentLang === 'en' ? 'Search categories, dresses, electronics...' : 'Shakisha ibyiciro...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-8 pe-8 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6000]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute end-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close category menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MAIN BODY: 2-COLUMN MEGA MENU (LEFT SIDEBAR + RIGHT MEGA PANEL) */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0 bg-slate-50/50">
          {/* LEFT COLUMN: 13 MAIN CATEGORIES LIST */}
          <div className="w-full md:w-72 lg:w-80 bg-white border-r border-slate-200 overflow-y-auto divide-y divide-slate-100 shrink-0">
            {filteredCategories.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-600">No category matched "{searchQuery}"</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-[#FF6000] hover:underline font-bold"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredCategories.map((cat, idx) => {
                const isActive = cat.id === activeMainId;
                const count = productCounts[cat.id] ?? 0;

                return (
                  <button
                    key={cat.id}
                    onMouseEnter={() => setActiveMainId(cat.id)}
                    onClick={() => {
                      setActiveMainId(cat.id);
                      // On mobile screen, clicking opens category or navigates
                      if (window.innerWidth < 768) {
                        onSelectCategory(cat.id);
                        onClose();
                      }
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-orange-50/90 text-[#FF6000] font-black'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {/* Active Indicator Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF6000]" />
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-[#FF6000] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-orange-100 group-hover:text-[#FF6000]'
                      }`}>
                        {getCategoryIcon(cat.icon, 'w-4 h-4')}
                      </span>
                      <div className="min-w-0 truncate">
                        <span className="text-xs font-bold block truncate">
                          {idx + 1}. {currentLang === 'en' ? cat.name : cat.nameRw}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal block truncate">
                          {currentLang === 'en' ? cat.nameRw : cat.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {count > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {count}
                        </span>
                      )}
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
                        isActive ? 'text-[#FF6000] translate-x-0.5' : 'text-slate-300 group-hover:text-slate-400'
                      }`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* RIGHT COLUMN: EXPANDED SUBCATEGORIES MEGA PANEL */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#FAFAFA]">
            {activeCategory && (
              <div className="space-y-6">
                {/* Header for Active Main Category */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={activeCategory.image}
                      alt={activeCategory.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                          {currentLang === 'en' ? activeCategory.name : activeCategory.nameRw}
                        </span>
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          ({currentLang === 'en' ? activeCategory.nameRw : activeCategory.name})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 max-w-xl">
                        {activeCategory.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectCategory(activeCategory.id);
                      onClose();
                    }}
                    className="self-start sm:self-auto px-4 py-2 bg-[#FF6000] hover:bg-[#E54D00] text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <span>View All {activeCategory.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Grid of Subcategories & Child Items */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeCategory.subcategories.map((sub) => {
                    const subId = `${activeCategory.id}-${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

                    return (
                      <div
                        key={sub.name}
                        className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs hover:border-orange-300 transition-all group"
                      >
                        {/* Subcategory Title Button */}
                        <button
                          onClick={() => {
                            onSelectCategory(activeCategory.id, subId);
                            onClose();
                          }}
                          className="w-full text-left font-black text-xs sm:text-sm text-slate-900 group-hover:text-[#FF6000] flex items-center justify-between pb-2 mb-2 border-b border-slate-100 cursor-pointer"
                        >
                          <span className="truncate">{sub.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#FF6000] shrink-0" />
                        </button>

                        {/* Child Items / Tags (Level 3) */}
                        <div className="flex flex-wrap gap-1.5">
                          {sub.items.map((item) => (
                            <button
                              key={item}
                              onClick={() => {
                                onSelectCategory(activeCategory.id, subId, item);
                                onClose();
                              }}
                              className="text-[11px] font-medium text-slate-600 hover:text-[#FF6000] hover:bg-orange-50 px-2 py-0.5 rounded-md transition-colors cursor-pointer bg-slate-50 border border-slate-100/80"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM BAR: Quick Shortcuts */}
        <div className="px-5 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Quick Navigation:</span>
            <button
              onClick={() => {
                onSelectCategory('all');
                onClose();
              }}
              className="text-[#FF6000] hover:underline font-bold cursor-pointer"
            >
              Browse Full Catalog (All Products)
            </button>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Tip: Click any subcategory to filter instant products in stock.
          </span>
        </div>
      </div>
    </div>
  );
};
