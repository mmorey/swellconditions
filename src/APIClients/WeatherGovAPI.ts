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

  return {
    forecast,
    current,
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

const fetchCurrentConditions = async (observationStationsUrl: string): Promise<CurrentConditionsAPIResponse> => {
  const stationsResponse = await fetchWithRetry(observationStationsUrl, { headers });
  if (!stationsResponse.ok) {
    throw new Error(`HTTP error! status: ${stationsResponse.status}`);
  }
  const stationsData = await stationsResponse.json();

  for (let i = 0; i < Math.min(10, stationsData.features.length); i++) {
    const station = stationsData.features[i];
    const stationId = station.id;
    const stationName = station.properties.name;

    const currentConditionsUrl = `${stationId}/observations`;
    const currentConditionsResponse = await fetchWithRetry(currentConditionsUrl, { headers });
    if (!currentConditionsResponse.ok) {
      console.warn(`HTTP error for station ${stationName}! status: ${currentConditionsResponse.status}`);
      continue;
    }
    const currentConditionsData = await currentConditionsResponse.json();

    // Iterate through observations to find the first one with valid temperature and wind speed
    for (const observation of currentConditionsData.features) {
      const temperature = observation.properties.temperature.value;
      const windSpeed = observation.properties.windSpeed.value;

      if (temperature !== null && windSpeed !== null) {
        return {
          name: stationName,
          geometry: observation.geometry,
          properties: {
            timestamp: observation.properties.timestamp,
            temperature: observation.properties.temperature,
            windSpeed: observation.properties.windSpeed,
            windDirection: observation.properties.windDirection,
            windGust: observation.properties.windGust,
          },
        };
      }
    }
  }

  throw new Error('No valid observation found with temperature and wind speed after trying up to 10 stations');
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
