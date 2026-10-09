// 네이버 지역검색 API로 식당 후보(주소·좌표·카테고리)를 찾아 보여주는 스크립트
// 사이트에는 포함되지 않고, 내 컴퓨터에서만 실행함 (키가 사이트에 노출되지 않도록)
//
// 사용법:
//   1) scripts/placesInput.txt 에 식당 이름을 한 줄에 하나씩 적기 (예: 저육당 사당본점)
//   2) 실행: node --env-file=.env scripts/fetchPlaces.mjs
//   또는 이름을 직접 넣기: node --env-file=.env scripts/fetchPlaces.mjs "저육당 사당" "제육대가 서초"

import { readFileSync, existsSync } from 'node:fs';

const CLIENT_ID = process.env.NAVER_SEARCH_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_SEARCH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('.env에 NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET 이 없습니다.');
  console.error('실행 명령: node --env-file=.env scripts/fetchPlaces.mjs');
  process.exit(1);
}

// 학교 좌표 (src/data/mockData.ts의 DONGDEOK_SCHOOL_COORDS와 같은 값)
const SCHOOL = { lat: 37.4762104, lng: 126.9923154 };

// 입력: 명령줄 인자가 있으면 그것, 없으면 placesInput.txt
const INPUT_FILE = new URL('./placesInput.txt', import.meta.url);
// --raw 를 붙이면 API가 주는 원본 응답(JSON)을 그대로 출력함 (어떤 필드가 있는지 확인용)
const RAW = process.argv.includes('--raw');
let names = process.argv.slice(2).filter((a) => a !== '--raw');
if (names.length === 0 && existsSync(INPUT_FILE)) {
  names = readFileSync(INPUT_FILE, 'utf-8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}
if (names.length === 0) {
  console.error('검색할 식당 이름이 없습니다. scripts/placesInput.txt에 한 줄에 하나씩 적어주세요.');
  process.exit(1);
}

// <b>태그와 HTML 특수문자 제거
const cleanText = (s) =>
  String(s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

// mapx/mapy 변환: 9자리 이상이면 (위경도 × 10^7), 그보다 짧으면 옛 좌표계라 변환 불가
function parseCoord(mapx, mapy) {
  if (String(mapx).length >= 9 && String(mapy).length >= 8) {
    return { lng: Number(mapx) / 1e7, lat: Number(mapy) / 1e7 };
  }
  return null;
}

// 두 좌표 사이 직선거리(m)
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

// 네이버 카테고리 → 우리 앱 카테고리 (애매하면 '확인 필요')
function mapCategory(c) {
  if (/분식|떡볶이/.test(c)) return '분식/떡볶이';
  if (/중식|중국|마라/.test(c)) return '마라탕/중식';
  if (/샐러드|포케|샌드위치/.test(c)) return '포케/샐러드';
  if (/카페|디저트|베이커리|커피|음료/.test(c)) return '카페/디저트';
  if (/양식|햄버거|패스트푸드|피자|파스타|이탈리/.test(c)) return '양식/버거';
  if (/한식|도시락|죽/.test(c)) return '한식/도시락';
  return '확인 필요';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(query) {
  // NAVER API HUB 주소와 헤더 (예전 개발자센터의 openapi.naver.com / X-Naver-Client-* 는 쓸 수 없음)
  const url = `https://naverapihub.apigw.ntruss.com/search/v1/local?query=${encodeURIComponent(query)}&display=5&start=1&format=json`;
  const res = await fetch(url, {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': CLIENT_ID,
      'X-NCP-APIGW-API-KEY': CLIENT_SECRET,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${await res.text()}`);
  }
  return res.json();
}

for (const name of names) {
  console.log(`\n==================== 검색: ${name} ====================`);
  try {
    const data = await search(name);
    if (RAW) {
      console.log(JSON.stringify(data, null, 2));
      continue;
    }
    if (!data.items || data.items.length === 0) {
      console.log('  결과 없음 → 이름을 줄이거나(예: "저육당 사당") 지역명을 붙여 다시 검색해보세요.');
    } else {
      data.items.forEach((item, i) => {
        const coord = parseCoord(item.mapx, item.mapy);
        const category = cleanText(item.category);
        console.log(`\n[후보 ${i + 1}] ${cleanText(item.title)}`);
        console.log(`  네이버 카테고리 : ${category}`);
        console.log(`  앱 카테고리 제안: ${mapCategory(category)}`);
        console.log(`  도로명주소      : ${cleanText(item.roadAddress)}`);
        console.log(`  지번주소        : ${cleanText(item.address)}`);
        console.log(`  전화번호        : ${cleanText(item.telephone) || '(없음)'}`);
        if (coord) {
          console.log(`  lat: ${coord.lat}, lng: ${coord.lng}`);
          console.log(`  학교에서 직선거리: 약 ${distanceMeters(SCHOOL.lat, SCHOOL.lng, coord.lat, coord.lng)}m`);
        } else {
          console.log(`  (좌표 형식을 변환하지 못함: mapx=${item.mapx}, mapy=${item.mapy})`);
        }
      });
    }
  } catch (err) {
    console.error(`  오류: ${err.message}`);
  }
  await sleep(300); // 호출 간격 두기
}

console.log('\n※ 직선거리는 실제 배달 거리와 다를 수 있고, 배달시간·메뉴·가격은 엑셀 값을 그대로 쓰세요.');
