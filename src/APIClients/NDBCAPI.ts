import { NDBCStation, NDBCStationsResponse, NDBCLatestObservation, SpectralWaveData, SpectralDataPoint, SwellComponent } from './NDBCTypes';
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

function zeroSpectralMoment(energy: number, bandwidth: number): number {
  return energy * bandwidth;
}

// function secondSpectralMoment(energy: number, bandwidth: number, frequency: number): number {
//   return energy * bandwidth * (frequency * frequency);
// }

function degreeToDirection(degree: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degree + 360) % 360) / 22.5) % 16;
  return directions[index];
}

function peakDetect(values: number[], delta: number): [number[], number[], number[], number[]] {
  const minIndexes: number[] = [];
  const minValues: number[] = [];
  const maxIndexes: number[] = [];
  const maxValues: number[] = [];

  let mn = Infinity;
  let mx = -Infinity;
  let mnPos = NaN;
  let mxPos = NaN;
  let lookForMax = true;

  for (let i = 0; i < values.length; i++) {
    const current = values[i];

    if (current > mx) {
      mx = current;
      mxPos = i;
    }
    if (current < mn) {
      mn = current;
      mnPos = i;
    }

    if (lookForMax) {
      if (current < mx - delta) {
        maxIndexes.push(mxPos);
        maxValues.push(mx);
        mn = current;
        mnPos = i;
        lookForMax = false;
      }
    } else {
      if (current > mn + delta) {
        minIndexes.push(mnPos);
        minValues.push(mn);
        mx = current;
        mxPos = i;
        lookForMax = true;
      }
    }
  }

  return [minIndexes, minValues, maxIndexes, maxValues];
}

