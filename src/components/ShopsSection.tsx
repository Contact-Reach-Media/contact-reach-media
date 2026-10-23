import React, { useState } from 'react';
import { Store, CheckCircle, MapPin, Users, Heart, ArrowUpRight, Search, Plus } from 'lucide-react';
import { VendorShop } from '../types.ts';
import { Language } from '../translations.ts';

interface ShopsSectionProps {
  shops: VendorShop[];
  currentLang: Language;
  onSelectShopCategory: (category: string) => void;
  onSelectShop?: (shop: VendorShop) => void;
  onOpenSellerModal: () => void;
}

export const ShopsSection: React.FC<ShopsSectionProps> = ({
  shops,
  currentLang,
  onSelectShopCategory,
  onSelectShop,
  onOpenSellerModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [followedShops, setFollowedShops] = useState<Record<string, boolean>>({});

  const toggleFollow = (id: string) => {
    setFollowedShops(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredShops = shops.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="py-10 bg-[#F8F9FA] min-h-[70vh]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Top Header Row (Matching Screenshot 7) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Discover shops
          </h1>

          <button
            onClick={onOpenSellerModal}
            className="py-2.5 px-5 rounded-full font-black text-xs sm:text-sm bg-[#FF6000] hover:bg-[#E54D00] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <span>Sell on ContactReach →</span>
          </button>
        </div>

        {/* Search & Sort Bar (Matching Screenshot 7) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-8 bg-white p-3 rounded-2xl border border-slate-200">
          <div className="w-full sm:flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search shops..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-auto flex items-center justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <select className="text-xs font-semibold text-slate-700 bg-transparent py-1 px-2 focus:outline-none cursor-pointer">
              <option>Newest</option>
              <option>Most Followed</option>
              <option>Verified First</option>
            </select>
          </div>
        </div>

        {/* 3-Column Grid of Shop Cards or Clean Empty State */}
        {filteredShops.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-2xs space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 text-[#FF6000] flex items-center justify-center mx-auto">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {currentLang === 'en' ? 'Supplier Stores Onboarding' : "Amaduka n'Abacuruzi Bari Gutegurwa"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                {currentLang === 'en'
                  ? 'ContactReach Market partners directly with verified retail suppliers, wholesalers, and brand distributors across Kigali. No fake shops or invented follower counts are listed.'
                  : "ContactReach Market ikorana n'abacuruzi nyabo bafite amaduka azwi i Kigali no mu Rwanda hose. Nta maduka y'igihimbano agomba kugaragara hano."}
              </p>
            </div>
            <button
              onClick={onOpenSellerModal}
              className="py-2.5 px-6 rounded-full bg-[#FF6000] hover:bg-[#E54D00] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              {currentLang === 'en' ? 'Apply to Sell as Supplier →' : 'Saba Kwandikisha Idani ryawe →'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShops.map((shop) => {
            const isFollowed = Boolean(followedShops[shop.id]);
            return (
              <div
                key={shop.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Banner Image / Gradient with Logo Avatar & Follow Button */}
                  <div className={`h-28 bg-gradient-to-r ${shop.bannerColor} relative p-4 flex items-start justify-between`}>
                    {/* Circle Logo Avatar */}
                    <div className="w-14 h-14 rounded-full bg-white p-1 shadow-md absolute -bottom-5 left-4 flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center text-slate-800 font-extrabold text-xs">
                        {shop.name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 bg-black/20 px-2 py-0.5 rounded backdrop-blur-xs">
                        {shop.category}
                      </span>
                      {shop.isRecommended && (
                        <span className="text-[10px] font-black text-amber-950 bg-amber-400 px-2 py-0.5 rounded shadow-2xs">
                          ★ Recommended
                        </span>
                      )}
                    </div>

                    {/* Follow Button */}
                    <button
                      onClick={() => toggleFollow(shop.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer shadow-xs ${
                        isFollowed
                          ? 'bg-white text-slate-900'
                          : 'bg-white/90 hover:bg-white text-slate-800'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFollowed ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
                      <span>{isFollowed ? 'Following' : 'Follow'}</span>
                    </button>
                  </div>

                  {/* Shop Information */}
                  <div className="pt-8 px-5 pb-4">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-base text-slate-900">
                        {shop.name}
                      </h3>
                      {shop.isVerified && (
                        <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-50" />
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {shop.description}
                    </p>

                    <div className="flex items-center gap-4 mt-4 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{shop.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{(shop.followersCount + (isFollowed ? 1 : 0)).toLocaleString()} followers</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                  <button
                    onClick={() => onSelectShopCategory(shop.category)}
                    className="w-full py-2 px-3 rounded-xl bg-white hover:bg-orange-50 border border-slate-200 text-slate-800 hover:text-[#FF6000] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>View Store Products</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
};
