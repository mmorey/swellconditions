import React from 'react';
import styled, { useTheme } from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions } from 'chart.js';
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

  const data = {
    labels: periods,
    datasets: [
      {
        label: 'Wave Energy',
        data: station.spectralWaveData.spectralData.map((point) => point.energy),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.4,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Wave Spectra (m²/Hz) vs Period (s)`,
        color: theme.colors.text.primary,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const period = parseFloat(context.label);
            const frequency = (1 / period).toFixed(3);
            return [`Energy: ${context.parsed.y.toFixed(2)} m²/Hz`, `Frequency: ${frequency} Hz`, `Period: ${period} s`];
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear',
        beginAtZero: true,
        title: {
          display: false,
          text: 'Energy (m²/Hz)',
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
          display: false,
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
