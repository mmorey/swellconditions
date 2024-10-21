export interface TidesAndCurrentsGovAPIResponse {
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
