import React from 'react';
import { ActivePage } from '../types';

interface FooterProps {
  onNavigate: (page: ActivePage) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-6 border-b border-slate-800">
          
          {/* Col 1: School Brand */}
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2 text-white font-extrabold text-sm sm:text-base">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                D
              </div>
              <span>동덕여자고등학교 '용기내' 지도</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px] max-w-md xl:max-w-none xl:whitespace-nowrap">
              동덕여자고등학교 학생 및 교직원을 위한 다회용기 배달·포장 맛집 지도 & 교내 반납 안내 플랫폼입니다.
            </p>
            <div className="text-slate-500 text-[10px]">
              서울특별시 서초구 방배로3길 34 (방배동 1017-1) 동덕여자고등학교
            </div>
          </div>

          {/* Col 2: Page Navigation */}
          <div className="space-y-1.5">
            <div className="text-white font-bold text-xs uppercase tracking-wider mb-1">
              페이지 바로가기
            </div>
            <ul className="space-y-1 text-slate-400 text-[11px]">
              <li>
                <button onClick={() => onNavigate('map')} className="hover:text-emerald-400">
                  동덕여고 근처 다회용기 맛집 지도
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('guide')} className="hover:text-emerald-400">
                  이용 & 교내 반납 가이드
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('gallery')} className="hover:text-emerald-400">
                  실시간 인증 갤러리
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: School Notice */}
          <div className="space-y-1.5">
            <div className="text-white font-bold text-xs uppercase tracking-wider mb-1">
              이용 안내
            </div>
            <p className="text-[10px] leading-relaxed text-slate-500">
              주문 시 [다회용기 사용]을 고르면 살균 용기에 담겨오며, 식사 후 교내 반납함에 뚜껑을 닫아 넣으면 전문 세척 업체에서 수거합니다.
            </p>
          </div>

        </div>

        {/* Bottom Banner */}
        <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-emerald-300">
          <div className="flex items-center gap-3">
            <span>📍 반납 장소: 교내 다회용기 전용 반납함</span>
            <span>✨ 설거지 없이 뚜껑만 닫아 반납</span>
          </div>
          <div className="text-slate-400">2026 동덕여자고등학교 기후행동 365+</div>
        </div>

      </div>
    </footer>
  );
};
