// Utility functions
import { parse } from 'iso8601-duration';

export const parseISO8601Duration = (duration: string): number => {
  const parsedDuration = parse(duration);
  return parsedDuration.hours || 0;
};

export const convertTemperature = (value: number, unitCode: string): number => {
  if (unitCode === 'wmoUnit:degC') {
    return (value * 9) / 5 + 32; // Convert Celsius to Fahrenheit
  }
  return value; // Assume it's already in Fahrenheit
};

export const convertWindSpeed = (value: number, unitCode: string): number => {
  if (unitCode === 'wmoUnit:km_h-1') {
    return value * 0.62137119; // Convert km/h to mph
  }
  return value; // Assume it's already in mph
};

export const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

export const getWindArrow = (degrees: number): { arrow: string; rotation: number } => {
  return { arrow: '↓', rotation: degrees };
};

// Haversine formula to calculate distance between two points
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Radius of the Earth in miles
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance;
};

// Function to determine the direction between two points
export const getDirection = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  let direction = '';

  if (Math.abs(dLat) > Math.abs(dLon)) {
    direction += dLat > 0 ? 'N' : 'S';
  }

  if (Math.abs(dLon) > Math.abs(dLat)) {
    direction += dLon > 0 ? 'E' : 'W';
  }

  if (Math.abs(dLat) > 0 && Math.abs(dLon) > 0) {
    direction = (dLat > 0 ? 'N' : 'S') + (dLon > 0 ? 'E' : 'W');
  }

  return direction;
};

// Function to format timestamp to "X minutes ago"
export const formatTimeAgo = (timestamp: string): string => {
  // Parse CDIP timestamp format: mm.dd.YYYY-HH:MM:ss (UTC)
  const [datePart, timePart] = timestamp.split('-');
  const [month, day, year] = datePart.split('.');
  const [hours, minutes, seconds] = timePart.split(':');

  // Create date in UTC
  const date = new Date(
    Date.UTC(
      parseInt(year),
      parseInt(month) - 1, // JavaScript months are 0-based
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    )
  );

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) {
    return 'just now';
  } else if (diffInMinutes === 1) {
    return '1 minute ago';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInMinutes < 120) {
    return '1 hour ago';
  } else {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hours ago`;
  }
};
