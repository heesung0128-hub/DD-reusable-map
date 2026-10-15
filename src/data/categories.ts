import { FoodCategory, Restaurant } from '../types';
import { RESTAURANTS_DATA } from './mockData';

// 첫 화면과 인증 갤러리가 같은 카테고리 이름을 쓰도록 한곳에 둠
export const FOOD_CATEGORIES: FoodCategory[] = [
  '전체',
  '분식/떡볶이',
  '마라탕/중식',
  '포케/샐러드',
  '한식/도시락',
  '양식/버거',
  '카페/디저트',
];

// 인증 글이 가리키는 식당을 찾음. 식당 ID가 있으면 ID로 찾고(이름이 바뀌어도 연결됨),
// ID가 없는 예전 글은 이름으로 찾음. 지도에 없는 식당이면 undefined
export function findRestaurant(restaurantId: string | undefined, restaurantName: string): Restaurant | undefined {
  if (restaurantId) return RESTAURANTS_DATA.find((r) => r.id === restaurantId);
  return RESTAURANTS_DATA.find((r) => r.name === restaurantName);
}
