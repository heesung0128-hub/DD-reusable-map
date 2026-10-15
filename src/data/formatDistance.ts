// 1000m부터는 km로 보여줌 (2500m → 2.5km, 3000m → 3km). 1000m보다 가까우면 m 그대로 (900m → 900m)
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${Math.round(meters / 100) / 10}km`;
}
