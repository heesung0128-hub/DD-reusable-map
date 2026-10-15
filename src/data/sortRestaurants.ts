import { Restaurant } from '../types';

export type SortMode = 'distance' | 'popular';

// 가까운 순: 학교에서 가까운 식당부터
// 인기순: 학생 인증이 많은 식당부터 (인증 수가 같으면 가까운 순). 인증 수를 아직 못 불러왔으면 가까운 순
export function sortRestaurants(
  list: Restaurant[],
  mode: SortMode,
  certCounts: Record<string, number> | null,
): Restaurant[] {
  const byDistance = (a: Restaurant, b: Restaurant) => a.distanceMeters - b.distanceMeters;
  const sorted = [...list];

  if (mode === 'popular' && certCounts) {
    sorted.sort((a, b) => (certCounts[b.id] ?? 0) - (certCounts[a.id] ?? 0) || byDistance(a, b));
  } else {
    sorted.sort(byDistance);
  }
  return sorted;
}
