import React from 'react';
import {
  LayoutDashboard, Package, FolderTree, Store, ShoppingBag, CreditCard,
  Layers, Users, Mail, AlertTriangle, Tag, Settings, Shield,
  Globe, RefreshCw, DollarSign, ShieldCheck, X, ChevronLeft, ChevronRight,
  SlidersHorizontal, LayoutGrid
} from 'lucide-react';

export type TabType =
  | 'overview'
  | 'products'
  | 'categories'
  | 'shops'
  | 'suppliers'
  | 'payouts'
  | 'alibaba'
  | 'cjdropshipping'
  | 'dsers'
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSwitchToTabs?: () => void;
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
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  onSwitchToTabs,
}) => {
  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside
      className={`admin-sidebar ${
        isCollapsed ? 'admin-sidebar-collapsed w-16 min-w-[4rem] max-w-[4rem] p-2' : 'w-64 min-w-[16rem] max-w-[16rem] p-3 sm:p-4'
      } shrink-0 bg-white border-r border-slate-200/80 flex flex-col justify-between overflow-y-auto transition-all duration-200`}
    >
      <div className="space-y-3">
        {/* Mobile Close Button */}
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

        {/* Top Switcher Bar: Switch to Small Tabs / Collapse Sidebar */}
        <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-100">
          {!isCollapsed && onSwitchToTabs && (
            <button
              type="button"
              onClick={onSwitchToTabs}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#FF6000] text-[11px] font-bold border border-orange-200 transition-colors cursor-pointer"
              title="Convert navigation into horizontal Small Tabs at the top"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Small Tabs Mode</span>
            </button>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ${
                isCollapsed ? 'w-full flex items-center justify-center' : ''
              }`}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse to compact slim bar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* SECTION 1: OPERATIONS */}
        <div>
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Operations
            </div>
          )}
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => handleTabClick('overview')}
              title="Executive Overview"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Overview</span>}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('orders')}
              title={`Orders & Delivery (${totalOrdersCount})`}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 relative' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Orders & Delivery</span>}
              </div>
              {isCollapsed ? (
                newOrdersCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )
              ) : (
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
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('payments')}
              title="Payments & SMS Verifications"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 relative' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 shrink-0 text-emerald-600" />
                {!isCollapsed && <span>Payments & SMS</span>}
              </div>
              {isCollapsed ? (
                pendingVerificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )
              ) : (
                pendingVerificationsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500 text-white animate-pulse">
                    {pendingVerificationsCount}
                  </span>
                )
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('customers')}
              title="Customer Database"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 shrink-0 text-blue-600" />
                {!isCollapsed && <span>Customers</span>}
              </div>
              {!isCollapsed && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'customers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {customersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('messages')}
              title="Customer Inquiries & Messages"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 relative' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'messages'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 shrink-0 text-orange-500" />
                {!isCollapsed && <span>Customer Chat</span>}
              </div>
              {isCollapsed ? (
                unreadMessagesCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                )
              ) : (
                unreadMessagesCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-[#FF6000] text-white animate-pulse">
                    {unreadMessagesCount}
                  </span>
                )
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('problems')}
              title="Reported Issues"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 relative' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'problems'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                {!isCollapsed && <span>Issues & Reports</span>}
              </div>
              {isCollapsed ? (
                unresolvedProblemsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )
              ) : (
                unresolvedProblemsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-rose-500 text-white animate-pulse">
                    {unresolvedProblemsCount}
                  </span>
                )
              )}
            </button>
          </div>
        </div>

        {/* SECTION 2: CATALOG & STOCK */}
        <div>
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Catalog & Stock
            </div>
          )}
          <div className="space-y-0.5">
            {/* Products Tab - High-priority */}
            <button
              type="button"
              onClick={() => handleTabClick('products')}
              title={`Products Catalog (${productsCount} products)`}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold ring-2 ring-orange-300'
                  : 'text-slate-800 hover:bg-orange-50 hover:text-orange-900 font-bold'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className={`w-4 h-4 shrink-0 ${activeTab === 'products' ? 'text-white' : 'text-[#FF6000]'}`} />
                {!isCollapsed && <span>Products Catalog</span>}
              </div>
              {!isCollapsed && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-900'
                }`}>
                  {productsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('categories')}
              title={`Categories (${categoriesCount})`}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderTree className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Categories</span>}
              </div>
              {!isCollapsed && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {categoriesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('inventory')}
              title="Inventory & Stock Tracking"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 relative' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Inventory & Stock</span>}
              </div>
              {isCollapsed ? (
                lowStockCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )
              ) : (
                lowStockCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500 text-white animate-pulse">
                    {lowStockCount}
                  </span>
                )
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('shops')}
              title={`Registered Shops (${shopsCount})`}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'shops'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Registered Shops</span>}
              </div>
              {!isCollapsed && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'shops' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {shopsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SECTION 3: SOURCING & SUPPLIERS */}
        <div>
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Suppliers & Sourcing
            </div>
          )}
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => handleTabClick('suppliers')}
              title="Supplier Onboarding"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 relative' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 shrink-0 text-amber-500" />
                {!isCollapsed && <span>Onboarding</span>}
              </div>
              {isCollapsed ? (
                pendingSuppliersCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )
              ) : (
                pendingSuppliersCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500 text-white animate-pulse">
                    {pendingSuppliersCount}
                  </span>
                )
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('payouts')}
              title="Supplier Payouts"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5 relative' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'payouts'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 shrink-0 text-emerald-500" />
                {!isCollapsed && <span>Supplier Payouts</span>}
              </div>
              {isCollapsed ? (
                pendingPayoutsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                )
              ) : (
                pendingPayoutsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-emerald-600 text-white animate-pulse">
                    {pendingPayoutsCount}
                  </span>
                )
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('alibaba')}
              title="Alibaba Wholesale"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'alibaba'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 shrink-0 text-orange-500" />
                {!isCollapsed && <span>Alibaba Wholesale</span>}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('cjdropshipping')}
              title="CJ Dropshipping"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'cjdropshipping'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 shrink-0 text-purple-600" />
                {!isCollapsed && <span>CJ Dropshipping</span>}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('dsers')}
              title="DSers Fulfillment"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dsers'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 shrink-0 text-emerald-600" />
                {!isCollapsed && <span>DSers Fulfillment</span>}
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 4: ADMINISTRATION */}
        <div>
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              System & Config
            </div>
          )}
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => handleTabClick('coupons')}
              title="Promo Codes"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'coupons'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Promo Codes</span>}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('audit')}
              title="Audit Logs"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Audit Logs</span>}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('team')}
              title={`Team & Roles (${adminUsersCount})`}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Team & Roles</span>}
              </div>
              {!isCollapsed && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeTab === 'team' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {adminUsersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabClick('settings')}
              title="Settings"
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-2.5' : 'justify-between px-3 py-2'} rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#FF6000] text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Settings</span>}
              </div>
            </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="pt-3 border-t border-slate-100 mt-4 text-[10px] text-slate-400 space-y-0.5">
          <p className="font-bold text-slate-600">ContactReach Media Ltd</p>
          <p>Support: +250 780 022 600</p>
        </div>
      )}
    </aside>
  );
};
