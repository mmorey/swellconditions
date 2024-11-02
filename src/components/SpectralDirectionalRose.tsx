import React from 'react';
import styled, { useTheme } from 'styled-components';
import { PolarArea } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, ArcElement, Tooltip, Legend, ChartOptions } from 'chart.js';
import { NDBCStation, SpectralDataPoint } from '../APIClients/NDBCTypes';

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

const GraphContainer = styled.div`
  height: 400px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  margin: 10px 0;
`;

interface SpectralDirectionalRoseProps {
  station: NDBCStation;
}

// Using 16 segments but only showing 4 labels
const DIRECTIONS = Array(16)
  .fill('')
  .map((_, i) => {
    const angle = i * 22.5;
    if (angle % 90 === 0) {
      return `${angle}°`;
    }
    return '';
  });

// Energy ranges in m²/Hz with updated colors for better visibility
const ENERGY_RANGES = [
  { min: 0, max: 0.1, color: 'rgba(255, 247, 230, 0.7)', label: '< 0.1 m²/Hz' },
  { min: 0.1, max: 0.5, color: 'rgba(255, 237, 160, 0.7)', label: '0.1-0.5 m²/Hz' },
  { min: 0.5, max: 1.0, color: 'rgba(254, 217, 118, 0.7)', label: '0.5-1.0 m²/Hz' },
  { min: 1.0, max: 2.0, color: 'rgba(253, 141, 60, 0.7)', label: '1.0-2.0 m²/Hz' },
  { min: 2.0, max: 4.0, color: 'rgba(252, 78, 42, 0.7)', label: '2.0-4.0 m²/Hz' },
  { min: 4.0, max: Infinity, color: 'rgba(189, 0, 38, 0.7)', label: '> 4.0 m²/Hz' },
];

const getDirectionBin = (angle: number): number => {
  // Normalize angle to 0-360
  const normalizedAngle = ((angle % 360) + 360) % 360;
  // Each bin is 22.5 degrees (360/16)
  return Math.floor(((normalizedAngle + 11.25) % 360) / 22.5);
};

const getEnergyBin = (energy: number): number => {
  return ENERGY_RANGES.findIndex((range) => energy <= range.max);
};

const SpectralDirectionalRose: React.FC<SpectralDirectionalRoseProps> = ({ station }) => {
  const theme = useTheme();

  if (!station.spectralWaveData?.spectralData) return null;

  // Initialize direction bins with zeros for each energy range
  const directionBins: number[][] = Array(16)
    .fill(null)
    .map(() => Array(ENERGY_RANGES.length).fill(0));

  // Group data points by direction and energy level
  station.spectralWaveData.spectralData.forEach((point: SpectralDataPoint) => {
    const dirBin = getDirectionBin(point.angle);
    const energyBin = getEnergyBin(point.energy);
    if (energyBin >= 0) {
      directionBins[dirBin][energyBin] += point.energy;
    }
  });

  const datasets = ENERGY_RANGES.map((range, index) => ({
    label: range.label,
    data: directionBins.map((bin) => bin[index]),
    backgroundColor: range.color,
    borderColor: range.color.replace('0.7', '1'),
    borderWidth: 1,
    stack: 'stack1',
  }));

  const data = {
    labels: DIRECTIONS,
    datasets,
  };

  const options: ChartOptions<'polarArea'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Wave Energy Distribution by Direction',
        color: theme.colors.text.primary,
        font: {
          size: 16,
        },
        padding: {
          bottom: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.r.toFixed(2)} m²/Hz`;
          },
        },
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          color: theme.colors.text.primary,
          backdropColor: 'transparent',
          font: {
            size: 10,
          },
          padding: -10,
          z: 1,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.2)',
          lineWidth: 1,
        },
        angleLines: {
          color: 'rgba(255, 255, 255, 0.2)',
          lineWidth: 1,
        },
        pointLabels: {
          display: true,
          color: theme.colors.text.primary,
          font: {
            size: 12,
            weight: 'bold',
          },
          padding: 10,
          centerPointLabels: true,
          callback: (value) => value || '',
        },
      },
    },
    startAngle: 270, // Makes 0° point up
  };

  return (
    <GraphContainer>
      <PolarArea data={data} options={options} />
    </GraphContainer>
  );
};

export default SpectralDirectionalRose;
