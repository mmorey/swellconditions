import { TidesAndCurrentsGovAPIResponse } from './TidesAndCurrentsGovTypes';

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
  console.log('water temp data: ', data);

  return data;
};
