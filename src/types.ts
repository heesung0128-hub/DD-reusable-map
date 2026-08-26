export type EcoGrade = 'A' | 'B' | 'C';

export type FoodCategory = '전체' | '분식/떡볶이' | '마라탕/중식' | '포케/샐러드' | '한식/도시락' | '양식/버거' | '카페/디저트';

export type ActivePage = 'map' | 'guide' | 'gallery';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  carbonKg: number;
  ecoGrade: EcoGrade;
  isVegetarian?: boolean;
  description: string;
  image: string;
}

export interface Restaurant {
  id: string;
  name: string;
  category: FoodCategory;
  distanceFromSchool: string;
  walkMinutes: number;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  containerSupport: {
    type: string;
    system: string;
    returnSpot: string;
    benefit: string;
  };
  menus: MenuItem[];
  rating: number;
  reviewCount: number;
  ecoScore: number;
  tags: string[];
  bannerImage: string;
  openHours: string;
  isRecommendedForLunch: boolean;
}

export interface CertificationPost {
  id: string;
  studentName: string;
  gradeClass: string;
  restaurantName: string;
  menuName: string;
  containerType: string;
  photoUrl: string;
  comment: string;
  likes: number;
  date: string;
  verified: boolean;
}
