import React from 'react';
import styled from 'styled-components';
import { NDBCStation } from '../APIClients/NDBCTypes';
import { getWindArrow, getWindDirection, formatTimeAgo } from '../utils';
import SpectralWaveGraph from './SpectralWaveGraph';
import SpectralDirectionalRose from './SpectralDirectionalRose';

const StationContainer = styled.div`
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h2`
  text-align: center;
  font-size: 12px;
  color: ${(props) => props.theme.colors.text.primary};
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
  text-align: center;
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

const SwellComponentsContainer = styled.div`
  display: flex;
  flex-direction: column;

  background-color: ${(props) => props.theme.colors.backgroundLight};
`;

const SwellComponentRow = styled.div`
  display: grid;
  // grid-template-columns: repeat(4, 1fr);
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  padding: 10px;
  &:not(:last-child) {
    border-bottom: 1px solid ${(props) => props.theme.colors.text.secondary}20;
  }
`;

const SwellTitle = styled.div`
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  color: ${(props) => props.theme.colors.text.primary};
`;

const SwellValue = styled.div`
  text-align: center;
  font-size: 12px;
  font-weight: bold;
`;

interface NDBCStationProps {
  station: NDBCStation;
}

const NDBCStationComponent: React.FC<NDBCStationProps> = ({ station }) => {
  if (!station.latestObservation) return null;

  // Convert wave height from meters to feet
  const waveHeightFeet = station.latestObservation.waveHeight ? station.latestObservation.waveHeight * 3.28084 : null;

  // Convert temperature from Celsius to Fahrenheit
  const temperatureF = station.latestObservation.waterTemp ? (station.latestObservation.waterTemp * 9) / 5 + 32 : null;

  return (
    <StationContainer>
      <Title>Buoy {station.id}</Title>
      <StationRow>
        <DataColumnsWrapper>
          <DataColumn>
            <Label>Significant Wave Height</Label>
            <LargeValue>{waveHeightFeet?.toFixed(1) ?? 'N/A'} ft</LargeValue>
          </DataColumn>
          <DataColumn>
            <Label>Dominant Wave Period</Label>
            <LargeValue>{station.latestObservation.dominantWavePeriod?.toFixed(1) ?? 'N/A'} s</LargeValue>
          </DataColumn>
          {station.latestObservation.meanWaveDirection !== null && (
            <DataColumn>
              <Label>Mean Wave Direction</Label>
              <LargeValue>
                {station.latestObservation.meanWaveDirection}° {getWindDirection(station.latestObservation.meanWaveDirection)}
                <DirectionArrow $rotation={station.latestObservation.meanWaveDirection}>{getWindArrow(station.latestObservation.meanWaveDirection).arrow}</DirectionArrow>
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

      {station.spectralWaveData?.swellComponents && station.spectralWaveData.swellComponents.length > 0 && (
        <SwellComponentsContainer>
          <SwellTitle>Individual Swell Components</SwellTitle>
          {station.spectralWaveData.swellComponents.map((component, index) => {
            const heightFeet = component.waveHeight * 3.28084;
            return (
              <SwellComponentRow key={index}>
                {/* <SwellValue>{(component.maxEnergyJoules / 1000).toFixed(2)} kJ</SwellValue> */}
                <SwellValue>{heightFeet.toFixed(1)} ft</SwellValue>
                <SwellValue>{component.period.toFixed(1)} s</SwellValue>
                <SwellValue>
                  {component.direction}° {component.compassDirection}
                  <DirectionArrow $rotation={component.direction}>{getWindArrow(component.direction).arrow}</DirectionArrow>
                </SwellValue>
              </SwellComponentRow>
            );
          })}
        </SwellComponentsContainer>
      )}

      <SpectralWaveGraph station={station} />
      <SpectralDirectionalRose station={station} />
      <StationInfo>
        {station.id} observed {Math.round(station.distance ?? 0)} miles {station.direction} at {station.name} {formatTimeAgo(station.latestObservation.timestamp)}
      </StationInfo>
    </StationContainer>
  );
};

export default NDBCStationComponent;
