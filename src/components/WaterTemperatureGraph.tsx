import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartDataset } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import annotationPlugin from 'chartjs-plugin-annotation';
import { TidesAndCurrentsGovWaterTemperatureAPIResponse } from '../APIClients/TidesAndCurrentsGovTypes';
import 'chartjs-adapter-date-fns';
import { parseISO, addHours, differenceInHours, subHours, isAfter, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin);

interface WaterTemperatureGraphProps {
  waterTemperatureData: TidesAndCurrentsGovWaterTemperatureAPIResponse;
}

const GraphContainer = styled.div`
  height: 300px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
`;

// Helper function to calculate exponential moving average
const calculateEMA = (data: number[], periods: number): number[] => {
  const multiplier = 2 / (periods + 1);
  const ema = [data[0]];

  for (let i = 1; i < data.length; i++) {
    ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }

  return ema;
};

// Helper function to fit sinusoidal pattern
const fitSinusoidalPattern = (times: Date[], temperatures: number[]): { amplitude: number; phase: number; offset: number } => {
  // Convert times to hours since start
  const hours = times.map((time) => differenceInHours(time, times[0]));

  // Estimate parameters for sin wave (24-hour period)
  let sumSin = 0,
    sumCos = 0,
    sumTemp = 0;
  const omega = (2 * Math.PI) / 24; // 24-hour period

  for (let i = 0; i < hours.length; i++) {
    sumSin += Math.sin(omega * hours[i]) * temperatures[i];
    sumCos += Math.cos(omega * hours[i]) * temperatures[i];
    sumTemp += temperatures[i];
  }

  const offset = sumTemp / temperatures.length;
  const amplitude = (Math.sqrt(sumSin * sumSin + sumCos * sumCos) * 2) / temperatures.length;
  const phase = Math.atan2(sumCos, sumSin);

  return { amplitude, phase, offset };
};

