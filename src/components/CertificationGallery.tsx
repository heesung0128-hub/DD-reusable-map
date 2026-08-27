import React, { useState, useEffect } from 'react';
import {
  Camera, Heart, Sparkles, CheckCircle,
  X, Send, Trash2, Filter, AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc,
  increment, serverTimestamp, orderBy, query,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CertificationPost } from '../types';
import { RESTAURANTS_DATA } from '../data/mockData';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// Phone camera photos are often several MB; downscale + re-encode before
// storing as base64 so a handful of posts don't blow past localStorage quota.
const MAX_PHOTO_DIMENSION = 1280;
const PHOTO_JPEG_QUALITY = 0.8;

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unexpected file reader result'));
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION) {
          const scale = MAX_PHOTO_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

interface CertificationGalleryProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
}

export const CertificationGallery: React.FC<CertificationGalleryProps> = ({
  isModalOpen,
  onCloseModal,
  onOpenModal,
}) => {
  // Posts are shared across every visitor via Firestore (real-time synced)
  const [posts, setPosts] = useState<CertificationPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(false);

  const [likedPostIds, setLikedPostIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('dongdeok_eco_liked_ids');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Track which posts this browser created, so only the author can delete their own post
  const [myPostIds, setMyPostIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('dongdeok_eco_my_post_ids');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [filterRestaurant, setFilterRestaurant] = useState<string>('전체');

  useBodyScrollLock(isModalOpen);

  // Form State
  const [authorName, setAuthorName] = useState('');
  const [gradeClass, setGradeClass] = useState('동덕여고 2학년 3반');
  const [selectedRest, setSelectedRest] = useState(RESTAURANTS_DATA[0].name);
  const [menuName, setMenuName] = useState('에코 마라탕 / 떡볶이');
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80');

  // Subscribe to the shared certification board in Firestore
  useEffect(() => {
    const q = query(collection(db, 'certifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPosts(snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            studentName: data.studentName,
            gradeClass: data.gradeClass,
            restaurantName: data.restaurantName,
            menuName: data.menuName,
            photoUrl: data.photoUrl,
            comment: data.comment,
            likes: data.likes,
            date: data.date,
            verified: data.verified,
          } as CertificationPost;
        }));
        setPostsLoading(false);
        setPostsError(false);
      },
      (err) => {
        console.error(err);
        setPostsLoading(false);
        setPostsError(true);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('dongdeok_eco_liked_ids', JSON.stringify(likedPostIds));
    } catch (e) {
      console.error(e);
    }
  }, [likedPostIds]);

  useEffect(() => {
    try {
      localStorage.setItem('dongdeok_eco_my_post_ids', JSON.stringify(myPostIds));
    } catch (e) {
      console.error(e);
    }
  }, [myPostIds]);

  const presetPhotos = [
    { label: '스텐 마라탕 용기', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' },
    { label: '다회용 떡볶이 용기', url: 'https://images.unsplash.com/photo-1627042633145-b780d842ba45?auto=format&fit=crop&w=600&q=80' },
    { label: '에코 보울 포케', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80' },
    { label: '다회용 컵 & 베이커리', url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80' },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(file)
      .then(setPhotoUrl)
      .catch((err) => {
        console.error(err);
        alert('사진을 처리하는 중 문제가 발생했습니다. 다른 사진을 선택해주세요.');
      });
  };

  const handleToggleLike = async (postId: string) => {
    const postRef = doc(db, 'certifications', postId);
    if (likedPostIds.includes(postId)) {
      setLikedPostIds(prev => prev.filter(id => id !== postId));
      try {
        await updateDoc(postRef, { likes: increment(-1) });
      } catch (err) {
        console.error(err);
      }
    } else {
      setLikedPostIds(prev => [...prev, postId]);
      try {
        await updateDoc(postRef, { likes: increment(1) });
      } catch (err) {
        console.error(err);
      }
      confetti({
        particleCount: 30,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#f43f5e', '#fb7185', '#fda4af'],
      });
    }
  };

  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 인증 게시글을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'certifications', postId));
      } catch (err) {
        console.error(err);
        alert('삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  const handleSubmitNewPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      alert('이름과 실천 소감을 입력해주세요!');
      return;
    }

    const newPostData = {
      studentName: authorName.trim(),
      gradeClass: gradeClass.trim() || '동덕여자고등학교',
      restaurantName: selectedRest,
      menuName: menuName.trim() || '다회용기 메뉴',
      photoUrl: photoUrl,
      comment: comment.trim(),
      likes: 1,
      date: new Date().toISOString().split('T')[0],
      verified: true,
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'certifications'), newPostData);
      setLikedPostIds(prev => [...prev, docRef.id]);
      setMyPostIds(prev => [...prev, docRef.id]);
      onCloseModal();

      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#059669', '#10b981', '#34d399', '#f59e0b'],
      });

      setAuthorName('');
      setComment('');
    } catch (err) {
      console.error(err);
      alert('인증 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filterRestaurant === '전체') return true;
    return post.restaurantName.includes(filterRestaurant);
  });

  return (
    <div className="py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-emerald-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black mb-2">
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>동덕인 실시간 에코 인증 갤러리</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            동덕여고 '용기내' 인증 피드
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            가게에서 다회용기로 주문하고 맛있게 먹은 사진을 올려 친구들과 교내 에코 실천을 공유하세요!
          </p>
        </div>

        <button
          onClick={onOpenModal}
          className="px-5 py-3 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-black shadow-md hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Camera className="w-4 h-4" />
          <span>나도 인증샷 올리기</span>
        </button>
      </div>

      {postsLoading && (
        <div className="text-center py-12 bg-white rounded-3xl border border-emerald-100">
          <p className="text-sm text-slate-500 font-medium">인증 게시판을 불러오는 중...</p>
        </div>
      )}

      {postsError && (
        <div className="flex items-start gap-2 p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-medium leading-relaxed">
            인증 게시판을 불러오지 못했습니다. Firestore 연결 또는 보안 규칙 설정을 확인해주세요.
          </p>
        </div>
      )}

      {!postsLoading && !postsError && (
      <>
      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> 매장별:
          </span>
          {['전체', '마라탕', '떡볶이', '포케', '제육', '카페'].map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterRestaurant(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterRestaurant === filter
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="text-xs font-bold text-emerald-800 shrink-0">
          총 <strong className="text-emerald-600 font-black">{filteredPosts.length}</strong>개의 인증
        </div>
      </div>

      {/* Certification Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPosts.map((post) => {
          const isLiked = likedPostIds.includes(post.id);
          return (
            <div
              key={post.id}
              className="bg-white rounded-3xl border-2 border-emerald-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Photo Header */}
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img
                    src={post.photoUrl}
                    alt={post.menuName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-emerald-800/90 text-white text-[11px] font-black backdrop-blur-xs shadow-xs">
                    {post.gradeClass}
                  </div>

                  {myPostIds.includes(post.id) && (
                    <button
                      onClick={(e) => handleDeletePost(post.id, e)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/40 text-white hover:bg-rose-600 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      title="내가 올린 인증 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-extrabold text-slate-900 text-sm">{post.studentName}</span>
                    <span className="text-[11px]">{post.date}</span>
                  </div>

                  <div>
                    <div className="text-xs font-black text-emerald-950 truncate">
                      🍴 {post.restaurantName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium truncate">
                      {post.menuName}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-3">
                    "{post.comment}"
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 bg-slate-50/80 border-t border-emerald-100 flex items-center justify-between">
                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> 교내 반납 완료
                </span>

                <button
                  onClick={() => handleToggleLike(post.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    isLiked
                      ? 'bg-rose-100 text-rose-600 border border-rose-200'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-rose-500'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{post.likes}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {filteredPosts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-emerald-200">
          <p className="text-sm text-slate-500 font-medium">선택한 매장의 인증 게시물이 아직 없습니다.</p>
        </div>
      )}
      </>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-2 border-emerald-300 my-auto animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    실시간 '용기내' 인증 올리기
                  </h3>
                  <p className="text-[10px] text-slate-500">동덕여고 다회용기 식사 인증</p>
                </div>
              </div>
              <button onClick={onCloseModal} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewPost} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase">
                    작성자 이름 / 닉네임 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 김민서"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase">
                    학년 및 반
                  </label>
                  <input
                    type="text"
                    placeholder="예: 동덕여고 2학년 3반"
                    value={gradeClass}
                    onChange={(e) => setGradeClass(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase">
                    이용한 매장
                  </label>
                  <input
                    type="text"
                    list="cert-restaurant-options"
                    value={selectedRest}
                    onChange={(e) => setSelectedRest(e.target.value)}
                    placeholder="매장명 입력 또는 선택"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                  <datalist id="cert-restaurant-options">
                    {RESTAURANTS_DATA.map(r => (
                      <option key={r.id} value={r.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase">
                    메뉴 이름
                  </label>
                  <input
                    type="text"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    placeholder="예: 마라탕 / 떡볶이"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Photo Upload & Presets */}
              <div>
                <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase">
                  인증 사진 등록 (직접 업로드 또는 샘플 선택)
                </label>
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full mb-2 text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-black file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {presetPhotos.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoUrl(p.url)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 border transition-all ${
                        photoUrl === p.url
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {photoUrl && (
                  <div className="mt-2 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={photoUrl} alt="미리보기" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 mb-1 uppercase">
                  실천 한줄 소감 *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="다회용기 주문 후기나 교내 반납 경험을 적어주세요!"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-emerald-700 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>인증 등록하기</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  취소
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
