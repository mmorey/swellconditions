import React from 'react';
import styled from 'styled-components';

const LocationInputContainer = styled.div`
  background-color: ${(props) => props.theme.colors.backgroundLight};
  padding: 10px;
  border-radius: 10px;
`;

const Description = styled.div`
  text-align: center;
  margin: 20px 0;
  line-height: 1.5;
  color: ${(props) => props.theme.colors.text.primary};
`;

const CoordinateInputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  padding: 20px;
`;

const InputRow = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 600px;
  justify-content: center;
`;

const Input = styled.input`
  padding: 8px;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: 4px;
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text.primary};
  width: 120px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background-color: ${(props) => props.theme.colors.link.primary};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`;

const ErrorInfo = styled.div`
  margin: 10px;
  padding: 10px;
  background-color: ${(props) => props.theme.colors.text.error};
  border-radius: 5px;
  font-size: 14px;
  text-align: center;
`;

const LocationsList = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 10px 0;
`;

const LocationButton = styled(Button)`
  font-size: 14px;
  padding: 6px 12px;
`;

interface LocationInputProps {
  manualLat: string;
  manualLon: string;
  locationError: string | null;
  isGettingLocation: boolean;
  onLatChange: (value: string) => void;
  onLonChange: (value: string) => void;
  onSubmitCoordinates: () => void;
  onUseLocation: () => void;
}

const LocationInput: React.FC<LocationInputProps> = ({ manualLat, manualLon, locationError, isGettingLocation, onLatChange, onLonChange, onSubmitCoordinates, onUseLocation }) => {
  const popularLocations = [
    { name: 'Malibu', lat: 34.0259, lon: -118.7798 },
    { name: 'Lower Trestles', lat: 33.382, lon: -117.5886 }, //33.382040, -117.588630
    { name: 'Pipeline', lat: 21.6654, lon: -158.0521 },
  ];

  const handleLocationSelect = (lat: number, lon: number) => {
    // Navigate directly to the URL with the coordinates
    window.location.href = `?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  };

  return (
    <LocationInputContainer>
      <Description>
        <p>
          SwellConditions.com provides comprehensive marine weather data including wave heights, wind conditions, tides, and water temperatures for any coastal location. To provide you with accurate
          local conditions, we need your location coordinates.
        </p>
        <p>The simplest way to get started is to click "Use My Location" below, which will automatically detect your coordinates.</p>
      </Description>

      <CoordinateInputGroup>
        <Button onClick={onUseLocation} disabled={isGettingLocation}>
          {isGettingLocation ? 'Getting Location...' : '⌖ Use My Location'}
        </Button>
        <Description>
          <p>Alternatively, you can manually enter specific latitude and longitude coordinates.</p>
        </Description>
        <InputRow>
          <Input type="number" step="any" placeholder="Latitude" value={manualLat} onChange={(e) => onLatChange(e.target.value)} />
          <Input type="number" step="any" placeholder="Longitude" value={manualLon} onChange={(e) => onLonChange(e.target.value)} />
          <Button onClick={onSubmitCoordinates}>Submit Coordinates</Button>
        </InputRow>
        {locationError && <ErrorInfo>{locationError}</ErrorInfo>}
      </CoordinateInputGroup>
      <Description>
        <p>Or here are some popular locations:</p>
        <LocationsList>
          {popularLocations.map((location) => (
            <LocationButton key={location.name} onClick={() => handleLocationSelect(location.lat, location.lon)}>
              {location.name}
            </LocationButton>
          ))}
        </LocationsList>
      </Description>
    </LocationInputContainer>
  );
};

export default LocationInput;
