export type TravelType = 'solo' | 'couple' | 'family' | 'friends';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'SGD' | 'AUD' | 'CAD' | 'HKD';

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: Currency;
  travelType: TravelType;
  createdAt: string;
}

export interface OnboardingForm {
  dest: string;
  startDate: string;
  endDate: string;
  budget: string;
  currency: Currency;
  travelType: TravelType | '';
}
