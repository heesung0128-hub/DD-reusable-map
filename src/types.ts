export type FoodCategory = '전체' | '분식/떡볶이' | '마라탕/중식' | '포케/샐러드' | '한식/도시락' | '양식/버거' | '카페/디저트';

export type ActivePage = 'map' | 'guide' | 'gallery';

export type MenuRecommendationTag = '대표메뉴' | '저탄소';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  isVegetarian?: boolean;
  carbonKg?: number;
  recommendationTag?: MenuRecommendationTag;
  description: string;
  image: string;
}

export interface Restaurant {
  id: string;
  name: string;
  category: FoodCategory;
  distanceMeters: number;
  deliveryMinutes: number;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  containerSupport: {
    system: string;
    returnSpot: string;
  };
  menus: MenuItem[];
  openHours: string;
}

export interface CertificationPost {
  id: string;
  studentName: string;
  gradeClass: string;
  restaurantName: string;
  menuName: string;
  photoUrl: string;
  comment: string;
  likes: number;
  date: string;
  verified: boolean;
}
