import React, { useState, useEffect } from 'react';
import {
  Camera, Heart, CheckCircle,
  X, Send, Trash2, Filter, AlertCircle, Pencil
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc,
  increment, serverTimestamp, orderBy, query, limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CertificationPost } from '../types';
import { RESTAURANTS_DATA } from '../data/mockData';
import { FOOD_CATEGORIES, findRestaurant } from '../data/categories';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// 스마트폰 카메라 사진은 수 MB에 달하므로, 업로드 전 해상도를 줄이고 압축하여 용량을 최적화합니다.
const MAX_PHOTO_DIMENSION = 1280;
const PHOTO_JPEG_QUALITY = 0.8;

// 인증 글은 이 개수씩 나눠서 불러옴 (사진이 글에 들어 있어 한꺼번에 불러오면 느려짐)
const POSTS_PER_PAGE = 12;

/**
 * 선택한 이미지 파일을 브라우저 캔버스를 이용해 리사이징하고 압축하는 함수
 */
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
  // Firestore 실시간 동기화로 가져온 전체 인증 글 목록
  const [posts, setPosts] = useState<CertificationPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(POSTS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  // 좋아요 누른 글 목록 (로컬 스토리지에 보관)
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

  // 내가 작성한 글 ID 목록 (로컬 스토리지에 보관하여 본인 글만 수정/삭제할 수 있도록 함)
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

  // 카테고리 필터 상태
  const [filterCategory, setFilterCategory] = useState<string>('전체');

  // 신규 등록 폼 상태
  const [authorName, setAuthorName] = useState('');
  const [gradeClass, setGradeClass] = useState('동덕여고 2학년 3반');
  const [selectedRestId, setSelectedRestId] = useState('');
  const [menuName, setMenuName] = useState('');
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoProcessing, setPhotoProcessing] = useState(false);
  // 파일 선택 칸 초기화를 위한 키
  const [fileInputKey, setFileInputKey] = useState(0);

  // 수정 모달 상태 (null이면 닫힘, 글 객체가 있으면 해당 글 수정 중)
  const [editingPost, setEditingPost] = useState<CertificationPost | null>(null);
  const [editAuthorName, setEditAuthorName] = useState('');
  const [editGradeClass, setEditGradeClass] = useState('');
  const [editSelectedRestId, setEditSelectedRestId] = useState('');
  const [editMenuName, setEditMenuName] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editPhotoProcessing, setEditPhotoProcessing] = useState(false);
  const [editFileInputKey, setEditFileInputKey] = useState(100);

  // 모달이 열려 있을 때 뒷배경 스크롤 방지
  useBodyScrollLock(isModalOpen || !!editingPost);

  // Firestore의 certifications 컬렉션 실시간 구독
  useEffect(() => {
    const q = query(collection(db, 'certifications'), orderBy('createdAt', 'desc'), limit(visibleLimit + 1));
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
            restaurantId: data.restaurantId,
            menuName: data.menuName,
            photoUrl: data.photoUrl,
            comment: data.comment,
            likes: data.likes,
            date: data.date,
            verified: data.verified,
          } as CertificationPost;
        }));
        setPostsLoading(false);
        setLoadingMore(false);
        setPostsError(false);
      },
      (err) => {
        console.error(err);
        setPostsLoading(false);
        setLoadingMore(false);
        setPostsError(true);
      }
    );
    return () => unsubscribe();
  }, [visibleLimit]);

  // 좋아요 목록 로컬스토리지 저장
  useEffect(() => {
    try {
      localStorage.setItem('dongdeok_eco_liked_ids', JSON.stringify(likedPostIds));
    } catch (e) {
      console.error(e);
    }
  }, [likedPostIds]);

  // 내가 쓴 글 목록 로컬스토리지 저장
  useEffect(() => {
    try {
      localStorage.setItem('dongdeok_eco_my_post_ids', JSON.stringify(myPostIds));
    } catch (e) {
      console.error(e);
    }
  }, [myPostIds]);

  // 신규 등록용 사진 업로드 처리
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoProcessing(true);
    compressImageFile(file)
      .then(setPhotoUrl)
      .catch((err) => {
        console.error(err);
        setPhotoUrl('');
        setFileInputKey((k) => k + 1);
        alert('사진을 처리하는 중 문제가 발생했습니다. 다른 사진을 선택해주세요.');
      })
      .finally(() => setPhotoProcessing(false));
  };

  // 수정용 사진 업로드 처리
  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoProcessing(true);
    compressImageFile(file)
      .then(setEditPhotoUrl)
      .catch((err) => {
        console.error(err);
        alert('사진을 처리하는 중 문제가 발생했습니다. 다른 사진을 선택해주세요.');
      })
      .finally(() => setEditPhotoProcessing(false));
  };

  // 좋아요 토글 처리
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

  // 내가 올린 글 삭제 처리
  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 인증 게시글을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'certifications', postId));
        // 삭제 성공 시 로컬 내가 쓴 글 목록에서도 제거
        setMyPostIds(prev => prev.filter(id => id !== postId));
      } catch (err) {
        console.error(err);
        alert('삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  // 수정 버튼 클릭 시 기존 글 데이터를 폼에 채우고 모달 열기
  const handleOpenEditModal = (post: CertificationPost, e: React.MouseEvent) => {
    e.stopPropagation();
    // 식당 ID가 없으면 식당 이름을 바탕으로 ID 역추적
    const matchedRest = RESTAURANTS_DATA.find(
      (r) => r.id === post.restaurantId || r.name === post.restaurantName
    );

    setEditingPost(post);
    setEditAuthorName(post.studentName);
    setEditGradeClass(post.gradeClass);
    setEditSelectedRestId(matchedRest?.id || post.restaurantId || '');
    setEditMenuName(post.menuName);
    setEditComment(post.comment);
    setEditPhotoUrl(post.photoUrl);
    setEditFileInputKey((k) => k + 1);
  };

  // 수정 모달 닫기
  const handleCloseEditModal = () => {
    setEditingPost(null);
    setEditPhotoProcessing(false);
  };

  // 신규 게시글 등록 처리
  const handleSubmitNewPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) {
      alert('이름과 실천 소감을 입력해주세요!');
      return;
    }
    const restaurant = RESTAURANTS_DATA.find((r) => r.id === selectedRestId);
    if (!restaurant) {
      alert('이용한 매장을 선택해주세요!');
      return;
    }
    if (photoProcessing) {
      alert('사진을 처리하는 중입니다. 잠시 후 다시 눌러주세요.');
      return;
    }
    if (!photoUrl) {
      alert('인증 사진을 올려주세요!');
      return;
    }

    const newPostData = {
      studentName: authorName.trim(),
      gradeClass: gradeClass.trim() || '동덕여자고등학교',
      // 이름은 화면 표시용, ID는 식당을 가리키는 고유값
      restaurantName: restaurant.name,
      restaurantId: restaurant.id,
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
      setSelectedRestId('');
      setMenuName('');
      setPhotoUrl('');
      setFileInputKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert('인증 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 게시글 수정 완료 처리
  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    if (!editAuthorName.trim() || !editComment.trim()) {
      alert('이름과 실천 소감을 입력해주세요!');
      return;
    }
    const restaurant = RESTAURANTS_DATA.find((r) => r.id === editSelectedRestId);
    if (!restaurant) {
      alert('이용한 매장을 선택해주세요!');
      return;
    }
    if (editPhotoProcessing) {
      alert('사진을 처리하는 중입니다. 잠시 후 다시 눌러주세요.');
      return;
    }
    if (!editPhotoUrl) {
      alert('인증 사진이 필요합니다!');
      return;
    }

    try {
      const postRef = doc(db, 'certifications', editingPost.id);
      await updateDoc(postRef, {
        studentName: editAuthorName.trim(),
        gradeClass: editGradeClass.trim() || '동덕여자고등학교',
        restaurantName: restaurant.name,
        restaurantId: restaurant.id,
        menuName: editMenuName.trim() || '다회용기 메뉴',
        photoUrl: editPhotoUrl,
        comment: editComment.trim(),
      });

      handleCloseEditModal();

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#059669', '#10b981', '#3b82f6'],
      });
      alert('게시글이 성공적으로 수정되었습니다! 👏');
    } catch (err) {
      console.error(err);
      alert('게시글 수정 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // 더 보기 가능 여부
  const hasMore = posts.length > visibleLimit;
  const shownPosts = posts.slice(0, visibleLimit);

  const handleLoadMore = () => {
    setLoadingMore(true);
    setVisibleLimit((n) => n + POSTS_PER_PAGE);
  };

  // 카테고리 필터링된 글 목록
  const filteredPosts = shownPosts.filter(post => {
    if (filterCategory === '전체') return true;
    return findRestaurant(post.restaurantId, post.restaurantName)?.category === filterCategory;
  });

  return (
    <div className="py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-300">
      
      {/* 최상단 헤더 및 등록 버튼 영역 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-emerald-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black mb-2">
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>동덕인 실시간 에코 인증 갤러리</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight text-balance">
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

      {/* 로딩 상태 안내 */}
      {postsLoading && (
        <div className="text-center py-12 bg-white rounded-3xl border border-emerald-100">
          <p className="text-sm text-slate-500 font-medium">인증 게시판을 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 안내 */}
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
      {/* 카테고리 필터 탭 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> 카테고리:
          </span>
          {FOOD_CATEGORIES.map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterCategory(filter)}
              className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                filterCategory === filter
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-emerald-100 hover:bg-emerald-50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="text-xs font-bold text-emerald-800 shrink-0">
          {hasMore ? '최근 ' : '총 '}<strong className="text-emerald-600 font-black">{filteredPosts.length}</strong>개의 인증
        </div>
      </div>

      {/* 인증 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPosts.map((post) => {
          const isLiked = likedPostIds.includes(post.id);
          const isMyPost = myPostIds.includes(post.id);

          return (
            <div
              key={post.id}
              className="bg-white rounded-3xl border-2 border-emerald-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* 상단 사진 영역 */}
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img
                    src={post.photoUrl}
                    alt={post.menuName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-emerald-800/90 text-white text-[11px] font-black backdrop-blur-xs shadow-xs">
                    {post.gradeClass}
                  </div>

                  {/* 내가 작성한 글인 경우 수정 및 삭제 버튼 표시 */}
                  {isMyPost && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => handleOpenEditModal(post, e)}
                        className="p-1.5 rounded-full bg-black/50 text-white hover:bg-emerald-600 transition-all shadow-sm"
                        title="내가 올린 인증 수정"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeletePost(post.id, e)}
                        className="p-1.5 rounded-full bg-black/50 text-white hover:bg-rose-600 transition-all shadow-sm"
                        title="내가 올린 인증 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 카드 본문 내용 */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-extrabold text-slate-900 text-sm">{post.studentName}</span>
                    <span className="text-[11px]">{post.date}</span>
                  </div>

                  <div>
                    <div className="text-xs font-black text-emerald-950 truncate">
                      🍴 {findRestaurant(post.restaurantId, post.restaurantName)?.name ?? post.restaurantName}
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

              {/* 카드 하단 푸터 (교내 반납 안내 및 좋아요 버튼) */}
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
          <p className="text-sm text-slate-500 font-medium">
            {hasMore
              ? '불러온 글 중에는 이 카테고리의 인증이 없어요. 아래 "더 보기"로 이전 글을 찾아보세요.'
              : '선택한 카테고리의 인증 게시물이 아직 없습니다.'}
          </p>
        </div>
      )}

      {/* 더 보기 버튼 */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="min-h-11 px-6 py-2.5 rounded-2xl bg-white border-2 border-emerald-200 text-emerald-800 text-xs sm:text-sm font-black hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loadingMore ? '불러오는 중...' : `인증 더 보기 (${POSTS_PER_PAGE}개씩)`}
          </button>
        </div>
      )}
      </>
      )}

      {/* 신규 등록 모달 */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="cert-author" className="block text-[10px] font-black text-slate-700 mb-1">
                    작성자 이름 / 닉네임 *
                  </label>
                  <input
                    id="cert-author"
                    type="text"
                    required
                    placeholder="예: 김민서"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label htmlFor="cert-grade" className="block text-[10px] font-black text-slate-700 mb-1">
                    학년 및 반
                  </label>
                  <input
                    id="cert-grade"
                    type="text"
                    placeholder="예: 동덕여고 2학년 3반"
                    value={gradeClass}
                    onChange={(e) => setGradeClass(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="cert-restaurant" className="block text-[10px] font-black text-slate-700 mb-1">
                    이용한 매장 *
                  </label>
                  <select
                    id="cert-restaurant"
                    required
                    value={selectedRestId}
                    onChange={(e) => setSelectedRestId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="">매장을 선택하세요</option>
                    {FOOD_CATEGORIES.filter((c) => c !== '전체').map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {RESTAURANTS_DATA.filter((r) => r.category === cat).map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="cert-menu" className="block text-[10px] font-black text-slate-700 mb-1">
                    메뉴 이름
                  </label>
                  <input
                    id="cert-menu"
                    type="text"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    placeholder="예: 야채마라탕"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 인증 사진: 직접 업로드만 (필수) */}
              <div>
                <label htmlFor="cert-photo" className="block text-[10px] font-black text-slate-700 mb-1">
                  인증 사진 *
                </label>
                <p className="text-[10px] text-slate-400 mb-1.5">직접 찍은 사진을 올려주세요. 사진은 자동으로 크기가 줄어서 올라가요.</p>

                <input
                  id="cert-photo"
                  key={fileInputKey}
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleFileUpload}
                  className="w-full mb-2 text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />

                {photoProcessing && (
                  <p className="text-[11px] text-slate-500">사진을 처리하는 중...</p>
                )}

                {photoUrl && !photoProcessing && (
                  <div className="h-40 sm:h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
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
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={photoProcessing}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-emerald-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
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

      {/* 게시글 수정 모달 (내가 작성한 글일 때만 오픈 가능) */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-2 border-emerald-400 my-auto animate-in zoom-in-95">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    내가 올린 '용기내' 인증 수정
                  </h3>
                  <p className="text-[10px] text-slate-500">수정된 내용은 즉시 반영됩니다</p>
                </div>
              </div>
              <button onClick={handleCloseEditModal} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePost} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="edit-cert-author" className="block text-[10px] font-black text-slate-700 mb-1">
                    작성자 이름 / 닉네임 *
                  </label>
                  <input
                    id="edit-cert-author"
                    type="text"
                    required
                    placeholder="예: 김민서"
                    value={editAuthorName}
                    onChange={(e) => setEditAuthorName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label htmlFor="edit-cert-grade" className="block text-[10px] font-black text-slate-700 mb-1">
                    학년 및 반
                  </label>
                  <input
                    id="edit-cert-grade"
                    type="text"
                    placeholder="예: 동덕여고 2학년 3반"
                    value={editGradeClass}
                    onChange={(e) => setEditGradeClass(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="edit-cert-restaurant" className="block text-[10px] font-black text-slate-700 mb-1">
                    이용한 매장 *
                  </label>
                  <select
                    id="edit-cert-restaurant"
                    required
                    value={editSelectedRestId}
                    onChange={(e) => setEditSelectedRestId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  >
                    <option value="">매장을 선택하세요</option>
                    {FOOD_CATEGORIES.filter((c) => c !== '전체').map((cat) => (
                      <optgroup key={cat} label={cat}>
                        {RESTAURANTS_DATA.filter((r) => r.category === cat).map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-cert-menu" className="block text-[10px] font-black text-slate-700 mb-1">
                    메뉴 이름
                  </label>
                  <input
                    id="edit-cert-menu"
                    type="text"
                    value={editMenuName}
                    onChange={(e) => setEditMenuName(e.target.value)}
                    placeholder="예: 야채마라탕"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 인증 사진: 기존 사진 유지 또는 새 사진 선택 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="edit-cert-photo" className="text-[10px] font-black text-slate-700">
                    인증 사진 (선택)
                  </label>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    사진을 바꾸지 않으면 기존 사진이 유지돼요
                  </span>
                </div>

                <input
                  id="edit-cert-photo"
                  key={editFileInputKey}
                  type="file"
                  accept="image/*"
                  onChange={handleEditFileUpload}
                  className="w-full mb-2 text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />

                {editPhotoProcessing && (
                  <p className="text-[11px] text-slate-500">새 사진을 처리하는 중...</p>
                )}

                {editPhotoUrl && !editPhotoProcessing && (
                  <div className="h-40 sm:h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                    <img src={editPhotoUrl} alt="미리보기" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px]">
                      현재 설정된 사진
                    </span>
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
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={editPhotoProcessing}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-emerald-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>수정 완료하기</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
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
