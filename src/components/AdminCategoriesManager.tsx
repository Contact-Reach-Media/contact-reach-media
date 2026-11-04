import React, { useState, useMemo } from 'react';
import {
  FolderTree, Plus, Edit, Trash2, ChevronDown, ChevronRight, Search,
  RefreshCw, Layers, Tag, ArrowRight, Sparkles, AlertTriangle, Check,
  CheckCircle2, X, MoveRight, Eye, Grid, List, ShieldAlert, Image as ImageIcon
} from 'lucide-react';
import { Category, Product } from '../types.ts';
import { api } from '../services/api.ts';
import { MAIN_CATEGORY_DEFINITIONS, mapProductToCategoryHierarchy } from '../data/categoryStructure.ts';

interface AdminCategoriesManagerProps {
  categories: Category[];
  products: Product[];
  onRefresh: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminCategoriesManager: React.FC<AdminCategoriesManagerProps> = ({
  categories,
  products,
  onRefresh,
  showToast
}) => {
  const [viewMode, setViewMode] = useState<'tree' | 'grid' | 'review'>('tree');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    clothing: true,
    shoes: true,
    'luggage-bags': true
  });

  // Modal States
  const [categoryModalMode, setCategoryModalMode] = useState<'create-main' | 'create-sub' | 'edit' | null>(null);
  const [targetCategory, setTargetCategory] = useState<Category | null>(null);
  const [parentCatId, setParentCatId] = useState<string>('clothing');
  const [formNameEn, setFormNameEn] = useState('');
  const [formNameRw, setFormNameRw] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formIcon, setFormIcon] = useState('Tag');
  const [formImage, setFormImage] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Move Modal State
  const [moveModalCat, setMoveModalCat] = useState<Category | null>(null);
  const [moveTargetParentId, setMoveTargetParentId] = useState<string>('');
  const [movingCat, setMovingCat] = useState(false);

  // Delete Modal State
  const [deleteModalCat, setDeleteModalCat] = useState<Category | null>(null);
  const [deleteReassignTo, setDeleteReassignTo] = useState<string>('');
  const [deletingCat, setDeletingCat] = useState(false);

  // Auto-map State
  const [isAutoMapping, setIsAutoMapping] = useState(false);

  // Review List State
  const [reviewFilter, setReviewFilter] = useState<'all' | 'unassigned' | 'low-confidence'>('all');
  const [reassigningProdId, setReassigningProdId] = useState<string | null>(null);
  const [selectedMainForReassign, setSelectedMainForReassign] = useState<Record<string, string>>({});
  const [selectedSubForReassign, setSelectedSubForReassign] = useState<Record<string, string>>({});

  // Main Categories (level 1)
  const mainCategories = useMemo(() => {
    return categories
      .filter(c => c.level === 1 || !c.parentId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [categories]);

  // Subcategories grouped by parentId
  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, Category[]>();
    categories
      .filter(c => c.level === 2 && c.parentId)
      .forEach(sub => {
        const pId = sub.parentId!;
        if (!map.has(pId)) map.set(pId, []);
        map.get(pId)!.push(sub);
      });
    return map;
  }, [categories]);

  // Product Counts Map
  const productCountByMainCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const catKey = p.mainCategoryId || p.category;
      if (catKey) {
        counts[catKey] = (counts[catKey] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const productCountBySubCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.subCategoryId) {
        counts[p.subCategoryId] = (counts[p.subCategoryId] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Products for review (missing mainCategoryId or mapped with low confidence)
  const reviewProducts = useMemo(() => {
    return products.filter(p => {
      const hasMain = Boolean(p.mainCategoryId && mainCategories.some(m => m.id === p.mainCategoryId));
      const hasSub = Boolean(p.subCategoryId);
      if (reviewFilter === 'unassigned') {
        return !hasMain || !hasSub;
      }
      return !hasMain || !hasSub || p.category === 'all';
    });
  }, [products, mainCategories, reviewFilter]);

  const toggleExpand = (catId: string) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleOpenCreateMain = () => {
    setCategoryModalMode('create-main');
    setTargetCategory(null);
    setFormNameEn('');
    setFormNameRw('');
    setFormDesc('');
    setFormIcon('Tag');
    setFormImage('');
  };

  const handleOpenCreateSub = (defaultParentId?: string) => {
    setCategoryModalMode('create-sub');
    setTargetCategory(null);
    setParentCatId(defaultParentId || mainCategories[0]?.id || 'clothing');
    setFormNameEn('');
    setFormNameRw('');
    setFormDesc('');
    setFormIcon('Tag');
    setFormImage('');
  };

  const handleOpenEdit = (cat: Category) => {
    setCategoryModalMode('edit');
    setTargetCategory(cat);
    setParentCatId(cat.parentId || '');
    setFormNameEn(cat.nameEn);
    setFormNameRw(cat.nameRw || '');
    setFormDesc(cat.description || '');
    setFormIcon(cat.icon || 'Tag');
    setFormImage(cat.imageUrl || '');
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameEn.trim()) {
      showToast('Category name in English is required', 'error');
      return;
    }

    setSavingCategory(true);
    try {
      if (categoryModalMode === 'edit' && targetCategory) {
        await api.adminUpdateCategory(targetCategory.id, {
          nameEn: formNameEn.trim(),
          nameRw: formNameRw.trim() || formNameEn.trim(),
          description: formDesc.trim(),
          icon: formIcon,
          imageUrl: formImage.trim() || undefined
        });
        showToast(`Category "${formNameEn}" updated successfully!`, 'success');
      } else {
        const isSub = categoryModalMode === 'create-sub';
        await api.adminAddCategory({
          nameEn: formNameEn.trim(),
          nameRw: formNameRw.trim() || formNameEn.trim(),
          description: formDesc.trim(),
          icon: formIcon,
          imageUrl: formImage.trim() || undefined,
          level: isSub ? 2 : 1,
          parentId: isSub ? parentCatId : null
        });
        showToast(
          isSub
            ? `Subcategory "${formNameEn}" created under ${parentCatId}!`
            : `Main category "${formNameEn}" created!`,
          'success'
        );
      }
      setCategoryModalMode(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleOpenMove = (cat: Category) => {
    setMoveModalCat(cat);
    const initialTarget = mainCategories.find(m => m.id !== cat.parentId)?.id || '';
    setMoveTargetParentId(initialTarget);
  };

  const handleConfirmMove = async () => {
    if (!moveModalCat || !moveTargetParentId) return;
    setMovingCat(true);
    try {
      await api.adminMoveCategory(moveModalCat.id, moveTargetParentId);
      showToast(`Moved "${moveModalCat.nameEn}" to target department!`, 'success');
      setMoveModalCat(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to move category', 'error');
    } finally {
      setMovingCat(false);
    }
  };

  const handleOpenDelete = (cat: Category) => {
    const count = cat.level === 1
      ? (productCountByMainCategory[cat.id] || 0)
      : (productCountBySubCategory[cat.id] || 0);

    setDeleteModalCat(cat);
    const fallbackTarget = mainCategories.find(m => m.id !== cat.id)?.id || 'clothing';
    setDeleteReassignTo(fallbackTarget);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalCat) return;
    setDeletingCat(true);
    try {
      await api.adminDeleteCategory(deleteModalCat.id, deleteReassignTo || undefined);
      showToast(`Category "${deleteModalCat.nameEn}" deleted.`, 'success');
      setDeleteModalCat(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
    } finally {
      setDeletingCat(false);
    }
  };

  const handleAutoMapAll = async () => {
    setIsAutoMapping(true);
    try {
      const res = await api.adminAutoMapCategories();
      showToast(`Category auto-mapping complete! ${res.updatedCount || 0} products verified.`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to auto-map products', 'error');
    } finally {
      setIsAutoMapping(false);
    }
  };

  const handleQuickReassign = async (product: Product, mainId: string, subId?: string) => {
    setReassigningProdId(product.id);
    try {
      const mainCat = mainCategories.find(m => m.id === mainId);
      const subCat = categories.find(c => c.id === subId);

      await api.adminUpdateProduct(product.id, {
        category: mainId,
        mainCategoryId: mainId,
        categoryName: mainCat?.nameEn || mainId,
        subCategoryId: subId || undefined,
        subCategoryName: subCat?.nameEn || undefined
      });
      showToast(`Reassigned "${product.name.slice(0, 20)}..." to ${mainCat?.nameEn}!`, 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to reassign product', 'error');
    } finally {
      setReassigningProdId(null);
    }
  };

  // Filter main categories by search query
  const filteredMainCategories = useMemo(() => {
    if (!searchQuery.trim()) return mainCategories;
    const q = searchQuery.toLowerCase().trim();
    return mainCategories.filter(main => {
      const matchName = main.nameEn.toLowerCase().includes(q) || (main.nameRw && main.nameRw.toLowerCase().includes(q));
      const subs = subcategoriesByParent.get(main.id) || [];
      const matchSub = subs.some(s => s.nameEn.toLowerCase().includes(q) || (s.nameRw && s.nameRw.toLowerCase().includes(q)));
      return matchName || matchSub;
    });
  }, [mainCategories, subcategoriesByParent, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & METRICS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF6000] text-xs font-black uppercase tracking-wider">
                KiKUU Rwanda Hierarchy
              </span>
              <span className="text-xs font-bold text-slate-500">
                13 Official Departments
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Category & Subcategory Hierarchy
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict 3-level structure: Main Category &rarr; Subcategory &rarr; Product. All catalog items map directly into these departments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleAutoMapAll}
              disabled={isAutoMapping}
              className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-2xl shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 text-amber-400 ${isAutoMapping ? 'animate-spin' : ''}`} />
              <span>{isAutoMapping ? 'Mapping All 422+ Products...' : 'Auto-Map Products'}</span>
            </button>

            <button
              onClick={() => handleOpenCreateSub()}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 text-[#FF6000]" />
              <span>+ Subcategory</span>
            </button>

            <button
              onClick={handleOpenCreateMain}
              className="px-4 py-2.5 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-2xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Main Category</span>
            </button>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Main Departments</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">{mainCategories.length}</span>
            <span className="text-[10px] text-slate-500 font-medium">Clothing to Automobile</span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Total Subcategories</span>
            <span className="text-xl font-black text-slate-900 mt-0.5 block">
              {categories.filter(c => c.level === 2).length}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Nested category tiers</span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Catalog Products</span>
            <span className="text-xl font-black text-emerald-600 mt-0.5 block">{products.length}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Protected & Preserved</span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Needs Review</span>
            <span className="text-xl font-black text-amber-600 mt-0.5 block">{reviewProducts.length}</span>
            <span className="text-[10px] text-slate-500 font-medium">
              {reviewProducts.length === 0 ? 'All mapped!' : 'Needs category check'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. CONTROLS BAR: SEARCH & VIEW MODES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search departments, subcategories or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-orange-500 bg-slate-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'tree'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5 text-[#FF6000]" />
            <span>Tree Hierarchy</span>
          </button>

          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5 text-blue-500" />
            <span>Department Cards</span>
          </button>

          <button
            onClick={() => setViewMode('review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'review'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
            <span>Review List ({reviewProducts.length})</span>
          </button>
        </div>
      </div>

      {/* 3. VIEW: TREE HIERARCHY */}
      {viewMode === 'tree' && (
        <div className="space-y-3">
          {filteredMainCategories.map((main, index) => {
            const subs = subcategoriesByParent.get(main.id) || [];
            const isExpanded = Boolean(expandedCats[main.id]);
            const mainCount = productCountByMainCategory[main.id] || 0;

            return (
              <div
                key={main.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
              >
                {/* Main Category Header Row */}
                <div className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => toggleExpand(main.id)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img
                        src={main.imageUrl || (main as any).image || 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=200&q=80'}
                        alt={main.nameEn}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-orange-100 text-[#FF6000] font-black text-[10px] flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900 truncate">
                          {main.nameEn}
                        </h3>
                        {main.nameRw && (
                          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                            ({main.nameRw})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                        {main.description || `Department ${main.nameEn}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-orange-50 text-[#FF6000] border border-orange-200">
                      {mainCount} products
                    </span>
                    <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 hidden md:inline">
                      {subs.length} subcategories
                    </span>

                    <button
                      onClick={() => handleOpenCreateSub(main.id)}
                      title="Add subcategory to this department"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-[#FF6000] text-slate-600 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(main)}
                      title="Edit department name & photo"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenDelete(main)}
                      title="Delete department"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subcategories Child Accordion */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 pl-12 space-y-2">
                    {subs.length === 0 ? (
                      <div className="py-3 px-4 bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 flex items-center justify-between">
                        <span>No subcategories created yet for this department.</span>
                        <button
                          onClick={() => handleOpenCreateSub(main.id)}
                          className="font-bold text-[#FF6000] hover:underline"
                        >
                          + Add first subcategory
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {subs.map(sub => {
                          const subCount = productCountBySubCategory[sub.id] || 0;
                          return (
                            <div
                              key={sub.id}
                              className="bg-white rounded-xl border border-slate-200/80 p-3 flex items-center justify-between gap-3 shadow-2xs hover:border-orange-200 transition-all"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-[#FF6000]" />
                                  <h4 className="font-bold text-xs text-slate-800 truncate">
                                    {sub.nameEn}
                                  </h4>
                                </div>
                                {sub.subcategoriesList && sub.subcategoriesList.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                    {sub.subcategoriesList.slice(0, 4).map((tag, tIdx) => {
                                      const label = typeof tag === 'string' ? tag : (tag as any).name || String(tag);
                                      return (
                                        <span
                                          key={tIdx}
                                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium truncate max-w-[100px]"
                                        >
                                          {label}
                                        </span>
                                      );
                                    })}
                                    {sub.subcategoriesList.length > 4 && (
                                      <span className="text-[9px] text-slate-400 font-bold">
                                        +{sub.subcategoriesList.length - 4}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                                  {subCount} items
                                </span>

                                <button
                                  onClick={() => handleOpenMove(sub)}
                                  title="Move to another main department"
                                  className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                  <MoveRight className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleOpenEdit(sub)}
                                  title="Edit subcategory"
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleOpenDelete(sub)}
                                  title="Delete subcategory (with reassignment)"
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. VIEW: DEPARTMENT CARDS GRID */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMainCategories.map((main) => {
            const subs = subcategoriesByParent.get(main.id) || [];
            const mainCount = productCountByMainCategory[main.id] || 0;

            return (
              <div
                key={main.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
                    <img
                      src={main.imageUrl || (main as any).image || 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=500&q=80'}
                      alt={main.nameEn}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300">
                          Main Department
                        </span>
                        <h3 className="text-base font-black leading-tight">{main.nameEn}</h3>
                        {main.nameRw && (
                          <span className="text-xs text-slate-200 font-medium">{main.nameRw}</span>
                        )}
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#FF6000] text-white shadow-xs">
                        {mainCount} products
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {main.description || `Organized department for ${main.nameEn}`}
                    </p>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
                        Subcategories ({subs.length})
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {subs.map(sub => (
                          <span
                            key={sub.id}
                            className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <span>{sub.nameEn}</span>
                            <span className="text-[9px] font-mono text-slate-400">
                              ({productCountBySubCategory[sub.id] || 0})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleOpenCreateSub(main.id)}
                    className="font-bold text-[#FF6000] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Sub</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(main)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-bold border border-slate-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleOpenDelete(main)}
                      className="text-rose-600 hover:text-rose-700 font-bold px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. VIEW: REVIEW / UNMAPPED PRODUCTS */}
      {viewMode === 'review' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Products Review & Direct Assignment Queue
              </h2>
              <p className="text-xs text-slate-500">
                Review products that need department assignment. All 422+ products are safely preserved.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setReviewFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  reviewFilter === 'all'
                    ? 'bg-[#FF6000] text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                Needs Review ({reviewProducts.length})
              </button>
              <button
                onClick={handleAutoMapAll}
                className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white hover:bg-black flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Run Intelligent Auto-Mapper</span>
              </button>
            </div>
          </div>

          {reviewProducts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-extrabold text-slate-800 text-sm">All Products Successfully Categorized!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Every single product in ContactReach Market is currently mapped to an active main department and subcategory.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-black text-[10px]">
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Current Category</th>
                    <th className="py-2.5 px-3">Suggested Department</th>
                    <th className="py-2.5 px-3">Assign Main Category</th>
                    <th className="py-2.5 px-3">Assign Subcategory</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reviewProducts.slice(0, 50).map(product => {
                    const suggestion = mapProductToCategoryHierarchy(product);
                    const chosenMain = selectedMainForReassign[product.id] || suggestion.mainCategoryId || 'clothing';
                    const mainSubs = subcategoriesByParent.get(chosenMain) || [];
                    const chosenSub = selectedSubForReassign[product.id] || mainSubs[0]?.id || '';

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5 max-w-xs">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{product.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {product.price.toLocaleString()} RWF
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {product.category || 'None'}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="text-slate-800 font-bold truncate max-w-[130px]">
                              {suggestion.categoryName} &rarr; {suggestion.subCategoryName}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={chosenMain}
                            onChange={(e) => {
                              setSelectedMainForReassign(prev => ({ ...prev, [product.id]: e.target.value }));
                            }}
                            className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                          >
                            {mainCategories.map(m => (
                              <option key={m.id} value={m.id}>{m.nameEn}</option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={chosenSub}
                            onChange={(e) => {
                              setSelectedSubForReassign(prev => ({ ...prev, [product.id]: e.target.value }));
                            }}
                            className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                          >
                            <option value="">-- No Subcategory --</option>
                            {mainSubs.map(s => (
                              <option key={s.id} value={s.id}>{s.nameEn}</option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleQuickReassign(product, chosenMain, chosenSub)}
                            disabled={reassigningProdId === product.id}
                            className="px-3 py-1 bg-[#FF6000] hover:bg-[#e05500] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {reassigningProdId === product.id ? 'Saving...' : 'Confirm'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {reviewProducts.length > 50 && (
                <div className="py-3 text-center text-xs text-slate-400">
                  Showing first 50 items needing review. Use "Run Intelligent Auto-Mapper" to map all products in bulk.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT CATEGORY */}
      {categoryModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">
                {categoryModalMode === 'create-main' && 'Create Main Category'}
                {categoryModalMode === 'create-sub' && 'Create Subcategory'}
                {categoryModalMode === 'edit' && `Edit Category: ${targetCategory?.nameEn}`}
              </h3>
              <button
                onClick={() => setCategoryModalMode(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5 text-xs">
              {/* If creating subcategory, select parent */}
              {categoryModalMode === 'create-sub' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Parent Department (Main Category) *
                  </label>
                  <select
                    value={parentCatId}
                    onChange={(e) => setParentCatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    {mainCategories.map(m => (
                      <option key={m.id} value={m.id}>{m.nameEn} ({m.nameRw})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Name in English *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Women's Clothing"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Name in Kinyarwanda
                </label>
                <input
                  type="text"
                  placeholder="e.g. Imyenda y'abategarugori"
                  value={formNameRw}
                  onChange={(e) => setFormNameRw(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Department details for customers..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Custom Cover Photo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave blank to auto-use top product pictures or official default photography.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryModalMode(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="px-5 py-2 bg-[#FF6000] hover:bg-[#e05500] text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingCategory ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVE SUBCATEGORY */}
      {moveModalCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-base text-slate-900">
                Move Subcategory to New Department
              </h3>
              <button
                onClick={() => setMoveModalCat(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Move <strong>"{moveModalCat.nameEn}"</strong> to a different main department. Products linked to this subcategory will automatically reflect the new parent department.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select New Parent Department *
                </label>
                <select
                  value={moveTargetParentId}
                  onChange={(e) => setMoveTargetParentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-orange-500"
                >
                  {mainCategories
                    .filter(m => m.id !== moveModalCat.parentId)
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.nameEn} ({m.nameRw})</option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMoveModalCat(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMove}
                  disabled={movingCat || !moveTargetParentId}
                  className="px-5 py-2 bg-[#FF6000] hover:bg-[#e05500] text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {movingCat ? 'Moving...' : 'Confirm Move'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CATEGORY WITH REASSIGNMENT PROTECTION */}
      {deleteModalCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 pb-3 border-b border-slate-100">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Delete Category: {deleteModalCat.nameEn}
                </h3>
                <span className="text-[11px] text-rose-600 font-bold">
                  Accidental Deletion & Product Protection Guard
                </span>
              </div>
            </div>

            <div className="bg-rose-50 rounded-2xl p-3 border border-rose-100 text-xs text-rose-800 space-y-1">
              <p className="font-bold">
                Linked Products Count:{' '}
                {deleteModalCat.level === 1
                  ? (productCountByMainCategory[deleteModalCat.id] || 0)
                  : (productCountBySubCategory[deleteModalCat.id] || 0)}
              </p>
              <p className="text-[11px] leading-relaxed">
                ContactReach Market guarantees that existing products are never deleted or corrupted. Please pick a replacement category to safely reassign any linked products before deleting this category.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reassign Linked Products To: *
                </label>
                <select
                  value={deleteReassignTo}
                  onChange={(e) => setDeleteReassignTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold bg-white focus:ring-2 focus:ring-orange-500"
                >
                  {mainCategories
                    .filter(m => m.id !== deleteModalCat.id)
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.nameEn} ({m.nameRw})</option>
                    ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalCat(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deletingCat}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {deletingCat ? 'Reassigning & Deleting...' : 'Reassign & Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
