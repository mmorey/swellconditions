import React from 'react';
import styled from 'styled-components';
import * as SunCalc from 'suncalc';

const SunInformationContainer = styled.div`
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h2`
  text-align: center;
  font-size: ${(props) => props.theme.fonts.secondary.size};
  color: ${(props) => props.theme.colors.text.primary};
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
  font-size: ${(props) => props.theme.fonts.primary.size};
  font-weight: bold;
  margin-top: 5px;
`;

const SunLabel = styled.div`
  font-size: ${(props) => props.theme.fonts.secondary.size};
  color: ${(props) => props.theme.colors.text.secondary};
`;

const CoordinateText = styled.div`
  font-size: ${(props) => props.theme.fonts.secondary.size};
  color: ${(props) => props.theme.colors.text.secondary};
  text-align: center;
  margin-top: 10px;
`;

interface SunInformationProps {
  latitude: number;
  longitude: number;
}

const SunInformation: React.FC<SunInformationProps> = ({ latitude, longitude }) => {
  const now = new Date();
  const times = SunCalc.getTimes(now, latitude, longitude);
  const isShowingTomorrow = now > times.dusk;

  // If current time is past dusk, show tomorrow's times
  if (isShowingTomorrow) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTimes = SunCalc.getTimes(tomorrow, latitude, longitude);
    return renderSunTimes(tomorrowTimes, latitude, longitude, isShowingTomorrow);
  }

  return renderSunTimes(times, latitude, longitude, isShowingTomorrow);
};

const renderSunTimes = (times: SunCalc.GetTimesResult, latitude: number, longitude: number, isShowingTomorrow: boolean) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  return (
    <SunInformationContainer>
      <Title>Daylight Hours</Title>
      <SunInformationRow>
        <SunColumn>
          <SunTimeGroup>
            <SunLabel>First Light</SunLabel>
            <SunTime>{formatTime(times.dawn)}</SunTime>
          </SunTimeGroup>
          <SunTimeGroup>
            <SunLabel>Sunset</SunLabel>
            <SunTime>{formatTime(times.sunset)}</SunTime>
          </SunTimeGroup>
        </SunColumn>
        <SunColumn>
          <SunTimeGroup>
            <SunLabel>Sunrise</SunLabel>
            <SunTime>{formatTime(times.sunrise)}</SunTime>
          </SunTimeGroup>
          <SunTimeGroup>
            <SunLabel>Last Light</SunLabel>
            <SunTime>{formatTime(times.dusk)}</SunTime>
          </SunTimeGroup>
        </SunColumn>
      </SunInformationRow>
      <CoordinateText>
        Calculated times at {latitude.toFixed(4)}°, {longitude.toFixed(4)}° for {isShowingTomorrow ? 'tomorrow' : 'today'}
      </CoordinateText>
    </SunInformationContainer>
  );
};

export default SunInformation;
