import React, { useState, useEffect, useRef } from 'react';
import {
  Search, MapPin, Sparkles, Utensils,
  Phone, CheckCircle, Info, ChevronRight, X, Heart, RefreshCw, Key, ArrowRight, CornerDownRight, Truck, Leaf, Star
} from 'lucide-react';
import { Restaurant, FoodCategory } from '../types';
import { RESTAURANTS_DATA, DONGDEOK_SCHOOL_COORDS } from '../data/mockData';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface MapSectionProps {
  onOpenCertModal?: () => void;
}

// Derive each restaurant's fallback-map pin position from its actual lat/lng,
// keyed by restaurant id so pins stay put regardless of search/filter order.
const RESTAURANT_PIN_POSITIONS: Record<string, { top: string; left: string }> = (() => {
  const lats = RESTAURANTS_DATA.map(r => r.lat);
  const lngs = RESTAURANTS_DATA.map(r => r.lng);
  const latMin = Math.min(...lats);
  const latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs);
  const lngMax = Math.max(...lngs);
  const latSpan = Math.max(latMax - latMin, 1e-6);
  const lngSpan = Math.max(lngMax - lngMin, 1e-6);

  const positions: Record<string, { top: string; left: string }> = {};
  RESTAURANTS_DATA.forEach(r => {
    const leftPct = 12 + ((r.lng - lngMin) / lngSpan) * 76;
    const topPct = 88 - ((r.lat - latMin) / latSpan) * 76;
    positions[r.id] = { top: `${topPct.toFixed(1)}%`, left: `${leftPct.toFixed(1)}%` };
  });
  return positions;
})();

