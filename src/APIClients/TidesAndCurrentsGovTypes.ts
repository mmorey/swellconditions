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
  t: string; // Time - Date and time of the observation, Greenwich Mean Time (GMT)
  v: string; // Value - Measured water temperature
  f: string; // Data Flags - in order of listing:
  //-- (X) A flag that when set to 1 indicates that the maximum expected water temperature was exceeded
  //-- (N) A flag that when set to 1 indicates that the minimum expected water temperature was exceeded
  //-- (R) A flag that when set to 1 indicates that the rate of change tolerance limit was exceeded
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
  t: string; // Time - Date and time of the observation, Greenwich Mean Time (GMT)
  v: string; // Value - Measured water level height
  s: string; // Sigma - Standard deviation of 1 second samples used to compute the water level height
  f: string; // Data Flags
  q: string; // Quality Assurance/Quality Control level, -- p = preliminary, -- v = verified
}

export interface TidesAndCurrentsGovTideHiLoPredictionAPIResponse {
  predictions: Array<TidePredictionReading>;
}

export interface TidePredictionReading {
  t: string; // Time - Date and time of the observation, Greenwich Mean Time (GMT)
  v: string; // Value - Predicted water level height
  type: string; // Type - Designation of Water level height. HH = Higher High water, H = High water, L = Low water, LL = Lower Low water
}

export interface TidesAndCurrentsGovTideDetailedPredictionAPIResponse {
  predictions: Array<DetailedTidePredictionReading>;
}

export interface DetailedTidePredictionReading {
  t: string; // Time - Date and time of the observation, Greenwich Mean Time (GMT)
  v: string; // Value - Predicted water level height
}

export interface WaterLevelData {
  waterLevel: TidesAndCurrentsGovWaterLevelAPIResponse;
  tideHiLoPrediction: TidesAndCurrentsGovTideHiLoPredictionAPIResponse;
  tideDetailedPrediction: TidesAndCurrentsGovTideDetailedPredictionAPIResponse;
}

export interface TideData {
  stationId: string;
  waterTemperature: TidesAndCurrentsGovWaterTemperatureAPIResponse;
  waterLevel: WaterLevelData;
}
