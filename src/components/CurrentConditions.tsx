import React from 'react';
import styled from 'styled-components';
import { WeatherData } from '../APIClients/WeatherGovTypes';
import { convertTemperature, convertWindSpeed, getWindDirection, getWindArrow } from '../utils';

const CurrentConditionsContainer = styled.div`
  background-color: #1f1f1f;
  padding: 15px;
  margin: 20px auto;
  width: 85%;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
`;

const CurrentConditionsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const ConditionColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 50%;
`;

const LargeValue = styled.div`
  font-size: 24px;
  font-weight: bold;
`;

const WindGust = styled.div`
  font-size: 14px;
  margin-top: 5px;
`;

const WindDirection = styled.div`
  font-size: 14px;
  margin-top: 5px;
  display: flex;
  align-items: center;
`;

const WindArrow = styled.span<{ $rotation: number }>`
  display: inline-block;
  margin-left: 5px;
  transform: rotate(${(props) => props.$rotation}deg);
`;

const ObservationTime = styled.div`
  font-size: 2vw; // Responsive font size
  color: #999;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  @media (max-width: 768px) {
    font-size: 3vw; // Slightly larger font on smaller screens
  }
  @media (min-width: 1200px) {
    font-size: 24px; // Cap the font size for larger screens
  }
`;

interface CurrentConditionsProps {
  weatherData: WeatherData;
  queriedLat: number;
  queriedLon: number;
}

// Haversine formula to calculate distance between two points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Radius of the Earth in miles
  const toRadians = (degrees: number) => degrees * (Math.PI / 180);

  // Convert latitude and longitude from degrees to radians
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  // Haversine formula
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Distance in miles
  const distance = R * c;
  return distance;
};

// Function to determine the direction between two points
const getDirection = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
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

const CurrentConditions: React.FC<CurrentConditionsProps> = ({ weatherData, queriedLat, queriedLon }) => {
  const [stationLon, stationLat] = weatherData.current.geometry.coordinates;
  const distance = Math.round(calculateDistance(queriedLat, queriedLon, stationLat, stationLon));
  const direction = getDirection(queriedLat, queriedLon, stationLat, stationLon);

  return (
    <CurrentConditionsContainer>
      <CurrentConditionsRow>
        <ConditionColumn>
          <LargeValue>{convertTemperature(weatherData.current.properties.temperature.value, weatherData.current.properties.temperature.unitCode).toFixed(1)} °F</LargeValue>
        </ConditionColumn>
        <ConditionColumn>
          <LargeValue>{convertWindSpeed(weatherData.current.properties.windSpeed.value, weatherData.current.properties.windSpeed.unitCode).toFixed(1)} mph</LargeValue>
          <WindGust>{convertWindSpeed(weatherData.current.properties.windGust.value, weatherData.current.properties.windGust.unitCode).toFixed(1)} mph gust</WindGust>
          <WindDirection>
            {getWindDirection(weatherData.current.properties.windDirection.value)}
            <WindArrow $rotation={weatherData.current.properties.windDirection.value}>{getWindArrow(weatherData.current.properties.windDirection.value).arrow}</WindArrow>
          </WindDirection>
        </ConditionColumn>
      </CurrentConditionsRow>
      <ObservationTime>
        Observed {distance} miles {direction} at {weatherData.current.name} {Math.round((new Date().getTime() - new Date(weatherData.current.properties.timestamp).getTime()) / 60000)} minutes ago
      </ObservationTime>
    </CurrentConditionsContainer>
  );
};

export default CurrentConditions;
