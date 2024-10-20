import React from "react";
import {
  TideData,
  TidePredictionData,
  TidePredictionHiLoData,
} from "../types/weatherTypes";

import { Chart as ChartJS, ChartData, ChartOptions, TimeScale } from "chart.js";
import { Chart } from "react-chartjs-2";
import {
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import "chartjs-adapter-date-fns";
import ChartDataLabels from "chartjs-plugin-datalabels";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
);

interface TideLevelGraphProps {
  tideData: TideData | null;
  tidePredictionData: TidePredictionData | null;
  tidePredictionHiLoData: TidePredictionHiLoData | null;
}

const TideLevelGraph: React.FC<TideLevelGraphProps> = ({
  tideData,
  tidePredictionData,
  tidePredictionHiLoData,
}) => {
  if (
    !tideData ||
    tideData.data.length === 0 ||
    !tidePredictionData ||
    tidePredictionData.predictions.length === 0 ||
    !tidePredictionHiLoData ||
    tidePredictionHiLoData.predictions.length === 0
  ) {
    return <div>No tide prediction data available</div>;
  }

  const now = new Date();
  const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  console.log("Now:", now);
  console.log("Twenty Four Hours Later:", twentyFourHoursLater);

  const filteredData = tidePredictionData.predictions.filter((prediction) => {
    const predictionTime = new Date(prediction.t);
    return predictionTime >= now && predictionTime <= twentyFourHoursLater;
  });

  const filteredHiLoData = tidePredictionHiLoData.predictions.filter(
    (prediction) => {
      const predictionTime = new Date(prediction.t);
      return predictionTime >= now && predictionTime <= twentyFourHoursLater;
    }
  );

  const data = {
    datasets: [
      {
        label: "Tide Level",
        data: filteredData.map((prediction) => ({
          x: new Date(prediction.t).getTime(),
          y: parseFloat(prediction.v),
        })),
        fill: false,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
      {
        label: "High/Low Tide",
        data: filteredHiLoData.map((prediction) => ({
          x: new Date(prediction.t).getTime(),
          y: parseFloat(prediction.v),
          t: prediction.type,
        })),
        fill: false,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgb(255, 99, 132)",
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
      },
      {
        label: "Current Tide Level",
        data: tideData.data.map((data) => ({
          x: new Date(data.t).getTime(),
          y: parseFloat(data.v),
        })),
        fill: false,
        borderColor: "rgb(255, 159, 64)",
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Predicted Tide Level (Next 24 Hours)",
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.datasetIndex === 1) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(
                2
              )} ft`;
            }
            return `${context.dataset.label}: ${context.parsed.y.toFixed(
              2
            )} ft`;
          },
        },
      },
      datalabels: {
        anchor: "end",
        align: "top",
        formatter: (value, context) => {
          if (context.datasetIndex === 1) {
            const predictionTime = new Date(value.x).toLocaleTimeString(
              "en-US",
              {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }
            );
            return `${value.t} ${value.y.toFixed(2)} ft at ${predictionTime}`;
          } else if (context.datasetIndex === 2) {
            const predictionTime = new Date(value.x).toLocaleTimeString(
              "en-US",
              {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }
            );
            return `${value.y.toFixed(2)} ft at ${predictionTime}`;
          }
          return null;
        },
        font: {
          weight: "bold",
        },
        color: (context) => {
          return context.datasetIndex === 2
            ? "rgb(255, 159, 64)"
            : "rgb(255, 99, 132)";
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: "Water Level (ft)",
        },
      },
      x: {
        type: "time",
        title: {
          display: true,
          text: "Time",
        },
      },
    },
  };

  return (
    <div style={{ height: "350px", position: "relative" }}>
      <Chart
        type="line"
        data={data}
        options={options}
        plugins={[ChartDataLabels]}
      />
    </div>
  );
};

export default TideLevelGraph;