function calculateSwellComponents(spectralData: SpectralDataPoint[]): SwellComponent[] {
  if (spectralData.length === 0) return [];

  const energyValues = spectralData.map((point) => point.energy);
  const [minIndexes, , maxIndexes, maxValues] = peakDetect(energyValues, 0.05);

  const components: SwellComponent[] = [];
  let prevIndex = 0;

  for (let i = 0; i < maxValues.length; i++) {
    const minIndex = i >= minIndexes.length ? spectralData.length : minIndexes[i];
    let zeroMoment = 0;

    for (let j = prevIndex; j < minIndex; j++) {
      const bandwidth = j > 0 ? Math.abs(spectralData[j].frequency - spectralData[j - 1].frequency) : Math.abs(spectralData[j + 1].frequency - spectralData[j].frequency);

      zeroMoment += zeroSpectralMoment(spectralData[j].energy, bandwidth);
    }

    const WATER_DENSITY = 1025; // kg/m³ (seawater)
    const GRAVITY = 9.81; // m/s²

    const waveHeight = 4.0 * Math.sqrt(zeroMoment);
    const wavePeriod = 1.0 / spectralData[maxIndexes[i]].frequency;
    const maxEnergyJoules = (1 / 16) * WATER_DENSITY * GRAVITY * waveHeight * waveHeight;
    // const maxEnergyJoules = wavePeriod * waveHeight * waveHeight;

    const component: SwellComponent = {
      waveHeight: waveHeight,
      period: wavePeriod,
      direction: spectralData[maxIndexes[i]].angle,
      compassDirection: degreeToDirection(spectralData[maxIndexes[i]].angle),
      maxEnergy: maxValues[i],
      maxEnergyJoules: maxEnergyJoules,
      frequencyIndex: maxIndexes[i],
    };

    components.push(component);
    prevIndex = minIndex;
  }

  return components.sort((a, b) => b.maxEnergy - a.maxEnergy);
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

  const stations: NDBCStation[] = Array.from(xmlDoc.querySelectorAll('station')).map((station) => {
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

export async function getClosestStations(latitude: number, longitude: number): Promise<NDBCStation[]> {
  const response = await getActiveStations();

  // Calculate distance and direction for each station
  const stationsWithDistanceAndDirection = response.stations.map((station) => ({
    ...station,
    distance: calculateDistance(latitude, longitude, station.lat, station.lon),
    direction: getDirection(latitude, longitude, station.lat, station.lon),
  }));

  // Sort by distance and get top 3 stations
  const closestStations = stationsWithDistanceAndDirection.sort((a, b) => a.distance - b.distance).slice(0, 3);

  // Get station IDs for the closest stations
  const stationIds = closestStations.map((station) => station.id);

  // Fetch the stations with spectral data
  return fetchSpecificNDBCStations(stationIds, latitude, longitude);
}

export async function fetchSpecificNDBCStations(stationNumbers: string[], latitude: number, longitude: number): Promise<NDBCStation[]> {
  const allStations = await getActiveStations();

  // Fetch spectral data for all stations in parallel
  const spectralDataPromises = stationNumbers.map((stationId) => fetchRawSpectralWaveData(stationId));
  const spectralDataResults = await Promise.all(spectralDataPromises);

  // Create a map of station IDs to their spectral data
  const spectralDataMap = new Map(stationNumbers.map((id, index) => [id, spectralDataResults[index]]));

  return allStations.stations
    .filter((station) => stationNumbers.includes(station.id))
    .map((station) => ({
      ...station,
      distance: calculateDistance(latitude, longitude, station.lat, station.lon),
      direction: getDirection(latitude, longitude, station.lat, station.lon),
      spectralWaveData: spectralDataMap.get(station.id) || undefined,
    }));
}

export async function fetchRawSpectralWaveData(stationID: string): Promise<SpectralWaveData | null> {
  const [specResponse, dirResponse] = await Promise.all([
    fetch(`https://corsproxy.io/?https://www.ndbc.noaa.gov/data/realtime2/${stationID}.data_spec`),
    fetch(`https://corsproxy.io/?https://www.ndbc.noaa.gov/data/realtime2/${stationID}.swdir`),
  ]);

  const [specText, dirText] = await Promise.all([specResponse.text(), dirResponse.text()]);

  const specLines = specText.split('\n');
  const dirLines = dirText.split('\n');

  // Find the first non-header lines
  const specDataLine = specLines.find((line) => line.trim() && !line.startsWith('#'));
  const dirDataLine = dirLines.find((line) => line.trim() && !line.startsWith('#'));

  if (!specDataLine || !dirDataLine) return null;

  const specParts = specDataLine.trim().split(/\s+/);
  const dirParts = dirDataLine.trim().split(/\s+/);

  if (specParts.length < 6 || dirParts.length < 6) return null;

  // Parse timestamp from spec data (first 5 columns)
  const timestamp = new Date(
    Date.UTC(
      parseInt(specParts[0]), // year
      parseInt(specParts[1]) - 1, // month (0-based)
      parseInt(specParts[2]), // day
      parseInt(specParts[3]), // hour
      parseInt(specParts[4]) // minute
    )
  );

  const separationFrequency = parseFloat(specParts[5]);

  // Parse spectral data and direction data (remaining columns)
  const spectralDataSection = specParts.slice(6).join(' ');
  const directionDataSection = dirParts.slice(5).join(' ');
  const spectralData: SpectralDataPoint[] = [];

  const specRegex = /([\d.]+)\s*\(([\d.]+)\)/g;
  const dirRegex = /([\d.]+)\s*\(([\d.]+)\)/g;

  let specMatch;
  let dirMatch;
  while ((specMatch = specRegex.exec(spectralDataSection)) !== null && (dirMatch = dirRegex.exec(directionDataSection)) !== null) {
    // Verify the frequencies match
    if (specMatch[2] === dirMatch[2]) {
      spectralData.push({
        energy: parseFloat(specMatch[1]),
        frequency: parseFloat(specMatch[2]),
        angle: parseFloat(dirMatch[1]),
      });
    }
  }

  // Calculate swell components from spectral data
  const swellComponents = calculateSwellComponents(spectralData);

  return {
    timestamp,
    separationFrequency,
    spectralData,
    swellComponents,
  };
}
