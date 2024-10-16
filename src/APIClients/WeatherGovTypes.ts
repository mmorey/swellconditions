export interface WeatherGovAPIResponse {
  properties: {
    forecastGridData: string;
  };
}

export interface ForecastGridDataAPIResponse {
  properties: {
    temperature: {
      values: Array<{ validTime: string; value: number }>;
    };
    windSpeed: {
      values: Array<{ validTime: string; value: number }>;
    };
    windDirection?: {
      values: Array<{ validTime: string; value: number }>;
    };
    windGust?: {
      values: Array<{ validTime: string; value: number }>;
    };
  };
}
