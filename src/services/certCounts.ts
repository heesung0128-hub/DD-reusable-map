import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RESTAURANTS_DATA } from '../data/mockData';

const CACHE_MS = 5 * 60 * 1000;
let cache: { counts: Record<string, number>; at: number } | null = null;

// 식당 id별 인증 글 개수. 인증 글에 저장된 식당 ID(restaurantId)가 같은 글을 셈
// (식당 ID가 생기기 전에 올린 예전 글은 세지 않음)
export async function countCertsByRestaurantId(ids: string[]): Promise<Record<string, number>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      const snap = await getCountFromServer(
        query(collection(db, 'certifications'), where('restaurantId', '==', id)),
      );
      return [id, snap.data().count] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// 지도의 모든 식당의 인증 수. 5분 동안은 다시 부르지 않고 저장해 둔 값을 씀
export async function fetchCertCounts(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.counts;

  const counts = await countCertsByRestaurantId(RESTAURANTS_DATA.map((r) => r.id));
  cache = { counts, at: Date.now() };
  return counts;
}
