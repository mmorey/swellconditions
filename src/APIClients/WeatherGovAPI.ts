import { WeatherGovAPIResponse, ForecastGridDataAPIResponse, CurrentConditionsAPIResponse, WeatherData, HistoricalConditionsAPIResponse } from './WeatherGovTypes';
import { parseISO8601Duration } from '../utils';

const headers = {
  'User-Agent': 'swellconditions.com',
};

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

export const fetchWeatherData = async (latitude: number, longitude: number): Promise<WeatherData> => {
  const roundedLat = latitude.toFixed(4);
  const roundedLon = longitude.toFixed(4);
  const response = await fetchWithRetry(`https://api.weather.gov/points/${roundedLat},${roundedLon}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: WeatherGovAPIResponse = await response.json();
  const forecast = await fetchForecastData(data.properties.forecastGridData);
  const { current, historical } = await fetchObservations(data.properties.observationStations);

  return {
    forecast,
    current,
    historical,
    city: data.properties.relativeLocation.properties.city,
    state: data.properties.relativeLocation.properties.state,
  };
};

const fetchForecastData = async (forecastGridDataUrl: string): Promise<ForecastGridDataAPIResponse> => {
  const response = await fetchWithRetry(forecastGridDataUrl, { headers });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

const fetchObservations = async (observationStationsUrl: string): Promise<{ current: CurrentConditionsAPIResponse; historical: HistoricalConditionsAPIResponse }> => {
  const stationsResponse = await fetchWithRetry(observationStationsUrl, { headers });
  if (!stationsResponse.ok) {
    throw new Error(`HTTP error! status: ${stationsResponse.status}`);
  }
  const stationsData = await stationsResponse.json();

  for (let i = 0; i < Math.min(10, stationsData.features.length); i++) {
    const station = stationsData.features[i];
    const stationId = station.id;
    const stationName = station.properties.name;
    const stationIdentifier = station.properties.stationIdentifier;

    const currentConditionsUrl = `${stationId}/observations`;
    const currentConditionsResponse = await fetchWithRetry(currentConditionsUrl, { headers });
    if (!currentConditionsResponse.ok) {
      console.warn(`HTTP error for station ${stationName}! status: ${currentConditionsResponse.status}`);
      continue;
    }
    const currentConditionsData = await currentConditionsResponse.json();

    // Find the first observation with valid temperature and wind speed
    for (const observation of currentConditionsData.features) {
      const temperature = observation.properties.temperature.value;
      const windSpeed = observation.properties.windSpeed.value;

      if (temperature !== null && windSpeed !== null) {
        const current = {
          name: stationName,
          stationIdentifier: stationIdentifier,
          geometry: observation.geometry,
          properties: {
            timestamp: observation.properties.timestamp,
            temperature: observation.properties.temperature,
            windSpeed: observation.properties.windSpeed,
            windDirection: observation.properties.windDirection,
            windGust: observation.properties.windGust,
          },
        };

        return {
          current,
          historical: currentConditionsData, // Return the full observations data as historical
        };
      }
    }
  }

  throw new Error('No valid observation found with temperature and wind speed after trying up to 10 stations');
};

// Debug helper function
const createDebugCSV = (weatherData: WeatherData): string => {
  const headers = ['UTC Timestamp', 'Temperature', 'Wind Speed', 'Wind Gust', 'Wind Direction'];
  const rowMap = new Map<string, string[]>();

  const addToRowMap = (property: string, values: any[] | undefined) => {
    if (!values) return;
    values.forEach((value) => {
      const [startTimeStr, durationStr] = value.validTime.split('/');
      const startTime = new Date(startTimeStr);
      const durationHours = parseISO8601Duration(durationStr);

      for (let i = 0; i < durationHours; i++) {
        const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);
        const timeStr = time.toISOString();
        if (!rowMap.has(timeStr)) {
          rowMap.set(timeStr, [timeStr, '', '', '', '']);
        }
        const row = rowMap.get(timeStr)!;
        switch (property) {
          case 'temperature':
            row[1] = value.value;
            break;
          case 'windSpeed':
            row[2] = value.value;
            break;
          case 'windGust':
            row[3] = value.value;
            break;
          case 'windDirection':
            row[4] = value.value;
            break;
        }
      }
    });
  };

  addToRowMap('temperature', weatherData.forecast.properties.temperature.values);
  addToRowMap('windSpeed', weatherData.forecast.properties.windSpeed.values);
  addToRowMap('windGust', weatherData.forecast.properties.windGust?.values);
  addToRowMap('windDirection', weatherData.forecast.properties.windDirection?.values);

  const rows = Array.from(rowMap.values());
  rows.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  return [headers, ...rows].map((row) => row.join(',')).join('\n');
};

export const getDebugCSVContent = (weatherData: WeatherData | null): string | null => {
  if (!weatherData) return null;
  return createDebugCSV(weatherData);
};
