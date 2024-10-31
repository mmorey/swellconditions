import { NDBCStationType, NDBCStationsResponse, NDBCLatestObservation } from './NDBCTypes';
import { calculateDistance, getDirection } from '../utils';

function parseLatestObservations(text: string): Map<string, NDBCLatestObservation> {
  const lines = text.split('\n');
  const observations = new Map<string, NDBCLatestObservation>();

  // Skip the first two lines (headers)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 19) continue;

    const parseValue = (value: string) => (value === 'MM' ? null : parseFloat(value));

    // if (parts[0] === '46232') {
    //   console.log('Line: ', line);
    //   console.log('Parts: ', parts);
    // }

    const observation: NDBCLatestObservation = {
      timestamp: new Date(
        Date.UTC(
          parseInt(parts[3]), // year
          parseInt(parts[4]) - 1, // month (0-based)
          parseInt(parts[5]), // day
          parseInt(parts[6]), // hour
          parseInt(parts[7]) // minute
        )
      ),
      windDirection: parseValue(parts[8]),
      windSpeed: parseValue(parts[9]),
      gustSpeed: parseValue(parts[10]),
      waveHeight: parseValue(parts[11]),
      dominantWavePeriod: parseValue(parts[12]),
      averageWavePeriod: parseValue(parts[13]),
      meanWaveDirection: parseValue(parts[14]),
      pressure: parseValue(parts[15]),
      pressureTendency: parseValue(parts[16]),
      airTemp: parseValue(parts[17]),
      waterTemp: parseValue(parts[18]),
      dewPoint: parts.length > 19 ? parseValue(parts[19]) : null,
      visibility: parts.length > 20 ? parseValue(parts[20]) : null,
      tide: parts.length > 21 ? parseValue(parts[21]) : null,
    };

    // Convert ID to uppercase when storing
    observations.set(parts[0].toUpperCase(), observation);
  }

  return observations;
}

export async function getActiveStations(): Promise<NDBCStationsResponse> {
  const [stationsResponse, latestObsResponse] = await Promise.all([
    fetch('https://corsproxy.io/?https://www.ndbc.noaa.gov/activestations.xml'),
    fetch('https://corsproxy.io/?https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt'),
  ]);

  const [xmlText, latestObsText] = await Promise.all([stationsResponse.text(), latestObsResponse.text()]);

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const stationsElement = xmlDoc.querySelector('stations');
  if (!stationsElement) {
    throw new Error('Invalid XML response: missing stations element');
  }

  const latestObservations = parseLatestObservations(latestObsText);

  const stations: NDBCStationType[] = Array.from(xmlDoc.querySelectorAll('station')).map((station) => {
    const id = station.getAttribute('id') || '';
    // Convert ID to uppercase when looking up observations
    const latestObs = latestObservations.get(id.toUpperCase());

    return {
      id,
      lat: parseFloat(station.getAttribute('lat') || '0'),
      lon: parseFloat(station.getAttribute('lon') || '0'),
      elev: parseFloat(station.getAttribute('elev') || '0'),
      name: station.getAttribute('name') || '',
      owner: station.getAttribute('owner') || '',
      pgm: station.getAttribute('pgm') || '',
      type: station.getAttribute('type') || '',
      met: (station.getAttribute('met') || 'n') as 'y' | 'n',
      currents: (station.getAttribute('currents') || 'n') as 'y' | 'n',
      waterquality: (station.getAttribute('waterquality') || 'n') as 'y' | 'n',
      dart: (station.getAttribute('dart') || 'n') as 'y' | 'n',
      latestObservation: latestObs,
    };
  });

  return {
    created: stationsElement.getAttribute('created') || '',
    count: parseInt(stationsElement.getAttribute('count') || '0', 10),
    stations,
  };
}

export async function getClosestStations(latitude: number, longitude: number): Promise<NDBCStationType[]> {
  const response = await getActiveStations();

  // Calculate distance and direction for each station
  const stationsWithDistanceAndDirection = response.stations.map((station) => ({
    ...station,
    distance: calculateDistance(latitude, longitude, station.lat, station.lon),
    direction: getDirection(latitude, longitude, station.lat, station.lon),
  }));

  // Sort by distance and return top 3
  return stationsWithDistanceAndDirection.sort((a, b) => a.distance - b.distance).slice(0, 3);
}

export async function fetchSpecificNDBCStations(stationNumbers: string[], latitude: number, longitude: number): Promise<NDBCStationType[]> {
  const allStations = await getActiveStations();
  return allStations.stations
    .filter((station) => stationNumbers.includes(station.id))
    .map((station) => ({
      ...station,
      distance: calculateDistance(latitude, longitude, station.lat, station.lon),
      direction: getDirection(latitude, longitude, station.lat, station.lon),
    }));
}
