import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Utensils, ChevronRight, X, Heart } from 'lucide-react';
import { Restaurant, FoodCategory } from '../types';
import { RESTAURANTS_DATA, DONGDEOK_SCHOOL_COORDS } from '../data/mockData';
import { FOOD_CATEGORIES } from '../data/categories';
import { sortRestaurants, SortMode } from '../data/sortRestaurants';
import { RestaurantDetail } from './RestaurantDetail';

interface MapSectionProps {
  onOpenCertModal?: () => void;
}

// 찜한 식당은 이 기기(브라우저)에 저장해서 새로고침해도 남게 함
const LIKED_STORAGE_KEY = 'dongdeok_eco_liked_restaurants';

function loadLikedRestaurants(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LIKED_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'distance', label: '가까운 순' },
  { mode: 'popular', label: '인기순' },
];

// Baked in at build time so every visitor gets the real Naver map automatically.
const NAVER_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID as string | undefined;

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
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [likedRestaurants, setLikedRestaurants] = useState<string[]>(loadLikedRestaurants);
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const [certCounts, setCertCounts] = useState<Record<string, number> | null>(null);
  const [countsStatus, setCountsStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [naverMapLoaded, setNaverMapLoaded] = useState(false);
  const [mapMode, setMapMode] = useState<'interactive-vector' | 'naver-sdk'>('interactive-vector');

  const naverMapRef = useRef<HTMLDivElement>(null);
  const naverMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const detailRef = useRef<HTMLDivElement>(null);
  const listItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const naverAuthFailedRef = useRef(false);

  // 넓은 화면(lg 이상)은 오른쪽 패널, 좁은 화면은 목록 안에서 아래로 열림
  const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

  // 선택한 식당 정보가 보이는 위치로 스크롤
  const scrollToSelected = (id: string) => {
    setTimeout(() => {
      if (isDesktop()) {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        listItemRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  };

  // 지도 핀을 눌렀을 때: 그 식당을 열고 정보가 있는 곳으로 이동
  const handleSelectRestaurant = (rest: Restaurant) => {
    setSelectedRestaurant(rest);
    scrollToSelected(rest.id);
  };

  // 목록에서 눌렀을 때: 좁은 화면에서는 열려 있는 식당을 다시 누르면 닫힘
  const handleListItemClick = (rest: Restaurant) => {
    if (!isDesktop() && selectedRestaurant?.id === rest.id) {
      setSelectedRestaurant(null);
      return;
    }
    handleSelectRestaurant(rest);
  };

  const categories = FOOD_CATEGORIES;

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

  useEffect(() => {
    try {
      localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(likedRestaurants));
    } catch (e) {
      console.error(e);
    }
  }, [likedRestaurants]);

  // 인기순을 고르면 식당별 인증 수를 불러옴 (처음 화면이 무거워지지 않게 이때 처음 불러옴)
  useEffect(() => {
    if (sortMode !== 'popular') return;
    let cancelled = false;
    setCountsStatus('loading');
    import('../services/certCounts')
      .then((m) => m.fetchCertCounts())
      .then((counts) => {
        if (cancelled) return;
        setCertCounts(counts);
        setCountsStatus('done');
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setCountsStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [sortMode]);

  // 목록에 보이는 식당: 찜한 식당만 보기 → 정렬 순서 (지도 핀은 카테고리·검색 결과를 그대로 보여줌)
  const likedCount = RESTAURANTS_DATA.filter((r) => likedRestaurants.includes(r.id)).length;
  const displayedRestaurants = sortRestaurants(
    showLikedOnly ? filteredRestaurants.filter((r) => likedRestaurants.includes(r.id)) : filteredRestaurants,
    sortMode,
    countsStatus === 'done' ? certCounts : null,
  );

  // Naver Maps Script loader
  const loadNaverMaps = (clientId: string) => {
    if (!clientId) return;
    const existingScript = document.getElementById('naver-map-script');
    if (existingScript) existingScript.remove();

    // 네이버 인증 실패(등록하지 않은 주소 등) 시 빈 회색 지도 대신 간단 지도로 대체
    naverAuthFailedRef.current = false;
    (window as any).navermap_authFailure = () => {
      console.error('네이버 지도 인증 실패 — 네이버 콘솔의 서비스 URL에 현재 주소가 등록되어 있는지 확인하세요. 간단 지도로 대체합니다.');
      naverAuthFailedRef.current = true;
      setNaverMapLoaded(false);
      setMapMode('interactive-vector');
    };

    const script = document.createElement('script');
    script.id = 'naver-map-script';
    script.type = 'text/javascript';
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.onload = () => {
      if (naverAuthFailedRef.current) return;
      if ((window as any).naver && (window as any).naver.maps) {
        setNaverMapLoaded(true);
        setMapMode('naver-sdk');
        initNaverMap();
      }
    };
    script.onerror = () => {
      console.error('네이버 지도 API 로드 실패 — 기본 인터랙티브 지도로 대체합니다.');
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
        handleSelectRestaurant(r);
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

  // Auto-load the real Naver map for every visitor once a Client ID is baked into the build.
  useEffect(() => {
    if (NAVER_CLIENT_ID) {
      loadNaverMaps(NAVER_CLIENT_ID);
    }
  }, []);

  return (
    <section id="map" className="pt-4 pb-8 sm:py-10 bg-[#F0FAF5] relative border-b-4 border-emerald-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Mobile Header Title */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
              <MapPin className="w-3 h-3 text-emerald-600" />
              <span>동덕여고 근처 다회용기 맛집</span>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            동덕여고 근처 다회용기 맛집 맵
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
              className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-emerald-200 rounded-xl text-base sm:text-sm font-medium placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-xs"
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

        {/* Main Layout: mobile stacks Map → Full List → Selected Detail (like a delivery app); desktop keeps Map + Detail side by side with the list below */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4">

          {/* Interactive Map (7 cols on desktop, full width on mobile) */}
          <div className="order-1 lg:col-span-7 flex flex-col">
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
                        onClick={() => handleSelectRestaurant(rest)}
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

          {/* Right Column: 선택한 식당 정보 패널 (넓은 화면에서만 보임. 좁은 화면에서는 목록 안에서 아래로 열림) */}
          <div ref={detailRef} className="hidden lg:flex lg:order-2 lg:col-span-5 flex-col space-y-3">
            {selectedRestaurant ? (
              <RestaurantDetail
                variant="panel"
                restaurant={selectedRestaurant}
                liked={likedRestaurants.includes(selectedRestaurant.id)}
                onToggleLike={toggleLike}
              />
            ) : (
              <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-emerald-100">
                아래 목록이나 지도의 매장 핀을 터치해주세요.
              </div>
            )}
          </div>

          {/* 식당 목록: 좁은 화면에서는 누르면 아래로 정보가 열리고, 넓은 화면에서는 오른쪽 패널에 표시됨 */}
          <div className="order-2 lg:order-3 lg:col-span-12">
            <h3 className="text-xs font-black text-slate-900 mb-2 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-emerald-600" />
              <span>동덕여고 주변 다회용기 매장 전체 목록</span>
            </h3>
            <p className="lg:hidden text-[11px] text-slate-500 mb-2">식당을 누르면 아래로 정보가 열려요.</p>

            {/* 목록 보기 옵션: 정렬 + 찜한 식당만 보기 */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-[11px] font-bold text-slate-500 mr-0.5">정렬</span>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => setSortMode(opt.mode)}
                  aria-pressed={sortMode === opt.mode}
                  className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    sortMode === opt.mode
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-emerald-100 hover:bg-emerald-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowLikedOnly((v) => !v)}
                aria-pressed={showLikedOnly}
                className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ml-auto ${
                  showLikedOnly
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-rose-100 hover:bg-rose-50'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${showLikedOnly ? 'fill-white' : 'text-rose-500'}`} />
                <span>찜한 식당 {likedCount}</span>
              </button>
            </div>

            {sortMode === 'popular' && (
              <p className="text-[11px] text-slate-500 mb-2">
                {countsStatus === 'loading' && '인증 수를 불러오는 중이에요…'}
                {countsStatus === 'error' && '인증 수를 불러오지 못해 가까운 순으로 보여드려요.'}
                {countsStatus === 'done' && '학생 인증이 많은 식당부터 보여드려요. (같으면 가까운 순)'}
              </p>
            )}

            {displayedRestaurants.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-emerald-100">
                {showLikedOnly && likedCount === 0
                  ? '아직 찜한 식당이 없어요. 식당을 열어 ♡를 눌러 보세요.'
                  : '조건에 맞는 식당이 없어요. 검색어나 카테고리를 바꿔 보세요.'}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 items-start">
              {displayedRestaurants.map((rest) => {
                const isOpen = selectedRestaurant?.id === rest.id;
                const isLiked = likedRestaurants.includes(rest.id);
                return (
                  <div
                    key={rest.id}
                    ref={(el) => { listItemRefs.current[rest.id] = el; }}
                    className={`scroll-mt-20 rounded-2xl border transition-all overflow-hidden ${
                      isOpen
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300'
                        : 'bg-white border-emerald-100 hover:border-emerald-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleListItemClick(rest)}
                      aria-expanded={isOpen}
                      className="w-full min-h-14 p-3 flex items-center justify-between gap-2 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base shrink-0">
                          {rest.category.includes('마라탕') ? '🍜' :
                           rest.category.includes('포케') ? '🥗' :
                           rest.category.includes('떡볶이') ? '🍲' :
                           rest.category.includes('카페') ? '🥤' :
                           rest.category.includes('양식') ? '🍝' : '🍱'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1">
                            <span>{rest.name}</span>
                            {isLiked && <Heart className="w-3 h-3 fill-rose-500 text-rose-500 shrink-0" aria-label="찜한 식당" />}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            학교에서 {rest.distanceMeters}m · 배달 약 {rest.deliveryMinutes}분
                            {sortMode === 'popular' && countsStatus === 'done' && certCounts && (
                              <span className="font-bold text-emerald-700"> · 인증 {certCounts[rest.id] ?? 0}건</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-90 lg:rotate-0' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="lg:hidden">
                        <RestaurantDetail
                          variant="inline"
                          restaurant={rest}
                          liked={likedRestaurants.includes(rest.id)}
                          onToggleLike={toggleLike}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </section>
  );
};
