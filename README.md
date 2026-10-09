# 동덕여고 '용기내' 지도

동덕여자고등학교 학생·교직원을 위한 다회용기 배달/포장 맛집 지도, 이용·반납 가이드, 실시간 인증 갤러리 웹 애플리케이션입니다.

- **맛집 지도**: 학교 근처 다회용기 주문 가능 매장과 대표/저탄소 추천 메뉴 안내
- **이용 & 반납 가이드**: 다회용기 주문 방법과 교내 반납함 이용 안내
- **인증 갤러리**: Firebase(Firestore)로 실시간 공유되는 다회용기 이용 인증 게시판

> AI(Antigravity, Claude Code 등)와 함께 작업할 때 지켜야 할 규칙은 [AGENTS.md](AGENTS.md)에 있습니다. AI가 자동으로 읽도록 되어 있고, 사람도 꼭 읽어주세요.

## 로컬 실행

**사전 준비:** Node.js 20 이상, Git

1. 저장소 받기
   ```bash
   git clone https://github.com/heesung0128-hub/DD-reusable-map.git
   cd DD-reusable-map
   ```
2. 의존성 설치
   ```bash
   npm install
   ```
3. `.env.example`을 복사해 `.env` 파일을 만들고 `VITE_NAVER_CLIENT_ID` 값 입력 (값은 선생님께 문의). 비워두면 네이버 지도 대신 간단 지도가 표시됩니다.
4. 개발 서버 실행 후, 터미널에 표시된 주소(http://localhost:3000/DD-reusable-map/)를 브라우저로 열기
   ```bash
   npm run dev
   ```

> 로컬 주소가 네이버 지도 콘솔의 서비스 URL에 등록되어 있지 않으면, 네이버 지도 대신 간단 지도가 자동으로 표시됩니다. 오류가 아닙니다.

## 식당 추가하기

식당·메뉴 데이터는 `src/data/mockData.ts`의 `RESTAURANTS_DATA` 배열에 있습니다. 식당 정보는 선생님이 공유하는 엑셀 양식에 먼저 채운 뒤 아래 순서로 코드에 옮깁니다. (AI에게 엑셀 파일을 주고 "이 식당들을 mockData.ts에 추가해줘"라고 요청해도 됩니다.)

### 1단계. 네이버 지역검색으로 주소·좌표(위도·경도) 찾기

지도에 핀을 찍으려면 `lat`(위도), `lng`(경도)가 필요합니다. 네이버 지역검색 API로 가게의 도로명주소와 좌표를 찾습니다. (예전에 쓰던 OpenStreetMap 검색은 동네 중심으로 나와 핀이 수백 m씩 어긋나서 쓰지 않습니다.)

**처음 한 번만 준비하기**

1. Node.js(20 이상)가 설치되어 있어야 합니다. 터미널에서 `node --version`으로 확인하세요.
2. 네이버 클라우드 플랫폼의 **NAVER API HUB**에서 Application을 등록하고 **검색 → 지역** API를 선택해 Client ID와 Client Secret을 받습니다. (예전 `developers.naver.com` 키는 쓸 수 없습니다.)
3. `.env` 파일(`.env.example`을 복사해서 만듭니다)에 아래 두 줄을 채웁니다. **`VITE_`를 붙이지 마세요.** 붙이면 배포된 사이트에 키가 공개됩니다.
   ```
   NAVER_SEARCH_CLIENT_ID=발급받은 Client ID
   NAVER_SEARCH_CLIENT_SECRET=발급받은 Client Secret
   ```

**식당 찾기**

1. 터미널에서 식당 이름으로 검색합니다. 프랜차이즈는 **지점명**까지 넣어야 합니다. (예: `동궁찜닭`만 검색하면 다른 동네 지점이 나옵니다.)
   ```bash
   node --env-file=.env scripts/fetchPlaces.mjs "저육당 사당본점"
   ```
   여러 곳은 `scripts/placesInput.txt`에 식당 이름을 한 줄에 하나씩 적고 이름 없이 실행합니다.
   ```bash
   node --env-file=.env scripts/fetchPlaces.mjs
   ```
2. 후보(최대 5개)가 나옵니다. **가게 이름과 도로명주소가 맞는 후보를 직접 골라야 합니다.** 같은 이름의 다른 지점이 나올 수 있습니다.
3. 고른 후보의 값을 코드에 옮깁니다.

   | 출력 | 코드 항목 |
   | --- | --- |
   | `lat` | `lat` |
   | `lng` | `lng` |
   | 도로명주소 | `address` (괄호 표기 `(사당동)` 등은 빼고 입력) |

4. 기존 식당의 핀 위치를 한꺼번에 점검하려면 아래를 실행합니다. 파일은 수정하지 않고, 기존 좌표와 네이버 좌표의 차이를 큰 순서로 보여줍니다. 이름이 같아도 다른 지점이 잡힐 수 있으니(수 km 차이) 차이가 매우 크면 같은 가게인지 먼저 확인하세요.
   ```bash
   node --env-file=.env scripts/comparePlaces.mjs
   ```

**배민 상호와 네이버 상호가 다를 때**

배민에 등록된 상호와 네이버 지도의 실제 상호가 다른 가게가 있습니다. (예: 배민 `매운콩불` = 네이버 `꿀대박고깃집`) 앱 화면에는 **항상 배민 상호**가 보여야 하므로 `mockData.ts`의 `name`은 배민 상호 그대로 두고, 네이버 검색에만 실제 상호를 씁니다.

1. `scripts/placeAliases.json`에 `"식당id": "네이버 실제 상호"`를 한 줄 추가합니다.
   ```json
   "rest-17": "꿀대박고깃집"
   ```
2. `comparePlaces.mjs`가 이 이름으로 검색합니다. 개별 검색(`fetchPlaces.mjs`)은 실제 상호를 직접 입력하면 됩니다.
3. 배민 사업자 정보(상호명·주소)로 실제 상호와 주소를 확인할 수 있습니다. 네이버에 등록되지 않은 가게도 있으며, 이때는 사업자 정보의 주소를 `address`에 쓰고 `lat`/`lng`는 기존 값을 유지한 뒤 앱에서 핀 위치를 확인합니다.

**알아둘 점**

- 지역검색 API가 주는 정보는 **가게명, 도로명·지번주소, 좌표, 카테고리**뿐입니다. 전화번호는 값이 비어 있어 오지 않고, 메뉴·가격·영업시간도 없습니다. 이런 값은 엑셀에서 가져옵니다.
- 한 번에 후보 5개까지만 나오고 그 이상은 가져올 수 없습니다. 검색이 안 되면 이름을 줄이거나 지점명·동네를 바꿔 보세요.
- 네이버 카테고리(예: `음식점>한식`)는 우리 앱의 6개 카테고리와 달라서 제안만 보여줍니다. 카테고리는 엑셀 기준으로 직접 고릅니다.
- `distanceMeters`(학교에서 거리)는 엑셀 값이 아니라 네이버 길찾기로 계산한 자동차 경로 거리를 씁니다. 아래 "학교까지 거리 계산하기"를 보세요. 검색 스크립트가 보여주는 직선거리는 참고용입니다.
- 하루 호출 한도가 있으니 필요한 만큼만 실행하세요. 스크립트가 호출 사이에 간격을 두긴 하지만 반복 실행은 피해 주세요.

**학교까지 거리 계산하기 (`distanceMeters`)**

`distanceMeters`는 식당에서 학교까지 **자동차 추천 경로 거리(m)**를 100m 단위로 반올림한 값입니다. 네이버 길찾기(Directions 5)로 계산합니다.

1. `.env`에 Maps Application의 Client Secret을 추가합니다. 이 값은 **`VITE_`를 붙이지 않습니다.** (값은 선생님께 문의. Client ID는 `VITE_NAVER_CLIENT_ID`가 같은 Application의 값이라 자동으로 씁니다. 다르면 `NAVER_MAPS_API_KEY_ID`를 따로 넣습니다.)
   ```
   NAVER_MAPS_API_KEY=Maps Application의 Client Secret
   ```
   네이버 클라우드 플랫폼 콘솔의 Maps → Application에서 **Directions 5**(필요하면 Geocoding도)가 사용 설정되어 있어야 합니다.
2. 식당의 `lat`/`lng`를 먼저 정확하게 맞춘 뒤 아래를 실행합니다. 각 식당의 현재 값, 계산한 경로 거리, 반올림 값, 차이를 보여줍니다. 파일은 수정하지 않습니다.
   ```bash
   node --env-file=.env scripts/calcDistances.mjs
   ```
3. 반올림 값을 `distanceMeters`에 입력합니다.

- 실시간 교통이 반영되어 호출 시간에 따라 몇십~몇백 m씩 달라질 수 있어서 100m 단위로 반올림합니다.
- 길찾기는 자동차 경로만 제공합니다. 배달 오토바이의 실제 경로와 약간 다를 수 있습니다.
- 이 Maps Application은 VPC 환경이라 주소가 `maps.apigw.ntruss.com`입니다. 스크립트에 이미 반영되어 있습니다. 주소를 `naveropenapi.apigw.ntruss.com`으로 바꾸면 401 오류가 납니다.
- 네이버 지역검색에 없는 가게는 Geocoding(주소 → 좌표)으로 좌표를 구할 수 있습니다. 배민 사업자 정보의 도로명주소로 건물 단위 좌표를 얻습니다. 예시: `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=도로명주소` (헤더 `x-ncp-apigw-api-key-id`, `x-ncp-apigw-api-key`에 Maps 키)

### 2단계. 데이터 입력

`RESTAURANTS_DATA` 배열의 맨 끝(마지막 식당 뒤)에 아래 형식으로 추가합니다.

```ts
{
  id: 'rest-24',
  name: '식당 이름',
  category: '한식/도시락',
  distanceMeters: 1500,
  deliveryMinutes: 30,
  lat: 37.4917230,
  lng: 127.0124690,
  address: '서울 서초구 반포대로28길 76 2층',
  phone: '02-000-0000',
  baeminUrl: 'https://s.baemin.com/...',
  containerSupport: {
    system: '주문 시 [다회용기] 무료 선택',
    returnSpot: '동덕여고 본관 1층 수거함',
  },
  menus: [
    { id: 'm24-1', name: '메뉴 이름', price: 12000, carbonKg: 1.2, recommendationTag: '대표메뉴' },
    { id: 'm24-2', name: '메뉴 이름', price: 9000, carbonKg: 0.8 },
  ],
},
```

엑셀 칸과 코드 항목의 대응은 다음과 같습니다.

| 엑셀 칸 | 코드 항목 | 입력 방법 |
| --- | --- | --- |
| 식당ID | `id` | `rest-번호`. 마지막 식당 다음 번호 |
| 식당명 | `name` | 지점명까지 배달앱 표기대로 |
| 카테고리 | `category` | 아래 6개 중 하나로 바꿔서 입력 |
| 학교에서_거리(m) | `distanceMeters` | 숫자만. 엑셀 값 대신 1단계의 "학교까지 거리 계산하기"로 구한 값 |
| 배달시간(분) | `deliveryMinutes` | 숫자만 |
| 주소 | `address` | 화면에 표시되는 주소 (도로명주소 권장) |
| (1단계에서 구한 값) | `lat`, `lng` | 숫자 |
| 전화번호 | `phone` | 없으면 `''`로 두면 화면에서 자동으로 숨겨짐 |
| 배민_주문링크 | `baeminUrl` | 없으면 `''`로 두면 "배민 링크 준비 중"으로 표시 |
| 다회용기_이용방법 | `containerSupport.system` | 문구 그대로 |
| 반납장소 | `containerSupport.returnSpot` | 문구 그대로 |

메뉴 항목은 다음과 같습니다.

| 엑셀 칸 | 코드 항목 | 입력 방법 |
| --- | --- | --- |
| (자동) | `id` | `m식당번호-순번`. 예: rest-24의 첫 메뉴는 `m24-1` |
| 메뉴명 | `name` | 문구 그대로 |
| 가격 | `price` | 숫자만(원) |
| 탄소배출량(kgCO2e) | `carbonKg` | 숫자. 값이 없으면 이 항목을 통째로 생략 |
| 추천유형 | `recommendationTag` | `'대표메뉴'` 또는 `'저탄소'`. 없으면 이 항목을 통째로 생략 |

- 카테고리는 `분식/떡볶이`, `마라탕/중식`, `포케/샐러드`, `한식/도시락`, `양식/버거`, `카페/디저트` 중에서만 고를 수 있습니다. 엑셀에 `제육볶음/한식`처럼 더 세부적으로 적혀 있으면 가장 가까운 것으로 바꿔 넣습니다. 새 카테고리가 필요하면 선생님과 먼저 상의하세요(`src/types.ts`, `src/components/MapSection.tsx` 수정이 필요합니다).
- 엑셀의 `메뉴사진URL` 칸은 현재 사용하지 않습니다(메뉴 사진 기능이 없습니다).
- 가격·탄소배출량 같은 숫자는 엑셀 값을 그대로 옮기고, 비어 있는 값을 임의로 채우지 마세요.

### 3단계. 확인하고 올리기

1. `npm run lint`로 오류가 없는지 확인합니다.
2. `npm run dev`로 실행해서 새 식당이 목록에 나오는지, 지도 핀 위치가 맞는지, 눌렀을 때 메뉴·탄소배출량·배민 버튼이 제대로 나오는지 확인합니다.
3. 커밋·푸시한 뒤 필요하면 배포합니다(아래 "배포" 참고).

## 배포

GitHub Pages(`gh-pages` 브랜치)로 배포합니다. 협업자로 초대된 학생도 직접 배포할 수 있습니다.

1. `git pull`로 최신 상태인지 확인
2. `npm run lint`, `npm run build`가 오류 없이 끝나는지 확인
3. 변경 내용을 `main`에 푸시
4. 배포
   ```bash
   npm run deploy
   ```
5. 배포 주소(https://heesung0128-hub.github.io/DD-reusable-map/)를 열어 확인 (반영까지 몇 분 걸릴 수 있음)
