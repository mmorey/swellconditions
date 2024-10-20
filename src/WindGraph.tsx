import React from 'react';
import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartData, ScatterController, LineController } from 'chart.js';

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

const WindGraph: React.FC<WindGraphProps> = ({ data }) => {
  const chartData: ChartData<'line' | 'scatter'> = {
    labels: data.map((d) => d.time),
    datasets: [
      {
        type: 'line',
        label: 'Wind Speed',
        data: data.map((d) => d.speed),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
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
      {
        type: 'scatter',
        label: 'Wind Gust',
        data: data.map((d, index) => (d.gust !== d.speed ? { x: index, y: d.gust } : null)).filter((point): point is { x: number; y: number } => point !== null),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options: ChartOptions<'line' | 'scatter'> = {
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
            const labels = [`Wind Speed: ${dataPoint.speed.toFixed(1)} MPH`, `Direction: ${dataPoint.direction}°`];
            if (dataPoint.gust > dataPoint.speed) {
              labels.splice(1, 0, `Wind Gust: ${dataPoint.gust.toFixed(1)} MPH`);
            }
            return labels;
          },
        },
      },
    },
    scales: {
      x: {
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
      <Chart type="line" data={chartData} options={options} />
    </div>
  );
};

export default WindGraph;
