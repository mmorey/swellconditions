import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BrowserRouter, useSearchParams } from 'react-router-dom';
import { WeatherData } from './APIClients/WeatherGovTypes';
import WindGraph from './WindGraph';
import { fetchWeatherData } from './APIClients/WeatherGovAPI';
import { parseISO8601Duration, convertTemperature, convertWindSpeed, getWindDirection, getWindArrow } from './utils';

const AppContainer = styled.div`
  background-color: #171717;
  min-height: 100vh;
  color: #ffffff;
`;

const TitleContainer = styled.div`
  width: 100%;
  color: #ffffff;
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

const CurrentConditions = styled.div`
  background-color: #1f1f1f;
  padding: 15px;
  margin: 20px auto;
  width: 85%;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
`;

const CurrentConditionsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const ConditionColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 50%;
`;

const LargeValue = styled.div`
  font-size: 24px;
  font-weight: bold;
`;

const WindGust = styled.div`
  font-size: 14px;
  margin-top: 5px;
`;

const WindDirection = styled.div`
  font-size: 14px;
  margin-top: 5px;
`;

const ObservationTime = styled.div`
  font-size: 12px;
  color: #999;
  text-align: center;
`;

const AppContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = searchParams.get('location') || 'San Francisco, CA';
  const latitude = searchParams.get('lat') || '37.7749';
  const longitude = searchParams.get('lon') || '-122.4194';
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coordinates = `(${latitude}, ${longitude})`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWeatherData(latitude, longitude);
        setWeatherData(data);
      } catch (e) {
        setError(`Failed to fetch weather data: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [latitude, longitude]);

  const processWindData = () => {
    if (!weatherData) return [];

    try {
      const now = new Date();
      const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const windSpeedData = weatherData.forecast.properties.windSpeed.values;
      if (!Array.isArray(windSpeedData)) {
        throw new Error('Wind speed data is not in the expected format');
      }

      const windDirectionData = weatherData.forecast.properties.windDirection?.values || [];
      const windGustData = weatherData.forecast.properties.windGust?.values || [];

      const hourlyData: {
        time: Date;
        speed: number;
        direction: number;
        gust: number;
      }[] = [];

      windSpeedData.forEach((windSpeed) => {
        if (typeof windSpeed.validTime !== 'string') {
          throw new Error('Invalid validTime in wind speed data');
        }

        const [startTimeStr, durationStr] = windSpeed.validTime.split('/');
        const startTime = new Date(startTimeStr);
        const durationHours = parseISO8601Duration(durationStr);

        for (let i = 0; i < durationHours; i++) {
          const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);
          if (time >= now && time <= twentyFourHoursLater) {
            const direction =
              windDirectionData.find((dir) => {
                const dirStartTime = new Date(dir.validTime.split('/')[0]);
                const dirEndTime = new Date(dirStartTime.getTime() + parseISO8601Duration(dir.validTime.split('/')[1]) * 60 * 60 * 1000);
                return time >= dirStartTime && time < dirEndTime;
              })?.value || 0;

            const gust =
              windGustData.find((g) => {
                const gustStartTime = new Date(g.validTime.split('/')[0]);
                const gustEndTime = new Date(gustStartTime.getTime() + parseISO8601Duration(g.validTime.split('/')[1]) * 60 * 60 * 1000);
                const isWithinRange = time >= gustStartTime && time < gustEndTime;
                return isWithinRange;
              })?.value || windSpeed.value;

            hourlyData.push({
              time,
              speed: convertWindSpeed(windSpeed.value, weatherData.forecast.properties.windSpeed.uom),
              direction,
              gust: convertWindSpeed(gust, weatherData.forecast.properties.windGust?.uom || 'wmoUnit:km_h-1'),
            });
          }
        }
      });

      return hourlyData.map((data) => ({
        time: data.time.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        speed: data.speed,
        direction: data.direction,
        gust: data.gust,
      }));
    } catch (error) {
      console.error('Error processing wind data:', error);
      setError(`Error processing wind data: ${error instanceof Error ? error.message : String(error)}`);
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
      {!loading && !error && weatherData && (
        <>
          <CurrentConditions>
            <CurrentConditionsRow>
              <ConditionColumn>
                <LargeValue>{convertTemperature(weatherData.current.properties.temperature.value, weatherData.current.properties.temperature.unitCode).toFixed(1)} °F</LargeValue>
              </ConditionColumn>
              <ConditionColumn>
                <LargeValue>{convertWindSpeed(weatherData.current.properties.windSpeed.value, weatherData.current.properties.windSpeed.unitCode).toFixed(1)} mph</LargeValue>
                <WindGust>{convertWindSpeed(weatherData.current.properties.windGust.value, weatherData.current.properties.windGust.unitCode).toFixed(1)} mph gust</WindGust>
                <WindDirection>
                  {getWindDirection(weatherData.current.properties.windDirection.value)} {getWindArrow(weatherData.current.properties.windDirection.value)}
                </WindDirection>
              </ConditionColumn>
            </CurrentConditionsRow>
            <ObservationTime>
              Observed at {weatherData.current.name} {Math.round((new Date().getTime() - new Date(weatherData.current.properties.timestamp).getTime()) / 60000)} minutes ago
            </ObservationTime>
          </CurrentConditions>
          <WindGraphContainer>
            <WindGraph data={windData} />
          </WindGraphContainer>
        </>
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
