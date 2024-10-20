import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartDataset, ScriptableContext } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { TidesAndCurrentsGovAPIResponse } from '../APIClients/TidesAndCurrentsGovTypes';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface WaterTemperatureGraphProps {
  waterTemperatureData: TidesAndCurrentsGovAPIResponse;
}

const GraphContainer = styled.div`
  height: 300px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
`;

const SourceContainer = styled.div`
  text-align: right;
  font-size: 8px;
`;

const SourceLink = styled.a`
  color: gray;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const WaterTemperatureGraph: React.FC<WaterTemperatureGraphProps> = ({ waterTemperatureData }) => {
  const theme = useTheme();

  const { labels, temperatures, latestReading, maxTemp, minTemp, stationName } = useMemo(() => {
    const last72Hours = waterTemperatureData.data.slice(-72);
    const latest = last72Hours[last72Hours.length - 1];
    const temps = last72Hours.map((item) => parseFloat(item.v));
    const max = Math.max(...temps);
    const min = Math.min(...temps);
    return {
      labels: last72Hours.map((item) => {
        const date = new Date(item.t);
        return date.toLocaleString([], {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }),
      temperatures: temps,
      latestReading: {
        temperature: parseFloat(latest.v),
        timestamp: latest.t,
      },
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
        pointBackgroundColor: 'green',
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
        datalabels: {
          color: 'green',
          font: {
            weight: 'bold' as const,
            size: 12,
          },
          anchor: 'end' as const,
          align: 'top' as const,
          offset: 5,
          formatter: (value: number | null) => (value ? `${value.toFixed(1)}°F` : ''),
        },
      },
      {
        label: 'Max/Min Temperature',
        data: temperatures.map((_, index) => (index === maxTemp.index ? maxTemp.value : index === minTemp.index ? minTemp.value : null)),
        pointBackgroundColor: (context: ScriptableContext<'line'>) => {
          const index = context.dataIndex;
          return index === maxTemp.index ? 'red' : index === minTemp.index ? 'blue' : 'transparent';
        },
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
        datalabels: {
          color: (context: ScriptableContext<'line'>) => {
            const index = context.dataIndex;
            return index === maxTemp.index ? 'red' : index === minTemp.index ? 'blue' : 'transparent';
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
    plugins: {
      legend: {
        display: false, // Hide the legend
      },
      title: {
        display: true,
        text: `Water Temperature at ${stationName} (Last 72 Hours)`,
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
        <SourceContainer>
          <SourceLink href="#" target="_blank" rel="noopener noreferrer">
            NOAA CO-OPS API
          </SourceLink>
        </SourceContainer>
      </GraphContainer>
    </>
  );
};

export default WaterTemperatureGraph;
