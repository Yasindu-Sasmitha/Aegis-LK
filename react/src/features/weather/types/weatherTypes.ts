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
  trace: AgentStep[];
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

export interface AgentStep {
  step: string;
  tool: string;
  duration_ms: number;
  status: 'success' | 'failed';
  summary: string;
  error?: string;
}

export interface PredictionItem {
  id: string;
  districtId: string;
  districtName: string | null;
  agentRunId: string;
  hazardType: 'Flood' | 'Landslide' | 'StrongWind';
  riskProbabilityPct: number;
  confidencePct: number;
  forecastValue: number;
  historicalThreshold: number;
  unit: string;
  status: string;
  createdAt: string;
  hasOutcome: boolean;
  actualDisasterOccurred: boolean | null;
  actualValue: number | null;
  confirmedByUserId?: string | null;
  outcomeConfirmedAt?: string | null;
  outcomeNotes?: string | null;
}

export interface PredictionsResponse {
  total: number;
  page: number;
  pageSize: number;
  items: PredictionItem[];
}

export interface PredictionOutcomeRequest {
  actualDisasterOccurred: boolean;
  actualValue?: number | null;
  notes?: string | null;
}

export interface PredictionOutcomeResponse {
  id: string;
  predictionId: string;
  actualDisasterOccurred: boolean;
  actualValue: number | null;
  confirmedByUserId: string;
  confirmedAt: string;
  notes: string | null;
}
