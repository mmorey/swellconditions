import React from 'react';
import styled from 'styled-components';
import { WeatherData } from '../APIClients/WeatherGovTypes';
import { convertTemperature, convertWindSpeed, getWindDirection, getWindArrow, calculateDistance, getDirection, formatTimeAgo } from '../utils';

const CurrentConditionsContainer = styled.div`
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
`;

const StationsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
`;

const Title = styled.h2`
  text-align: center;
  font-size: ${(props) => props.theme.fonts.secondary.size};
  color: ${(props) => props.theme.colors.text.primary};
  margin: 0;
`;

const StationContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  font-size: ${(props) => props.theme.fonts.primary.size};
  font-weight: bold;
`;

const WindGust = styled.div`
  font-size: ${(props) => props.theme.fonts.secondary.size};
  margin-top: 5px;
`;

const WindDirection = styled.div`
  font-size: ${(props) => props.theme.fonts.secondary.size};
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
  font-size: ${(props) => props.theme.fonts.secondary.size};
  color: ${(props) => props.theme.colors.text.secondary};
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  font-size: ${(props) => props.theme.fonts.secondary.size};
`;

const StationDivider = styled.hr`
  width: 100%;
  border: none;
  border-top: 1px solid ${(props) => props.theme.colors.text.secondary};
  opacity: 0.2;
  margin: 0;
`;

interface CurrentConditionsProps {
  weatherData: WeatherData;
  queriedLat: number;
  queriedLon: number;
}

const CurrentConditions: React.FC<CurrentConditionsProps> = ({ weatherData, queriedLat, queriedLon }) => {
  return (
    <CurrentConditionsContainer>
      <Title>Current Weather Conditions</Title>
      <StationsContainer>
        {weatherData.stations.map((station, index) => (
          <React.Fragment key={station.current.stationIdentifier}>
            {index > 0 && <StationDivider />}
            <StationContainer>
              <CurrentConditionsRow>
                <ConditionColumn>
                  <LargeValue>{convertTemperature(station.current.properties.temperature.value, station.current.properties.temperature.unitCode).toFixed(1)} °F</LargeValue>
                </ConditionColumn>
                <ConditionColumn>
                  <LargeValue>{convertWindSpeed(station.current.properties.windSpeed.value, station.current.properties.windSpeed.unitCode).toFixed(1)} mph</LargeValue>
                  <WindGust>{convertWindSpeed(station.current.properties.windGust.value, station.current.properties.windGust.unitCode).toFixed(1)} mph gust</WindGust>
                  <WindDirection>
                    {getWindDirection(station.current.properties.windDirection.value)}
                    <WindArrow $rotation={station.current.properties.windDirection.value}>{getWindArrow(station.current.properties.windDirection.value).arrow}</WindArrow>
                  </WindDirection>
                </ConditionColumn>
              </CurrentConditionsRow>
              <ObservationTime>
                {(() => {
                  const [stationLon, stationLat] = station.current.geometry.coordinates;
                  const distance = Math.round(calculateDistance(queriedLat, queriedLon, stationLat, stationLon));
                  const direction = getDirection(queriedLat, queriedLon, stationLat, stationLon);
                  const timeAgo = formatTimeAgo(station.current.properties.timestamp);
                  const stationName = station.current.name.length > 20 ? station.current.name.substring(0, 20).trim() + '...' : station.current.name;
                  return `Observed ${distance} mi ${direction} at ${stationName} ${timeAgo}`;
                })()}
              </ObservationTime>
            </StationContainer>
          </React.Fragment>
        ))}
      </StationsContainer>
    </CurrentConditionsContainer>
  );
};

export default CurrentConditions;
