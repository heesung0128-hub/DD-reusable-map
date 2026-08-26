import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { MapSection } from './components/MapSection';
import { OrderReturnGuide } from './components/OrderReturnGuide';
import { CertificationGallery } from './components/CertificationGallery';
import { Footer } from './components/Footer';
import { ActivePage } from './types';
import { Camera, MapPin, BookOpen } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('map');
  const [isCertModalOpen, setIsCertModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#F0FAF5] flex flex-col selection:bg-emerald-200 selection:text-emerald-900 font-sans">
      
      {/* 1. Header & Navigation Tabs (Multi-page Switching) */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenCertModal={() => setIsCertModalOpen(true)}
      />

      {/* 2. Independent Page Routing Content */}
      <main className="flex-1">
        
        {/* Page 1: 맛집 지도 (Map Page) */}
        {activePage === 'map' && (
          <MapSection
            onOpenCertModal={() => {
              setActivePage('gallery');
              setIsCertModalOpen(true);
            }}
          />
        )}

        {/* Page 2: 이용 & 반납 가이드 (Guide Page) */}
        {activePage === 'guide' && (
          <OrderReturnGuide
            onGoToMap={() => setActivePage('map')}
            onGoToGallery={() => setActivePage('gallery')}
          />
        )}

        {/* Page 3: 실시간 인증 갤러리 (Gallery Page) */}
        {activePage === 'gallery' && (
          <CertificationGallery
            isModalOpen={isCertModalOpen}
            onCloseModal={() => setIsCertModalOpen(false)}
            onOpenModal={() => setIsCertModalOpen(true)}
          />
        )}

      </main>

      {/* 3. Mobile Bottom Navigation Bar for Instant Page Switching */}
      <div className="md:hidden sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-emerald-200 py-1.5 px-6 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setActivePage('map')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
            activePage === 'map' ? 'text-emerald-700 font-black' : 'text-slate-400 font-medium'
          }`}
        >
          <MapPin className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">맛집 지도</span>
        </button>

        <button
          onClick={() => setActivePage('guide')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
            activePage === 'guide' ? 'text-emerald-700 font-black' : 'text-slate-400 font-medium'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">이용 가이드</span>
        </button>

        <button
          onClick={() => setActivePage('gallery')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
            activePage === 'gallery' ? 'text-emerald-700 font-black' : 'text-slate-400 font-medium'
          }`}
        >
          <Camera className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">인증 갤러리</span>
        </button>
      </div>

      {/* 4. Footer */}
      <Footer onNavigate={setActivePage} />

    </div>
  );
}
