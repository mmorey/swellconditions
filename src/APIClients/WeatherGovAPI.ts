import {
  WeatherGovAPIResponse,
  ForecastGridDataAPIResponse,
  CurrentConditionsAPIResponse,
  WeatherData,
} from './WeatherGovTypes';

export const fetchWeatherData = async (
  latitude: string,
  longitude: string
): Promise<WeatherData> => {
  const roundedLat = Number(latitude).toFixed(4);
  const roundedLon = Number(longitude).toFixed(4);
  const response = await fetch(`https://api.weather.gov/points/${roundedLat},${roundedLon}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: WeatherGovAPIResponse = await response.json();
  const forecast = await fetchForecastData(data.properties.forecastGridData);
  const current = await fetchCurrentConditions(data.properties.observationStations);

  return { forecast, current };
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

const fetchCurrentConditions = async (
  observationStationsUrl: string
): Promise<CurrentConditionsAPIResponse> => {
  const stationsResponse = await fetch(observationStationsUrl);
  if (!stationsResponse.ok) {
    throw new Error(`HTTP error! status: ${stationsResponse.status}`);
  }
  const stationsData = await stationsResponse.json();
  const firstStation = stationsData.features[0];
  const stationId = firstStation.id;
  const stationName = firstStation.properties.name;

  const currentConditionsUrl = `${stationId}/observations/latest`;
  const currentConditionsResponse = await fetch(currentConditionsUrl);
  if (!currentConditionsResponse.ok) {
    throw new Error(`HTTP error! status: ${currentConditionsResponse.status}`);
  }
  const currentConditionsData = await currentConditionsResponse.json();

  // Set the name property to the station name
  currentConditionsData.name = stationName;

  return currentConditionsData;
};
