import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  Sparkles, CheckCircle, Heart, CornerDownRight, Truck, Leaf, Star, ExternalLink,
} from 'lucide-react';
import { Restaurant } from '../types';
import { formatDistance } from '../data/formatDistance';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  liked: boolean;
  onToggleLike: (id: string, e: React.MouseEvent) => void;
  // panel: 넓은 화면의 오른쪽 패널, inline: 좁은 화면에서 목록 아래로 열리는 카드
  variant: 'panel' | 'inline';
}

// 마운트되면 높이 0에서 부드럽게 아래로 열림
const ExpandPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    // 높이 0 상태를 한 번 계산해 둬야 열리는 애니메이션이 동작함
    ref.current?.getBoundingClientRect();
    setOpen(true);
  }, []);

  return (
    <div
      ref={ref}
      className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
};

export const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ restaurant, liked, onToggleLike, variant }) => {
  const content = (
    <div
      className={
        variant === 'panel'
          ? 'bg-white rounded-2xl sm:rounded-3xl border-2 border-emerald-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between flex-1'
          : 'border-t border-emerald-200 p-3.5 flex flex-col'
      }
    >
      {/* Store Header Info */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                {restaurant.category}
              </span>
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Truck className="w-3 h-3 text-emerald-600" />
                학교에서 {formatDistance(restaurant.distanceMeters)} · 배달 약 {restaurant.deliveryMinutes}분
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {restaurant.name}
            </h3>
          </div>

          <button
            onClick={(e) => onToggleLike(restaurant.id, e)}
            className={`min-w-11 min-h-11 flex items-center justify-center rounded-full border transition-all ${
              liked
                ? 'bg-rose-50 border-rose-200 text-rose-500'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-500'
            }`}
            aria-label="찜하기"
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
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
                <strong>주문 방법:</strong> {restaurant.containerSupport.system}
              </div>
            </div>

            <div className="flex items-start gap-1.5 text-emerald-900">
              <CornerDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>반납 장소:</strong> {restaurant.containerSupport.returnSpot}
              </div>
            </div>
          </div>
        </div>

        {/* Store Address & Baemin Order Button */}
        <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] mb-3">
          <span className="text-slate-600 min-w-0 break-keep">
            {restaurant.address}
            {restaurant.phone && <span className="whitespace-nowrap"> · {restaurant.phone}</span>}
          </span>
          {restaurant.baeminUrl ? (
            <a
              href={restaurant.baeminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-9 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold shrink-0 hover:bg-emerald-700 flex items-center gap-1 active:scale-95 transition-all text-[11px]"
            >
              <ExternalLink className="w-3 h-3" />
              <span>배민 주문</span>
            </a>
          ) : (
            <span className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-500 font-bold shrink-0 text-[11px]">
              배민 링크 준비 중
            </span>
          )}
        </div>

        {/* Recommended Menu Highlights */}
        {restaurant.menus.some((m) => m.recommendationTag) && (
          <div className="mb-3">
            <h4 className="text-xs font-black text-slate-800 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>추천 메뉴</span>
            </h4>
            <div className="space-y-1.5">
              {restaurant.menus
                .filter((m) => m.recommendationTag)
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
          {/* 좁은 화면에서 열린 카드 안에서는 따로 스크롤되지 않게 전체를 보여줌 */}
          <div className={variant === 'panel' ? 'space-y-1.5 max-h-48 overflow-y-auto pr-1' : 'space-y-1.5'}>
            {restaurant.menus.map((menu) => (
              <div
                key={menu.id}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
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
  );

  return variant === 'inline' ? <ExpandPanel>{content}</ExpandPanel> : content;
};
