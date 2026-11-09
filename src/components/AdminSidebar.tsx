import React from 'react';
import {
  LayoutDashboard, Package, FolderTree, Store, ShoppingBag, CreditCard,
  Layers, Users, Mail, AlertTriangle, Tag, FileText, Settings, Shield,
  Globe, RefreshCw, DollarSign, ShieldCheck, X
} from 'lucide-react';

export type TabType =
  | 'overview'
  | 'products'
  | 'categories'
  | 'shops'
  | 'suppliers'
  | 'payouts'
  | 'orders'
  | 'payments'
  | 'inventory'
  | 'customers'
  | 'messages'
  | 'problems'
  | 'coupons'
  | 'audit'
  | 'team'
  | 'settings';

interface AdminSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  productsCount: number;
  categoriesCount: number;
  shopsCount: number;
  newOrdersCount: number;
  totalOrdersCount: number;
  pendingVerificationsCount: number;
  lowStockCount: number;
  unreadMessagesCount: number;
  unresolvedProblemsCount: number;
  customersCount: number;
  pendingSuppliersCount: number;
  pendingPayoutsCount: number;
  adminUsersCount: number;
  onCloseMobile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  productsCount,
  categoriesCount,
  shopsCount,
  newOrdersCount,
  totalOrdersCount,
  pendingVerificationsCount,
  lowStockCount,
  unreadMessagesCount,
  unresolvedProblemsCount,
  customersCount,
  pendingSuppliersCount,
  pendingPayoutsCount,
  adminUsersCount,
  onCloseMobile
}) => {
  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="admin-sidebar w-64 min-w-[16rem] max-w-[16rem] shrink-0 bg-white border-r border-slate-200/80 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-4">
        {onCloseMobile && (
          <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Navigation Menu</span>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* SECTION 1: OPERATIONS */}
        <div>
          <div className="px-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Operations
          </div>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => handleTabClick('overview')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('orders')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders & Delivery</span>
              </div>
              <div className="flex items-center gap-1">
                {newOrdersCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-rose-500 text-white animate-pulse">
                    {newOrdersCount}
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {totalOrdersCount}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('payments')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4" />
                <span>Payments & SMS</span>
              </div>
              {pendingVerificationsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500 text-white animate-pulse">
                  {pendingVerificationsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('customers')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Customers</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'customers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {customersCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('messages')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'messages'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" />
                <span>Customer Chat</span>
              </div>
              {unreadMessagesCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-[#FF6000] text-white animate-pulse">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('problems')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'problems'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Issues & Reports</span>
              </div>
              {unresolvedProblemsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-rose-600 text-white">
                  {unresolvedProblemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SECTION 2: CATALOG & INVENTORY */}
        <div>
          <div className="px-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Catalog & Stock
          </div>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => handleTabClick('products')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4" />
                <span>Products Catalog</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {productsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('categories')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderTree className="w-4 h-4" />
                <span>Categories</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {categoriesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('inventory')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Inventory & Stock</span>
              </div>
              {lowStockCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500 text-white">
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('shops')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'shops'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4" />
                <span>Registered Shops</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'shops' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {shopsCount}
              </span>
            </button>
          </div>
        </div>

        {/* SECTION 3: SOURCING & SUPPLIERS */}
        <div>
          <div className="px-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Suppliers & Sourcing
          </div>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => handleTabClick('suppliers')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-amber-500" />
                <span>Onboarding</span>
              </div>
              {pendingSuppliersCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500 text-white animate-pulse">
                  {pendingSuppliersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('payouts')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'payouts'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Supplier Payouts</span>
              </div>
              {pendingPayoutsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-emerald-600 text-white animate-pulse">
                  {pendingPayoutsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SECTION 4: ADMINISTRATION */}
        <div>
          <div className="px-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            System & Config
          </div>
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => handleTabClick('coupons')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'coupons'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4" />
                <span>Promo Codes</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('audit')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Audit Logs</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('team')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" />
                <span>Team & Roles</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'team' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {adminUsersCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('settings')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 mt-4 text-[10px] text-slate-400 space-y-0.5">
        <p className="font-bold text-slate-600">ContactReach Media Ltd</p>
        <p>Support: +250 780 022 600</p>
      </div>
    </aside>
  );
};
