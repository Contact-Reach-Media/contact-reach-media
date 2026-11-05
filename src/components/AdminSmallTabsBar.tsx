import React, { useRef } from 'react';
import {
  LayoutDashboard, Package, FolderTree, Store, ShoppingBag, CreditCard,
  Layers, Users, Mail, AlertTriangle, Tag, Settings, Shield,
  Globe, RefreshCw, DollarSign, ShieldCheck, ChevronLeft, ChevronRight,
  Sidebar as SidebarIcon, Check
} from 'lucide-react';
import { TabType } from './AdminSidebar.tsx';

interface AdminSmallTabsBarProps {
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
  onSwitchToSidebar?: () => void;
  showSidebarToggle?: boolean;
}

interface TabDef {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
  group: 'catalog' | 'orders' | 'sourcing' | 'system' | 'overview';
  isPrimary?: boolean;
}

export const AdminSmallTabsBar: React.FC<AdminSmallTabsBarProps> = ({
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
  onSwitchToSidebar,
  showSidebarToggle = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<'all' | 'catalog' | 'orders' | 'sourcing' | 'system'>('all');

  const tabs: TabDef[] = [
    {
      id: 'products',
      label: 'Products Catalog',
      shortLabel: 'Products',
      icon: Package,
      badge: productsCount,
      badgeColor: 'bg-orange-500 text-white',
      group: 'catalog',
      isPrimary: true,
    },
    {
      id: 'orders',
      label: 'Orders & Delivery',
      shortLabel: 'Orders',
      icon: ShoppingBag,
      badge: newOrdersCount > 0 ? `${newOrdersCount}/${totalOrdersCount}` : totalOrdersCount,
      badgeColor: newOrdersCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700',
      group: 'orders',
      isPrimary: true,
    },
    {
      id: 'overview',
      label: 'Overview',
      shortLabel: 'Overview',
      icon: LayoutDashboard,
      group: 'overview',
    },
    {
      id: 'payments',
      label: 'Payments & SMS',
      shortLabel: 'Payments',
      icon: CreditCard,
      badge: pendingVerificationsCount > 0 ? pendingVerificationsCount : undefined,
      badgeColor: 'bg-amber-500 text-white animate-pulse',
      group: 'orders',
      isPrimary: true,
    },
    {
      id: 'inventory',
      label: 'Inventory & Stock',
      shortLabel: 'Stock',
      icon: Layers,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
      group: 'catalog',
    },
    {
      id: 'categories',
      label: 'Categories',
      shortLabel: 'Categories',
      icon: FolderTree,
      badge: categoriesCount,
      group: 'catalog',
    },
    {
      id: 'shops',
      label: 'Registered Shops',
      shortLabel: 'Shops',
      icon: Store,
      badge: shopsCount,
      group: 'catalog',
    },
    {
      id: 'customers',
      label: 'Customers',
      shortLabel: 'Customers',
      icon: Users,
      badge: customersCount,
      group: 'orders',
    },
    {
      id: 'suppliers',
      label: 'Supplier Onboarding',
      shortLabel: 'Suppliers',
      icon: Store,
      badge: pendingSuppliersCount > 0 ? pendingSuppliersCount : undefined,
      badgeColor: 'bg-amber-500 text-white animate-pulse',
      group: 'sourcing',
    },
    {
      id: 'payouts',
      label: 'Supplier Payouts',
      shortLabel: 'Payouts',
      icon: DollarSign,
      badge: pendingPayoutsCount > 0 ? pendingPayoutsCount : undefined,
      badgeColor: 'bg-emerald-600 text-white',
      group: 'sourcing',
    },
    {
      id: 'alibaba',
      label: 'Alibaba Wholesale',
      shortLabel: 'Alibaba',
      icon: Globe,
      group: 'sourcing',
    },
    {
      id: 'cjdropshipping',
      label: 'CJ Dropshipping',
      shortLabel: 'CJ Drop',
      icon: RefreshCw,
      group: 'sourcing',
    },
    {
      id: 'dsers',
      label: 'DSers Fulfillment',
      shortLabel: 'DSers',
      icon: Globe,
      group: 'sourcing',
    },
    {
      id: 'messages',
      label: 'Customer Chat & SMS',
      shortLabel: 'Chat',
      icon: Mail,
      badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
      badgeColor: 'bg-orange-500 text-white',
      group: 'orders',
    },
    {
      id: 'problems',
      label: 'Issues & Reports',
      shortLabel: 'Issues',
      icon: AlertTriangle,
      badge: unresolvedProblemsCount > 0 ? unresolvedProblemsCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
      group: 'orders',
    },
    {
      id: 'coupons',
      label: 'Promo Codes',
      shortLabel: 'Coupons',
      icon: Tag,
      group: 'system',
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      shortLabel: 'Audit',
      icon: ShieldCheck,
      group: 'system',
    },
    {
      id: 'team',
      label: 'Team & Roles',
      shortLabel: 'Team',
      icon: Shield,
      badge: adminUsersCount,
      group: 'system',
    },
    {
      id: 'settings',
      label: 'Settings',
      shortLabel: 'Settings',
      icon: Settings,
      group: 'system',
    },
  ];

  const visibleTabs = selectedGroup === 'all'
    ? tabs
    : tabs.filter(t => t.group === selectedGroup);

  const scrollByAmount = (delta: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white border-b border-slate-200/90 shadow-2xs sticky top-[57px] z-20 w-full">
      {/* Top filter row: Group pills & view switcher */}
      <div className="px-3 sm:px-6 py-2 flex items-center justify-between gap-2 border-b border-slate-100 text-xs">
        {/* Quick Group Filters */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
            Tabs:
          </span>
          <button
            type="button"
            onClick={() => setSelectedGroup('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedGroup === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Tabs ({tabs.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroup('catalog')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedGroup === 'catalog'
                ? 'bg-[#FF6000] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-orange-600'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Products & Catalog</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroup('orders')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedGroup === 'orders'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders & Pay</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroup('sourcing')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedGroup === 'sourcing'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>Sourcing</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroup('system')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
              selectedGroup === 'system'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>System</span>
          </button>
        </div>

        {/* Right side: Jump to products + Switch to Sidebar Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab !== 'products' && (
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-[#FF6000] border border-orange-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Quickly jump to Products Catalog"
            >
              <Package className="w-3.5 h-3.5 text-[#FF6000]" />
              <span className="hidden sm:inline">View</span> Products ({productsCount})
            </button>
          )}

          {showSidebarToggle && onSwitchToSidebar && (
            <button
              type="button"
              onClick={onSwitchToSidebar}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Switch back to Sidebar navigation mode"
            >
              <SidebarIcon className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">Sidebar Mode</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Small Tabs Horizontal Strip */}
      <div className="relative flex items-center px-2 sm:px-4 py-1.5 bg-slate-50/70">
        {/* Scroll Left Button */}
        <button
          type="button"
          onClick={() => scrollByAmount(-220)}
          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0 hidden sm:flex items-center justify-center"
          title="Scroll tabs left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Tabs Track */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none px-1 py-1"
        >
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isProduct = tab.id === 'products';

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                  isActive
                    ? isProduct
                      ? 'bg-[#FF6000] text-white border-[#FF6000] shadow-sm scale-[1.02]'
                      : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : isProduct
                    ? 'bg-orange-50 text-orange-900 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                    : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${
                  isActive
                    ? 'text-white'
                    : isProduct
                    ? 'text-[#FF6000]'
                    : 'text-slate-500 group-hover:text-slate-800'
                }`} />

                <span className="whitespace-nowrap">
                  {tab.shortLabel}
                </span>

                {tab.badge !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-tight ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : tab.badgeColor || 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}

                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        <button
          type="button"
          onClick={() => scrollByAmount(220)}
          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer shrink-0 hidden sm:flex items-center justify-center"
          title="Scroll tabs right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
