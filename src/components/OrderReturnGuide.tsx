import React from 'react';
import { Smartphone, Utensils, RotateCcw, ShieldCheck, MapPin, CheckCircle2, CornerDownRight, Sparkles, ArrowRight, Search, Camera } from 'lucide-react';

interface OrderReturnGuideProps {
  onGoToMap: () => void;
  onGoToGallery: () => void;
}

export const OrderReturnGuide: React.FC<OrderReturnGuideProps> = ({ onGoToMap, onGoToGallery }) => {
  const steps = [
    {
      step: '01',
      icon: Smartphone,
      title: '주문 시 [다회용기] 선택',
      desc: '배달앱(배달의민족, 요기요, 쿠팡이츠 등) 또는 전화 주문 시 "다회용기 사용" 옵션을 체크합니다.',
      badge: '대여료 0원',
      detail: '개인 용기를 따로 챙겨갈 필요 없이 가게에서 살균 다회용기에 담아 배달·포장해줍니다.',
    },
    {
      step: '02',
      icon: ShieldCheck,
      title: '밀폐 다회용기로 수령',
      desc: '보온이 유지되는 전용 밀폐 다회용기 또는 스텐 보온통에 음식이 따뜻하고 안전하게 담겨옵니다.',
      badge: '온기 유지 & 샘 방지',
      detail: '일회용 플라스틱 용기 특유의 환경호르몬이나 미세플라스틱 걱정 없이 안심하고 먹을 수 있습니다.',
    },
    {
      step: '03',
      icon: Utensils,
      title: '친구들과 맛있게 식사',
      desc: '교실, 동아리실, 휴게 공간 등에서 친구들과 함께 플라스틱 쓰레기 걱정 없이 식사를 즐깁니다.',
      badge: '일회용 쓰레기 0개',
      detail: '식사 후 번거로운 플라스틱 분리수거 및 세척 부담이 전혀 없습니다.',
    },
    {
      step: '04',
      icon: RotateCcw,
      title: '교내 수거함에 뚜껑 닫아 반납',
      desc: '잔여 음식물만 비우고 뚜껑을 꼭 닫아 동덕여고 교내 반납함에 쏙 넣으면 완료됩니다.',
      badge: '세척 불필요',
      detail: '전문 수거·세척 업체에서 매일 교내 수거함을 방문하여 회수해 갑니다.',
    },
  ];

  const etiquetteRules = [
    {
      icon: '🍲 ➡️ 🗑️',
      title: '1. 잔여 음식물 가볍게 비우기',
      desc: '다 드신 후 국물이나 남은 음식물 찌꺼기는 음식물 쓰레기통에 가볍게 비워주세요.',
      point: '※ 물로 직접 설거지할 필요 전혀 없습니다!',
    },
    {
      icon: '🔒',
      title: '2. 용기 뚜껑 꼭 닫기',
      desc: '수거함 주변에 음식 냄새가 퍼지거나 벌레가 생기지 않도록 뚜껑을 꽉 닫아주세요.',
      point: '※ 부속품(뚜껑, 보온백 등)을 함께 챙겨주세요.',
    },
    {
      icon: '📍 📦',
      title: '3. 교내 전용 반납함에 넣기',
      desc: '동덕여고 교내 다회용기 전용 반납함에 넣어주세요.',
      point: '※ 일반 쓰레기통이나 분리수거함에 버리지 마세요.',
    },
  ];

  // TODO: 정확한 반납함 위치 확정되면 name/description/photoUrl을 교체해주세요.
  const returnSpot = {
    name: '반납함 위치 (추후 안내 예정)',
    description: '정확한 반납함 위치와 이용 안내가 이곳에 표시됩니다.',
    photoUrl: '',
  };

  return (
    <div className="py-6 sm:py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="text-center max-w-2xl lg:max-w-none mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>동덕여고 다회용기 이용 & 반납 가이드</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          용기 준비 없이 주문하고, 교내에서 간편 반납!
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed lg:whitespace-nowrap">
          가게에서 깨끗한 다회용기에 담아 보내주고, 식사 후 교내 반납함에 뚜껑만 닫아 넣으면 끝나는 초간단 에코 라이프입니다.
        </p>
      </div>

      {/* Delivery App Search Tip */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
          <Search className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className="text-sm font-black text-emerald-950">배달앱에서 매장을 더 쉽게 찾는 법</p>
          <p className="text-xs sm:text-sm text-emerald-900 mt-1 leading-relaxed">
            배달앱(배달의민족, 요기요, 쿠팡이츠 등) 검색창에 <strong>"다회용기"</strong>를 검색하면 다회용기 주문이 가능한 매장들이 바로 모아서 나옵니다!
          </p>
        </div>
      </div>

      {/* 1. 4-Step Reusable System Flow */}
      <div className="bg-white rounded-3xl border-2 border-emerald-200 p-5 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">1</span>
            <span>다회용기 주문부터 수령까지 4단계</span>
          </h3>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            보증금 & 대여료 0원
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="w-7 h-7 rounded-xl bg-emerald-700 text-white font-black text-xs flex items-center justify-center">
                      {s.step}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-emerald-800 border border-emerald-300 text-[10px] font-black">
                      {s.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h4 className="font-black text-sm text-slate-900">{s.title}</h4>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed mb-2 font-medium">
                    {s.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-900 font-medium">
                  {s.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. School Return Spots Map & Locations */}
      <div className="bg-emerald-800 text-white rounded-3xl p-5 sm:p-7 shadow-md border-2 border-emerald-600">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-700 text-emerald-200 border border-emerald-500 uppercase">
              Dongdeok Return Spots
            </span>
            <h3 className="text-base sm:text-lg font-black text-white mt-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-300" />
              <span>동덕여자고등학교 교내 다회용기 전용 반납함 위치</span>
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-200 bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-700">
            매일 전문 업체 정기 수거
          </span>
        </div>

        <div className="bg-emerald-900/80 rounded-2xl p-4 sm:p-5 border border-emerald-700/80 flex flex-col sm:flex-row gap-4">
          <div className="sm:w-56 shrink-0 aspect-4/3 sm:aspect-square rounded-xl overflow-hidden border border-emerald-700/80 bg-emerald-950/50 flex items-center justify-center">
            {returnSpot.photoUrl ? (
              <img src={returnSpot.photoUrl} alt={returnSpot.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-emerald-400/70 p-4 text-center">
                <Camera className="w-6 h-6" />
                <span className="text-[10px] font-bold">반납함 사진 추가 예정</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-sm sm:text-base font-black text-white mb-1.5">
              {returnSpot.name}
            </div>
            <p className="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed">
              {returnSpot.description}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Return Etiquette 3 Principles */}
      <div className="bg-white rounded-3xl border-2 border-emerald-200 p-5 sm:p-7 shadow-sm">
        <h3 className="text-base sm:text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">2</span>
          <span>동덕인을 위한 초간단 반납 에티켓 3원칙</span>
        </h3>
        <p className="text-xs text-slate-600 mb-5">
          세척은 전문 공장에서 고온 살균 처리하므로 직접 씻을 필요 없이 아래 3가지만 지켜주세요.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {etiquetteRules.map((rule, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-center flex flex-col justify-between">
              <div>
                <div className="text-3xl mb-2">{rule.icon}</div>
                <h4 className="text-xs sm:text-sm font-black text-emerald-950 mb-1.5">{rule.title}</h4>
                <p className="text-xs text-slate-700 leading-relaxed mb-3">
                  {rule.desc}
                </p>
              </div>
              <div className="text-[11px] font-bold text-emerald-800 bg-white py-1.5 px-2 rounded-xl border border-emerald-200">
                {rule.point}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Navigation Strip */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onGoToMap}
          className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-md hover:bg-emerald-700 active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <span>동덕여고 근처 다회용기 맛집 지도 보러가기</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onGoToGallery}
          className="flex-1 py-3.5 px-4 rounded-2xl bg-white text-emerald-800 font-black text-sm border-2 border-emerald-200 hover:bg-emerald-50 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xs"
        >
          <span>실시간 '용기내' 인증 갤러리 가기</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
