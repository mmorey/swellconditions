import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BrowserRouter, useSearchParams } from 'react-router-dom';
import { WeatherData } from './APIClients/WeatherGovTypes';
import WindGraph from './components/WindGraph';
import { fetchWeatherData, getDebugCSVContent } from './APIClients/WeatherGovAPI';
import { fetchWaterTemperatureData, findClosestTideStation, fetchWaterLevel } from './APIClients/TidesAndCurrentsGovAPI';
import { TidesAndCurrentsGovWaterTemperatureAPIResponse, WaterLevelData } from './APIClients/TidesAndCurrentsGovTypes';
import { fetchLatestStations } from './APIClients/CDIPAPI';
import CurrentConditions from './components/CurrentConditions';
import SunInformation from './components/SunInformation';
import WaterTemperatureGraph from './components/WaterTemperatureGraph';
import TideGraph from './components/TideGraph';

// Debug flag
const DEBUG_MODE = false;

const AppContainer = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const TitleContainer = styled.div`
  width: 100%;
  text-align: center;
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
  right: 10px;
  top: 10px;
  font-size: 24px;
  cursor: pointer;
`;

const ErrorInfo = styled.div`
  margin: 10px;
  padding: 10px;
  background-color: ${(props) => props.theme.colors.text.error};
  border-radius: 5px;
  font-size: 14px;
  text-align: center;
`;

const PlaceholderContainer = styled.div`
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 15px;
  width: 85%;
  border-radius: 10px;
  text-align: center;
`;

const DownloadLink = styled.a`
  display: block;
  text-align: center;
  color: ${(props) => props.theme.colors.text.link};
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const AppContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const latitude = parseFloat(searchParams.get('lat') || '37.7749');
  const longitude = parseFloat(searchParams.get('lon') || '-122.4194');
  const [tideStation, setTideStation] = useState<string | null>(searchParams.get('tideStation'));
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [waterTempData, setWaterTempData] = useState<TidesAndCurrentsGovWaterTemperatureAPIResponse | null>(null);
  const [waterLevelData, setWaterLevelData] = useState<WaterLevelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvDataUrl, setCsvDataUrl] = useState<string | null>(null);

  const coordinates = `(${latitude}, ${longitude})`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const weatherPromise = fetchWeatherData(latitude, longitude);

        let selectedTideStation = tideStation;
        if (!selectedTideStation) {
          selectedTideStation = await findClosestTideStation(latitude, longitude);
          setTideStation(selectedTideStation);
        }

        const waterTempPromise = fetchWaterTemperatureData(selectedTideStation);
        const waterLevelPromise = fetchWaterLevel(selectedTideStation);
        const cdipStationsPromise = fetchLatestStations();

        const [weatherResult, waterTempResult, waterLevelResult, cdipStations] = await Promise.all([weatherPromise, waterTempPromise, waterLevelPromise, cdipStationsPromise]);

        console.log('CDIP Stations:', cdipStations);

        setWeatherData(weatherResult);
        setWaterTempData(waterTempResult);
        setWaterLevelData(waterLevelResult);
      } catch (e) {
        setError(`Failed to fetch data: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [latitude, longitude, tideStation]);

  useEffect(() => {
    if (DEBUG_MODE && weatherData) {
      const csvContent = getDebugCSVContent(weatherData);
      if (csvContent) {
        const encodedCsv = encodeURIComponent(csvContent);
        setCsvDataUrl(`data:text/csv;charset=utf-8,${encodedCsv}`);
      }
    }
  }, [weatherData]);

  return (
    <AppContainer>
      <TitleContainer>
        <MainTitle>Swell Conditions</MainTitle>
        <LocationInfo>
          {weatherData ? `${weatherData.city}, ${weatherData.state}` : 'Loading...'} {coordinates}
        </LocationInfo>
        <GearIcon role="img" aria-label="Settings">
          ⚙️
        </GearIcon>
      </TitleContainer>
      <SunInformation latitude={latitude} longitude={longitude} />
      {loading && <PlaceholderContainer>Loading data...</PlaceholderContainer>}
      {error && <ErrorInfo>{error}</ErrorInfo>}
      {!loading && !error && weatherData && waterTempData ? (
        <>
          <CurrentConditions weatherData={weatherData} queriedLat={latitude} queriedLon={longitude} />
          <WindGraph weatherData={weatherData} />
          {waterLevelData && <TideGraph waterLevelData={waterLevelData} />}
          <WaterTemperatureGraph waterTemperatureData={waterTempData} />
          {DEBUG_MODE && csvDataUrl && (
            <DownloadLink href={csvDataUrl} download="weather_data.csv">
              Download Debug CSV
            </DownloadLink>
          )}
        </>
      ) : (
        <>
          <PlaceholderContainer>Current conditions unavailable</PlaceholderContainer>
          <PlaceholderContainer>Wind graph unavailable</PlaceholderContainer>
          <PlaceholderContainer>Tide graph unavailable</PlaceholderContainer>
          <PlaceholderContainer>Water temperature graph unavailable</PlaceholderContainer>
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
