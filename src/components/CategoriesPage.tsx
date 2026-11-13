import React, { useState } from 'react';
import {
  Grid, Search, ChevronRight, Tag, ArrowRight, ArrowLeft, Package
} from 'lucide-react';
import { resolveDepartmentDefinitions, MAIN_CATEGORY_DEFINITIONS } from '../data/categoryStructure.ts';
import { Category } from '../types.ts';
import { Language } from '../translations.ts';
import { useDynamicText } from '../services/translation.ts';

const CategoryTitle: React.FC<{ text: string; lang: Language }> = ({ text, lang }) => {
  const dynamic = useDynamicText(text, lang);
  return <>{dynamic || text}</>;
};

interface CategoriesPageProps {
  onSelectCategory: (mainCatId: string, subCatId?: string, searchTag?: string) => void;
  onNavigate: (view: string) => void;
  currentLang: Language;
  categories?: Category[];
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  onSelectCategory,
  onNavigate,
  currentLang,
  categories = []
}) => {
  const departments = React.useMemo(
    () => resolveDepartmentDefinitions(categories, true),
    [categories]
  );
  const [activeMainId, setActiveMainId] = useState<string>(MAIN_CATEGORY_DEFINITIONS[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = departments.filter(cat => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    if (cat.name.toLowerCase().includes(q) || cat.nameRw.toLowerCase().includes(q)) return true;
    return cat.subcategories.some(sub =>
      sub.name.toLowerCase().includes(q) ||
      sub.items.some(item => item.toLowerCase().includes(q))
    );
  });

  const activeCategory = departments.find(c => c.id === activeMainId) || departments[0];

  return (
    <div className="bg-slate-50 min-h-screen py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-orange-600 transition-colors font-medium cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <button
            onClick={() => onNavigate('shop')}
            className="hover:text-orange-600 transition-colors font-medium cursor-pointer"
          >
            Shop
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-900">All 13 Product Categories</span>
        </nav>

        {/* Page Title & Search */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Grid className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                All 13 Product Categories
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse complete ContactReach Market department directory across all categories and subcategories.
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category or item..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 bg-slate-50"
            />
          </div>
        </div>

        {/* Main 2-Column Department Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

          {/* Left Column: 13 Main Category Tabs (4 cols) */}
          <div className="md:col-span-4 bg-white rounded-3xl border border-slate-200/90 p-3 shadow-xs space-y-1">
            <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-100 mb-1">
              Main Departments (13)
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {filteredCategories.map(cat => {
                const isSelected = cat.id === activeMainId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveMainId(cat.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="truncate">
                        <CategoryTitle text={cat.name} lang={currentLang} />
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {cat.subcategories.length}
                      </span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Subcategories & Items Grid (8 cols) */}
          <div className="md:col-span-8 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">
                  Selected Department
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  <CategoryTitle text={activeCategory.name} lang={currentLang} />
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onSelectCategory(activeCategory.id)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                View All {activeCategory.name} &rarr;
              </button>
            </div>

            {/* Subcategories Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeCategory.subcategories.map(sub => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                >
                  <button
                    type="button"
                    onClick={() => onSelectCategory(activeCategory.id, sub.id)}
                    className="font-black text-xs text-slate-900 hover:text-orange-600 transition-colors flex items-center justify-between w-full text-left cursor-pointer"
                  >
                    <span>{sub.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-orange-600" />
                  </button>

                  <div className="flex flex-wrap gap-1.5">
                    {sub.items.map(it => (
                      <button
                        key={it}
                        type="button"
                        onClick={() => onSelectCategory(activeCategory.id, sub.id, it)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 hover:text-orange-600 hover:border-orange-300 transition-colors cursor-pointer"
                      >
                        {it}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
