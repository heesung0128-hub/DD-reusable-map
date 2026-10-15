import { collection, doc, getDocs, increment, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchCertCounts } from './certCounts';

const CACHE_MS = 5 * 60 * 1000;
let cache: { scores: Record<string, number>; at: number } | null = null;

// 식당별 찜 수는 restaurantLikes/{식당ID} 문서의 count 칸에 모아 둠 (찜 +1, 찜 해제 -1)
export async function changeRestaurantLikeCount(restaurantId: string, delta: 1 | -1): Promise<void> {
  await setDoc(doc(db, 'restaurantLikes', restaurantId), { count: increment(delta) }, { merge: true });
  cache = null; // 다음에 인기순을 고를 때 방금 누른 찜이 반영되도록
}

async function fetchRestaurantLikeCounts(): Promise<Record<string, number>> {
  const snap = await getDocs(collection(db, 'restaurantLikes'));
  const counts: Record<string, number> = {};
  snap.forEach((d) => {
    counts[d.id] = Math.max(0, Number(d.data().count) || 0);
  });
  return counts;
}

// 인기 점수 = 인증 수 + 찜 수 (인증 1건과 찜 1개를 같은 점수로 더함)
// 찜 수를 못 불러와도(보안 규칙 미설정 등) 인증 수만으로 계산함. 5분 동안은 저장해 둔 값을 씀
export async function fetchPopularityScores(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.scores;

  const [certCounts, likeCounts] = await Promise.all([
    fetchCertCounts(),
    fetchRestaurantLikeCounts().catch((err) => {
      console.error('찜 수를 불러오지 못해 인증 수만으로 계산합니다.', err);
      return {} as Record<string, number>;
    }),
  ]);

  const scores: Record<string, number> = {};
  for (const id of Object.keys(certCounts)) {
    scores[id] = certCounts[id] + (likeCounts[id] ?? 0);
  }
  cache = { scores, at: Date.now() };
  return scores;
}
