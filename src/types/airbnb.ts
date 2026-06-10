export interface AirbnbRow {
  id: string;
  name: string;
  host_id: string;
  host_name: string | null;
  neighbourhood_group: string;
  neighbourhood: string;
  lat: number;
  long: number;
  room_type: string;
  price: number;
  service_fee: number;
  minimum_nights: number;
  number_of_reviews: number;
  last_review: string | null;
  reviews_per_month: number;
  calculated_host_listings_count: number;
  availability_365: number;
  review_scores_rating: number;
  instant_bookable: boolean;
  // engineered
  custo_real: number;
  taxa_atratividade: number;
  fator_eficiencia: number;
}

export interface Filters {
  roomTypes: string[];
  neighbourhoodGroups: string[];
  priceRange: [number, number];
}
