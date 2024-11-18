import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { BrowserRouter, useSearchParams, useNavigate } from 'react-router-dom';
import { WeatherData } from './APIClients/WeatherGovTypes';
import { CDIPStation as CDIPStationType } from './APIClients/CDIPTypes';
import { NDBCStation } from './APIClients/NDBCTypes';
import WindGraph from './components/WindGraph';
import { fetchWeatherData, getDebugCSVContent } from './APIClients/WeatherGovAPI';
import { fetchTideData } from './APIClients/TidesAndCurrentsGovAPI';
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
import CDIPClassicSwellModelLocal from './components/CDIPClassicSwellModelLocal';
import { calculateDistance, getDirection } from './utils';
import SatelliteViewer from './components/SatelliteViewer';
import AFD from './components/AFD';
import SRF from './components/SRF';
import VideoPlayer from './components/VideoPlayer';
import LocationInput from './components/LocationInput';

// Debug flag
const DEBUG_MODE = false;

const AppContainer = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 600px;
  margin: 0 auto;
`;

const HeaderContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const TitleContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: center;
`;

const Logo = styled.img`
  width: 24px;
  height: 24px;
  display: block;

  @media (prefers-color-scheme: dark) {
    filter: invert(1);
  }
`;

const MainTitle = styled.h1`
  font-size: 24px;
  line-height: 24px;
  margin: 0 0 0 8px;
`;

const LocationInfo = styled.h2`
  margin: 8px 0 0 0;
  font-size: 18px;
  font-weight: normal;
  text-align: center;
  color: ${(props) => props.theme.colors.text.secondary};
`;

const SettingsIcon = styled.img`
  width: 24px;
  height: 24px;
  cursor: pointer;

  @media (prefers-color-scheme: dark) {
    filter: invert(1);
  }
`;

const ErrorInfo = styled.div`
  margin: 10px;
  padding: 10px;
  background-color: ${(props) => props.theme.colors.text.error};
  border-radius: 5px;
  font-size: 14px;
  text-align: center;
`;

