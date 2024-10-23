import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartDataset, ScriptableContext } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { TidesAndCurrentsGovWaterTemperatureAPIResponse } from '../APIClients/TidesAndCurrentsGovTypes';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface WaterTemperatureGraphProps {
  waterTemperatureData: TidesAndCurrentsGovWaterTemperatureAPIResponse;
}

const GraphContainer = styled.div`
  height: 300px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
`;

const hoursToGoBack = 12;

const WaterTemperatureGraph: React.FC<WaterTemperatureGraphProps> = ({ waterTemperatureData }) => {
  const theme = useTheme();

  const { labels, temperatures, maxTemp, minTemp, stationName } = useMemo(() => {
    const lastHours = waterTemperatureData.data.slice(-1 * hoursToGoBack);
    const temps = lastHours.map((item) => parseFloat(item.v));
    const max = Math.max(...temps);
    const min = Math.min(...temps);
    return {
      labels: lastHours.map((item) => {
        const [datePart, timePart] = item.t.split(' ');
        const date = new Date(`${datePart}T${timePart}Z`);
        return date.toLocaleString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }),

      temperatures: temps,
      maxTemp: { value: max, index: temps.indexOf(max) },
      minTemp: { value: min, index: temps.indexOf(min) },
      stationName: waterTemperatureData.metadata.name,
    };
  }, [waterTemperatureData]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Latest Temperature',
        data: temperatures.map((_, index) => (index === temperatures.length - 1 ? temperatures[index] : null)),
        pointBackgroundColor: 'rgb(53, 162, 235)',
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
        datalabels: {
          color: 'rgb(53, 162, 235)',
          font: {
            weight: 'bold' as const,
            size: 12,
          },
          anchor: 'start' as const,
          align: 'bottom' as const,
          offset: 5,
          formatter: (value: number | null) => (value ? `${value.toFixed(1)}°F` : ''),
        },
      },
      {
        label: 'Max/Min Temperature',
        data: temperatures.map((_, index) => (index === maxTemp.index ? maxTemp.value : index === minTemp.index ? minTemp.value : null)),
        pointBackgroundColor: (context: ScriptableContext<'line'>) => {
          const index = context.dataIndex;
          return index === maxTemp.index ? 'rgb(0, 84, 147)' : index === minTemp.index ? 'rgb(150, 206, 255)' : 'transparent';
        },
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
        datalabels: {
          color: (context: ScriptableContext<'line'>) => {
            const index = context.dataIndex;
            return index === maxTemp.index ? 'rgb(0, 84, 147)' : index === minTemp.index ? 'rgb(150, 206, 255)' : 'transparent';
          },
          font: {
            weight: 'bold' as const,
            size: 12,
          },
          anchor: 'end' as const,
          align: 'left' as const,
          offset: 5,
          formatter: (value: number | null) => (value ? `${value.toFixed(1)}°F` : ''),
        },
      },
      {
        label: 'Water Temperature (°F)',
        data: temperatures,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        datalabels: {
          display: false,
        },
      },
    ] as ChartDataset<'line', (number | null)[]>[],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        right: 20, // Increase right padding to accommodate the label
      },
    },
    plugins: {
      legend: {
        display: false, // Hide the legend
      },
      title: {
        display: true,
        text: `Water Temperature at ${stationName} (Last ${hoursToGoBack} Hours)`,
        color: theme.colors.text.primary,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const index = context.dataIndex;
            if (index === maxTemp.index) {
              return `Max: ${maxTemp.value.toFixed(1)}°F`;
            } else if (index === minTemp.index) {
              return `Min: ${minTemp.value.toFixed(1)}°F`;
            } else if (index === temperatures.length - 1) {
              return `Latest: ${temperatures[index].toFixed(1)}°F`;
            }
            return `Temperature: ${context.parsed.y.toFixed(1)}°F`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Temperature (°F)',
          color: theme.colors.text.primary,
        },
        ticks: {
          color: theme.colors.text.primary,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
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
    <>
      <GraphContainer>
        <Line options={options} data={data} plugins={[ChartDataLabels]} />
      </GraphContainer>
    </>
  );
};

export default WaterTemperatureGraph;
