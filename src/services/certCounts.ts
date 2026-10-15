import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RESTAURANTS_DATA } from '../data/mockData';

const CACHE_MS = 5 * 60 * 1000;
let cache: { counts: Record<string, number>; at: number } | null = null;

// 식당 이름별 인증 글 개수. 인증 글에는 식당 이름이 저장되어 있어서 이름이 같은 글을 셈
export async function countCertsByRestaurantName(names: string[]): Promise<Record<string, number>> {
  const entries = await Promise.all(
    names.map(async (name) => {
      const snap = await getCountFromServer(
        query(collection(db, 'certifications'), where('restaurantName', '==', name)),
      );
      return [name, snap.data().count] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// 식당 id별 인증 수. 5분 동안은 다시 부르지 않고 저장해 둔 값을 씀
export async function fetchCertCounts(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.counts;

  const byName = await countCertsByRestaurantName(RESTAURANTS_DATA.map((r) => r.name));
  const counts: Record<string, number> = {};
  RESTAURANTS_DATA.forEach((r) => {
    counts[r.id] = byName[r.name] ?? 0;
  });
  cache = { counts, at: Date.now() };
  return counts;
}
