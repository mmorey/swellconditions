import {
  TidesAndCurrentsGovWaterTemperatureAPIResponse,
  TideStation,
  TidesAndCurrentsGovWaterLevelAPIResponse,
  TidesAndCurrentsGovTideHiLoPredictionAPIResponse,
  TidesAndCurrentsGovTideDetailedPredictionAPIResponse,
  WaterLevelData,
  TideData,
} from './TidesAndCurrentsGovTypes';
import { calculateDistance } from '../utils';

const headers = {};

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delay = 500): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (response.status === 500 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay);
    }
    throw error;
  }
};

const formatDate = (date: Date): string => {
  const formattedDate = date
    .toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .replace(/-/g, '');
  return formattedDate;
};

const fetchWaterTemperatureData = async (stationId: string): Promise<TidesAndCurrentsGovWaterTemperatureAPIResponse> => {
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${stationId}&product=water_temperature&datum=MLLW&time_zone=gmt&units=english&format=json&date=recent`;

  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: TidesAndCurrentsGovWaterTemperatureAPIResponse = await response.json();

  return data;
};

const fetchWaterLevelData = async (stationId: string): Promise<TidesAndCurrentsGovWaterLevelAPIResponse> => {
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${stationId}&product=water_level&datum=MLLW&time_zone=gmt&units=english&format=json&application=GoingOff&date=latest&range=48`;

  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: TidesAndCurrentsGovWaterLevelAPIResponse = await response.json();

  return data;
};

const fetchTideHiLoPredictions = async (stationId: string): Promise<TidesAndCurrentsGovTideHiLoPredictionAPIResponse> => {
  const formattedDate = formatDate(new Date());
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${formattedDate}&station=${stationId}&product=predictions&interval=hilo&datum=MLLW&time_zone=gmt&units=english&format=json&range=48`;

  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: TidesAndCurrentsGovTideHiLoPredictionAPIResponse = await response.json();

  return data;
};

const fetchDetailedTidePredictions = async (stationId: string): Promise<TidesAndCurrentsGovTideDetailedPredictionAPIResponse> => {
  const formattedDate = formatDate(new Date());
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${formattedDate}&station=${stationId}&product=predictions&interval=15&datum=MLLW&time_zone=gmt&units=english&format=json&range=48`;

  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: TidesAndCurrentsGovTideDetailedPredictionAPIResponse = await response.json();

  return data;
};

const fetchWaterLevel = async (stationId: string): Promise<WaterLevelData> => {
  const waterLevelData = await fetchWaterLevelData(stationId);
  const tideHiLoPredictionData = await fetchTideHiLoPredictions(stationId);
  const tideDetailedPredicitonData = await fetchDetailedTidePredictions(stationId);

  const data: WaterLevelData = { waterLevel: waterLevelData, tideHiLoPrediction: tideHiLoPredictionData, tideDetailedPrediction: tideDetailedPredicitonData };
  return data;
};

const fetchTideStations = async (): Promise<TideStation[]> => {
  const url = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=waterlevels&expand=details';

  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.stations.map((station: any) => ({
    id: station.id,
    name: station.name,
    lat: station.lat,
    lng: station.lng,
  }));
};

const findClosestTideStation = async (latitude: number, longitude: number): Promise<string> => {
  const tideStations = await fetchTideStations();
  const closestStation = tideStations.reduce((closest: TideStation | null, station: TideStation) => {
    const distance = calculateDistance(latitude, longitude, station.lat, station.lng);
    if (!closest || distance < calculateDistance(latitude, longitude, closest.lat, closest.lng)) {
      return station;
    }
    return closest;
  }, null);

  if (closestStation) {
    return closestStation.id;
  } else {
    throw new Error('No tide stations found');
  }
};

export const fetchTideData = async (latitude: number, longitude: number, stationId?: string): Promise<TideData> => {
  const selectedStationId = stationId || (await findClosestTideStation(latitude, longitude));
  const [waterTemp, waterLevelData] = await Promise.all([fetchWaterTemperatureData(selectedStationId), fetchWaterLevel(selectedStationId)]);

  return {
    stationId: selectedStationId,
    waterTemperature: waterTemp,
    waterLevel: waterLevelData,
  };
};
