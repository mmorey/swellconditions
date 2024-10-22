import React from 'react';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartData, ScatterController, LineController } from 'chart.js';
import { getWindDirection } from '../utils';
import styled, { useTheme } from 'styled-components';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ScatterController, LineController, Title, Tooltip, Legend);

interface WindData {
  time: string;
  speed: number;
  gust: number;
  direction: number;
}

interface WindGraphProps {
  data: WindData[];
}

const ChartContainer = styled.div`
  height: 300px;
  padding: 10px;
  border-radius: 10px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
`;

const WindGraph: React.FC<WindGraphProps> = ({ data }) => {
  const theme = useTheme();

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
