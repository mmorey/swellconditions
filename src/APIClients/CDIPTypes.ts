export interface CDIPStation {
  timestamp: string;
  station_number: string;
  station_name: string;
  latitude: number;
  longitude: number;
  depth_cm: number;
  hs_m: number; // Significant wave height in meters
  tp_s: number; // Peak period in seconds
  dp_deg: number | null; // Peak direction in degrees true, can be null
  sst_c: number | null; // Sea surface temperature in Celsius, can be null
}

export interface CDIPResponse {
  last_updated: string;
  data: CDIPStation[];
}
