import { WeatherAPIResponse, ForecastGridDataAPIResponse } from "../types";

export const fetchWeatherData = async (
  latitude: string,
  longitude: string
): Promise<ForecastGridDataAPIResponse> => {
  const roundedLat = Number(latitude).toFixed(4);
  const roundedLon = Number(longitude).toFixed(4);
  const response = await fetch(
    `https://api.weather.gov/points/${roundedLat},${roundedLon}`
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: WeatherAPIResponse = await response.json();
  return fetchForecastData(data.properties.forecastGridData);
};

const fetchForecastData = async (
  forecastGridDataUrl: string
): Promise<ForecastGridDataAPIResponse> => {
  const response = await fetch(forecastGridDataUrl);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};
