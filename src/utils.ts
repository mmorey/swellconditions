// Utility functions

export const parseISO8601Duration = (duration: string): number => {
  const matches = duration.match(/PT(\d+)H/);
  return matches ? parseInt(matches[1], 10) : 0;
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
  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

export const getWindArrow = (degrees: number): string => {
  const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
  const index = Math.round(degrees / 45) % 8;
  return arrows[index];
};
