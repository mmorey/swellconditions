import React from 'react';
import styled, { useTheme } from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ScriptableContext } from 'chart.js';
import { NDBCStation } from '../APIClients/NDBCTypes';
import { getWindDirection } from '../utils';

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
        label: 'Swell Components',
        data: swellComponentsData,
        borderColor: theme.colors.chart.primary,
        backgroundColor: theme.colors.chart.primary,
        showLine: false,
        pointRadius: (context: ScriptableContext<'line'>) => (context.raw === null ? 0 : 6),
        pointHoverRadius: (context: ScriptableContext<'line'>) => (context.raw === null ? 0 : 8),
        yAxisID: 'y',
      },
      {
        label: 'Wave Energy',
        data: station.spectralWaveData.spectralData.map((point) => point.energy),
        borderColor: theme.colors.chart.primary,
        backgroundColor: theme.colors.chart.primary,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        yAxisID: 'y',
      },
      {
        label: 'Direction',
        data: station.spectralWaveData.spectralData.map((point) => point.angle),
        borderColor: theme.colors.chart.secondary,
        backgroundColor: theme.colors.chart.secondary,
        showLine: false,
        pointRadius: 2,
        pointHoverRadius: 6,
        yAxisID: 'y1',
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
            const period = parseFloat(context.label);
            const frequency = (1 / period).toFixed(3);
            const swellComponent = station.spectralWaveData?.swellComponents?.find((comp) => comp.period.toFixed(1) === period.toFixed(1));

            const labels = [`Energy: ${context.parsed.y.toFixed(2)} m²/Hz`, `Period: ${period} s`, `Frequency: ${frequency} Hz`];

            if (swellComponent) {
              labels.splice(1, 0, `Height: ${(swellComponent.waveHeight * 3.28084).toFixed(1)} ft`);
            }

            // Add direction based on the dataset
            if (swellComponent) {
              labels.push(`Direction: ${swellComponent.compassDirection} (${swellComponent.direction}°)`);
            } else if (context.datasetIndex === 2) {
              labels.push(`Direction: ${getWindDirection(context.parsed.y)} (${context.parsed.y.toFixed(0)}°)`);
            } else {
              const spectralDataPoint = station.spectralWaveData?.spectralData[context.dataIndex];
              if (spectralDataPoint) {
                labels.push(`Direction: ${getWindDirection(spectralDataPoint.angle)} (${spectralDataPoint.angle.toFixed(0)}°)`);
              }
            }
            return labels;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear',
        beginAtZero: true,
        max: yAxisMax,
        position: 'left',
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
      y1: {
        type: 'linear',
        beginAtZero: true,
        max: 360,
        position: 'right',
        title: {
          display: true,
          text: 'Direction (°)',
          color: theme.colors.text.primary,
        },
        ticks: {
          color: theme.colors.text.primary,
          padding: 8,
          stepSize: 45,
        },
        grid: {
          drawOnChartArea: false,
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
