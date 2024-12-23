import { CDIPStation, CDIPResponse } from './CDIPTypes';

export async function fetchLatestStations(): Promise<CDIPStation[]> {
  const response = await fetch('https://raw.githubusercontent.com/mmorey/CDIPData/refs/heads/main/public/data/cdip_sccoos.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch CDIP data: ${response.status} ${response.statusText}`);
  }

  const data: CDIPResponse = await response.json();
  return data.data;
}

export async function fetchSpecificStations(stationNumbers: string[]): Promise<CDIPStation[]> {
  const allStations = await fetchLatestStations();
  return allStations.filter((station) => stationNumbers.includes(station.station_number));
}
