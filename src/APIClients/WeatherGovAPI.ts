import { WeatherGovAPIResponse, ForecastGridDataAPIResponse, CurrentConditionsAPIResponse, WeatherData } from './WeatherGovTypes';
import { parseISO8601Duration, convertWindSpeed } from '../utils';

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

export const fetchWeatherData = async (latitude: string, longitude: string): Promise<WeatherData> => {
  const roundedLat = Number(latitude).toFixed(4);
  const roundedLon = Number(longitude).toFixed(4);
  const response = await fetchWithRetry(`https://api.weather.gov/points/${roundedLat},${roundedLon}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: WeatherGovAPIResponse = await response.json();
  const forecast = await fetchForecastData(data.properties.forecastGridData);
  const current = await fetchCurrentConditions(data.properties.observationStations);

  return { forecast, current };
};

const fetchForecastData = async (forecastGridDataUrl: string): Promise<ForecastGridDataAPIResponse> => {
  const response = await fetchWithRetry(forecastGridDataUrl, { headers });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
};

const fetchCurrentConditions = async (observationStationsUrl: string): Promise<CurrentConditionsAPIResponse> => {
  const stationsResponse = await fetchWithRetry(observationStationsUrl, { headers });
  if (!stationsResponse.ok) {
    throw new Error(`HTTP error! status: ${stationsResponse.status}`);
  }
  const stationsData = await stationsResponse.json();
  const firstStation = stationsData.features[0];
  const stationId = firstStation.id;
  const stationName = firstStation.properties.name;

  const currentConditionsUrl = `${stationId}/observations/latest`;
  const currentConditionsResponse = await fetchWithRetry(currentConditionsUrl, { headers });
  if (!currentConditionsResponse.ok) {
    throw new Error(`HTTP error! status: ${currentConditionsResponse.status}`);
  }
  const currentConditionsData = await currentConditionsResponse.json();

  currentConditionsData.name = stationName;

  return currentConditionsData;
};

export const processWeatherGovWindData = (weatherData: WeatherData | null) => {
  if (!weatherData) return [];

  try {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const windSpeedData = weatherData.forecast.properties.windSpeed.values;
    if (!Array.isArray(windSpeedData)) {
      throw new Error('Wind speed data is not in the expected format');
    }

    const windDirectionData = weatherData.forecast.properties.windDirection?.values || [];
    const windGustData = weatherData.forecast.properties.windGust?.values || [];

    const hourlyData: {
      time: Date;
      speed: number;
      direction: number;
      gust: number;
    }[] = [];

    windSpeedData.forEach((windSpeed) => {
      if (typeof windSpeed.validTime !== 'string') {
        throw new Error('Invalid validTime in wind speed data');
      }

      const [startTimeStr, durationStr] = windSpeed.validTime.split('/');
      const startTime = new Date(startTimeStr);
      const durationHours = parseISO8601Duration(durationStr);

      for (let i = 0; i < durationHours; i++) {
        const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);
        if (time >= now && time <= twentyFourHoursLater) {
          const direction =
            windDirectionData.find((dir) => {
              const dirStartTime = new Date(dir.validTime.split('/')[0]);
              const dirEndTime = new Date(dirStartTime.getTime() + parseISO8601Duration(dir.validTime.split('/')[1]) * 60 * 60 * 1000);
              return time >= dirStartTime && time < dirEndTime;
            })?.value || 0;

          const gust =
            windGustData.find((g) => {
              const gustStartTime = new Date(g.validTime.split('/')[0]);
              const gustEndTime = new Date(gustStartTime.getTime() + parseISO8601Duration(g.validTime.split('/')[1]) * 60 * 60 * 1000);
              const isWithinRange = time >= gustStartTime && time < gustEndTime;
              return isWithinRange;
            })?.value || windSpeed.value;

          hourlyData.push({
            time,
            speed: convertWindSpeed(windSpeed.value, weatherData.forecast.properties.windSpeed.uom),
            direction,
            gust: convertWindSpeed(gust, weatherData.forecast.properties.windGust?.uom || 'wmoUnit:km_h-1'),
          });
        }
      }
    });

    return hourlyData.map((data) => ({
      time: data.time.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      speed: data.speed,
      direction: data.direction,
      gust: data.gust,
    }));
  } catch (error) {
    console.error('Error processing wind data:', error);
    return [];
  }
};
