import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartDataset } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { TidesAndCurrentsGovTideDetailedPredictionAPIResponse } from '../APIClients/TidesAndCurrentsGovTypes';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TideGraphProps {
  tideData: TidesAndCurrentsGovTideDetailedPredictionAPIResponse;
  stationName: string;
}

const GraphContainer = styled.div`
  height: 300px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
`;

const hoursToShow = 2 * 24; // Show 24 hours of tide data, results are every 30 minutes

const TideGraph: React.FC<TideGraphProps> = ({ tideData, stationName }) => {
  const theme = useTheme();

  const { labels, heights, maxHeight, minHeight } = useMemo(() => {
    const predictions = tideData.predictions.slice(0, hoursToShow);
    const heightValues = predictions.map((item) => parseFloat(item.v));
    const max = Math.max(...heightValues);
    const min = Math.min(...heightValues);

    return {
      labels: predictions.map((item) => {
        const [datePart, timePart] = item.t.split(' ');
        const date = new Date(`${datePart}T${timePart}Z`);
        return date.toLocaleString([], {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }),
      heights: heightValues,
      maxHeight: { value: max, index: heightValues.indexOf(max) },
      minHeight: { value: min, index: heightValues.indexOf(min) },
    };
  }, [tideData]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Max/Min Height',
        data: heights.map((_, index) => (index === maxHeight.index ? maxHeight.value : index === minHeight.index ? minHeight.value : null)),
        pointBackgroundColor: (context: any) => {
          const index = context.dataIndex;
          return index === maxHeight.index ? 'rgb(0, 84, 147)' : index === minHeight.index ? 'rgb(150, 206, 255)' : 'transparent';
        },
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
        datalabels: {
          color: (context: any) => {
            const index = context.dataIndex;
            return index === maxHeight.index ? 'rgb(0, 84, 147)' : index === minHeight.index ? 'rgb(150, 206, 255)' : 'transparent';
          },
          font: {
            weight: 'bold' as const,
            size: 12,
          },
          anchor: 'end' as const,
          align: 'top' as const,
          offset: 5,
          formatter: (value: number | null) => (value ? `${value.toFixed(1)}ft` : ''),
        },
      },
      {
        label: 'Tide Height (ft)',
        data: heights,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.4,
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
        right: 20,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Tide Predictions at ${stationName} (Next ${hoursToShow} Hours)`,
        color: theme.colors.text.primary,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const index = context.dataIndex;
            if (index === maxHeight.index) {
              return `High Tide: ${maxHeight.value.toFixed(1)}ft`;
            } else if (index === minHeight.index) {
              return `Low Tide: ${minHeight.value.toFixed(1)}ft`;
            }
            return `Height: ${context.parsed.y.toFixed(1)}ft`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Height (ft)',
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
    <GraphContainer>
      <Line options={options} data={data} plugins={[ChartDataLabels]} />
    </GraphContainer>
  );
};

export default TideGraph;
