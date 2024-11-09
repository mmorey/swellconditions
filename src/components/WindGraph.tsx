import React from 'react';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartData, ScatterController, LineController } from 'chart.js';
import { getWindDirection, parseISO8601Duration, convertWindSpeed } from '../utils';
import styled, { useTheme } from 'styled-components';
import { WeatherData, HistoricalConditionsAPIResponse } from '../APIClients/WeatherGovTypes';
import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';
import { addHours, subHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, ScatterController, LineController, Title, Tooltip, Legend, annotationPlugin);

interface WindGraphProps {
  weatherData: WeatherData;
}

export const processWeatherGovWindData = (weatherData: WeatherData | null) => {
  if (!weatherData) return [];

  try {
    const hourlyData: {
      time: Date;
      speed: number;
      direction: number;
      gust: number;
      isHistorical?: boolean;
    }[] = [];

    const now = new Date();
    const sixHoursAgo = subHours(now, 6);

    // Process historical observations from the first station
    if (weatherData.stations[0]?.historical) {
      weatherData.stations[0].historical.features.forEach((observation: HistoricalConditionsAPIResponse['features'][0]) => {
        if (observation.properties.windSpeed && observation.properties.windDirection) {
          const time = new Date(observation.properties.timestamp);
          if (time >= sixHoursAgo && time <= now) {
            hourlyData.push({
              time,
              speed: convertWindSpeed(observation.properties.windSpeed.value, observation.properties.windSpeed.unitCode),
              direction: observation.properties.windDirection.value,
              gust: observation.properties.windGust?.value ? convertWindSpeed(observation.properties.windGust.value, observation.properties.windGust.unitCode) : 0,
              isHistorical: true,
            });
          }
        }
      });
    }

    // Process forecast data
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
        // Only include forecast data points from now onwards
        if (time >= now) {
          hourlyData.push({
            time,
            speed: convertWindSpeed(windSpeed.value, weatherData.forecast.properties.windSpeed.uom),
            direction: 0,
            gust: 0,
            isHistorical: false,
          });
        }
      }
    });

    // Process wind direction data
    windDirectionData.forEach((windDirection) => {
      const [startTimeStr, durationStr] = windDirection.validTime.split('/');
      const startTime = new Date(startTimeStr);
      const durationHours = parseISO8601Duration(durationStr);

      for (let i = 0; i < durationHours; i++) {
        const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);
        // Only process forecast data points from now onwards
        if (time >= now) {
          const existingEntry = hourlyData.find((entry) => entry.time.getTime() === time.getTime());
          if (existingEntry) {
            existingEntry.direction = windDirection.value;
          } else {
            hourlyData.push({
              time,
              speed: 0,
              direction: windDirection.value,
              gust: 0,
              isHistorical: false,
            });
          }
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
        // Only process forecast data points from now onwards
        if (time >= now) {
          const existingEntry = hourlyData.find((entry) => entry.time.getTime() === time.getTime());
          if (existingEntry) {
            existingEntry.gust = convertWindSpeed(windGust.value, weatherData.forecast.properties.windGust?.uom || 'wmoUnit:km_h-1');
          } else {
            hourlyData.push({
              time,
              speed: 0,
              direction: 0,
              gust: convertWindSpeed(windGust.value, weatherData.forecast.properties.windGust?.uom || 'wmoUnit:km_h-1'),
              isHistorical: false,
            });
          }
        }
      }
    });

    // Sort the hourlyData array by time
    hourlyData.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Get current time rounded to the nearest hour
    const currentHour = setMilliseconds(setSeconds(setMinutes(now, 0), 0), 0);

    // Calculate start and end times (6 hours back and 18 hours forward)
    const startTime = subHours(currentHour, 6);
    const endTime = addHours(currentHour, 18);

    // Filter data to show 6 hours of history and 18 hours of forecast
    return hourlyData.filter((data) => data.time >= startTime && data.time <= endTime);
  } catch (error) {
    console.error('Error processing wind data:', error);
    return [];
  }
};

const ChartContainer = styled.div`
  height: 300px;
  padding: 10px;
  border-radius: 10px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
`;

