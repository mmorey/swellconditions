import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartDataset } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { WaterLevelData } from '../APIClients/TidesAndCurrentsGovTypes';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface TideGraphProps {
  waterLevelData: WaterLevelData;
}

const GraphContainer = styled.div`
  height: 300px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
`;

const hoursToShow = 2 * 24; // Show 24 hours of tide data, results are every 30 minutes

const TideGraph: React.FC<TideGraphProps> = ({ waterLevelData }) => {
  const theme = useTheme();

  const { detailedData, hiLoData } = useMemo(() => {
    // Get the start and end time from detailed predictions
    const startTime = new Date(waterLevelData.tideDetailedPrediction.predictions[0].t).getTime();
    const endTime = new Date(waterLevelData.tideDetailedPrediction.predictions[hoursToShow - 1].t).getTime();

    // Process detailed predictions
    const detailedPredictions = waterLevelData.tideDetailedPrediction.predictions.slice(0, hoursToShow);
    const detailedLabels = detailedPredictions.map((item) => {
      const [datePart, timePart] = item.t.split(' ');
      const date = new Date(`${datePart}T${timePart}Z`);
      return date.toLocaleString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    });
    const detailedHeights = detailedPredictions.map((item) => parseFloat(item.v));

    // Process hi/lo predictions within the time range
    const hiLoPredictions = waterLevelData.tideHiLoPrediction.predictions.filter((prediction) => {
      const time = new Date(prediction.t).getTime();
      return time >= startTime && time <= endTime;
    });

    // Create sparse arrays for hi/lo data
    const hiLoPoints = new Array(detailedLabels.length).fill(null);
    const hiLoTypes = new Array(detailedLabels.length).fill(null);

    hiLoPredictions.forEach((hiLo) => {
      const hiLoTime = new Date(hiLo.t).getTime();
      // Find the closest detailed prediction time
      const index = detailedPredictions.findIndex((detailed) => {
        const detailedTime = new Date(detailed.t).getTime();
        return Math.abs(detailedTime - hiLoTime) <= 15 * 60 * 1000; // Within 15 minutes
      });

      if (index !== -1) {
        hiLoPoints[index] = parseFloat(hiLo.v);
        hiLoTypes[index] = hiLo.type;
      }
    });

    return {
      detailedData: {
        labels: detailedLabels,
        heights: detailedHeights,
      },
      hiLoData: {
        points: hiLoPoints,
        types: hiLoTypes,
      },
    };
  }, [waterLevelData]);

  const data = {
    labels: detailedData.labels,
    datasets: [
      {
        label: 'Tide Height',
        data: detailedData.heights,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.4,
        datalabels: {
          display: false,
        },
      },
      {
        label: 'High/Low Points',
        data: hiLoData.points,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgb(255, 99, 132)',
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
        datalabels: {
          display: (context) => hiLoData.types[context.dataIndex] !== null,
          color: theme.colors.text.primary,
          formatter: (value: number, context) => {
            const type = hiLoData.types[context.dataIndex];
            const typeLabel = type === 'H' || type === 'HH' ? 'High' : 'Low';
            return `${typeLabel}\n${value.toFixed(1)}ft`;
          },
          anchor: (context) => {
            const type = hiLoData.types[context.dataIndex];
            return type === 'H' || type === 'HH' ? 'bottom' : 'top';
          },
          align: (context) => {
            const type = hiLoData.types[context.dataIndex];
            return type === 'H' || type === 'HH' ? 'bottom' : 'top';
          },
          offset: 8,
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
        top: 30,
        bottom: 30,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Tide Predictions at ${waterLevelData.waterLevel.metadata.name} (Next ${hoursToShow} Hours)`,
        color: theme.colors.text.primary,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const datasetIndex = context.datasetIndex;
            if (datasetIndex === 1) {
              // Hi/Lo dataset
              const type = hiLoData.types[context.dataIndex];
              const typeLabel = type === 'H' || type === 'HH' ? 'High' : 'Low';
              return `${typeLabel} Tide: ${context.parsed.y.toFixed(1)}ft`;
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
