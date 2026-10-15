import { Restaurant } from '../types';

export type SortMode = 'distance' | 'popular';

// 가까운 순: 학교에서 가까운 식당부터
// 인기순: 인기 점수(학생 인증 수 + 찜 수)가 높은 식당부터 (점수가 같으면 가까운 순). 점수를 아직 못 불러왔으면 가까운 순
export function sortRestaurants(
  list: Restaurant[],
  mode: SortMode,
  popularityScores: Record<string, number> | null,
): Restaurant[] {
  const byDistance = (a: Restaurant, b: Restaurant) => a.distanceMeters - b.distanceMeters;
  const sorted = [...list];

  if (mode === 'popular' && popularityScores) {
    sorted.sort((a, b) => (popularityScores[b.id] ?? 0) - (popularityScores[a.id] ?? 0) || byDistance(a, b));
  } else {
    sorted.sort(byDistance);
  }
  return sorted;
}
