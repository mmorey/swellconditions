import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions, ChartDataset } from 'chart.js';
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';
import annotationPlugin from 'chartjs-plugin-annotation';
import 'chartjs-adapter-date-fns';
import { parseISO, addHours, subHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { WaterLevelData } from '../APIClients/TidesAndCurrentsGovTypes';

ChartJS.register(TimeScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, annotationPlugin);

const GraphContainer = styled.div`
  height: 300px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
`;

interface TideGraphProps {
  waterLevelData: WaterLevelData;
}
type HiLoDataPoint = {
  x: Date;
  y: number;
  type: string;
};

// Helper function to convert GMT string to local Date object
const convertGMTtoLocal = (gmtString: string): Date => {
  // Parse the GMT string to a Date object (which will be in UTC)
  const date = parseISO(gmtString.replace(' ', 'T') + 'Z');
  return date;
};

const TideGraph: React.FC<TideGraphProps> = ({ waterLevelData }) => {
  const theme = useTheme();

  const { detailedData, hiLoData, yAxisRange, now, currentWaterLevel } = useMemo(() => {
    // Get current time and round it to the nearest hour
    const now = new Date();
    const currentHour = setMilliseconds(setSeconds(setMinutes(now, 0), 0), 0);

    // Calculate exact start and end times
    const startTime = subHours(currentHour, 6); // Changed from 3 to 6 hours of historical data
    const endTime = addHours(startTime, 24);

    // Get the latest water level reading
    const currentWaterLevel = waterLevelData.waterLevel.data[waterLevelData.waterLevel.data.length - 1]?.v;

    // Filter predictions to get only the next 24 hours of data
    const detailedPredictions = waterLevelData.tideDetailedPrediction.predictions.filter((prediction) => {
      const predTime = convertGMTtoLocal(prediction.t);
      return predTime >= startTime && predTime <= endTime;
    });

    const detailedTimes = detailedPredictions.map((item) => convertGMTtoLocal(item.t));
    const detailedHeights = detailedPredictions.map((item) => parseFloat(item.v));

    // Process hi/lo predictions within the time range
    const hiLoPredictions = waterLevelData.tideHiLoPrediction.predictions.filter((prediction) => {
      const time = convertGMTtoLocal(prediction.t).getTime();
      return time >= startTime.getTime() && time <= endTime.getTime();
    });

    // Create arrays for hi/lo data
    const hiLoData = hiLoPredictions.map((hiLo) => ({
      x: convertGMTtoLocal(hiLo.t),
      y: parseFloat(hiLo.v),
      type: hiLo.type,
    }));

    // Calculate y-axis range
    const allHeights = [...detailedHeights, ...hiLoData.map((point) => point.y)];
    const minHeight = Math.min(...allHeights);
    const maxHeight = Math.max(...allHeights);
    const range = maxHeight - minHeight;
    const padding = range * 0.8;

    return {
      detailedData: {
        times: detailedTimes,
        heights: detailedHeights,
      },
      hiLoData,
      yAxisRange: {
        min: Math.floor(minHeight - padding),
        max: Math.ceil(maxHeight + padding),
      },
      now,
      currentWaterLevel,
    };
  }, [waterLevelData]);

  const datasets: ChartDataset<'line', any>[] = [
    {
      label: 'High/Low Points',
      data: hiLoData,
      borderColor: `${theme.colors.chart.primary}`,
      backgroundColor: `${theme.colors.chart.primary}`,
      pointRadius: 6,
      pointHoverRadius: 8,
      showLine: false,
      parsing: {
        xAxisKey: 'x',
        yAxisKey: 'y',
      },
      datalabels: {
        display: true,
        color: theme.colors.text.primary,
        formatter: (value: any) => {
          const typeLabel = value.type === 'H' || value.type === 'HH' ? 'High' : 'Low';
          return `${typeLabel}\n${value.y.toFixed(1)} ft - ${value.x.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        },
        anchor: (context: Context) => {
          const dataPoint = context.dataset.data[context.dataIndex] as unknown as HiLoDataPoint;
          return dataPoint.type === 'H' || dataPoint.type === 'HH' ? 'end' : 'start';
        },
        align: (context: Context) => {
          const dataPoint = context.dataset.data[context.dataIndex] as unknown as HiLoDataPoint;
          return dataPoint.type === 'H' || dataPoint.type === 'HH' ? 'end' : 'start';
        },
        offset: 4,
        textAlign: 'center',
        backgroundColor: theme.colors.backgroundLight,
      },
    },
    {
      label: 'Tide Height',
      data: detailedData.times.map((time, index) => ({
        x: time,
        y: detailedData.heights[index],
      })),
      borderColor: `${theme.colors.chart.primary}`,
      backgroundColor: `${theme.colors.chart.primary}`,
      tension: 0.4,
      pointRadius: 1,
      datalabels: {
        display: false,
      },
    },
  ];

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Tides at ${waterLevelData.waterLevel.metadata.name} (${waterLevelData.waterLevel.metadata.id}) History & Forecast`,
        color: theme.colors.text.primary,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const datasetIndex = context.datasetIndex;
            if (datasetIndex === 0) {
              const point = context.raw as HiLoDataPoint;
              const typeLabel = point.type === 'H' || point.type === 'HH' ? 'High' : 'Low';
              return `${typeLabel} Tide: ${point.y.toFixed(1)} ft`;
            }
            return `Height: ${context.parsed.y.toFixed(1)} ft`;
          },
        },
      },
      annotation: {
        annotations: {
          currentTime: {
            type: 'line' as const,
            xMin: now.getTime(),
            xMax: now.getTime(),
            borderColor: theme.colors.text.primary,
            borderWidth: 1,
            drawTime: 'afterDatasetsDraw',
            label: {
              display: true,
              content: currentWaterLevel ? `${parseFloat(currentWaterLevel).toFixed(1)} ft` : 'Now',
              position: 'start', // currentTimeAnnotationPosition,
              backgroundColor: theme.colors.backgroundLight,
              color: theme.colors.text.primary,
              padding: 0,
            },
          },
        },
      },
    },
    scales: {
      y: {
        min: yAxisRange.min,
        max: yAxisRange.max,
        beginAtZero: false,
        title: {
          display: true,
          text: 'Height (ft)',
          color: theme.colors.text.primary,
        },
        ticks: {
          color: theme.colors.text.primary,
          padding: 8,
          // Add padding to match the width of temperature values
          callback: function (value) {
            return value.toString().padStart(5, ' ');
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        afterFit: (scaleInstance) => {
          scaleInstance.width = 60; // Fixed width to match WaterTemperatureGraph
        },
      },
      x: {
        type: 'time',
        time: {
          unit: 'hour',
          displayFormats: {
            hour: 'h:mm a',
          },
          tooltipFormat: 'PPpp', // Detailed format for tooltip
        },
        min: subHours(setMilliseconds(setSeconds(setMinutes(now, 0), 0), 0), 6).getTime(), // Changed from 3 to 6 hours
        max: addHours(subHours(setMilliseconds(setSeconds(setMinutes(now, 0), 0), 0), 6), 24).getTime(), // Updated to match new start time
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
      <Line options={options} data={{ datasets }} plugins={[ChartDataLabels]} />
    </GraphContainer>
  );
};

export default TideGraph;
