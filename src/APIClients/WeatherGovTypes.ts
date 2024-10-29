export interface WeatherGovAPIResponse {
  properties: {
    cwa: string;
    forecastGridData: string;
    observationStations: string;
    relativeLocation: {
      properties: {
        city: string;
        state: string;
      };
    };
  };
}

export interface ForecastGridDataAPIResponse {
  properties: {
    temperature: {
      values: Array<{ validTime: string; value: number }>;
      uom: string;
    };
    windSpeed: {
      values: Array<{ validTime: string; value: number }>;
      uom: string;
    };
    windDirection?: {
      values: Array<{ validTime: string; value: number }>;
      uom: string;
    };
    windGust?: {
      values: Array<{ validTime: string; value: number }>;
      uom: string;
    };
  };
}

export interface CurrentConditionsAPIResponse {
  name: string;
  stationIdentifier: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    timestamp: string;
    temperature: {
      unitCode: string;
      value: number;
    };
    windSpeed: {
      unitCode: string;
      value: number;
    };
    windDirection: {
      unitCode: string;
      value: number;
    };
    windGust: {
      unitCode: string;
      value: number;
    };
  };
}

export interface HistoricalConditionsAPIResponse {
  features: Array<{
    properties: {
      timestamp: string;
      temperature: {
        unitCode: string;
        value: number;
      };
      windSpeed: {
        unitCode: string;
        value: number;
      };
      windDirection: {
        unitCode: string;
        value: number;
      };
      windGust: {
        unitCode: string;
        value: number;
      };
    };
  }>;
}

export interface WeatherData {
  current: CurrentConditionsAPIResponse;
  historical: HistoricalConditionsAPIResponse;
  forecast: ForecastGridDataAPIResponse;
  city: string;
  state: string;
  cwa: string;
}
