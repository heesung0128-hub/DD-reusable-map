import React, { useState } from 'react';
import { MapPin, Camera, School, Menu, X, BookOpen } from 'lucide-react';
import { ActivePage } from '../types';

interface NavbarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  onOpenCertModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  onOpenCertModal,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ActivePage; label: string; icon: any }[] = [
    { id: 'map', label: '맛집 지도', icon: MapPin },
    { id: 'guide', label: '이용 & 반납 가이드', icon: BookOpen },
    { id: 'gallery', label: '실시간 인증 갤러리', icon: Camera },
  ];

  const handlePageChange = (id: ActivePage) => {
    setActivePage(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-emerald-600 text-white shadow-md border-b border-emerald-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Logo & School Badge */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handlePageChange('map')}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center text-emerald-600 font-black text-lg shadow-sm border border-emerald-200">
              D
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.2 rounded-full bg-emerald-700 text-emerald-100 border border-emerald-500/60 flex items-center gap-1">
                  <School className="w-2.5 h-2.5" /> 동덕여자고등학교
                </span>
                <span className="text-[10px] font-medium text-emerald-200">방배동</span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white leading-tight">
                동덕여고 <span className="text-emerald-100">'용기내'</span> 지도
              </h1>
            </div>
          </div>

          {/* Desktop Multi-Page Tabs Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-emerald-700/60 p-1 rounded-2xl border border-emerald-500/50">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handlePageChange(item.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-emerald-100 hover:text-white hover:bg-emerald-600'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-emerald-200'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Action CTA Button */}
          <div className="flex items-center gap-2">
            <button
              id="cta-cert-upload"
              onClick={() => {
                if (activePage !== 'gallery') {
                  setActivePage('gallery');
                }
                onOpenCertModal();
              }}
              className="min-h-11 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white text-emerald-800 text-xs sm:text-sm font-black shadow-sm hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-1.5 border border-emerald-200"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>인증샷 올리기</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white hover:bg-emerald-700 focus:outline-hidden"
              aria-label="메뉴 열기"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Page Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-emerald-700 border-b border-emerald-800 px-4 pt-2 pb-3 space-y-1 shadow-lg animate-in slide-in-from-top-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handlePageChange(item.id)}
                className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-black flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-emerald-100 hover:bg-emerald-600'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-emerald-200'}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
