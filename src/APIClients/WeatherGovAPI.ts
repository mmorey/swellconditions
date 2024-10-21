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
    const hourlyData: {
      time: Date;
      speed: number;
      direction: number;
      gust: number;
    }[] = [];

    const windSpeedData = weatherData.forecast.properties.windSpeed.values;
    const windDirectionData = weatherData.forecast.properties.windDirection?.values || [];
    const windGustData = weatherData.forecast.properties.windGust?.values || [];

    // Process wind speed data
    windSpeedData.forEach((windSpeed) => {
      const [startTimeStr, durationStr] = windSpeed.validTime.split('/');
      const startTime = new Date(startTimeStr);
      const durationHours = parseISO8601Duration(durationStr);

      for (let i = 0; i < durationHours; i++) {
        const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);

        hourlyData.push({
          time,
          speed: convertWindSpeed(windSpeed.value, weatherData.forecast.properties.windSpeed.uom),
          direction: 0,
          gust: 0,
        });
      }
    });

    // Process wind direction data
    windDirectionData.forEach((windDirection) => {
      const [startTimeStr, durationStr] = windDirection.validTime.split('/');
      const startTime = new Date(startTimeStr);
      const durationHours = parseISO8601Duration(durationStr);

      for (let i = 0; i < durationHours; i++) {
        const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);
        const existingEntry = hourlyData.find((entry) => entry.time.getTime() === time.getTime());
        if (existingEntry) {
          existingEntry.direction = windDirection.value;
        } else {
          hourlyData.push({
            time,
            speed: 0,
            direction: windDirection.value,
            gust: 0,
          });
        }
      }
    });

    // Process wind gust data
    windGustData.forEach((windGust) => {
      const [startTimeStr, durationStr] = windGust.validTime.split('/');
      const startTime = new Date(startTimeStr);
      const durationHours = parseISO8601Duration(durationStr);

      for (let i = 0; i < durationHours; i++) {
        const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);
        const existingEntry = hourlyData.find((entry) => entry.time.getTime() === time.getTime());
        if (existingEntry) {
          existingEntry.gust = convertWindSpeed(windGust.value, weatherData.forecast.properties.windGust?.uom || 'wmoUnit:km_h-1');
        } else {
          hourlyData.push({
            time,
            speed: 0,
            direction: 0,
            gust: convertWindSpeed(windGust.value, weatherData.forecast.properties.windGust?.uom || 'wmoUnit:km_h-1'),
          });
        }
      }
    });

    // Sort the hourlyData array by time
    hourlyData.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Limit the hourlyData array to the next 12 hours and no earlier than the current time
    const currentTime = new Date();
    const limitedData = hourlyData.filter((data) => data.time >= currentTime && data.time <= new Date(currentTime.getTime() + 12 * 60 * 60 * 1000));

    return limitedData.map((data) => ({
      time: data.time
        .toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          hourCycle: 'h12',
        })
        .toLowerCase(),
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
