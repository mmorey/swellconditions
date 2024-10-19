import React from 'react';
import styled from 'styled-components';
import * as SunCalc from 'suncalc';

const SunInformationContainer = styled.div`
  background-color: #1f1f1f;
  padding: 20px 15px;
  margin: 20px auto;
  width: 85%;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
`;

const SunInformationRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const SunColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 50%;
`;

const SunTimeGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 15px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SunTime = styled.div`
  font-size: 18px;
  font-weight: bold;
  margin-top: 5px;
`;

const SunLabel = styled.div`
  font-size: 14px;
  color: #999;
`;

interface SunInformationProps {
  latitude: number;
  longitude: number;
}

const SunInformation: React.FC<SunInformationProps> = ({ latitude, longitude }) => {
  const today = new Date();
  const times = SunCalc.getTimes(today, latitude, longitude);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  return (
    <SunInformationContainer>
      <SunInformationRow>
        <SunColumn>
          <SunTimeGroup>
            <SunLabel>First Light</SunLabel>
            <SunTime>{formatTime(times.dawn)}</SunTime>
          </SunTimeGroup>
          <SunTimeGroup>
            <SunLabel>Sunrise</SunLabel>
            <SunTime>{formatTime(times.sunrise)}</SunTime>
          </SunTimeGroup>
        </SunColumn>
        <SunColumn>
          <SunTimeGroup>
            <SunLabel>Sunset</SunLabel>
            <SunTime>{formatTime(times.sunset)}</SunTime>
          </SunTimeGroup>
          <SunTimeGroup>
            <SunLabel>Last Light</SunLabel>
            <SunTime>{formatTime(times.dusk)}</SunTime>
          </SunTimeGroup>
        </SunColumn>
      </SunInformationRow>
    </SunInformationContainer>
  );
};

export default SunInformation;
