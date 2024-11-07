import React from 'react';
import styled, { useTheme } from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ScriptableContext } from 'chart.js';
import { NDBCStation } from '../APIClients/NDBCTypes';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const GraphContainer = styled.div`
  height: 300px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
`;

interface SpectralWaveGraphProps {
  station: NDBCStation;
}

const SpectralWaveGraph: React.FC<SpectralWaveGraphProps> = ({ station }) => {
  const theme = useTheme();

  if (!station.spectralWaveData?.spectralData) return null;

  const frequencies = station.spectralWaveData.spectralData.map((point) => point.frequency);
  const periods = frequencies.map((freq) => (1 / freq).toFixed(1));

  // Create sparse array for swell components
  const swellComponentsData = new Array(periods.length).fill(null);
  station.spectralWaveData.swellComponents?.forEach((component) => {
    // Find the closest period index
    const periodStr = component.period.toFixed(1);
    const index = periods.findIndex((p) => p === periodStr);
    if (index !== -1) {
      swellComponentsData[index] = component.maxEnergy;
    }
  });

  // Calculate max energy value from both datasets
  const spectralEnergies = station.spectralWaveData.spectralData.map((point) => point.energy);
  const swellEnergies = swellComponentsData.filter((energy): energy is number => energy !== null);
  const maxEnergy = Math.max(...spectralEnergies, ...swellEnergies);
  const yAxisMax = maxEnergy * 1.2; // Add 20% padding

  const data = {
    labels: periods,
    datasets: [
      {
        label: 'Wave Energy',
        data: station.spectralWaveData.spectralData.map((point) => point.energy),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'rgb(53, 162, 235)',
        pointHoverBorderColor: 'rgb(53, 162, 235)',
      },
      {
        label: 'Swell Components',
        data: swellComponentsData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
        showLine: false,
        pointRadius: (context: ScriptableContext<'line'>) => (context.raw === null ? 0 : 6),
        pointHoverRadius: (context: ScriptableContext<'line'>) => (context.raw === null ? 0 : 8),
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        position: 'top',
        labels: {
          color: theme.colors.text.primary,
        },
      },
      title: {
        display: true,
        text: `Wave Spectral Density`,
        color: theme.colors.text.primary,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.datasetIndex === 0) {
              const period = parseFloat(context.label);
              const frequency = (1 / period).toFixed(3);
              return [`Energy: ${context.parsed.y.toFixed(2)} m²/Hz`, `Frequency: ${frequency} Hz`, `Period: ${period} s`];
            } else if (context.raw !== null) {
              const period = parseFloat(context.label);
              const swellComponent = station.spectralWaveData?.swellComponents?.find((comp) => comp.period.toFixed(1) === period.toFixed(1));
              if (swellComponent) {
                return [
                  `Energy: ${swellComponent.maxEnergy.toFixed(2)} m²/Hz`,
                  `Period: ${swellComponent.period.toFixed(1)} s`,
                  `Height: ${swellComponent.waveHeight.toFixed(1)} m`,
                  `Direction: ${swellComponent.compassDirection} (${swellComponent.direction}°)`,
                ];
              }
              return [`Energy: ${context.parsed.y.toFixed(2)} m²/Hz`];
            }
            return []; // Return empty array instead of null
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear',
        beginAtZero: true,
        max: yAxisMax,
        title: {
          display: true,
          text: 'Spectral Density (m²/Hz)',
          color: theme.colors.text.primary,
        },
        ticks: {
          color: theme.colors.text.primary,
          padding: 8,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        type: 'category',
        position: 'bottom',
        title: {
          display: true,
          text: 'Period (s)',
          color: theme.colors.text.primary,
        },
        ticks: {
          color: theme.colors.text.primary,
          padding: 8,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  return (
    <GraphContainer>
      <Line options={options} data={data} id={`spectral-wave-${station.id}`} />
    </GraphContainer>
  );
};

export default SpectralWaveGraph;
