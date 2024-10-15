import { useState, useEffect } from "react";
import styled from "styled-components";
import { BrowserRouter, useSearchParams } from "react-router-dom";
import { ForecastGridDataAPIResponse } from "./types";
import WindGraph from "./WindGraph";
import { fetchWeatherData } from "./api/weatherApi";

const AppContainer = styled.div`
  background-color: #1a1a1a;
  min-height: 100vh;
  color: #ffffff;
`;

const TitleContainer = styled.div`
  width: 100%;
  background-color: #333;
  color: #44d7a8;
  text-align: center;
  padding: 10px 0;
  position: relative;
`;

const MainTitle = styled.h1`
  margin: 0;
  padding: 0;
  font-size: 24px;
  line-height: 44px;
`;

const LocationInfo = styled.h2`
  margin: 5px 0;
  font-size: 18px;
  font-weight: normal;
`;

const GearIcon = styled.span`
  position: absolute;
  right: 15px;
  top: 15px;
  font-size: 24px;
  cursor: pointer;
`;

const ForecastInfo = styled.div`
  margin: 20px;
  text-align: center;
`;

const WindGraphContainer = styled.div`
  width: 90%;
  margin: 20px auto;
`;

const AppContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = searchParams.get("location") || "San Francisco, CA";
  const latitude = searchParams.get("lat") || "37.7749";
  const longitude = searchParams.get("lon") || "-122.4194";
  const [forecastData, setForecastData] =
    useState<ForecastGridDataAPIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coordinates = `(${latitude}, ${longitude})`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWeatherData(latitude, longitude);
        setForecastData(data);
      } catch (e) {
        setError(
          `Failed to fetch weather data: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [latitude, longitude]);

  const findClosestForecast = (
    forecasts: Array<{ validTime: string; value: number }>
  ) => {
    const now = new Date();
    return forecasts.reduce((closest, current) => {
      const currentDate = new Date(current.validTime.split("/")[0]);
      const closestDate = new Date(closest.validTime.split("/")[0]);
      return Math.abs(currentDate.getTime() - now.getTime()) <
        Math.abs(closestDate.getTime() - now.getTime())
        ? current
        : closest;
    });
  };

  const closestTemperature = forecastData
    ? findClosestForecast(forecastData.properties.temperature.values)
    : null;

  const closestWind = forecastData
    ? findClosestForecast(forecastData.properties.windSpeed.values)
    : null;

  const parseISO8601Duration = (duration: string): number => {
    const matches = duration.match(/PT(\d+)H/);
    return matches ? parseInt(matches[1], 10) : 0;
  };

  const processWindData = () => {
    if (!forecastData) return [];

    try {
      const now = new Date();
      const twentyFourHoursLater = new Date(
        now.getTime() + 24 * 60 * 60 * 1000
      );

      const windSpeedData = forecastData.properties.windSpeed.values;
      if (!Array.isArray(windSpeedData)) {
        throw new Error("Wind speed data is not in the expected format");
      }

      const windDirectionData =
        forecastData.properties.windDirection?.values || [];
      const windGustData = forecastData.properties.windGust?.values || [];

      const hourlyData: {
        time: Date;
        speed: number;
        direction: number;
        gust: number;
      }[] = [];

      windSpeedData.forEach((windSpeed) => {
        if (typeof windSpeed.validTime !== "string") {
          throw new Error("Invalid validTime in wind speed data");
        }

        const [startTimeStr, durationStr] = windSpeed.validTime.split("/");
        const startTime = new Date(startTimeStr);
        const durationHours = parseISO8601Duration(durationStr);

        for (let i = 0; i < durationHours; i++) {
          const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);
          if (time >= now && time <= twentyFourHoursLater) {
            const direction =
              windDirectionData.find((dir) => {
                const dirStartTime = new Date(dir.validTime.split("/")[0]);
                const dirEndTime = new Date(
                  dirStartTime.getTime() +
                    parseISO8601Duration(dir.validTime.split("/")[1]) *
                      60 *
                      60 *
                      1000
                );
                return time >= dirStartTime && time < dirEndTime;
              })?.value || 0;

            const gust =
              windGustData.find((g) => {
                const gustStartTime = new Date(g.validTime.split("/")[0]);
                const gustEndTime = new Date(
                  gustStartTime.getTime() +
                    parseISO8601Duration(g.validTime.split("/")[1]) *
                      60 *
                      60 *
                      1000
                );
                const isWithinRange =
                  time >= gustStartTime && time < gustEndTime;
                return isWithinRange;
              })?.value || windSpeed.value;

            hourlyData.push({
              time,
              speed: windSpeed.value * 0.62137119, // Convert km/h to mph
              direction,
              gust: gust * 0.62137119, // Convert km/h to mph
            });
          }
        }
      });

      return hourlyData.map((data) => ({
        time: data.time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        speed: data.speed,
        direction: data.direction,
        gust: data.gust,
      }));
    } catch (error) {
      console.error("Error processing wind data:", error);
      setError(
        `Error processing wind data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  };

  const windData = processWindData();

  return (
    <AppContainer>
      <TitleContainer>
        <MainTitle>Swell Conditions</MainTitle>
        <LocationInfo>
          {location} {coordinates}
        </LocationInfo>
        <GearIcon role="img" aria-label="Settings">
          ⚙️
        </GearIcon>
      </TitleContainer>
      {loading && <ForecastInfo>Loading weather data...</ForecastInfo>}
      {error && <ForecastInfo>Error: {error}</ForecastInfo>}
      {!loading && !error && closestTemperature && closestWind && (
        <ForecastInfo>
          <p>Temperature: {closestTemperature.value.toFixed(1)}°C</p>
          <p>Wind Speed: {closestWind.value.toFixed(1)} m/s</p>
        </ForecastInfo>
      )}
      {!loading && !error && windData.length > 0 && (
        <WindGraphContainer>
          <WindGraph data={windData} />
        </WindGraphContainer>
      )}
    </AppContainer>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
