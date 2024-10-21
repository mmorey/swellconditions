import { TidesAndCurrentsGovAPIResponse, TideStation } from './TidesAndCurrentsGovTypes';
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

export const fetchWaterTemperatureData = async (stationId: string): Promise<TidesAndCurrentsGovAPIResponse> => {
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=${stationId}&product=water_temperature&datum=MLLW&time_zone=lst_ldt&units=english&format=json&date=recent&interval=h`;

  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: TidesAndCurrentsGovAPIResponse = await response.json();

  return data;
};

export const fetchTideStations = async (): Promise<TideStation[]> => {
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

export const findClosestTideStation = async (latitude: number, longitude: number): Promise<string> => {
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
