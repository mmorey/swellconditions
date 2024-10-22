export interface TidesAndCurrentsGovWaterTemperatureAPIResponse {
  metadata: {
    id: string;
    name: string;
    lat: string;
    lon: string;
  };
  data: Array<WaterTemperatureReading>;
}

export interface WaterTemperatureReading {
  t: string;
  v: string;
  f: string;
}

export interface TideStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface TidesAndCurrentsGovWaterLevelAPIResponse {
  metadata: {
    id: string;
    name: string;
    lat: string;
    lon: string;
  };
  data: Array<WaterLevelReading>;
}

export interface WaterLevelReading {
  t: string;
  v: string;
  s: string;
  f: string;
  q: string;
}

export interface TidesAndCurrentsGovTideHiLoPredictionAPIResponse {
  predictions: Array<TidePredictionReading>;
}

export interface TidePredictionReading {
  t: string;
  v: string;
  type: string;
}

export interface TidesAndCurrentsGovTideDetailedPredictionAPIResponse {
  predictions: Array<DetailedTidePredictionReading>;
}

export interface DetailedTidePredictionReading {
  t: string;
  v: string;
}

export interface WaterLevelData {
  waterLevel: TidesAndCurrentsGovWaterLevelAPIResponse;
  tideHiLoPrediction: TidesAndCurrentsGovTideHiLoPredictionAPIResponse;
  tideDetailedPrediction: TidesAndCurrentsGovTideDetailedPredictionAPIResponse;
}
