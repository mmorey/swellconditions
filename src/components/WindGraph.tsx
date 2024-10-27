import React from 'react';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartData, ScatterController, LineController } from 'chart.js';
import { getWindDirection, parseISO8601Duration, convertWindSpeed } from '../utils';
import styled, { useTheme } from 'styled-components';
import { WeatherData } from '../APIClients/WeatherGovTypes';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ScatterController, LineController, Title, Tooltip, Legend);

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

const ChartContainer = styled.div`
  height: 300px;
  padding: 10px;
  border-radius: 10px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
`;

const WindGraph: React.FC<WindGraphProps> = ({ weatherData }) => {
  const theme = useTheme();
  const data = processWeatherGovWindData(weatherData);

  const windSpeedColor = 'rgb(75, 192, 192)';
  const gustColor = 'rgba(75, 192, 192, 0.25)';

  const chartData: ChartData<'scatter' | 'line'> = {
    labels: data.map((d) => d.time),
    datasets: [
      {
        type: 'scatter' as const,
        label: 'Wind Speed',
        data: data.map((d, index) => ({ x: index, y: d.speed })),
        backgroundColor: windSpeedColor,
        pointStyle: data.map((d) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = 30;
            canvas.height = 30;
            ctx.translate(15, 15);
            ctx.rotate(((d.direction + 180) * Math.PI) / 180);
            ctx.font = '30px Arial';
            ctx.fillStyle = windSpeedColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('↑', 0, 0);
          }
          return canvas;
        }),
        pointRadius: 8,
      },
      {
        type: 'line' as const,
        label: 'Wind Gust',
        data: data.map((d, index) => ({ x: index, y: d.gust })),
        borderColor: gustColor,
        backgroundColor: gustColor,
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
        text: 'Wind Forecast',
        color: theme.colors.text.primary,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const dataIndex = context.dataIndex;
            const dataPoint = data[dataIndex];
            return [
              `Time: ${dataPoint.time}`,
              `Wind Speed: ${dataPoint.speed.toFixed(1)} mph`,
              `Wind Gust: ${dataPoint.gust.toFixed(1)} mph`,
              `Direction: ${getWindDirection(dataPoint.direction)} ${dataPoint.direction}°`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        title: {
          display: false,
          text: 'Date and Time',
          color: theme.colors.text.primary,
        },
        ticks: {
          color: theme.colors.text.primary,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Wind Speed (mph)',
          color: theme.colors.text.primary,
        },
        ticks: {
          color: theme.colors.text.primary,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
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
