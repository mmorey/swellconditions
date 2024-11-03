// Base URL for NDBC data
const baseURL = 'https://www.ndbc.noaa.gov/data/realtime2/';

// Define 9 bands for period ranges in seconds
const bands = [
  { range: [22, Infinity], energy: 0, direction: 0, directionCount: 0 },
  { range: [18, 22], energy: 0, direction: 0, directionCount: 0 },
  { range: [16, 18], energy: 0, direction: 0, directionCount: 0 },
  { range: [14, 16], energy: 0, direction: 0, directionCount: 0 },
  { range: [12, 14], energy: 0, direction: 0, directionCount: 0 },
  { range: [10, 12], energy: 0, direction: 0, directionCount: 0 },
  { range: [8, 10], energy: 0, direction: 0, directionCount: 0 },
  { range: [6, 8], energy: 0, direction: 0, directionCount: 0 },
  { range: [2, 6], energy: 0, direction: 0, directionCount: 0 },
];

async function fetchData(station) {
  // Define URLs for required files
  const urls = {
    data_spec: `${baseURL}${station}.data_spec`,
    alpha1: `${baseURL}${station}.swdir`,
    alpha2: `${baseURL}${station}.swdir2`,
    r1: `${baseURL}${station}.swr1`,
    r2: `${baseURL}${station}.swr2`,
  };

  try {
    // Fetch and split data files concurrently
    const [dataSpec, alpha1, alpha2, r1, r2] = await Promise.all(
      Object.values(urls).map((url) =>
        fetch(url)
          .then((res) => res.text())
          .then((data) => data.split('\n'))
      )
    );

    // Helper function to find the first non-comment line and extract timestamp
    const findMostRecentDataLineAndTimestamp = (data) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].trim() && !data[i].startsWith('#')) {
          const columns = data[i].trim().split(/\s+/);
          const timestamp = new Date(
            Date.UTC(
              parseInt(columns[0]), // Year (already 4 digits)
              parseInt(columns[1]) - 1, // Month (0-indexed)
              parseInt(columns[2]), // Day
              parseInt(columns[3]), // Hour
              parseInt(columns[4]) // Minute
            )
          ).toISOString();
          return { line: data[i], timestamp };
        }
      }
      return { line: null, timestamp: null };
    };

    // Extract the most recent line and timestamp for each file
    const { line: mostRecentDataSpec, timestamp: dataSpecTimestamp } = findMostRecentDataLineAndTimestamp(dataSpec);
    const { line: mostRecentAlpha1, timestamp: alpha1Timestamp } = findMostRecentDataLineAndTimestamp(alpha1);
    const { line: mostRecentAlpha2, timestamp: alpha2Timestamp } = findMostRecentDataLineAndTimestamp(alpha2);
    const { line: mostRecentR1, timestamp: r1Timestamp } = findMostRecentDataLineAndTimestamp(r1);
    const { line: mostRecentR2, timestamp: r2Timestamp } = findMostRecentDataLineAndTimestamp(r2);

    // Consolidate timestamps at the root level
    const timestamps = {
      data_spec: dataSpecTimestamp,
      alpha1: alpha1Timestamp,
      alpha2: alpha2Timestamp,
      r1: r1Timestamp,
      r2: r2Timestamp,
    };

    // Process spectral density for energy using only the most recent data_spec line
    if (mostRecentDataSpec) {
      const spectralDataSection = mostRecentDataSpec.trim().split(/\s+/).slice(6).join(' ');

      // Match all "value (frequency)" pairs in the spectral data section
      const regex = /([\d.]+)\s*\(([\d.]+)\)/g;
      let match;
      let previousFrequency = null;

      while ((match = regex.exec(spectralDataSection)) !== null) {
        const spectralValue = parseFloat(match[1]);
        const frequency = parseFloat(match[2]);

        if (!isNaN(spectralValue) && !isNaN(frequency)) {
          const period = 1 / frequency;
          let bandWidth = 0;

          // Calculate band width based on adjacent frequency values
          if (previousFrequency !== null) {
            bandWidth = Math.abs(frequency - previousFrequency);
          }
          previousFrequency = frequency;

          // Accumulate the energy by adjusting for frequency band width
          bands.forEach((band) => {
            if (period >= band.range[0] && period < band.range[1]) {
              band.energy += spectralValue * bandWidth;
              console.log(`Period: ${period}  Energy: ${spectralValue * bandWidth}  Acc Energy: ${band.energy}  Band: ${band.range[0]} - ${band.range[1]}`);
            }
          });
        }
      }
    }

    // Process directional data to calculate mean directions using only the most recent alpha and r lines
    const parseDirectionalData = (line, startCol) => {
      const dataSection = line.trim().split(/\s+/).slice(startCol).join(' ');
      const regex = /([\d.]+)\s*\(([\d.]+)\)/g;
      const values = [];
      const frequencies = [];
      let match;

      while ((match = regex.exec(dataSection)) !== null) {
        values.push(parseFloat(match[1]));
        frequencies.push(parseFloat(match[2]));
      }
      return { values, frequencies };
    };

    const alpha1Data = parseDirectionalData(mostRecentAlpha1, 5).values;
    const alpha2Data = parseDirectionalData(mostRecentAlpha2, 5).values;
    const r1Data = parseDirectionalData(mostRecentR1, 5).values;
    const r2Data = parseDirectionalData(mostRecentR2, 5).values;

    for (let j = 0; j < alpha1Data.length; j++) {
      const frequency = 0.025 + 0.005 * j;
      const period = 1 / frequency;

      const alpha1Val = alpha1Data[j];
      const alpha2Val = alpha2Data[j];
      const r1Val = r1Data[j];
      const r2Val = r2Data[j];

      if (!isNaN(alpha1Val) && !isNaN(alpha2Val) && !isNaN(r1Val) && !isNaN(r2Val)) {
        const direction = (Math.atan2(alpha2Val * r1Val, alpha1Val * r2Val) * (180 / Math.PI) + 180) % 360;

        bands.forEach((band) => {
          if (period >= band.range[0] && period < band.range[1]) {
            band.direction += direction;
            band.directionCount += 1;
          }
        });
      }
    }

    // Calculate significant wave height, convert to feet, and average direction for each band
    const bandData = bands.map((band) => {
      const heightMeters = 4 * Math.sqrt(band.energy); // Calculate Hs for the entire band energy in meters
      const heightFeet = heightMeters * 3.28084; // Convert height to feet

      return {
        periodRange: `${band.range[0]}-${band.range[1]}`,
        energy: band.energy,
        heightMeters: heightMeters.toFixed(2),
        heightFeet: heightFeet.toFixed(2),
        direction: band.directionCount ? (band.direction / band.directionCount).toFixed(2) : null,
      };
    });

    // Final output with timestamps at the root level
    const output = { timestamps, bands: bandData };
    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error('Error fetching or processing data:', error);
  }
}

// Execute script with station number as argument
const station = process.argv[2];
if (station) {
  fetchData(station);
} else {
  console.error("Please provide a station number, e.g., 'node script.js 46232'");
}
