export interface NDBCLatestObservation {
  timestamp: Date;
  windDirection: number | null; // WDIR
  windSpeed: number | null; // WSPD in m/s
  gustSpeed: number | null; // GST in m/s
  waveHeight: number | null; // WVHT in m
  dominantWavePeriod: number | null; // DPD in sec
  averageWavePeriod: number | null; // APD in sec
  meanWaveDirection: number | null; // MWD in degrees
  pressure: number | null; // PRES in hPa
  pressureTendency: number | null; // PTDY in hPa
  airTemp: number | null; // ATMP in C
  waterTemp: number | null; // WTMP in C
  dewPoint: number | null; // DEWP in C
  visibility: number | null; // VIS in nautical miles
  tide: number | null; // TIDE in ft
}

export interface NDBCStation {
  id: string;
  lat: number;
  lon: number;
  elev: number;
  name: string;
  owner: string;
  pgm: string;
  type: string;
  met: 'y' | 'n';
  currents: 'y' | 'n';
  waterquality: 'y' | 'n';
  dart: 'y' | 'n';
  latestObservation?: NDBCLatestObservation;
  distance?: number; // Distance in miles from reference point
  direction?: string; // Direction from reference point (N, S, E, W, NE, etc.)
  spectralWaveData?: SpectralWaveData;
}

export interface NDBCStationsResponse {
  created: string;
  count: number;
  stations: NDBCStation[];
}

export interface SpectralDataPoint {
  frequency: number;
  energy: number;
  angle: number;
}

export interface SwellComponent {
  waveHeight: number; // Significant wave height in meters
  period: number; // Wave period in seconds
  direction: number; // Wave direction in degrees
  compassDirection: string; // Compass direction (N, S, E, W, etc.)
  maxEnergy: number; // Maximum energy value for this component m*m/Hz
  maxEnergyJoules: number; // Maximum energy value for this component in Joules
  frequencyIndex: number; // Index in the frequency array where max energy occurs
}

export interface SpectralWaveData {
  timestamp: Date;
  separationFrequency: number;
  spectralData: SpectralDataPoint[];
  swellComponents: SwellComponent[];
}
