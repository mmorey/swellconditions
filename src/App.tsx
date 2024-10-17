import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BrowserRouter, useSearchParams } from 'react-router-dom';
import { WeatherData } from './APIClients/WeatherGovTypes';
import WindGraph from './WindGraph';
import { fetchWeatherData, processWeatherGovWindData } from './APIClients/WeatherGovAPI';
import CurrentConditions from './components/CurrentConditions';

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

  const windData = processWeatherGovWindData(weatherData);

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
          <CurrentConditions weatherData={weatherData} />
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