export const MapSection: React.FC<MapSectionProps> = () => {
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(RESTAURANTS_DATA[0]);
  const [likedRestaurants, setLikedRestaurants] = useState<string[]>([]);
  const [showNaverKeyModal, setShowNaverKeyModal] = useState(false);
  const [naverClientId, setNaverClientId] = useState('');
  const [naverMapLoaded, setNaverMapLoaded] = useState(false);
  const [mapMode, setMapMode] = useState<'interactive-vector' | 'naver-sdk'>('interactive-vector');

  const naverMapRef = useRef<HTMLDivElement>(null);
  const naverMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useBodyScrollLock(showNaverKeyModal);

  // Categories list
  const categories: FoodCategory[] = ['전체', '분식/떡볶이', '마라탕/중식', '포케/샐러드', '한식/도시락', '양식/버거', '카페/디저트'];

  // Horizontal scroll affordance for the category pill row (content overflows on mobile)
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [categoryScroll, setCategoryScroll] = useState({ canScrollLeft: false, canScrollRight: false });

  const updateCategoryScroll = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    setCategoryScroll({
      canScrollLeft: el.scrollLeft > 4,
      canScrollRight: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  };

  useEffect(() => {
    updateCategoryScroll();
    window.addEventListener('resize', updateCategoryScroll);
    return () => window.removeEventListener('resize', updateCategoryScroll);
  }, []);

  // Filter restaurants
  const filteredRestaurants = RESTAURANTS_DATA.filter((item) => {
    const matchCategory = selectedCategory === '전체' || item.category === selectedCategory;
    const matchSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.menus.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchCategory && matchSearch;
  });

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedRestaurants(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Naver Maps Script loader
  const loadNaverMaps = (clientId: string) => {
    if (!clientId) return;
    const existingScript = document.getElementById('naver-map-script');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = 'naver-map-script';
    script.type = 'text/javascript';
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
    script.onload = () => {
      if ((window as any).naver && (window as any).naver.maps) {
        setNaverMapLoaded(true);
        setMapMode('naver-sdk');
        initNaverMap();
      }
    };
    script.onerror = () => {
      alert('네이버 지도 API 로드에 실패했습니다. 기본 인터랙티브 지도로 자동 전환됩니다.');
      setMapMode('interactive-vector');
    };
    document.head.appendChild(script);
  };

  const initNaverMap = () => {
    if (!(window as any).naver || !(window as any).naver.maps || !naverMapRef.current) return;
    const naver = (window as any).naver;

    const mapOptions = {
      center: new naver.maps.LatLng(DONGDEOK_SCHOOL_COORDS.lat, DONGDEOK_SCHOOL_COORDS.lng),
      zoom: 16,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
      },
    };

    const map = new naver.maps.Map(naverMapRef.current, mapOptions);
    naverMapInstance.current = map;

    // School Marker
    new naver.maps.Marker({
      position: new naver.maps.LatLng(DONGDEOK_SCHOOL_COORDS.lat, DONGDEOK_SCHOOL_COORDS.lng),
      map: map,
      title: '동덕여자고등학교',
      icon: {
        content: `
          <div style="background:#047857; color:white; font-weight:800; font-size:11px; padding:5px 10px; border-radius:20px; box-shadow:0 4px 6px rgba(0,0,0,0.2); border:2px solid white; display:flex; align-items:center; gap:4px;">
            <span>🏫 동덕여고</span>
          </div>
        `,
        anchor: new naver.maps.Point(40, 18),
      },
    });

    // Restaurant Markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    RESTAURANTS_DATA.forEach((r) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(r.lat, r.lng),
        map: map,
        title: r.name,
        icon: {
          content: `
            <div style="background:#059669; color:white; font-weight:700; font-size:11px; padding:4px 9px; border-radius:12px; box-shadow:0 3px 6px rgba(0,0,0,0.15); border:1.5px solid white; cursor:pointer;">
              🍴 ${r.name.split(' ')[0]}
            </div>
          `,
          anchor: new naver.maps.Point(30, 15),
        },
      });

      naver.maps.Event.addListener(marker, 'click', () => {
        setSelectedRestaurant(r);
        map.panTo(new naver.maps.LatLng(r.lat, r.lng));
      });

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (mapMode === 'naver-sdk' && naverMapLoaded) {
      initNaverMap();
    }
  }, [mapMode, naverMapLoaded]);

  return (
    <section id="map" className="pt-4 pb-8 sm:py-10 bg-[#F0FAF5] relative border-b-4 border-emerald-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Mobile Header Title */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>동덕여고 반경 500m 다회용기 맛집</span>
            </div>
            <button
              onClick={() => setShowNaverKeyModal(true)}
              className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-1 rounded-lg hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-1"
            >
              <Key className="w-3 h-3 text-emerald-600" />
              <span>네이버 지도 SDK</span>
            </button>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            동덕여고 방배동 다회용기 맛집 맵
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            주문 시 <strong>[다회용기 사용]</strong>을 고르면 살균 용기에 담겨오며, 다 먹고 교내 수거함에 반납하는 매장들입니다.
          </p>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="mb-4 space-y-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="restaurant-search-input"
              type="text"
              placeholder="매장명, 메뉴 (마라탕, 떡볶이, 포케 등) 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-emerald-200 rounded-xl text-xs sm:text-sm font-medium placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Horizontal Scrollable Category Pills */}
          <div className="relative">
            {categoryScroll.canScrollLeft && (
              <div className="pointer-events-none absolute left-0 top-0 bottom-1 w-8 bg-gradient-to-r from-[#F0FAF5] to-transparent z-10" />
            )}
            <div
              ref={categoryScrollRef}
              onScroll={updateCategoryScroll}
              className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar"
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-emerald-100 hover:bg-emerald-50'
                  }`}
                >
                  <span>{cat}</span>
                </button>
              ))}
            </div>
            {categoryScroll.canScrollRight && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[#F0FAF5] to-transparent z-10 flex items-center justify-end">
                <ChevronRight className="w-4 h-4 text-emerald-700/70 mr-0.5" />
              </div>
            )}
          </div>
        </div>

        {/* Main Grid: Interactive Map + Selected Restaurant View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Interactive Map (7 cols on desktop, full width on mobile) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="bg-white rounded-2xl sm:rounded-3xl border-4 border-emerald-100 shadow-sm overflow-hidden flex flex-col min-h-[340px] sm:min-h-[460px] relative">
              
              {/* Map Top Bar */}
              <div className="px-3.5 py-2 bg-emerald-700 text-white text-[11px] flex items-center justify-between z-10">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                  <span>동덕여고 주변 실시간 다회용기 가맹점 ({filteredRestaurants.length}곳)</span>
                </div>
                <div className="text-[10px] text-emerald-200">
                  {mapMode === 'naver-sdk' ? '네이버 정밀 지도' : '터치하여 매장 선택'}
                </div>
              </div>

              {/* Map Canvas */}
              {mapMode === 'naver-sdk' ? (
                <div ref={naverMapRef} className="w-full h-full min-h-[320px]" />
              ) : (
                /* Fallback Interactive Vector Map with dot pattern */
                <div className="relative w-full flex-1 bg-slate-100 overflow-hidden flex items-center justify-center p-3">
                  
                  {/* Dot Grid Background */}
                  <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#059669 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }} />
                  
                  {/* Major Road Lines */}
                  <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="0" y1="48%" x2="100%" y2="48%" stroke="#047857" strokeWidth="8" />
                    <line x1="52%" y1="0" x2="52%" y2="100%" stroke="#047857" strokeWidth="8" />
                    <line x1="20%" y1="0" x2="80%" y2="100%" stroke="#059669" strokeWidth="4" strokeDasharray="4,4" />
                  </svg>

                  {/* School Landmark Marker */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group">
                    <div className="px-2.5 py-1 rounded-full bg-emerald-800 text-white text-[11px] font-black shadow-md border-2 border-white flex items-center gap-1 group-hover:scale-105 transition-all">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                      🏫 동덕여자고등학교
                    </div>
                    <div className="w-2.5 h-2.5 bg-emerald-800 rotate-45 -mt-1 border-r border-b border-white"></div>
                    <span className="mt-0.5 text-[9px] font-bold text-emerald-950 bg-white/95 px-1.5 py-0.2 rounded shadow-xs border border-emerald-200">
                      반납함 (본관1층/급식실앞)
                    </span>
                  </div>

                  {/* Dynamic Restaurant Markers */}
                  {filteredRestaurants.map((rest) => {
                    const isSelected = selectedRestaurant?.id === rest.id;

                    const pinEmoji = rest.category.includes('마라탕') ? '🍜' :
                                     rest.category.includes('포케') ? '🥗' :
                                     rest.category.includes('떡볶이') ? '🍲' :
                                     rest.category.includes('카페') ? '🥤' :
                                     rest.category.includes('양식') ? '🍝' : '🍱';

                    const pos = RESTAURANT_PIN_POSITIONS[rest.id];

                    return (
                      <div
                        key={rest.id}
                        onClick={() => setSelectedRestaurant(rest)}
                        style={{ top: pos.top, left: pos.left }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer"
                      >
                        <div
                          className={`px-2 py-1 rounded-xl text-[11px] font-black shadow-md border flex items-center gap-1 whitespace-nowrap transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-300 shadow-emerald-600/30 ring-2 ring-emerald-300 scale-105 animate-bounce'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-500 hover:text-emerald-700'
                          }`}
                        >
                          <span>{pinEmoji}</span>
                          <span>{rest.name.split(' ')[0]}</span>
                          <span className="text-[9px] opacity-80 font-normal">(배달 {rest.deliveryMinutes}분)</span>
                        </div>
                        <div
                          className={`w-2 h-2 rotate-45 -mt-0.8 mx-auto ${
                            isSelected ? 'bg-emerald-600' : 'bg-white border-r border-b border-slate-200'
                          }`}
                        />
                      </div>
                    );
                  })}

                  {/* Map Hint Badge */}
                  <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded-md border border-emerald-200 text-[10px] font-bold text-emerald-900 shadow-xs">
                    💡 핀을 터치하면 매장 다회용기 정보가 표시됩니다
                  </div>

                </div>
              )}

            </div>
          </div>

          {/* Right Column: Selected Restaurant Card & Details (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            {selectedRestaurant ? (
              <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-emerald-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between flex-1">
                
                {/* Store Header Info */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                          {selectedRestaurant.category}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Truck className="w-3 h-3 text-emerald-600" />
                          학교에서 {selectedRestaurant.distanceMeters}m · 배달 약 {selectedRestaurant.deliveryMinutes}분
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                        {selectedRestaurant.name}
                      </h3>
                    </div>

                    <button
                      onClick={(e) => toggleLike(selectedRestaurant.id, e)}
                      className={`min-w-11 min-h-11 flex items-center justify-center rounded-full border transition-all ${
                        likedRestaurants.includes(selectedRestaurant.id)
                          ? 'bg-rose-50 border-rose-200 text-rose-500'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-500'
                      }`}
                      aria-label="찜하기"
                    >
                      <Heart className={`w-4 h-4 ${likedRestaurants.includes(selectedRestaurant.id) ? 'fill-rose-500' : ''}`} />
                    </button>
                  </div>

                  {/* Essential Reusable Delivery & Return Box */}
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 space-y-2 mb-3">
                    <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>다회용기 제공 & 반납 시스템 안내</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                      <div className="flex items-start gap-1.5 text-emerald-900">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>주문 방법:</strong> {selectedRestaurant.containerSupport.system}
                        </div>
                      </div>

                      <div className="flex items-start gap-1.5 text-emerald-900">
                        <CornerDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>반납 장소:</strong> {selectedRestaurant.containerSupport.returnSpot}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Store Address & Phone Button */}
                  <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] mb-3">
                    <span className="text-slate-600 truncate">{selectedRestaurant.address}</span>
                    <a
                      href={`tel:${selectedRestaurant.phone}`}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold shrink-0 hover:bg-emerald-700 flex items-center gap-1 active:scale-95 transition-all text-[11px]"
                    >
                      <Phone className="w-3 h-3" />
                      <span>전화 주문</span>
                    </a>
                  </div>

                  {/* Recommended Menu Highlights */}
                  {selectedRestaurant.menus.some(m => m.recommendationTag) && (
                    <div className="mb-3">
                      <h4 className="text-xs font-black text-slate-800 mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>추천 메뉴</span>
                      </h4>
                      <div className="space-y-1.5">
                        {selectedRestaurant.menus
                          .filter(m => m.recommendationTag)
                          .map((menu) => (
                            <div
                              key={menu.id}
                              className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                                menu.recommendationTag === '저탄소'
                                  ? 'bg-emerald-50 border-emerald-200'
                                  : 'bg-amber-50 border-amber-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={menu.image}
                                  alt={menu.name}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-xs leading-tight truncate">
                                    {menu.name}
                                  </div>
                                  <div className="text-[11px] font-semibold text-emerald-700">
                                    {menu.price.toLocaleString()}원
                                    {typeof menu.carbonKg === 'number' && (
                                      <span className="text-slate-500 font-medium"> · 탄소 {menu.carbonKg}kg</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 flex items-center gap-1 ${
                                  menu.recommendationTag === '저탄소'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}
                              >
                                {menu.recommendationTag === '저탄소' ? (
                                  <><Leaf className="w-3 h-3" />저탄소</>
                                ) : (
                                  <><Star className="w-3 h-3" />대표메뉴</>
                                )}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Menu Items List */}
                  <div>
                    <h4 className="text-xs font-black text-slate-800 mb-1.5">
                      대표 메뉴 (다회용기 주문 가능)
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {selectedRestaurant.menus.map((menu) => (
                        <div
                          key={menu.id}
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={menu.image}
                              alt={menu.name}
                              className="w-10 h-10 rounded-lg object-cover shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs leading-tight">
                                {menu.name}
                              </div>
                              <div className="text-[11px] font-semibold text-emerald-700">
                                {menu.price.toLocaleString()}원
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                            다회용기 제공
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-emerald-100">
                지도의 매장 핀을 터치해주세요.
              </div>
            )}
          </div>

        </div>

        {/* Quick Restaurant List Strip for Mobile Thumb Browsing */}
        <div className="mt-4">
          <h3 className="text-xs font-black text-slate-900 mb-2 flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-emerald-600" />
            <span>동덕여고 주변 다회용기 매장 전체 목록</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredRestaurants.map((rest) => (
              <div
                key={rest.id}
                onClick={() => {
                  setSelectedRestaurant(rest);
                  const mapElement = document.getElementById('map');
                  if (mapElement) {
                    mapElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  selectedRestaurant?.id === rest.id
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300'
                    : 'bg-white border-emerald-100 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0">
                    {rest.category.includes('마라탕') ? '🍜' :
                     rest.category.includes('포케') ? '🥗' :
                     rest.category.includes('떡볶이') ? '🍲' :
                     rest.category.includes('카페') ? '🥤' :
                     rest.category.includes('양식') ? '🍝' : '🍱'}
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">{rest.name}</div>
                    <div className="text-[10px] text-slate-500">학교에서 {rest.distanceMeters}m · 배달 약 {rest.deliveryMinutes}분</div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Naver Maps API Key Modal */}
      {showNaverKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-emerald-600" />
                <span>네이버 지도 Client ID 연동</span>
              </h3>
              <button onClick={() => setShowNaverKeyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
              NAVER Cloud Platform에서 발급받은 <strong>ncpClientId</strong>를 입력하시면 실제 네이버 지도 SDK가 로드됩니다.
            </p>
            <input
              type="text"
              placeholder="예: ncp_client_id_xxxx"
              value={naverClientId}
              onChange={(e) => setNaverClientId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono mb-3 focus:outline-hidden focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  loadNaverMaps(naverClientId);
                  setShowNaverKeyModal(false);
                }}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700"
              >
                적용하기
              </button>
              <button
                onClick={() => setShowNaverKeyModal(false)}
                className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
