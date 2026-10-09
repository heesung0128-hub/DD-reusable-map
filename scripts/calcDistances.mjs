// 네이버 길찾기(Directions 5)로 각 식당 → 학교 자동차 경로 거리를 계산해 비교하는 스크립트
// 읽기 전용: mockData.ts를 수정하지 않고, 현재 값과 계산한 값을 표로 보여줌
// 실행: node --env-file=.env scripts/calcDistances.mjs

import { readFileSync } from 'node:fs';

// Maps Application의 키 (KEY_ID가 없으면 사이트 지도용 Client ID를 대신 사용)
const KEY_ID = process.env.NAVER_MAPS_API_KEY_ID || process.env.VITE_NAVER_CLIENT_ID;
const KEY = process.env.NAVER_MAPS_API_KEY;
if (!KEY_ID || !KEY) {
  console.error('.env에 NAVER_MAPS_API_KEY (Maps Application의 Client Secret)가 없습니다.');
  console.error('KEY_ID는 NAVER_MAPS_API_KEY_ID 또는 VITE_NAVER_CLIENT_ID 중 하나가 있어야 합니다.');
  process.exit(1);
}

// 학교 좌표 (src/data/mockData.ts의 DONGDEOK_SCHOOL_COORDS와 같은 값)
const SCHOOL = { lat: 37.4762104, lng: 126.9923154 };

const source = readFileSync(new URL('../src/data/mockData.ts', import.meta.url), 'utf-8');
const restaurants = [];
const re = /id: '(rest-\d+)',\s*name: (['"])(.*?)\2,[\s\S]*?distanceMeters: (\d+),[\s\S]*?lat: ([\d.]+),\s*lng: ([\d.]+)/g;
for (const m of source.matchAll(re)) {
  restaurants.push({ id: m[1], name: m[3], current: Number(m[4]), lat: Number(m[5]), lng: Number(m[6]) });
}
console.log(`mockData.ts에서 식당 ${restaurants.length}곳을 읽었습니다.\n`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 식당(출발) → 학교(도착) 자동차 경로 거리(m)
async function routeDistance(lat, lng) {
  // VPC 환경 Maps Application은 maps.apigw.ntruss.com 으로 호출해야 함 (naveropenapi 주소는 401)
  const url =
    'https://maps.apigw.ntruss.com/map-direction/v1/driving' +
    `?start=${lng},${lat}&goal=${SCHOOL.lng},${SCHOOL.lat}&option=traoptimal`;
  const res = await fetch(url, {
    headers: { 'x-ncp-apigw-api-key-id': KEY_ID, 'x-ncp-apigw-api-key': KEY },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  if (data.code !== 0) throw new Error(`길찾기 실패 code=${data.code} ${data.message}`);
  return data.route.traoptimal[0].summary.distance;
}

for (const r of restaurants) {
  try {
    const raw = await routeDistance(r.lat, r.lng);
    const rounded = Math.round(raw / 100) * 100; // 100m 단위로 반올림
    console.log(
      `${r.id.padEnd(8)} ${r.name.padEnd(18)} 현재 ${String(r.current).padStart(5)}m → 경로 ${String(raw).padStart(5)}m (반올림 ${String(rounded).padStart(5)}m, 차이 ${rounded - r.current}m)`,
    );
  } catch (err) {
    console.log(`${r.id.padEnd(8)} ${r.name.padEnd(18)} 오류: ${err.message}`);
    if (String(err.message).includes('401')) {
      console.error('\n키 또는 Maps Application의 Directions 5 사용 신청을 확인하세요. 중단합니다.');
      process.exit(1);
    }
  }
  await sleep(300);
}

console.log('\n※ 자동차 경로(추천 경로) 기준이고 실시간 교통이 반영됩니다. 이 스크립트는 파일을 수정하지 않습니다.');
