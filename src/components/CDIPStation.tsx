import React from 'react';
import styled from 'styled-components';
import { CDIPStation as CDIPStationType } from '../APIClients/CDIPTypes';
import { getWindArrow, getWindDirection, formatTimeAgo } from '../utils';

const StationContainer = styled.div`
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
`;

const StationRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
`;

const DataColumnsWrapper = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
`;

const DataColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const LargeValue = styled.div`
  font-size: 18px;
  font-weight: bold;
  margin-top: 5px;
`;

const Label = styled.div`
  font-size: 14px;
  color: ${(props) => props.theme.colors.text.secondary};
`;

const StationInfo = styled.div`
  font-size: 2vw;
  color: ${(props) => props.theme.colors.text.secondary};
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  @media (max-width: 768px) {
    font-size: 2vw;
  }
  @media (min-width: 1200px) {
    font-size: 24px;
  }
`;

const DirectionArrow = styled.span<{ $rotation: number }>`
  display: inline-block;
  margin-left: 5px;
  transform: rotate(${(props) => props.$rotation}deg);
`;

interface CDIPStationProps {
  station: CDIPStationType;
  distance: number;
  direction: string;
}

const CDIPStation: React.FC<CDIPStationProps> = ({ station, distance, direction }) => {
  // Convert wave height from meters to feet
  const waveHeightFeet = station.hs_m * 3.28084;

  // Convert temperature from Celsius to Fahrenheit if present
  const temperatureF = station.sst_c !== null ? (station.sst_c * 9) / 5 + 32 : null;

  return (
    <StationContainer>
      <StationRow>
        <DataColumnsWrapper>
          <DataColumn>
            <Label>Height</Label>
            <LargeValue>{waveHeightFeet.toFixed(1)} ft</LargeValue>
          </DataColumn>
          <DataColumn>
            <Label>Period</Label>
            <LargeValue>{station.tp_s.toFixed(1)}s</LargeValue>
          </DataColumn>
          {station.dp_deg !== null && (
            <DataColumn>
              <Label>Direction</Label>
              <LargeValue>
                {station.dp_deg}° {getWindDirection(station.dp_deg)}
                <DirectionArrow $rotation={station.dp_deg}>{getWindArrow(station.dp_deg).arrow}</DirectionArrow>
              </LargeValue>
            </DataColumn>
          )}
          {temperatureF !== null && (
            <DataColumn>
              <Label>Water Temp</Label>
              <LargeValue>{temperatureF.toFixed(1)}°F</LargeValue>
            </DataColumn>
          )}
        </DataColumnsWrapper>
      </StationRow>
      <StationInfo>
        Observed {Math.round(distance)} miles {direction} at {station.station_name}({station.station_number}) {formatTimeAgo(station.timestamp)}
      </StationInfo>
    </StationContainer>
  );
};

export default CDIPStation;
