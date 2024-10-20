import React from 'react';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend, ChartOptions, ChartData, ScatterController } from 'chart.js';
import { getWindDirection } from '../utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, ScatterController, Title, Tooltip, Legend);

interface WindData {
  time: string;
  speed: number;
  gust: number;
  direction: number;
}

interface WindGraphProps {
  data: WindData[];
}

const WindGraph: React.FC<WindGraphProps> = ({ data }) => {
  const chartData: ChartData<'scatter'> = {
    datasets: [
      {
        type: 'scatter',
        label: 'Wind Speed',
        data: data.map((d, index) => ({ x: index, y: d.speed })),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        pointStyle: data.map((d) => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = 30;
            canvas.height = 30;
            ctx.translate(15, 15);
            ctx.rotate(((d.direction + 180) * Math.PI) / 180);
            ctx.font = '30px Arial';
            ctx.fillStyle = 'rgb(75, 192, 192)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('↑', 0, 0);
          }
          return canvas;
        }),
        pointRadius: 8,
      },
    ],
  };

  const options: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Wind Forecast',
        color: 'white',
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
        type: 'category',
        labels: data.map((d) => d.time),
        title: {
          display: false,
          text: 'Date and Time',
          color: 'white',
        },
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Wind Speed (MPH)',
          color: 'white',
        },
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  return (
    <div style={{ height: '400px', minHeight: '400px', width: '100%' }}>
      <Chart type="scatter" data={chartData} options={options} />
    </div>
  );
};

export default WindGraph;
