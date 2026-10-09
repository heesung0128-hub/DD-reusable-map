// mockData.ts의 기존 식당 정보를 네이버 지역검색 결과와 비교하는 스크립트 (읽기 전용, 파일을 고치지 않음)
//   - 식당마다 이름으로 검색해서 기존 좌표와 얼마나 차이 나는지 보여줌
//   - API가 어떤 필드를 실제로 채워주는지 통계를 냄
// 실행: node --env-file=.env scripts/comparePlaces.mjs

import { readFileSync } from 'node:fs';

const CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('.env에 NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 이 없습니다.');
  process.exit(1);
}

// mockData.ts에서 id, name, lat, lng, address만 읽어옴
const source = readFileSync(new URL('../src/data/mockData.ts', import.meta.url), 'utf-8');
const restaurants = [];
// 이름·주소는 작은따옴표/큰따옴표 둘 다 허용
const re = /id: '(rest-\d+)',\s*name: (['"])(.*?)\2,[\s\S]*?lat: ([\d.]+),\s*lng: ([\d.]+),\s*address: (['"])(.*?)\6/g;
for (const m of source.matchAll(re)) {
  restaurants.push({ id: m[1], name: m[3], lat: Number(m[4]), lng: Number(m[5]), address: m[7] });
}
console.log(`mockData.ts에서 식당 ${restaurants.length}곳을 읽었습니다.`);

const clean = (s) => String(s ?? '').replace(/<[^>]*>/g, '').trim();
const normalize = (s) => clean(s).replace(/\s+/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

async function search(query) {
  const url = `https://naverapihub.apigw.ntruss.com/search/v1/local?query=${encodeURIComponent(query)}&display=5&start=1&format=json`;
  const res = await fetch(url, {
    headers: { 'X-NCP-APIGW-API-KEY-ID': CLIENT_ID, 'X-NCP-APIGW-API-KEY': CLIENT_SECRET },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).items ?? [];
}

// 배민 상호와 네이버 실제 상호가 다른 식당은 placeAliases.json의 이름으로 검색함
const aliases = JSON.parse(readFileSync(new URL('./placeAliases.json', import.meta.url), 'utf-8'));

const rows = [];
const allItems = []; // 필드 통계용

for (const r of restaurants) {
  const searchName = aliases[r.id] ?? r.name;
  let items = [];
  try {
    items = await search(searchName);
    allItems.push(...items);
  } catch (err) {
    rows.push({ r, status: `오류: ${err.message}` });
    continue;
  }
  // 이름이 정확히 같은 후보를 우선, 없으면 첫 후보
  const exact = items.find((it) => normalize(it.title) === normalize(searchName));
  const pick = exact ?? items[0];
  if (!pick) {
    rows.push({ r, status: '결과 없음' });
  } else {
    const lat = Number(pick.mapy) / 1e7;
    const lng = Number(pick.mapx) / 1e7;
    rows.push({
      r,
      status: exact ? '이름 일치' : '이름 불일치(확인 필요)',
      title: clean(pick.title),
      roadAddress: clean(pick.roadAddress),
      diff: distanceMeters(r.lat, r.lng, lat, lng),
      lat,
      lng,
      count: items.length,
    });
  }
  await sleep(300);
}

console.log('\n===== 기존 좌표와 API 좌표 차이 (큰 순서) =====');
rows
  .sort((a, b) => (b.diff ?? -1) - (a.diff ?? -1))
  .forEach(({ r, status, title, roadAddress, diff, lat, lng, count }) => {
    console.log(`\n${r.id} ${r.name}  → ${status}`);
    if (title) {
      console.log(`  API 가게명  : ${title} (후보 ${count}개)`);
      console.log(`  기존 주소   : ${r.address}`);
      console.log(`  API 도로명  : ${roadAddress}`);
      console.log(`  좌표 차이   : 약 ${diff}m   (기존 ${r.lat}, ${r.lng} / API ${lat}, ${lng})`);
    }
  });

// 필드 통계: 전체 후보 중 값이 채워진 비율
console.log('\n===== API가 실제로 채워주는 필드 (검색된 후보 전체 기준) =====');
const fields = ['title', 'link', 'category', 'description', 'telephone', 'address', 'roadAddress', 'mapx', 'mapy'];
console.log(`후보 총 ${allItems.length}개`);
for (const f of fields) {
  const filled = allItems.filter((it) => String(it[f] ?? '').trim() !== '').length;
  console.log(`  ${f.padEnd(12)} ${filled}/${allItems.length} 채워짐`);
}
console.log('\n※ 이 스크립트는 파일을 수정하지 않습니다.');
