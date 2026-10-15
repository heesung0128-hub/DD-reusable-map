import { FoodCategory } from '../types';
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

// 식당 이름으로 카테고리를 찾음. 목록에 없는 식당이면 undefined
export function getRestaurantCategory(restaurantName: string): FoodCategory | undefined {
  return RESTAURANTS_DATA.find((r) => r.name === restaurantName)?.category;
}