const LoadingInfo = styled.div`
  margin: 5px;
  padding: 8px;
  background-color: ${(props) => props.theme.colors.backgroundLight};
  border-radius: 5px;
  font-size: 14px;
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
  const navigate = useNavigate();
  const urlLat = searchParams.get('lat');
  const urlLon = searchParams.get('lon');

  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const latitude = urlLat ? parseFloat(urlLat) : null;
  const longitude = urlLon ? parseFloat(urlLon) : null;

  const nwsstation = searchParams.get('nwsstation');
  const cdipParam = searchParams.get('cdip');
  const ndbcParam = searchParams.get('ndbc');
  const videoUrl = searchParams.get('videourl');
  const rotationInterval = searchParams.get('videorotation');

  const [tideStation, setTideStation] = useState<string | null>(searchParams.get('tideStation'));
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [waterTempData, setWaterTempData] = useState<TidesAndCurrentsGovWaterTemperatureAPIResponse | null>(null);
  const [waterLevelData, setWaterLevelData] = useState<WaterLevelData | null>(null);
  const [cdipStations, setCdipStations] = useState<CDIPStationType[]>([]);
  const [ndbcStations, setNdbcStations] = useState<NDBCStation[]>([]);

  const [weatherLoading, setWeatherLoading] = useState(false);
  const [tidesLoading, setTidesLoading] = useState(false);
  const [cdipLoading, setCdipLoading] = useState(false);
  const [ndbcLoading, setNdbcLoading] = useState(false);

  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [tidesError, setTidesError] = useState<string | null>(null);
  const [cdipError, setCdipError] = useState<string | null>(null);
  const [ndbcError, setNdbcError] = useState<string | null>(null);

  const [csvDataUrl, setCsvDataUrl] = useState<string | null>(null);

  const handleUseLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lon = position.coords.longitude.toFixed(4);
        navigate(`?lat=${lat}&lon=${lon}`);
        setIsGettingLocation(false);
      },
      (error) => {
        setLocationError(`Error getting location: ${error.message}`);
        setIsGettingLocation(false);
      }
    );
  };

  const handleSubmitCoordinates = () => {
    // Clear any previous error first
    setLocationError(null);

    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setLocationError('Please enter valid coordinates (latitude: -90 to 90, longitude: -180 to 180)');
      return;
    }

    navigate(`?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!latitude || !longitude) return;

      // Reset errors
      setWeatherError(null);
      setTidesError(null);
      setCdipError(null);
      setNdbcError(null);

      // Weather data
      setWeatherLoading(true);
      try {
        const weatherResult = await fetchWeatherData(latitude, longitude, nwsstation);
        setWeatherData(weatherResult);
      } catch (e) {
        setWeatherError(`Failed to fetch weather data: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setWeatherLoading(false);
      }

      // Tide data
      setTidesLoading(true);
      try {
        const tideData = await fetchTideData(latitude, longitude, tideStation || undefined);
        setTideStation(tideData.stationId);
        setWaterTempData(tideData.waterTemperature);
        setWaterLevelData(tideData.waterLevel);
      } catch (e) {
        setTidesError(`Failed to fetch tide data: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setTidesLoading(false);
      }

      // CDIP stations
      if (cdipParam) {
        setCdipLoading(true);
        try {
          const cdipStationsResult = await fetchSpecificStations(cdipParam.split(','));
          setCdipStations(cdipStationsResult);
        } catch (e) {
          setCdipError(`Failed to fetch CDIP stations: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
          setCdipLoading(false);
        }
      }

      // NDBC stations
      setNdbcLoading(true);
      try {
        if (ndbcParam) {
          const requestedStationIds = ndbcParam.split(',');
          const ndbcStationsResult = await fetchSpecificNDBCStations(requestedStationIds, latitude, longitude);
          // Sort the stations to match the order in the URL parameter
          const sortedStations = requestedStationIds.map((id) => ndbcStationsResult.find((station) => station.id === id)).filter((station): station is NDBCStation => station !== undefined);
          setNdbcStations(sortedStations);
        } else {
          const ndbcStationsResult = await getClosestStations(latitude, longitude);
          setNdbcStations(ndbcStationsResult);
        }
      } catch (e) {
        setNdbcError(`Failed to fetch NDBC stations: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setNdbcLoading(false);
      }
    };

    fetchData();
  }, [latitude, longitude, tideStation, cdipParam, ndbcParam, nwsstation]);

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
          distance: calculateDistance(latitude || 0, longitude || 0, station.latitude, station.longitude),
          direction: getDirection(latitude || 0, longitude || 0, station.latitude, station.longitude),
        }))
      : [];

  const ndbcStationsToDisplay = ndbcStations;

  if (!latitude || !longitude) {
    return (
      <AppContainer>
        <HeaderContainer>
          <TitleContainer>
            <TitleGroup>
              <Logo src="/logo.svg" alt="Swell Conditions Logo" />
              <MainTitle>Swell Conditions</MainTitle>
            </TitleGroup>
            <SettingsIcon src="/settings.svg" alt="Settings" />
          </TitleContainer>
        </HeaderContainer>

        <LocationInput
          manualLat={manualLat}
          manualLon={manualLon}
          locationError={locationError}
          isGettingLocation={isGettingLocation}
          onLatChange={setManualLat}
          onLonChange={setManualLon}
          onSubmitCoordinates={handleSubmitCoordinates}
          onUseLocation={handleUseLocation}
        />
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <HeaderContainer>
        <TitleContainer>
          <TitleGroup>
            <Logo src="/logo.svg" alt="Swell Conditions Logo" />
            <MainTitle>Swell Conditions</MainTitle>
          </TitleGroup>
          <SettingsIcon src="/settings.svg" alt="Settings" />
        </TitleContainer>
        <LocationInfo>
          {weatherData ? `${weatherData.city}, ${weatherData.state}` : 'Loading...'} ({latitude}, {longitude})
        </LocationInfo>
      </HeaderContainer>

      {/* Loading and error states */}
      {weatherLoading && <LoadingInfo>Loading Weather...</LoadingInfo>}
      {weatherError && <ErrorInfo>{weatherError}</ErrorInfo>}

      {tidesLoading && <LoadingInfo>Loading Tides...</LoadingInfo>}
      {tidesError && <ErrorInfo>{tidesError}</ErrorInfo>}

      {cdipLoading && <LoadingInfo>Loading CDIP Stations...</LoadingInfo>}
      {cdipError && <ErrorInfo>{cdipError}</ErrorInfo>}

      {ndbcLoading && <LoadingInfo>Loading NDBC Stations...</LoadingInfo>}
      {ndbcError && <ErrorInfo>{ndbcError}</ErrorInfo>}

      {videoUrl && <VideoPlayer playlistUrl={videoUrl} rotationInterval={rotationInterval ? parseInt(rotationInterval) : undefined} />}

      {/* NDBC stations */}
      {!ndbcLoading && !ndbcError && ndbcStationsToDisplay.map((station) => <NDBCStationComponent key={station.id} station={station} />)}

      {/* CDIP Model Image components */}
      <CDIPClassicSwellModel latitude={latitude} longitude={longitude} />
      <CDIPClassicSwellModelLocal latitude={latitude} longitude={longitude} />

      {/* Tide-dependent components */}
      {!tidesLoading && !tidesError && waterTempData && (
        <>
          {waterLevelData && <TideGraph waterLevelData={waterLevelData} />}
          <WaterTemperatureGraph waterTemperatureData={waterTempData} />
        </>
      )}

      <SunInformation latitude={latitude} longitude={longitude} />

      {/* Weather-dependent components */}
      {!weatherLoading && !weatherError && weatherData && (
        <>
          <CurrentConditions weatherData={weatherData} queriedLat={latitude} queriedLon={longitude} />
          <WindGraph weatherData={weatherData} />
          {weatherData.afd && <AFD afd={weatherData.afd.text} wfo={weatherData.cwa} timestamp={weatherData.afd.timestamp} />}
          {weatherData.srf && <SRF srf={weatherData.srf.text} wfo={weatherData.cwa} timestamp={weatherData.srf.timestamp} simpleFormat={true} />}
          <SatelliteViewer weatherOfficeCode={weatherData.cwa} />
        </>
      )}

      {/* CDIP stations */}
      {!cdipLoading &&
        !cdipError &&
        stationsToDisplay.map(({ station, distance, direction }) => <CDIPStation key={station.station_number} station={station} distance={distance} direction={direction} />)}

      {DEBUG_MODE && csvDataUrl && (
        <DownloadLink href={csvDataUrl} download="weather_data.csv">
          Download Debug CSV
        </DownloadLink>
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
