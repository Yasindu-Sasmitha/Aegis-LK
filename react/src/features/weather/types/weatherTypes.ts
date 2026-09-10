// Weather module TypeScript interfaces — mirrors Aegis.Weather backend models

export interface District {
  id: string;
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  isLandslideProne: boolean;
}

export interface HistoricalWeather {
  id: string;
  districtId: string;
  month: number;
  avgRainfallMm: number;
  floodThresholdMm: number;
  landslideThresholdMm: number | null;
  highWindThresholdKmh: number;
  source: string;
}

export interface ForecastResponse {
  name: string;
  isLandslideProne: boolean;
  rainfallMmNext3Days: number[];
  windSpeedKmhNext3Days: number[];
  fetchedAt: string;
  floodThresholdMm: number | null;
  landslideThresholdMm: number | null;
  highWindThresholdKmh: number | null;
  historicalAvgRainfallMm: number | null;
}

export interface HazardResult {
  hazardType: 'Flood' | 'Landslide' | 'StrongWind';
  riskProbabilityPct: number;
  alertStatus: 'Published' | 'PendingReview' | 'NoAlertNeeded' | 'SkippedDuplicate';
}

export interface PredictResponse {
  name: string;
  agentRunId: string;
  results: HazardResult[];
}

export interface WeatherAlert {
  id: string;
  districtId: string;
  districtName: string | null;
  hazardType: 'Flood' | 'Landslide' | 'StrongWind';
  severity: 'High' | 'Moderate';
  message: string;
  status: 'PendingReview' | 'Published' | 'Rejected';
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface AlertsResponse {
  total: number;
  page: number;
  pageSize: number;
  items: WeatherAlert[];
}

export interface AlertReviewResponse {
  id: string;
  hazardType: string;
  status: string;
  reviewedAt: string;
  publishedAt: string | null;
  reviewedByUserId: string;
}

export interface HazardAccuracy {
  hazardType: string;
  total: number;
  withOutcomeRecorded: number;
  correct: number;
  accuracyPct: number;
}

export interface AnalyticsResponse {
  totalPredictions: number;
  withOutcomeRecorded: number;
  correctPredictions: number;
  accuracyPct: number;
  byHazardType: HazardAccuracy[];
}
