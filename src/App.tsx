import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BrowserRouter, useSearchParams } from 'react-router-dom';
import { WeatherData } from './APIClients/WeatherGovTypes';
import { CDIPStation as CDIPStationType } from './APIClients/CDIPTypes';
import { NDBCStation } from './APIClients/NDBCTypes';
import WindGraph from './components/WindGraph';
import { fetchWeatherData, getDebugCSVContent } from './APIClients/WeatherGovAPI';
import { fetchWaterTemperatureData, findClosestTideStation, fetchWaterLevel } from './APIClients/TidesAndCurrentsGovAPI';
import { TidesAndCurrentsGovWaterTemperatureAPIResponse, WaterLevelData } from './APIClients/TidesAndCurrentsGovTypes';
import { fetchSpecificStations } from './APIClients/CDIPAPI';
import { getClosestStations, fetchSpecificNDBCStations } from './APIClients/NDBCAPI';
import CurrentConditions from './components/CurrentConditions';
import CDIPStation from './components/CDIPStation';
import NDBCStationComponent from './components/NDBCStationComponent';
import SunInformation from './components/SunInformation';
import WaterTemperatureGraph from './components/WaterTemperatureGraph';
import TideGraph from './components/TideGraph';
import CDIPClassicSwellModel from './components/CDIPClassicSwellModel';
import { calculateDistance, getDirection } from './utils';
import SatelliteViewer from './components/SatelliteViewer';

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
  const [cdipStations, setCdipStations] = useState<CDIPStationType[]>([]);
  const [ndbcStations, setNdbcStations] = useState<NDBCStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvDataUrl, setCsvDataUrl] = useState<string | null>(null);

  const coordinates = `(${latitude}, ${longitude})`;
  const cdipParam = searchParams.get('cdip');
  const ndbcParam = searchParams.get('ndbc');

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

        // Only fetch CDIP stations if cdipParam exists
        const cdipStationsPromise = cdipParam
          ? fetchSpecificStations(cdipParam.split(',')) // This will work for both single station and comma-separated lists
          : Promise.resolve([]);

        const ndbcStationsPromise = ndbcParam ? fetchSpecificNDBCStations(ndbcParam.split(','), latitude, longitude) : getClosestStations(latitude, longitude);

        const [weatherResult, waterTempResult, waterLevelResult, cdipStationsResult, ndbcStationsResult] = await Promise.all([
          weatherPromise,
          waterTempPromise,
          waterLevelPromise,
          cdipStationsPromise,
          ndbcStationsPromise,
        ]);

        setWeatherData(weatherResult);
        setWaterTempData(waterTempResult);
        setWaterLevelData(waterLevelResult);
        setCdipStations(cdipStationsResult);
        setNdbcStations(ndbcStationsResult);
      } catch (e) {
        setError(`Failed to fetch data: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [latitude, longitude, tideStation, cdipParam, ndbcParam]);

  useEffect(() => {
    if (DEBUG_MODE && weatherData) {
      const csvContent = getDebugCSVContent(weatherData);
      if (csvContent) {
        const encodedCsv = encodeURIComponent(csvContent);
        setCsvDataUrl(`data:text/csv;charset=utf-8,${encodedCsv}`);
      }
    }
  }, [weatherData]);

  // Only process CDIP stations if cdipParam exists
  const stationsToDisplay =
    cdipParam && cdipStations.length > 0
      ? cdipStations.map((station) => ({
          station,
          distance: calculateDistance(latitude, longitude, station.latitude, station.longitude),
          direction: getDirection(latitude, longitude, station.latitude, station.longitude),
        }))
      : [];

  const ndbcStationsToDisplay = ndbcStations;

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
          {stationsToDisplay.map(({ station, distance, direction }) => (
            <CDIPStation key={station.station_number} station={station} distance={distance} direction={direction} />
          ))}
          {ndbcStationsToDisplay.map((station) => (
            <NDBCStationComponent key={station.id} station={station} />
          ))}
          <WindGraph weatherData={weatherData} />
          {waterLevelData && <TideGraph waterLevelData={waterLevelData} />}
          <WaterTemperatureGraph waterTemperatureData={waterTempData} />
          <CDIPClassicSwellModel latitude={latitude} longitude={longitude} />
          {DEBUG_MODE && csvDataUrl && (
            <DownloadLink href={csvDataUrl} download="weather_data.csv">
              Download Debug CSV
            </DownloadLink>
          )}
          <SatelliteViewer weatherOfficeCode={weatherData.cwa} />
        </>
      ) : (
        <>
          <PlaceholderContainer>Current conditions unavailable</PlaceholderContainer>
          {cdipParam && <PlaceholderContainer>CDIP stations unavailable</PlaceholderContainer>}
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