const WaterTemperatureGraph: React.FC<WaterTemperatureGraphProps> = ({ waterTemperatureData }) => {
  const theme = useTheme();

  const { times, temperatures, predictedTimes, predictedTemperatures, stationName, stationID, yAxisScale, now, latestTemperature } = useMemo(() => {
    // Get current time and round it to the nearest hour
    const now = new Date();
    const currentHour = setMilliseconds(setSeconds(setMinutes(now, 0), 0), 0);

    // Calculate exact start and end times
    const startTime = subHours(currentHour, 3);
    const endTime = addHours(startTime, 24);

    // Get all historical data
    const allData = waterTemperatureData.data;
    const allTemps = allData.map((item) => parseFloat(item.v));
    const allTimes = allData.map((item) => parseISO(item.t.replace(' ', 'T') + 'Z'));

    // Filter data from start time
    const recentData = allData.filter((_, index) => isAfter(allTimes[index], startTime) || allTimes[index].getTime() === startTime.getTime());
    const temps = recentData.map((item) => parseFloat(item.v));
    const timePoints = recentData.map((item) => parseISO(item.t.replace(' ', 'T') + 'Z'));

    // Get the latest temperature reading
    const latestTemperature = temps[temps.length - 1];
    const lastActualTime = timePoints[timePoints.length - 1];

    // Filter to only show data points on the hour
    const hourlyData = recentData.filter((_, index) => {
      const time = timePoints[index];
      return time.getMinutes() === 0;
    });
    const hourlyTemps = hourlyData.map((item) => parseFloat(item.v));
    const hourlyTimePoints = hourlyData.map((item) => parseISO(item.t.replace(' ', 'T') + 'Z'));

    // Calculate EMA for trend detection (using all data)
    const ema = calculateEMA(allTemps, 12); // 12-hour EMA
    const recentTrend = ema[ema.length - 1] - ema[ema.length - 2];

    // Fit sinusoidal pattern to historical data (using all data)
    const { amplitude, phase, offset } = fitSinusoidalPattern(allTimes, allTemps);

    // Calculate how many hours we need to predict
    const hoursToPredict = Math.ceil(differenceInHours(endTime, lastActualTime)) + 1;

    // Generate future times (on the hour only)
    const futureTimes = Array.from({ length: hoursToPredict }, (_, i) => {
      const futureTime = addHours(lastActualTime, i + 1);
      return setMilliseconds(setSeconds(setMinutes(futureTime, 0), 0), 0);
    });

    // Generate predictions combining sinusoidal pattern and trend
    const lastTemp = temps[temps.length - 1];
    const omega = (2 * Math.PI) / 24; // 24-hour period

    const predictedTemps = futureTimes.map((time, i) => {
      const hoursSinceStart = differenceInHours(time, allTimes[0]);
      const sinComponent = amplitude * Math.sin(omega * hoursSinceStart + phase) + offset;
      const trendComponent = recentTrend * (i + 1) * 0.5; // Dampened trend

      // Combine sinusoidal pattern with dampened trend
      const prediction = lastTemp + (sinComponent - (lastTemp - trendComponent)) * (1 - Math.exp(-i / 24)) + trendComponent;

      // Apply bounds to prevent unrealistic predictions
      const maxChange = 5; // Maximum temperature change in °F over prediction period
      return Math.max(lastTemp - maxChange, Math.min(lastTemp + maxChange, prediction));
    });

    // Calculate y-axis scale with padding
    const allTemperatures = [...hourlyTemps, ...predictedTemps];
    const minTemp = Math.min(...allTemperatures);
    const maxTemp = Math.max(...allTemperatures);
    const range = maxTemp - minTemp;
    const padding = range * 0.2; // Add 20% padding

    return {
      times: hourlyTimePoints,
      temperatures: hourlyTemps,
      predictedTimes: futureTimes,
      predictedTemperatures: predictedTemps,
      stationName: waterTemperatureData.metadata.name,
      stationID: waterTemperatureData.metadata.id,
      yAxisScale: {
        min: minTemp - padding,
        max: maxTemp + padding,
      },
      now,
      latestTemperature,
    };
  }, [waterTemperatureData]);

  const data = {
    labels: [...times, ...predictedTimes],
    datasets: [
      {
        label: 'Actual Water Temperature',
        data: temperatures.map((temp, index) => ({
          x: times[index],
          y: temp,
        })),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        datalabels: {
          display: false,
        },
      },
      {
        label: 'Predicted Water Temperature',
        data: predictedTemperatures.map((temp, index) => ({
          x: predictedTimes[index],
          y: temp,
        })),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.2)',
        showLine: false,
        pointRadius: 4,
        pointStyle: 'circle',
        datalabels: {
          display: false,
        },
      },
    ] as ChartDataset<'line', any>[],
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
        text: `Water Temperature at ${stationName} (${stationID})`,
        color: theme.colors.text.primary,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const datasetIndex = context.datasetIndex;
            const value = context.parsed.y.toFixed(1);
            if (datasetIndex === 2) {
              return `Predicted: ${value} °F`;
            }
            return `Temperature: ${value} °F`;
          },
        },
      },
      annotation: {
        annotations: {
          currentTime: {
            type: 'line',
            xMin: now.getTime(),
            xMax: now.getTime(),
            borderColor: theme.colors.text.primary,
            borderWidth: 1,
            label: {
              display: true,
              content: `${latestTemperature.toFixed(1)} °F`,
              position: 'start',
              backgroundColor: theme.colors.backgroundLight,
              color: theme.colors.text.primary,
              padding: 4,
            },
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: yAxisScale.min,
        max: yAxisScale.max,
        title: {
          display: true,
          text: 'Temperature (°F)',
          color: theme.colors.text.primary,
        },
        ticks: {
          color: theme.colors.text.primary,
          padding: 8,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        afterFit: (scaleInstance) => {
          scaleInstance.width = 60; // Fixed width for y-axis
        },
      },
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          displayFormats: {
            hour: 'h:mm a',
          },
          tooltipFormat: 'PPpp',
        },
        min: subHours(setMilliseconds(setSeconds(setMinutes(now, 0), 0), 0), 3).getTime(),
        max: addHours(subHours(setMilliseconds(setSeconds(setMinutes(now, 0), 0), 0), 3), 24).getTime(),
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
    <>
      <GraphContainer>
        <Line options={options} data={data} plugins={[ChartDataLabels]} />
      </GraphContainer>
    </>
  );
};

export default WaterTemperatureGraph;