const WindGraph: React.FC<WindGraphProps> = ({ weatherData }) => {
  const theme = useTheme();
  const data = processWeatherGovWindData(weatherData);
  const now = new Date();
  const currentHour = setMilliseconds(setSeconds(setMinutes(now, 0), 0), 0);

  // Find the latest historical wind speed
  const latestHistoricalData = data
    .filter((d) => d.isHistorical)
    .reduce<(typeof data)[0] | undefined>((latest, current) => {
      if (!latest || current.time > latest.time) {
        return current;
      }
      return latest;
    }, undefined);

  // Find min and max wind speeds from the actual data
  const minSpeed = Math.min(...data.map((d) => d.speed));
  const maxSpeed = Math.max(...data.map((d) => d.speed));

  // Calculate y-axis range
  const range = maxSpeed - minSpeed;
  const padding = range * 0.4; // Add 20% padding
  const yAxisRange = {
    min: Math.floor(minSpeed - padding),
    max: Math.ceil(maxSpeed + padding),
  };

  // Calculate point sizes based on actual wind speed range
  const getPointSize = (speed: number) => {
    const minSize = 6;
    const maxSize = 16;

    // If all speeds are the same, return the average size
    if (maxSpeed === minSpeed) {
      return (minSize + maxSize) / 2;
    }

    // Linear scaling between min and max sizes based on actual data range
    return minSize + ((speed - minSpeed) / (maxSpeed - minSpeed)) * (maxSize - minSize);
  };

  const chartData: ChartData<'scatter' | 'line'> = {
    datasets: [
      {
        type: 'scatter' as const,
        label: 'Wind Speed',
        data: data.map((d) => ({ x: d.time.getTime(), y: d.speed })),
        backgroundColor: theme.colors.chart.primary,
        pointStyle: data.map((d) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const size = getPointSize(d.speed);
            canvas.width = size * 2;
            canvas.height = size * 2;
            ctx.translate(size, size);
            ctx.rotate(((d.direction + 180) * Math.PI) / 180);
            ctx.font = `${size * 2}px Arial`;
            ctx.fillStyle = theme.colors.chart.primary;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('↑', 0, 0);
          }
          return canvas;
        }),
        pointRadius: data.map((d) => getPointSize(d.speed)),
      },
      {
        type: 'line' as const,
        label: 'Wind Gust',
        data: data.map((d) => ({ x: d.time.getTime(), y: d.gust })),
        borderColor: `${theme.colors.chart.secondary}`,
        backgroundColor: `${theme.colors.chart.secondary}`,
        pointRadius: 1,
        borderWidth: 2,
        fill: false,
      },
    ],
  };

  const options: ChartOptions<'scatter' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Wind History & Forecast',
        color: theme.colors.text.primary,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const dataIndex = context.dataIndex;
            const dataPoint = data[dataIndex];
            return [
              `Time: ${dataPoint.time.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                hourCycle: 'h12',
              })}`,
              `Wind Speed: ${dataPoint.speed.toFixed(1)} mph`,
              `Wind Gust: ${dataPoint.gust.toFixed(1)} mph`,
              `Direction: ${getWindDirection(dataPoint.direction)} ${dataPoint.direction}°`,
            ];
          },
        },
      },
      annotation: {
        annotations: {
          currentTime: {
            type: 'line',
            xMin: latestHistoricalData?.time.getTime() || now.getTime(),
            xMax: latestHistoricalData?.time.getTime() || now.getTime(),
            borderColor: theme.colors.text.primary,
            borderWidth: 1,
            label: {
              display: true,
              content: latestHistoricalData ? `${latestHistoricalData.speed.toFixed(1)} mph` : 'N/A',
              position: latestHistoricalData && latestHistoricalData.speed > maxSpeed * 0.5 ? 'start' : 'end',
              backgroundColor: theme.colors.backgroundLight,
              color: theme.colors.text.primary,
              padding: 4,
            },
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          displayFormats: {
            hour: 'h:mm a',
          },
          tooltipFormat: 'PPpp',
        },
        min: subHours(currentHour, 6).getTime(),
        max: addHours(currentHour, 18).getTime(),
        ticks: {
          color: theme.colors.text.primary,
          padding: 8,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        max: yAxisRange.max,
        title: {
          display: true,
          text: 'Wind Speed (mph)',
          color: theme.colors.text.primary,
        },
        ticks: {
          color: theme.colors.text.primary,
          padding: 8,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        afterFit: (scaleInstance) => {
          scaleInstance.width = 60; // Fixed width for y-axis
        },
      },
    },
  };

  return (
    <ChartContainer>
      <Chart type="scatter" data={chartData} options={options} />
    </ChartContainer>
  );
};

export default WindGraph;
