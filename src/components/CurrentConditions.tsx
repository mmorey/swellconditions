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
  font-size: 12px;
  color: #999;
  text-align: center;
`;

interface CurrentConditionsProps {
  weatherData: WeatherData;
}

const CurrentConditions: React.FC<CurrentConditionsProps> = ({ weatherData }) => {
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
        Observed at {weatherData.current.name} {Math.round((new Date().getTime() - new Date(weatherData.current.properties.timestamp).getTime()) / 60000)} minutes ago
      </ObservationTime>
    </CurrentConditionsContainer>
  );
};

export default CurrentConditions;
